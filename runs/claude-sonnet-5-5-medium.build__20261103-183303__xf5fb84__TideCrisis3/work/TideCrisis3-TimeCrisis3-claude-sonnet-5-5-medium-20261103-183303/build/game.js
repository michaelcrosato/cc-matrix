(() => {
"use strict";
// ---- 00-core.js ----
// 00-core.js — TC namespace, registries, RNG, live tuning. Owns: shared constants. Reads: the engine (E).
// THE CORE LOOP: the camera rides the rail to the next area (WAIT) -> ACTION! starts the clock -> pop out and shoot
// -> duck when a crisis flash says a shot will hit -> reload in cover -> clear the area before TIME runs out -> ride on
// -> beat the boss -> STAGE CLEAR.
const E = My3D2dge, px = E.px;
const TC = { REG: {}, VERSION: '1.0' };
const def = (kind, id, spec) => { (TC.REG[kind] = TC.REG[kind] || {})[id] = spec; return spec; };
const reg = (kind, id) => (TC.REG[kind] || {})[id];
const clamp = E.clamp, lerp = E.lerp, TAU = Math.PI * 2, DEG = Math.PI / 180;
const hash32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const cosmetic = mulberry(0xC0FFEE);          // cosmetic-only stream (particles); never read by the Sim
const smooth = t => t * t * (3 - 2 * t);

// Live tuning: every dev-panel slider is a path into `tune`. TUNE is the frozen default set.
const TUNE = {
  player: { godMode: 0, infAmmo: 0, lives: 5, iframes: 1.5, coverIn: .12, coverOut: .15, reload: .30, padSpeed: 1.6, assist: .6 },
  weapon: { hgDmg: 1, mgRate: 12, mgDmg: .45, sgPellets: 8, sgSpread: 5.5, glRadius: 48, glDmg: 6, ammoMul: 1 },
  enemy: { hpMul: 1, threatMul: 1, telegraphMul: 1, fireMul: 1, maxThreats: 0, minGap: .35, reactMul: 1, bossHp: 1 },
  time: { freeze: 0, sceneMul: 1, elite: 2, refill: 60, speed: 1 },
  view: { fov: 55, hitVol: 0, colliders: 0, rail: 0, ai: 0, threats: 0, perf: 0, freecam: 0, hideHud: 0 }
};
const deepCopy = o => JSON.parse(JSON.stringify(o));
const tune = deepCopy(TUNE);
function resetTune() { const d = deepCopy(TUNE); for (const k in d) Object.assign(tune[k], d[k]); }
Object.freeze(TUNE); for (const k in TUNE) Object.freeze(TUNE[k]);

const DIFF = {
  easy: { lives: 7, time: 1.25, threat: .75, maxT: -1, name: 'EASY' },
  normal: { lives: 5, time: 1, threat: 1, maxT: 0, name: 'NORMAL' },
  hard: { lives: 3, time: .85, threat: 1.25, maxT: 1, name: 'HARD' }
};
const PCOL = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const AGENT = ['kai', 'rook', 'mari', 'juno'];
const AGENT_NAME = ['KAI', 'ROOK', 'MARI', 'JUNO'];

// ---- 01-render.js ----
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

// ---- 20-sim.js ----
// 20-sim.js — Sim: the authoritative, deterministic, render-free game state. Owns: players, cover, weapons, shots,
// threats (the crisis flash), projectiles, objects, director (waves, cues, clear), TIME, scoring, coroutines.
// Reads: registries (scene, enemy, weapon, boss). The presentation only reads sim.state/sim.events.
const WEAPONS = [
  { id: 'handgun', name: 'P9 MARLIN', short: 'P9', rate: 6, auto: 3.5, dmg: 1, spread: 0, sw: .2, recoil: .6 },
  { id: 'mg', name: 'RIPTIDE', short: 'MG', rate: 12, dmg: .45, spread: .6, bloom: 3, sw: .25, recoil: .25, pool: 240, pick: 60 },
  { id: 'sg', name: 'BREAKWATER', short: 'SG', rate: 1.5, dmg: .45, pellets: 8, spread: 5.5, sw: .3, recoil: 2.2, pool: 36, pick: 8 },
  { id: 'gl', name: 'SQUALL', short: 'GL', rate: 1, dmg: 6, radius: 48, sw: .35, recoil: 1.5, pool: 6, pick: 2 }
];
const GRAV = 240;
function newPlayer(i, spec, lives) {
  return { id: i, name: spec.name || 'P' + (i + 1), color: spec.color || PCOL[i], agent: spec.agent || AGENT[i], aspect: spec.aspect || 16 / 9,
    c: 0, wantCover: false, exposedSince: 0, aim: [0, 0], weapon: 0, switchT: 0, cool: 0, mag: 9, reloadT: 0, ammo: [9, 0, 0, 0], bloom: 0,
    lives, score: 0, chain: 0, best: 0, inv: 0, hurt: 0, down: false, contT: 0, continues: 0, cheat: 0,
    st: { shots: 0, hits: 0, heads: 0, kills: 0, quick: 0, saves: 0, lost: 0, civ: 0, bonus: 0 }, nextLife: 150000, recoil: 0, handled: 0, lastFire: -9, seen: {} };
}
class Sim {
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'stage'; this.diff = DIFF[o.difficulty || 'normal']; this.seed = o.seed == null ? 12345 : o.seed;
    this._rngs = {}; this.t = 0; this.events = []; this.nextId = 1; this.cheats = Object.assign({ god: 0, ammo: 0, freeze: 0, oneHit: 0 }, o.cheats || {});
    this.players = (o.players || [{}]).map((p, i) => newPlayer(i, p, this.diff.lives));
    if (o.lives) for (const p of this.players) p.lives = o.lives;
    this.enemies = []; this.threats = []; this.proj = []; this.objs = []; this.civs = []; this.cors = []; this.fx = [];
    this.stage = o.stage == null ? 1 : o.stage; this.sceneId = null; this.scene = null; this.phase = 'idle'; this.pt = 0; this.timer = 0; this.timeMax = 0;
    this.rail = 0; this.railSpeed = 0; this.waves = []; this.waveT = 0; this.spawned = 0; this.cues = []; this.cueDone = {}; this.boss = null; this.flags = {};
    this.slow = 1; this.over = false; this.won = false; this.hist = []; this.sayq = []; this.clearT = 0; this.shake = 0; this.mark = 0; this.sceneIdx = 0; this.lastKill = {}; this.sceneLog = [];
    this.stageStats = { time: 0, scenesCleared: 0, lostAtStart: 0 };
    this.travelFrom = null; this.statsStart = null; this.whip = 0; this.gauge = 0;
    if (o.scene) this.jump(this.stage, o.scene);
  }
  rng(s = 'a') { return (this._rngs[s] || (this._rngs[s] = mulberry(hash32(s) ^ this.seed)))(); }
  rr(a, b, s = 'a') { return a + (b - a) * this.rng(s); }
  pick(a, s = 'a') { return a[Math.floor(this.rng(s) * a.length) % a.length]; }
  emit(type, d) { this.events.push(Object.assign({ type, t: this.t }, d)); }
  say(who, text, dur) { this.emit('say', { who, text, dur }); }
  alive() { return this.players.filter(p => !p.down); }
  // ---------- stage and scene control ----------
  jump(stage, sceneId, o = {}) {
    this.stage = stage; this.sceneId = sceneId; const sc = this.scene = reg('scene', sceneId);
    if (!sc) throw new Error('no scene ' + sceneId);
    this.sceneIdx = (reg('stage', stage).scenes || []).indexOf(sceneId);
    this.enemies.length = 0; this.threats.length = 0; this.proj.length = 0; this.objs.length = 0; this.civs.length = 0; this.cors.length = 0; this.fx.length = 0;
    this.boss = null; this.waves = []; this.cues = (sc.cues || []).map((c, i) => Object.assign({ id: i }, c)); this.cueDone = {}; this.flags = {}; this.rail = 0; this.gauge = 0;
    this.waveT = 0; this.spawned = 0; this.sayq = [];
    const sl = sc.slots; this.slotsList = this.players.map((p, i) => sl[Math.min(i, sl.length - 1)] ? this.slotFor(sc, i) : this.slotFor(sc, 0));
    this.covers = Object.keys(sc.covers || {}).map(k => Object.assign({ id: k }, sc.covers[k]));
    for (const w of sc.waves || []) this.waves.push(Object.assign({ started: false, done: false, spawned: [] }, w));
    for (const o2 of sc.objs || []) this.addObj(o2);
    for (const c of sc.civ || []) this.addCiv(c);
    for (const p of this.players) { p.c = 0; p.wantCover = false; p.mag = 9; p.reloadT = 0; if (!p.down) p.inv = 0; p.chain = 0; p.bloom = 0; }
    this.timeMax = Math.round(sc.time * this.diff.time * tune.time.sceneMul); this.timer = this.timeMax;
    this.pt = 0; this.travelLen = this.pathLen(sc); this.travelDur = Math.max(1.2, this.travelLen / (sc.speed || 110)) * (this.o.fast ? .6 : 1);
    this.phase = o.phase || (sc.boss ? 'travel' : 'travel'); if (o.phase === 'action') this.beginAction(); this.emit('scene', { id: sceneId, stage, title: sc.title });
    for (const p of this.players) { p.st0 = Object.assign({}, p.st); }
    this.sceneStartT = this.t; this.hitsAtStart = this.players.map(p => p.st.lost);
  }
  slotFor(sc, i) {
    // seats 3 and 4: slot 1 moved 28 u further left, slot 2 moved 28 u further right (perpendicular to the view)
    const base = i >= sc.slots.length ? sc.slots[(i - sc.slots.length) % sc.slots.length] : sc.slots[i];
    const sdir = Math.sign(base.at[1]) || 1, at = [base.at[0], base.at[1] + (i >= sc.slots.length ? sdir * 28 : 0), base.at[2] || 24];
    const cover = base.cover || { dy: sdir * -7, yaw: -sdir * 10, dz: -12 };
    return { stand: { x: at[0], y: at[1], z: at[2], yaw: (base.yaw || 0) * DEG, pitch: (base.pitch || 0) * DEG }, cover: { x: at[0] - 2, y: at[1] + cover.dy, z: at[2] + cover.dz, yaw: ((base.yaw || 0) + cover.yaw) * DEG, pitch: (base.pitch || 0) * DEG - .04 }, prop: base.prop };
  }
  pathLen(sc) { const a = sc.from || [-160, 0, 24], b = sc.slots[0].at; return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  // the cover prop box for a slot (in front of the camera) -- also what cover looks like
  coverBox(i) {
    const s = this.slotsList[i], sc = this.scene, pr = Object.assign({ d: 26, w: 58, h: 13, mat: sc.coverMat || 'crate' }, sc.coverProp || {}, s.prop || {});
    const lift = sc.lift ? this.rail : 0, x = s.stand.x + (sc.lift ? 0 : this.rail) + pr.d, y = s.stand.y + (s.cover.y - s.stand.y) * .5;
    return { x0: x - 6, x1: x + 6, y0: y - pr.w / 2, y1: y + pr.w / 2, z0: s.stand.z - 24 - 4 + lift, z1: pr.h + lift, mat: pr.mat, cover: true, owner: i };
  }
  pose(i) {
    const p = this.players[i], s = this.slotsList[i]; if (!s) return { x: 0, y: 0, z: 24, yaw: 0, pitch: 0, roll: 0, fov: tune.view.fov };
    const k = smooth(clamp(p.c, 0, 1)), a = s.stand, b = s.cover; let pose;
    const sc = this.scene;
    if (this.phase === 'travel' && !this.travelDone) {
      const f = sc.from || [-160, 0, 24], u = clamp(this.pt / this.travelDur, 0, 1), e = u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      pose = { x: lerp(f[0], a.x, e), y: lerp(f[1], a.y, e), z: lerp(f[2], a.z, e) + Math.sin(this.pt * 12) * 1.1 * (1 - e) * (this.travelLen / (this.travelDur) > 80 ? 1 : 0), yaw: a.yaw + (1 - e) * (sc.whip == null ? .85 : sc.whip), pitch: a.pitch + (1 - e) * .06, roll: Math.sin(this.pt * 6) * .008 };
    } else {
      pose = { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k), roll: Math.sin(Math.PI * clamp(p.c, 0, 1)) * .035 };
      if (sc.lift) pose.z += this.rail;
      else pose.x += this.rail;
      if (sc.sway) { pose.roll += Math.sin(this.t * sc.sway[0]) * sc.sway[1]; pose.z += Math.sin(this.t * sc.sway[0] * 1.3) * sc.sway[1] * 40; pose.y += Math.sin(this.t * sc.sway[0] * .7) * sc.sway[1] * 60; }
    }
    pose.fov = tune.view.fov; return pose;
  }
  // exposed: can be hit
  exposed(p) { return p.c < .5; }
  // ---------- phases ----------
  beginAction() {
    this.phase = 'action'; this.travelDone = true; this.timer = this.timeMax; this.actionT = 0; this.emit('action', {});
    this.pt = this.travelDur; this.civQ = null; this.boomAt = [];
    for (const p of this.players) { p.lastFire = -9; }
    const sc = this.scene; if (sc.boss) this.spawnBoss(sc.boss); if (sc.onStart) sc.onStart(this);
  }
  step(dt, cmds = []) {
    this.events.length = 0; dt *= this.slow;
    if (this.cheats.freeze && false) return;
    this.t += dt;
    for (const p of this.players) this.stepPlayer(p, cmds[p.id] || {}, dt);
    if (this.phase === 'travel') { this.pt += dt; if (this.pt >= this.travelDur) { this.travelDone = true; this.beginAction(); } this.runCues(dt); }
    else if (this.phase === 'action' || this.phase === 'boss') this.stepAction(dt);
    else if (this.phase === 'clear') { this.clearT += dt; if (this.clearT > 1.6) this.advance(); }
    this.stepProjectiles(dt); this.stepObjs(dt); this.stepThreats(dt); this.stepFx(dt); this.runCoros(dt);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    // continues
    for (const p of this.players) if (p.down && p.contT > 0) { p.contT -= dt; if (p.contT <= 0) { p.contT = 0; p.contFail = true; this.emit('contfail', { p: p.id }); this.checkOver(); } }
  }
  stepAction(dt) {
    this.actionT += dt;
    if (this.sc_rail) this.sc_rail(dt);
    const sc = this.scene;
    if (sc.moving) {
      let lim = sc.moving.dist; const sx = this.slotsList[0] ? this.slotsList[0].stand.x : 0;
      for (const e of this.enemies) if (!e.dead && !e.gone && !e.civ && e.cover && e.rail !== false) lim = Math.min(lim, sc.lift ? e.bz - 20 : e.bx - 110 - sx);
      this.rail = Math.max(this.rail, Math.min(lim, this.rail + sc.moving.speed * dt));
    }
    this.stepWaves(dt); this.runCues(dt); this.stepEnemies(dt);
    if (sc.bossAtD != null && !this.flags.bossSpawned && this.rail >= sc.bossAtD) { this.flags.bossSpawned = 1; this.spawnBoss(sc.bossId, { final: true }); }
    if (this.boss) this.stepBoss(dt);
    if (!tune.time.freeze) { this.timer -= dt; }
    if (this.timer <= 0 && !tune.time.freeze) this.timeUp();
    if ((this.phase === 'action' || this.phase === 'boss') && this.sceneClear()) this.clearScene();
  }
  timeUp() {
    this.emit('timeup', {}); this.timer = Math.round(this.timeMax * tune.time.refill / 100);
    for (const p of this.players) if (!p.down) this.loseLife(p, 'time');
  }
  sceneClear() {
    if (this.waves.some(w => !w.done)) return false; if (this.boss && !this.boss.dead) return false;
    if (this.scene.objective && !this.scene.objective(this)) return false;
    return !this.enemies.some(e => !e.dead && !e.civ && !e.ally);
  }
  clearScene() {
    this.phase = 'clear'; this.clearT = 0; const bonus = Math.max(0, Math.round(this.timer)) * 100; this.emit('clear', { bonus, boss: !!this.scene.boss });
    for (const p of this.players) if (!p.down) { p.score += bonus; this.checkLife(p); }
    this.stageStats.scenesCleared++; this.threats.length = 0; for (const e of this.proj) if (e.team !== 'p') e.dead = true;
  }
  advance() {
    const st = reg('stage', this.stage), i = this.sceneIdx;
    if (i + 1 < st.scenes.length) this.jump(this.stage, st.scenes[i + 1]);
    else { this.phase = 'stageclear'; this.emit('stageclear', { stage: this.stage }); }
  }
  // ---------- waves, cues ----------
  stepWaves(dt) {
    this.waveT += dt;
    for (let i = 0; i < this.waves.length; i++) {
      const w = this.waves[i]; if (w.started) { if (!w.done && w.spawned.every(e => e.dead || e.gone)) w.done = true; continue; }
      let go = false;
      if (w.at != null) go = this.actionT >= w.at; else if (w.atD != null) go = this.rail >= w.atD;
      else if (w.after === 'clear') go = (!this.boss || this.boss.dead) && (i === 0 || (this.waves[i - 1].started && this.waves[i - 1].spawned.every(e => e.dead || e.gone) && this.noPending(i)));
      else if (w.after === 'obj') go = !!this.flags[w.flag];
      else if (w.on) go = !!this.flags[w.on];
      else if (typeof w.after === 'number') go = this.waves[w.after] && this.waves[w.after].done;
      if (go) this.startWave(w);
    }
  }
  noPending(i) { return true; }
  startWave(w) {
    w.started = true; this.emit('wave', {});
    for (const s of w.spawn) { const e = this.spawnEnemy(s[0], s[1], s[2] || {}); if (e) w.spawned.push(e); }
    if (w.boss) this.spawnBoss(w.boss);
    if (w.fn) w.fn(this, w);
    if (!w.spawned.length) w.done = true;
  }
  runCues(dt) {
    for (const c of this.cues) {
      if (this.cueDone[c.id]) continue;
      let go = false;
      if (c.at != null) go = (this.phase === 'travel' ? this.pt - this.travelDur : this.actionT) >= c.at - (c.at < 0 ? 0 : 0) && (c.at >= 0 ? this.phase !== 'travel' || c.pre : true);
      else if (c.on) go = !!this.flags[c.on]; else if (c.atD != null) go = this.rail >= c.atD;
      if (c.at === -1 && this.phase === 'travel') go = this.pt > 0.3;
      if (go) { this.cueDone[c.id] = 1; if (c.say) this.say(c.say[0], c.say[1]); if (c.fn) c.fn(this); if (c.flag) this.flags[c.flag] = 1; if (c.prompt) this.emit('prompt', { id: c.prompt }); if (c.music) this.emit('music', { song: c.music }); }
    }
  }
  // ---------- coroutines (boss scripts, scripted bits) ----------
  coro(gen) { this.cors.push({ g: gen, w: 0, pred: null, sub: null }); }
  runCoros(dt) {
    for (const c of this.cors) {
      if (c.done) continue;
      if (c.boss && c.boss.dead) { c.done = true; if (c.sub) c.sub.done = true; continue; }
      if (c.sub) { if (!c.sub.done) continue; c.sub = null; }
      if (c.pred) { if (!c.pred()) continue; c.pred = null; }
      c.w -= dt; if (c.w > 0) continue;
      let r; try { r = c.g.next(); } catch (e) { c.done = true; throw e; }
      if (r.done) { c.done = true; continue; }
      const v = r.value; c.w = 0;
      if (typeof v === 'number') c.w = v; else if (typeof v === 'function') c.pred = v; else if (v && v.next) { const sub = { g: v, w: 0, pred: null, sub: null }; this.cors.push(sub); c.sub = sub; }
    }
    if (this.cors.length > 20) this.cors = this.cors.filter(c => !c.done);
  }
  // ---------- players ----------
  stepPlayer(p, c, dt) {
    if (p.down) return;
    p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.cool = Math.max(0, p.cool - dt); p.switchT = Math.max(0, p.switchT - dt); p.recoil = Math.max(0, p.recoil - dt * 6);
    p.bloom = Math.max(0, p.bloom - dt * 6);
    if (c.aim) p.aim = [clamp(c.aim[0], -p.aspect, p.aspect), clamp(c.aim[1], -1, 1)];
    const was = p.c < .5; p.wantCover = !!c.coverDown;
    const canMove = this.phase === 'action' || this.phase === 'boss' || this.phase === 'clear' || this.phase === 'travel';
    const tgt = p.wantCover ? 1 : 0, rate = tgt > p.c ? 1 / Math.max(.02, tune.player.coverIn) : 1 / Math.max(.02, tune.player.coverOut);
    if (this.phase === 'travel') p.c = approach(p.c, 0, rate * dt); else p.c = approach(p.c, tgt, rate * dt);
    if (!was && p.c < .5) { } if (was && p.c >= .5) { } if (p.c < .5 && !(p.c0 < .5)) p.exposedSince = this.t; p.c0 = p.c;
    // weapon select
    if (c.select != null && c.select > 0 && c.select <= 4) this.selectWeapon(p, c.select - 1);
    if (c.next) this.cycleWeapon(p, 1); if (c.prev) this.cycleWeapon(p, -1);
    // reload (handgun) in cover
    const w = WEAPONS[p.weapon];
    if (p.weapon === 0 && p.mag < 9 && (p.c > .8 || c.reload && p.c > .8)) { p.reloadT += dt; if (p.reloadT >= tune.player.reload) { p.mag = 9; p.reloadT = 0; this.emit('reload', { p: p.id }); } } else if (p.c < .8) p.reloadT = 0;
    if (c.reload && p.c < .5 && p.weapon === 0 && p.mag < 9) this.emit('prompt', { id: 'reload', p: p.id });
    if (this.phase !== 'action' && this.phase !== 'boss' && this.phase !== 'clear') return;
    // fire
    if (c.firePressed && p.c > .5) { this.cycleWeapon(p, 1, true); }
    const wantsFire = (c.firePressed || (c.fireDown && (p.weapon === 1 || (p.weapon === 0 && c.autoFire !== false) ))) && p.c < .2 && p.switchT <= 0;
    if (wantsFire && p.cool <= 0) {
      const auto = p.weapon !== 0 || !c.firePressed;
      if (p.weapon === 0 && c.fireDown && !c.firePressed && p.cool > 0) return;
      this.fire(p, auto);
    }
  }
  selectWeapon(p, i) {
    if (i === p.weapon) return; if (i > 0 && p.ammo[i] <= 0) return;
    p.weapon = i; p.switchT = WEAPONS[i].sw; this.emit('switch', { p: p.id, w: i });
  }
  cycleWeapon(p, dir, fromCover) {
    for (let k = 1; k <= 4; k++) { const i = ((p.weapon + dir * k) % 4 + 4) % 4; if (i === 0 || p.ammo[i] > 0) { this.selectWeapon(p, i); return; } }
  }
  fire(p, auto) {
    const w = WEAPONS[p.weapon], i = p.weapon;
    if (i === 0) { if (p.mag <= 0) { p.cool = .25; this.emit('empty', { p: p.id }); return; } p.mag--; p.cool = auto ? 1 / w.auto : 1 / w.rate; }
    else if (!this.cheats.ammo && !tune.player.infAmmo && p.ammo[i] <= 0) { this.selectWeapon(p, 0); return; }
    else { if (!this.cheats.ammo && !tune.player.infAmmo) p.ammo[i]--; p.cool = 1 / (i === 1 ? tune.weapon.mgRate : w.rate); }
    if (i !== 0 && p.ammo[i] <= 0 && !this.cheats.ammo && !tune.player.infAmmo) p.autoSwitch = true;
    p.lastFire = this.t; p.st.shots++; p.recoil = 1;
    this.emit('shot', { p: p.id, w: i });
    const pose = this.pose(p.id);
    let anyHit = false;
    if (i === 3) { this.fireGL(p, pose); }
    else {
      const n = i === 2 ? tune.weapon.sgPellets : 1;
      for (let k = 0; k < n; k++) {
        let ax = p.aim[0], ay = p.aim[1];
        const sp = i === 2 ? tune.weapon.sgSpread : i === 1 ? (w.spread + p.bloom) : 0;
        if (sp > 0) { const a = this.rng('spread') * TAU, r = Math.sqrt(this.rng('spread')) * sp * DEG / Math.tan(pose.fov * DEG / 2); ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
        const dmg = i === 0 ? tune.weapon.hgDmg : i === 1 ? tune.weapon.mgDmg : w.dmg;
        if (this.shootRay(p, pose, ax, ay, dmg, i, k === 0)) anyHit = true;
      }
      if (i === 1) p.bloom = Math.min(w.bloom, p.bloom + .4);
    }
    if (!anyHit && i !== 3) { p.chain = 0; }
    if (p.autoSwitch) { p.autoSwitch = false; if (p.ammo[i] <= 0 && i > 0) this.selectWeapon(p, 0); }
  }
  // find nearest thing along a ray; returns {t, kind, ent, vol}
  castRay(o, d, opts = {}) {
    let best = { t: Infinity };
    const consider = (t, kind, ent, vol, pt) => { if (t < best.t && t > 0) best = { t, kind, ent, vol }; };
    for (const e of this.enemies) {
      if (e.dead || e.gone || e.civ && opts.noCiv) continue; const vols = this.volumes(e);
      for (const v of vols) { const t = v.k === 's' ? R3.raySphere(o, d, v.c, v.r) : v.k === 'c' ? R3.rayCapsule(o, d, v.a, v.b, v.r) : R3.rayBox(o, d, v.box); if (t < Infinity) consider(t, v.part || 'enemy', e, v); }
    }
    if (this.boss) for (const v of this.bossVolumes()) { if (v.dead) continue; const t = v.k === 's' ? R3.raySphere(o, d, v.c, v.r) : R3.rayBox(o, d, v.box); if (t < Infinity) consider(t, 'boss', this.boss, v); }
    for (const pr of this.proj) { if (pr.dead || pr.team === 'p') continue; const t = R3.raySphere(o, d, [pr.x, pr.y, pr.z], pr.r || 5); if (t < Infinity) consider(t, 'proj', pr, null); }
    for (const ob of this.objs) { if (ob.dead || ob.passive) continue; const t = R3.rayBox(o, d, { x0: ob.x - ob.rx, x1: ob.x + ob.rx, y0: ob.y - ob.ry, y1: ob.y + ob.ry, z0: ob.z, z1: ob.z + ob.h }); if (t < Infinity) consider(t, 'obj', ob, null); }
    // solid scenery: cover props and scene colliders block shots
    const blockers = this.colliders(opts.skip); for (const b of blockers) { const t = R3.rayBox(o, d, b); if (t < Infinity && t < best.t) { best = { t, kind: 'wall', ent: b }; } }
    // ground
    if (d[2] < 0) { const t = (0 - o[2]) / d[2]; if (t > 0 && t < best.t) best = { t, kind: 'ground' }; }
    return best;
  }
  colliders(skip) {
    if (!this._coll || this._collScene !== this.sceneId) { this._collScene = this.sceneId; this._coll = (this.scene.solids || []).filter(b => b.solid !== false); }
    const r = this._coll.slice();
    for (let i = 0; i < this.players.length; i++) if (i !== skip) r.push(this.coverBox(i));
    for (const o of this.objs) if (o.solid && !o.dead) r.push({ x0: o.x - o.rx, x1: o.x + o.rx, y0: o.y - o.ry, y1: o.y + o.ry, z0: o.z, z1: o.z + o.h, ent: o, mat: o.mat });
    return r;
  }
  shootRay(p, pose, ax, ay, dmg, wi, first) {
    const r = R3.ray(pose, ax, ay), hit = this.castRay(r.o, r.d, { skip: p.id });
    return this.resolveHit(p, hit, r, dmg, wi, first);
  }
  resolveHit(p, hit, r, dmg, wi, first) {
    const pos = [r.o[0] + r.d[0] * Math.min(hit.t, 3000), r.o[1] + r.d[1] * Math.min(hit.t, 3000), r.o[2] + r.d[2] * Math.min(hit.t, 3000)];
    if (hit.kind === 'ground' || hit.kind === 'wall') { this.emit('impact', { pos, mat: hit.kind === 'wall' && hit.ent.mat || 'ground', p: p.id }); return false; }
    if (hit.kind === 'head' || hit.kind === 'torso' || hit.kind === 'legs') return this.hitEnemy(p, hit.ent, hit.kind, dmg, wi, pos, r.d);
    if (hit.kind === 'boss') return this.hitBoss(p, hit.vol, dmg, wi, pos);
    if (hit.kind === 'proj') { this.shootDown(p, hit.ent, dmg); return true; }
    if (hit.kind === 'obj') { return this.hitObj(p, hit.ent, dmg, pos); }
    if (hit.kind === 'shield') { this.emit('impact', { pos, mat: 'steel', p: p.id, spark: 1 }); if (wi === 2 || wi === 3) { hit.ent.shieldDown = 1.5; this.emit('shieldaside', { id: hit.ent.id }); } return false; }
    return false;
  }
  fireGL(p, pose) {
    const r = R3.ray(pose, p.aim[0], p.aim[1]), sp = 640, a = Math.atan2(r.d[1], r.d[0]);
    this.proj.push({ id: this.nextId++, kind: 'gl', team: 'p', owner: p.id, x: r.o[0] + r.d[0] * 8, y: r.o[1] + r.d[1] * 8, z: r.o[2] + r.d[2] * 8 - 2, vx: r.d[0] * sp, vy: r.d[1] * sp, vz: r.d[2] * sp, g: GRAV, hp: 1, r: 3, life: 1.2 });
  }
  // ---------- damage and scoring ----------
  addScore(p, n, noChain) { const mul = noChain ? 1 : Math.min(2, 1 + Math.floor(p.chain / 5) * .1); p.score += Math.round(n * mul); this.checkLife(p); }
  checkLife(p) { while (p.score >= p.nextLife) { p.lives++; p.nextLife = p.nextLife < 400000 ? 400000 : 1e12; this.emit('oneup', { p: p.id }); } }
  hitEnemy(p, e, part, dmg, wi, pos, dir) {
    const def_ = reg('enemy', e.type); if (!def_) return false;
    if (e.civ) { this.civHit(p, e); return true; }
    p.st.hits++; p.chain++; p.best = Math.max(p.best, p.chain);
    let mult = part === 'head' ? 2 : part === 'legs' ? .75 : 1;
    if (e.armor && part !== 'head') mult *= e.armor;
    if (wi === 3) mult = 1;
    const d = dmg * mult * (def_.shotMul ? def_.shotMul(wi) : 1);
    this.addScore(p, 100); e.hp -= d; e.flash = .08; e.hurtT = .25; e.lastHit = p.id;
    if (part === 'legs' || wi === 2) { e.stagger = .3; }
    this.emit('hit', { p: p.id, id: e.id, part, pos, head: part === 'head' });
    if (e.hp <= 0 || (part === 'head' && e.hp <= 0)) { if (part === 'head') { p.st.heads++; this.addScore(p, 500); this.emit('headshot', { p: p.id, pos }); } this.killEnemy(e, p, wi, dir, part); }
    else if (def_.onHit) def_.onHit(this, e, p);
    return true;
  }
  killEnemy(e, p, wi, dir, part) {
    if (e.dead) return; e.dead = true; e.dt = 0; e.dying = 1; const d = reg('enemy', e.type);
    e.deathStyle = wi === 2 && Math.abs(e.x - this.pose(p ? p.id : 0).x) < 150 ? 'flyback' : wi === 1 ? 'spin' : wi === 3 ? 'flyback' : (e.z > 20 && e.entryKind !== 'run' ? 'fall' : 'crumple');
    if (e.water) e.deathStyle = 'splash';
    p = p || this.players[0]; p.st.kills++;
    let pts = d.score || 1000; const quick = e.exposedAt != null && this.t - e.exposedAt < .7; if (quick) { pts += 500; p.st.quick++; this.emit('quick', { p: p.id }); }
    this.addScore(p, pts); this.threats = this.threats.filter(t => t.src !== e.id);
    this.emit('kill', { p: p.id, id: e.id, type: e.type, pos: [e.x, e.y, e.z + 12], score: pts, style: e.deathStyle });
    if (d.elite) { this.timer += tune.time.elite; this.emit('extend', { s: tune.time.elite }); }
    if (d.drop) this.drop(e, p, d.drop === true ? e.drop : d.drop);
    if (e.drop && !d.drop) this.drop(e, p, e.drop);
    if (d.onDie) d.onDie(this, e, p);
    if (e.onDie) e.onDie(this, e, p);
    if (e.flagOnDie) this.flags[e.flagOnDie] = 1;
    this.lastKill = { t: this.t };
  }
  drop(e, p, kind) {
    const wi = { mg: 1, sg: 2, gl: 3 }[kind]; if (!wi) return; const W = WEAPONS[wi], n = Math.round(W.pick * tune.weapon.ammoMul);
    const had = p.seen[wi]; p.seen[wi] = 1; p.ammo[wi] = Math.min(W.pool, p.ammo[wi] + n);
    this.emit('pickup', { p: p.id, w: wi, n, first: !had, pos: [e.x, e.y, e.z + 12] });
  }
  shootDown(p, pr, dmg) {
    pr.hp -= dmg; this.emit('impact', { pos: [pr.x, pr.y, pr.z], mat: 'steel', p: p.id });
    if (pr.hp <= 0) { pr.dead = true; p.chain++; this.addScore(p, 1000); p.st.hits++; this.threats = this.threats.filter(t => t.proj !== pr.id); this.explode(pr.x, pr.y, pr.z, pr.kind === 'torpedo' ? 40 : 48, 'p', p.id, pr.kind === 'grenade' ? 3 : 2, true); this.emit('shotdown', { p: p.id, kind: pr.kind }); }
  }
  explode(x, y, z, rad, team, owner, dmg, small) {
    this.emit('explode', { pos: [x, y, z], r: rad, big: !small });
    this.shake = Math.min(1, this.shake + (small ? .15 : .35));
    const pl = this.players[owner || 0];
    for (const e of this.enemies.slice()) {
      if (e.dead || e.civ) continue; const d = Math.hypot(e.x - x, e.y - y, e.z + 12 - z);
      if (d < rad) { const f = 1 - d / rad * .75; e.hp -= dmg * f * (e.armor ? .6 : 1); e.flash = .1; e.hurtT = .3; this.emit('hit', { p: owner, id: e.id, part: 'torso', pos: [e.x, e.y, e.z + 12] }); if (team === 'p') { pl.st.hits++; this.addScore(pl, 100); } if (e.hp <= 0) this.killEnemy(e, pl, 3, null, 'torso'); }
    }
    for (const ob of this.objs.slice()) { if (ob.dead || ob.passive) continue; const d = Math.hypot(ob.x - x, ob.y - y, ob.z + ob.h / 2 - z); if (d < rad) this.hitObj(pl, ob, dmg, [x, y, z], true); }
    if (this.boss && team === 'p') this.bossExplode(pl, x, y, z, rad, dmg);
  }
  loseLife(p, why) {
    if (this.cheats.god || tune.player.godMode) return;
    p.lives--; p.chain = 0; p.st.lost++; p.inv = tune.player.iframes; p.hurt = .5; this.shake = Math.min(1, this.shake + .5);
    this.emit('hurt', { p: p.id, why, lives: p.lives });
    if (p.lives <= 0) { p.down = true; p.contT = this.players.length > 1 ? 10 : 10; p.contFail = false; this.emit('down', { p: p.id }); this.checkOver(); }
  }
  checkOver() { if (this.players.every(p => p.down && (p.contFail || this.o.noContinue))) { if (!this.over) { this.over = true; this.phase = 'over'; this.emit('gameover', {}); } } }
  continuePlayer(p) { p.down = false; p.lives = this.diff.lives; p.score = 0; p.mark = (p.mark || 0) + 1; p.continues++; p.contT = 0; p.inv = 2; p.c = 0; p.ammo = [9, 0, 0, 0]; p.mag = 9; p.weapon = 0; this.emit('continue', { p: p.id }); if (this.phase === 'over') { this.over = false; this.phase = 'travel'; } this.restartScene(); }
  restartScene() { const keep = this.players.map(p => ({ ...p })); this.jump(this.stage, this.sceneId); }
  civHit(p, e) { p.st.civ++; p.score = Math.max(0, p.score - 5000); this.emit('civhit', { p: p.id, id: e.id }); this.loseLife(p, 'civ'); e.dead = true; e.dt = 0; e.deathStyle = 'crumple'; e.civ = true; this.say('juno', 'Civilian down! Hold your fire!'); }
  // ---------- threats (the crisis flash) ----------
  newThreat(src, kind, tel, o = {}) {
    const alive = this.players.filter(p => !p.down); if (!alive.length) return null;
    const tgtP = o.target != null ? this.players[o.target] : alive[Math.floor(this.rng('tgt') * alive.length)];
    const th = Object.assign({ id: this.nextId++, src: src && src.id, kind, tgt: tgtP.id, t0: this.t, tel, at: this.t + tel, shifted: false }, o);
    // enforce the minimum gap between impacts on one player
    const gap = tune.enemy.minGap; for (const t of this.threats) if (t.tgt === th.tgt && Math.abs(t.at - th.at) < gap) th.at = t.at + gap;
    th.tel = th.at - th.t0; this.threats.push(th); this.emit('threat', { id: th.id, src: th.src, tgt: th.tgt, tel: th.tel, kind, sp: o.sp }); return th;
  }
  stepThreats(dt) {
    for (let i = this.threats.length - 1; i >= 0; i--) {
      const th = this.threats[i], p = this.players[th.tgt]; if (!p) { this.threats.splice(i, 1); continue; }
      const left = th.at - this.t;
      if (left <= 0) {
        if (!th.shifted && this.exposed(p) && p.exposedSince > th.at - .25 && p.exposedSince > th.t0 + .05) { th.shifted = true; th.at += .15; continue; }
        this.threats.splice(i, 1);
        if (p.down) continue;
        const ignoreCover = th.ignoreCover;
        if ((this.exposed(p) || ignoreCover) && p.inv <= 0) { this.emit('impactme', { p: p.id, src: th.src, kind: th.kind }); this.loseLife(p, th.kind); }
        else if (!this.exposed(p) && !ignoreCover) { p.st.saves++; this.emit('blocked', { p: p.id, src: th.src, kind: th.kind }); }
      }
    }
  }
  stepFx(dt) { }
  // a deterministic digest of the whole state, for determinism tests and net checks
  hash() {
    const r = n => Math.round(n * 100) / 100;
    const st = [this.t.toFixed(3), this.phase, this.sceneId, this.timer.toFixed(2), this.rail.toFixed(1), this.players.map(p => [p.score, p.lives, r(p.c), p.weapon, p.mag, p.ammo.join(','), p.st.hits, p.st.shots].join(':')).join('|'),
      this.enemies.map(e => [e.id, e.type, r(e.x), r(e.y), r(e.foot), e.st, e.hp, e.dead ? 1 : 0].join(':')).join('|'), this.threats.map(t => t.id + ':' + r(t.at)).join(','), this.proj.map(p => p.id + ':' + r(p.x)).join(','), this.boss ? Object.values(this.boss.parts).map(p => r(p.hp)).join(',') : ''].join('#');
    return hash32(st);
  }
}
const approach = (a, b, d) => a < b ? Math.min(b, a + d) : Math.max(b, a - d);

// ---- 21-enemies.js ----
// 21-enemies.js — enemy archetype registry, spawning with entry animations, the cover/peek/aim/fire state machine,
// hit volumes, and the ThreatDirector's decision for every enemy shot. Owns: sim.enemies. Reads: scene covers.
const SKIN = ['#e8b894', '#c68c5c', '#8d5a3a', '#f2cba8'];
const L = (o) => o;
def('enemy', 'deckhand', { name: 'Deckhand', hp: 1, score: 1000, ai: 'peek', exposed: [1.4, 2.2], burst: 3, gap: .12, chance: [.25, .32, .40], tel: 1.1, peeks: ['up', 'left', 'right'], look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', hair: 'short', weapon: 'gun', colors: { cloth: '#2e4a7a', pants: '#2b3140', boot: '#1b1b20', hat: '#1f2a44' } } });
def('enemy', 'marine', { name: 'Marine', hp: 2, score: 1500, ai: 'peek', exposed: [1.6, 2.4], burst: 4, gap: .12, chance: [.35, .4, .45], tel: .95, peeks: ['up', 'left', 'right'], flinch: 1, look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'helmet', weapon: 'gun', armor: true, colors: { cloth: '#556b3a', coat: '#556b3a', pants: '#3d4a2a', plate: '#6a7d48', metal: '#4a5a34' } } });
def('enemy', 'redtide', { name: 'Red Tide', hp: 2, score: 3000, ai: 'peek', exposed: [1.2, 1.6], burst: 2, gap: .2, chance: [1, 1, 1], always: true, tel: .7, peeks: ['left', 'right'], elite: true, look: { build: 'heroic', size: 1.02, outfit: 'coat', hat: 'cap', hair: 'bald', weapon: 'gun', colors: { cloth: '#b01c2a', coat: '#b01c2a', pants: '#3a0f14', hat: '#8a1020', trim: '#ffd36a' } } });
def('enemy', 'quartermaster', { name: 'Quartermaster', hp: 1, score: 2000, ai: 'route', look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', weapon: null, colors: { cloth: '#ff7a1a', pants: '#3a3a3a', hat: '#ff7a1a' } }, dropDefault: 'mg' });
def('enemy', 'grenadier', { name: 'Grenadier', hp: 2, score: 2000, ai: 'peek', exposed: [1.5, 1.9], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.2, peeks: ['up'], throws: 'grenade', look: { build: 'bulky', size: .95, outfit: 'shirt', hat: 'helmet', weapon: null, colors: { cloth: '#6a4a2a', pants: '#2b2b2b', plate: '#7a5a38' } } });
def('enemy', 'rocketeer', { name: 'Rocketeer', hp: 2, score: 2500, ai: 'peek', exposed: [2.2, 2.8], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: .8, peeks: ['up', 'left'], throws: 'rocket', look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'helmet', weapon: 'gun', colors: { cloth: '#30343c', coat: '#30343c', pants: '#222', metal: '#c8a020' } } });
def('enemy', 'shield', { name: 'Shield Trooper', hp: 3, score: 3000, ai: 'shield', burst: 3, gap: .15, chance: [.4, .4, .45], tel: .9, look: { build: 'bulky', size: 1.0, outfit: 'coat', hat: 'helmet', weapon: 'gun', armor: true, colors: { cloth: '#2d3340', coat: '#2d3340', plate: '#59616f', metal: '#3a414d' } } });
def('enemy', 'rusher', { name: 'Rusher', hp: 1.5, score: 2000, ai: 'rush', look: { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#d03a2a' }, weapon: 'sword', sleeves: 'none', colors: { cloth: '#c9c9c9', pants: '#5a4a38', trim: '#d03a2a' } } });
def('enemy', 'sniper', { name: 'Sniper', hp: 1, score: 3000, ai: 'peek', exposed: [3.2, 3.6], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.4, peeks: ['up'], elite: true, laser: true, look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: { style: 'pointed', color: '#4a4f5a' }, weapon: 'gun', colors: { cloth: '#4a4f5a', coat: '#4a4f5a', pants: '#2a2c33' } } });
def('enemy', 'drone', { name: 'Drone', hp: 2, score: 1500, ai: 'fly', chance: [.3, .3, .3], tel: .9, look: null });
def('enemy', 'jetski', { name: 'Jet Ski', hp: 1, score: 1500, ai: 'ski', chance: [.3, .3, .3], tel: 1.0, skiHp: 3, look: { build: 'chibi', size: .9, outfit: 'shirt', hat: 'helmet', weapon: 'gun', colors: { cloth: '#d83030', pants: '#222' } } });
def('enemy', 'gunner', { name: 'Gunner', hp: 3, score: 2500, ai: 'peek', exposed: [3, 4], burst: 6, gap: .1, chance: [.5, .5, .5], tel: 1, peeks: ['none'], look: { build: 'bulky', size: 1.0, outfit: 'shirt', hat: 'helmet', weapon: 'gun', colors: { cloth: '#3a3040', pants: '#222', plate: '#5a5a66' } } });
def('enemy', 'captor', { name: 'Captor', hp: 1, score: 5000, ai: 'peek', exposed: [.7, .7], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: .8, peeks: ['side'], headOnly: true, look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'cap', weapon: 'gun', colors: { cloth: '#b01c2a', coat: '#b01c2a', pants: '#3a0f14', hat: '#8a1020' } } });
def('enemy', 'civilian', { name: 'Civilian', hp: 1, score: 0, ai: 'route', civ: true, look: { build: 'chibi', size: .95, outfit: 'shirt', hair: 'long', weapon: null, colors: { cloth: '#d8b84a', pants: '#3a5a8a' } } });
def('enemy', 'hostage', { name: 'Hostage', hp: 1, score: 0, ai: 'static', civ: true, look: { build: 'chibi', size: 1, outfit: 'coat', hair: 'short', weapon: null, colors: { cloth: '#f4f4f4', coat: '#f4f4f4', pants: '#4a5a6a', hair: '#bbbbbb' } } });
def('enemy', 'target', { name: 'Cut-out', hp: 1, score: 500, ai: 'static', look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', weapon: 'gun', colors: { cloth: '#8a6a3a', pants: '#6a5a3a' } } });

Object.assign(Sim.prototype, {
  coverOf(id) { return this.covers.find(c => c.id === id); },
  spawnEnemy(type, coverId, o = {}) {
    const d = reg('enemy', type); if (!d) throw new Error('no enemy ' + type);
    const cv = coverId ? this.coverOf(coverId) : null; if (coverId && !cv) throw new Error('no cover ' + coverId + ' in ' + this.sceneId);
    const base = cv ? { x: cv.x + (cv.back == null ? 12 : cv.back), y: cv.y + (o.dy || 0), z: cv.z0 || 0 } : { x: o.at ? o.at[0] : 200, y: o.at ? o.at[1] : 0, z: o.at ? o.at[2] : 0 };
    const hpm = tune.enemy.hpMul, e = { id: this.nextId++, type, x: base.x, y: base.y, z: base.z, bx: base.x, by: base.y, bz: base.z, cover: cv, st: 'hide', t: this.rr(.2, .7, 'ai'), p: 0, foot: base.z - 28, hp: (o.hp || d.hp) * hpm, maxHp: (o.hp || d.hp) * hpm, flash: 0, hurtT: 0, stagger: 0, dead: false, dying: 0, dt: 0,
      civ: !!d.civ, ai: d.ai, peek: 'up', peekDir: 1, exposedAt: null, cycles: 0, drop: o.drop || d.dropDefault, anim: 'idle', aimT: 0, burstLeft: 0, entryKind: o.entry || 'stand', skin: SKIN[this.rr(0, 4, 'skin') | 0], armor: o.armor, ally: o.ally, rail: o.rail, shield: type === 'shield', flagOnDie: o.flag, lookAt: 0, exposures: 0, size: (d.look && d.look.size) || 1 };
    if (cv && cv.peek) { const pk = d.peeks ? d.peeks.filter(k => cv.peek.includes(k) || k === 'none' || k === 'side' && (cv.peek.includes('left') || cv.peek.includes('right'))) : ['up']; e.peek = o.peek || (pk.length ? this.pick(pk, 'ai') : 'up'); }
    if (e.peek === 'left' || e.peek === 'right' || e.peek === 'side') { e.peekDir = e.peek === 'left' ? -1 : e.peek === 'right' ? 1 : (this.rng('ai') < .5 ? -1 : 1); e.peek = 'side'; }
    if (e.peek === 'none') { e.peek = 'none'; }
    if (type === 'jetski') { e.skiHp = d.skiHp; e.water = true; }
    if (type === 'drone') { e.size = 1; e.ox = base.x; e.oy = base.y; e.oz = o.z || 40; e.ph = this.rng('ai') * TAU; e.foot = e.oz; }
    if (o.route) { e.route = o.route; e.routeT = 0; e.routeDur = o.dur || Math.hypot(o.route[1][0] - o.route[0][0], o.route[1][1] - o.route[0][1]) / (o.speed || 70); e.st = 'route'; e.flee = o.flee; e.x = o.route[0][0]; e.y = o.route[0][1]; e.foot = o.route[0][2] || 0; e.z = e.foot; }
    if (d.ai === 'rush') { e.st = 'rushin'; e.x = o.from ? o.from[0] : 360; e.y = o.from ? o.from[1] : this.rr(-60, 60, 'ai'); e.foot = 0; e.z = 0; e.tgtP = this.alive().length ? this.alive()[(this.rng('ai') * this.alive().length) | 0].id : 0; e.zig = this.rng('ai') * TAU; e.t = 0; }
    if (d.ai === 'shield') { e.st = 'adv'; e.x = o.from ? o.from[0] : base.x; e.y = o.from ? o.from[1] : base.y; e.foot = base.z; e.advX = o.advance || [base.x - 80]; e.advI = 0; e.t = 1; e.shieldDown = 0; }
    if (d.ai === 'static') { e.st = 'static'; e.p = 1; e.foot = base.z; }
    if (d.ai === 'ski') { e.route = o.route; e.routeT = 0; e.routeDur = o.dur || 5; e.st = 'ski'; e.foot = (o.route[0][2] || 0); }
    if (o.entry && o.entry !== 'stand' && (d.ai === 'peek')) this.startEntry(e, o);
    if (d.ai === 'peek' && e.peek === 'none') { e.p = 1; e.foot = base.z; e.st = 'rise'; }
    if (o.t != null) e.t = o.t;
    this.enemies.push(e); this.emit('spawn', { id: e.id, type, pos: [e.x, e.y, e.z] }); return e;
  },
  startEntry(e, o) {
    const k = o.entry; e.ent = { k, t: 0, dur: 1, from: o.from || [e.bx + 100, e.by + (o.fy || 0), e.bz], to: [e.bx, e.by, e.bz], arc: 0 };
    if (k === 'run') { const dd = Math.hypot(e.ent.from[0] - e.bx, e.ent.from[1] - e.by); e.ent.dur = Math.max(.6, dd / 95); e.anim = 'run'; }
    else if (k === 'jump') { e.ent.from = o.from || [e.bx, e.by, e.bz + 48]; e.ent.dur = .55; e.anim = 'air'; }
    else if (k === 'door') { e.ent.from = o.from || [e.bx + 14, e.by, e.bz]; e.ent.dur = 1.0; e.anim = 'run'; }
    else if (k === 'vault') { e.ent.from = o.from || [e.bx + 36, e.by, e.bz]; e.ent.dur = .65; e.ent.arc = 16; e.anim = 'air'; }
    else if (k === 'roll') { e.ent.from = o.from || [e.bx + 60, e.by + 10, e.bz]; e.ent.dur = .7; e.anim = 'roll'; }
    else if (k === 'rappel') { e.ent.from = o.from || [e.bx, e.by, e.bz + 90]; e.ent.dur = 1.6; e.anim = 'climb'; }
    else if (k === 'vehicle') { e.ent.from = o.from || [e.bx + 40, e.by, e.bz + 10]; e.ent.dur = .6; e.anim = 'air'; }
    e.st = 'entry'; e.p = 1; e.foot = e.ent.from[2]; e.x = e.ent.from[0]; e.y = e.ent.from[1];
  },
  maxThreatsFor(pid) { const s = this.stage, base = s === 1 ? 1 : 2, v = Math.max(1, base + this.diff.maxT + (tune.enemy.maxThreats ? tune.enemy.maxThreats - base : 0)); return v; },
  // the ThreatDirector's decision for a burst
  decideThreat(e, d) {
    if (this.players.every(p => p.down)) return false;
    const act = this.threats.length; if (act >= this.maxThreatsFor() + (d.always ? 1 : 0)) return false;
    if (d.always) return true;
    const ch = (d.chance[this.stage - 1] || d.chance[0]) * tune.enemy.threatMul * this.diff.threat;
    return this.rng('threat') < ch;
  },
  stepEnemies(dt) {
    for (const e of this.enemies) { if (e.gone) continue; this.stepEnemy(e, dt); }
    for (let i = this.enemies.length - 1; i >= 0; i--) if (this.enemies[i].gone && this.enemies[i].dt > 3) this.enemies.splice(i, 1);
  },
  // where an enemy's head will be when fully exposed (the bot pre-aims here)
  exposedPos(e) { const cv = e.cover, w2 = cv ? (cv.w || 30) / 2 : 0; if (e.peek === 'side') return [e.bx, e.by + e.peekDir * (w2 + 7), e.bz + 24 * (e.size || 1)]; return [e.bx, e.by, e.bz + 24 * (e.size || 1)]; },
  eyePos(e) { return [e.x, e.y, e.foot + 20 * (e.size || 1)]; },
  muzzle(e) { return [e.x - 5, e.y + (e.peek === 'side' ? 0 : 0), e.foot + 15 * (e.size || 1)]; },
  stepEnemy(e, dt) {
    const d = reg('enemy', e.type);
    if (e.dead) { e.dt += dt; e.flash = Math.max(0, e.flash - dt); if (e.dt > (e.civ ? 2 : 2.2)) { e.gone = true; } if (e.deathStyle === 'flyback' && e.dt < .5) { e.x += 60 * dt; } if (e.deathStyle === 'fall' && e.cover && e.bz > 4) { e.vzf = (e.vzf || 0) - GRAV * dt; e.foot = Math.max(0, e.foot + e.vzf * dt); e.falling = e.foot > 0; } return; }
    e.flash = Math.max(0, e.flash - dt); const hurtPause = e.hurtT > 0; e.hurtT = Math.max(0, e.hurtT - dt); e.stagger = Math.max(0, e.stagger - dt);
    if (d.ai === 'peek') this.stepPeek(e, d, dt, hurtPause);
    else if (d.ai === 'route') this.stepRoute(e, d, dt);
    else if (d.ai === 'rush') this.stepRush(e, d, dt);
    else if (d.ai === 'shield') this.stepShield(e, d, dt, hurtPause);
    else if (d.ai === 'fly') this.stepDrone(e, d, dt);
    else if (d.ai === 'ski') this.stepSki(e, d, dt);
    else if (d.ai === 'static') { e.p = 1; }
    if (e.hp <= 0 && !e.dead) this.killEnemy(e, this.players[e.lastHit || 0], 0, null, 'torso');
  },
  stepPeek(e, d, dt, hurtPause) {
    if (e.st === 'entry') {
      const n = e.ent; n.t += dt; const u = clamp(n.t / n.dur, 0, 1);
      e.x = lerp(n.from[0], n.to[0], u); e.y = lerp(n.from[1], n.to[1], u);
      e.foot = n.k === 'jump' ? lerp(n.from[2], n.to[2], u * u) : n.k === 'rappel' ? lerp(n.from[2], n.to[2], u) : lerp(n.from[2], n.to[2], u) + Math.sin(u * Math.PI) * n.arc;
      if (u >= 1) { e.st = 'hide'; e.t = .15; e.p = 0; e.anim = 'land'; e.landT = .25; e.x = e.bx; e.y = e.by; e.foot = e.bz; this.emit('landed', { id: e.id }); e.p = 1; e.hideFast = 1; }
      return;
    }
    const sp = d.peeks && d.peeks[0] === 'none';
    if (e.st === 'hide') {
      e.p = Math.max(0, e.p - dt * 7); if (!hurtPause) e.t -= dt * (e.landT > 0 ? 1 : 1) / Math.max(.3, tune.enemy.reactMul);
      if (e.t <= 0) { e.st = 'rise'; e.exposures++; }
    } else if (e.st === 'rise') {
      e.p = Math.min(1, e.p + dt * 5.5);
      if (e.p >= 1) { e.st = 'aim'; e.exposedAt = this.t; e.expLeft = this.rr(d.exposed[0], d.exposed[1], 'ai') / Math.max(.3, tune.enemy.fireMul * 1 / 1); this.beginAim(e, d); }
    } else if (e.st === 'aim') {
      if (!hurtPause) { e.aimT -= dt; e.expLeft -= dt; }
      if (e.aimT <= 0) { e.st = 'fire'; e.fireT = 0; e.shot = 0; }
    } else if (e.st === 'fire') {
      e.fireT -= dt; e.expLeft -= dt;
      if (e.fireT <= 0) {
        if (e.shot < e.burstN) { this.enemyShot(e, d, e.shot); e.shot++; e.fireT = Math.max(d.gap || .1, e.shotsThreat && e.shotsThreat[e.shot - 1] ? tune.enemy.minGap : 0) / 1; }
        else { e.st = 'wait'; }
      }
    } else if (e.st === 'wait') {
      e.expLeft -= dt;
      if (e.expLeft <= 0 || d.throws && e.throwDone) { if (!sp) { e.st = 'hide'; e.t = this.rr(.5, 1.3, 'ai') / Math.max(.3, tune.enemy.fireMul); e.cycles++; e.exposedAt = null; e.throwDone = false; } else { e.st = 'rise'; e.p = 1; e.exposedAt = this.t; } }
    }
    e.landT = Math.max(0, (e.landT || 0) - dt);
    // placement from peek amount
    const cv = e.cover, w2 = cv ? (cv.w || 30) / 2 : 0;
    if (e.peek === 'side') { e.foot = e.bz; e.y = e.by + e.peekDir * (e.p * (w2 + 7) * 1); e.x = e.bx; if (cv) e.y = e.by + e.peekDir * (-w2 * .3 + e.p * (w2 * .3 + 7 + w2 * .7)); }
    else if (e.peek === 'none') { e.foot = e.bz; }
    else { e.foot = e.bz - (1 - e.p) * 30; e.x = e.bx; e.y = e.by; }
    if (e.stagger > 0 && e.p >= 1) e.x += 30 * dt;
    e.anim = e.p < .98 ? (e.st === 'hide' || e.st === 'rise' ? 'crouch' : 'stand') : (e.st === 'aim' || e.st === 'fire' ? 'point' : 'stand');
  },
  beginAim(e, d) {
    const th = this.decideThreat(e, d), burst = d.burst || 1; e.burstN = burst; e.shotsThreat = [];
    if (d.throws) { e.burstN = 1; e.aimT = d.tel * tune.enemy.telegraphMul; e.throwKind = d.throws; e.tgtPlayer = this.pickTarget(); const tr = this.tgtPose(e.tgtPlayer);
      e.shotsThreat = [true]; e.aimThreat = null; this.emit('aimglint', { id: e.id, kind: d.throws }); return; }
    if (th) {
      e.aimT = d.tel * tune.enemy.telegraphMul * (d.always && d.tel < .7 ? 1 : 1); const alive = this.alive(); const tgt = alive[(this.rng('tgt') * alive.length) | 0];
      for (let i = 0; i < burst; i++) e.shotsThreat.push(d.always ? true : i === 0);
      e.aimThreat = this.newThreat(e, d.laser ? 'sniper' : 'bullet', e.aimT, { target: tgt && tgt.id, sp: this.muzzle(e) });
      if (e.aimThreat) e.aimThreat.firstShot = true;
    } else { e.aimT = this.rr(.35, .6, 'ai') * tune.enemy.telegraphMul; for (let i = 0; i < burst; i++) e.shotsThreat.push(false); e.aimThreat = null; }
    if (d.laser) e.laserT = e.aimT;
  },
  pickTarget() { const a = this.alive(); return a.length ? a[(this.rng('tgt') * a.length) | 0].id : 0; },
  tgtPose(pid) { return this.pose(pid); },
  enemyShot(e, d, i) {
    if (d.throws) { this.launchThrown(e, d); e.throwDone = true; return; }
    const m = this.muzzle(e); this.emit('eshot', { id: e.id, from: m, kind: d.laser ? 'sniper' : 'bullet' });
    const isThreat = e.shotsThreat[i];
    if (isThreat) {
      if (i === 0 && e.aimThreat && this.threats.includes(e.aimThreat)) { /* the telegraphed impact lands at aim end */ }
      else if (i > 0 && d.always) this.newThreat(e, 'bullet', .01, { sp: m });
    } else { const p = this.players[this.pickTarget()]; const pose = this.pose(p.id); this.emit('emiss', { id: e.id, from: m, to: [pose.x + 6 + this.rr(-30, 30, 'miss'), pose.y + this.rr(-30, 30, 'miss'), pose.z + this.rr(-12, 12, 'miss')], p: p.id }); }
  },
  launchThrown(e, d) {
    const p = this.players[e.tgtPlayer != null ? e.tgtPlayer : this.pickTarget()], pose = this.pose(p.id), m = this.muzzle(e);
    if (d.throws === 'grenade') {
      const to = [pose.x + 40 + this.rr(0, 20, 'ai'), pose.y + this.rr(-10, 10, 'ai'), 0], T = this.rr(1.1, 1.4, 'ai');
      const vx = (to[0] - m[0]) / T, vy = (to[1] - m[1]) / T, vz = (to[2] - m[2] + .5 * GRAV * T * T) / T;
      const pr = { id: this.nextId++, kind: 'grenade', team: 'e', x: m[0], y: m[1], z: m[2], vx, vy, vz, g: GRAV, hp: 1, r: 6, src: e.id, tgt: p.id };
      pr.th = this.newThreat(e, 'grenade', T, { target: p.id, proj: pr.id, sp: m }); this.proj.push(pr); this.emit('throw', { id: e.id, kind: 'grenade' });
    } else {
      const to = [pose.x + 4, pose.y, pose.z - 4], dd = Math.hypot(to[0] - m[0], to[1] - m[1], to[2] - m[2]), sp = 220, T = dd / sp;
      const pr = { id: this.nextId++, kind: 'rocket', team: 'e', x: m[0], y: m[1], z: m[2], vx: (to[0] - m[0]) / T, vy: (to[1] - m[1]) / T, vz: (to[2] - m[2]) / T, g: 0, hp: 1, r: 5, src: e.id, tgt: p.id };
      pr.th = this.newThreat(e, 'rocket', T, { target: p.id, proj: pr.id, sp: m }); this.proj.push(pr); this.emit('throw', { id: e.id, kind: 'rocket' });
    }
  },
  stepRoute(e, d, dt) {
    e.routeT += dt; const u = clamp(e.routeT / e.routeDur, 0, 1), r = e.route;
    e.x = lerp(r[0][0], r[1][0], u); e.y = lerp(r[0][1], r[1][1], u); e.foot = e.z = r[0][2] || 0; e.p = 1; e.anim = d.civ && e.panic ? 'panic' : 'run';
    e.facing = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]);
    if (u >= 1) { e.gone = true; e.dt = 4; e.escaped = true; this.emit('escaped', { id: e.id, type: e.type }); }
  },
  stepRush(e, d, dt) {
    const p = this.players[e.tgtP] && !this.players[e.tgtP].down ? this.players[e.tgtP] : this.alive()[0]; if (!p) return; const pose = this.pose(p.id);
    e.p = 1; e.foot = 0; e.t += dt; e.z = 0;
    if (e.st === 'rushin') {
      const spd = 78, dx = pose.x + 46 + this.rail * 0 - e.x, dy = pose.y - e.y + Math.sin(e.t * 5 + e.zig) * 18;
      e.x += Math.sign(dx) * Math.min(Math.abs(dx), spd * dt); e.y += clamp(dy, -50, 50) * dt * 1.2; e.anim = 'run';
      if (Math.abs(e.x - (pose.x + 46)) < 6) { e.st = 'wind'; e.t = 0; this.emit('windup', { id: e.id }); e.slashT = this.newThreat(e, 'slash', .45 * tune.enemy.telegraphMul, { target: p.id, sp: [e.x - 6, e.y, e.foot + 16] }); if (!e.slashT) { e.st = 'back'; } }
    } else if (e.st === 'wind') { e.anim = 'windup'; e.t += 0; if (!this.threats.includes(e.slashT)) { e.st = 'slash'; e.t = 0; this.emit('slash', { id: e.id }); } }
    else if (e.st === 'slash') { e.anim = 'slash'; if (e.t > .35) { e.st = 'back'; e.t = 0; } }
    else if (e.st === 'back') { e.anim = 'run'; e.x += 90 * dt; if (e.t > 1.2) { e.st = 'rushin'; e.t = 0; } }
  },
  stepShield(e, d, dt, hurtPause) {
    const pose = this.pose(this.pickTargetStable(e)); e.p = 1; e.foot = e.bz;
    e.shieldDown = Math.max(0, (e.shieldDown || 0) - dt);
    if (e.st === 'adv') { const tx = e.advX[Math.min(e.advI, e.advX.length - 1)]; const dx = tx - e.x; e.anim = 'walk'; e.x += Math.sign(dx) * Math.min(Math.abs(dx), 26 * dt); if (Math.abs(dx) < 1) { e.advI++; e.st = 'sfire'; e.t = .5; e.anim = 'stand'; } else if (e.advI >= e.advX.length) { e.st = 'sfire'; e.t = .5; } }
    else if (e.st === 'sfire') {
      e.t -= dt; if (!e.fireStarted && e.t <= 0) { e.fireStarted = true; this.beginAim(e, d); e.aimT = Math.max(e.aimT, .5); e.st = 'saim'; }
    } else if (e.st === 'saim') { e.openT = 1; e.aimT -= dt; e.anim = 'point'; if (e.aimT <= 0) { e.st = 'sshoot'; e.shot = 0; e.fireT = 0; } }
    else if (e.st === 'sshoot') { e.fireT -= dt; if (e.fireT <= 0) { if (e.shot < e.burstN) { this.enemyShot(e, d, e.shot); e.shot++; e.fireT = d.gap; } else { e.st = 'adv'; e.fireStarted = false; e.advI = Math.min(e.advI, e.advX.length - 1); if (e.advI >= e.advX.length - 1 && Math.abs(e.x - e.advX[e.advX.length - 1]) < 1) { e.st = 'sfire'; e.t = 1.4; } e.openT = 0; } } }
    e.shieldUp = !(e.st === 'saim' || e.st === 'sshoot') && e.shieldDown <= 0;
    if (e.st === 'adv' && e.advI >= e.advX.length) { e.st = 'sfire'; e.t = .4; }
  },
  pickTargetStable(e) { return e.tgtP != null ? e.tgtP : (e.tgtP = this.pickTarget()); },
  stepDrone(e, d, dt) {
    e.ph += dt * .85; const ox = e.ox, oy = e.oy, lift = this.scene.lift ? this.rail : 0;
    e.x = ox + Math.sin(e.ph * .9) * 40; e.y = oy + Math.sin(e.ph * 1.3 + 1) * 60; e.foot = e.oz + lift + Math.sin(e.ph * 1.7) * 12; e.z = e.foot; e.p = 1; e.t -= dt;
    if (e.st !== 'zap' && e.t <= -1.8 && !e.zapping) { e.zapping = true; e.zapAt = null; const th = this.decideThreat(e, d); if (th) { const a = this.alive(); e.zapT = this.newThreat(e, 'zap', d.tel * tune.enemy.telegraphMul, { target: a[(this.rng('tgt') * a.length) | 0].id, sp: [e.x, e.y, e.foot] }); } e.zapDone = this.t + d.tel; }
    if (e.zapping && this.t > e.zapDone) { e.zapping = false; e.t = this.rr(-.4, 0, 'ai'); this.emit('eshot', { id: e.id, from: [e.x, e.y, e.foot], kind: 'zap' }); }
  },
  stepSki(e, d, dt) {
    e.routeT += dt; const u = clamp(e.routeT / e.routeDur, 0, 1), r = e.route;
    e.x = lerp(r[0][0], r[1][0], u); e.y = lerp(r[0][1], r[1][1], u); e.foot = (r[0][2] || 0) + Math.sin(e.routeT * 9) * 1.2; e.z = e.foot; e.p = 1; e.facing = Math.atan2(r[1][1] - r[0][1], r[1][0] - r[0][0]);
    e.t -= dt;
    if (u > .25 && u < .85 && !e.shotDone && !e.zapping) { e.zapping = true; const th = this.decideThreat(e, d); if (th) { const a = this.alive(); e.zapT = this.newThreat(e, 'bullet', d.tel * tune.enemy.telegraphMul, { target: a[(this.rng('tgt') * a.length) | 0].id, sp: [e.x, e.y, e.foot + 14] }); } e.zapDone = this.t + d.tel; }
    if (e.zapping && this.t > e.zapDone) { e.zapping = false; e.shotDone = true; this.emit('eshot', { id: e.id, from: [e.x, e.y, e.foot + 14], kind: 'bullet' }); }
    if (u >= 1) { e.gone = true; e.dt = 4; e.escaped = true; }
  },
  // ---------- hit volumes ----------
  volumes(e) {
    const s = e.size || 1, f = e.foot, d = reg('enemy', e.type), x = e.x, y = e.y, out = [];
    if (e.type === 'drone') { out.push({ k: 's', c: [x, y, f], r: 7, part: 'torso' }); return out; }
    if (e.type === 'jetski') { out.push({ k: 's', c: [x, y, f + 24 * .9], r: 4.2, part: 'head' }); out.push({ k: 'c', a: [x, y, f + 11], b: [x, y, f + 19], r: 5.2, part: 'torso' }); out.push({ k: 'box', box: { x0: x - 14, x1: x + 14, y0: y - 16, y1: y + 16, z0: f - 2, z1: f + 7 }, part: 'legs', ski: 1 }); return out; }
    if (e.p < .12 && e.peek !== 'none' && e.peek !== 'side') return out;
    if (e.peek === 'side' && e.p < .12) return out;
    const crouch = e.anim === 'crouch' ? .78 : 1;
    if (!d.headOnly || true) { out.push({ k: 's', c: [x, y, f + 24.2 * s * crouch], r: 4.3 * s, part: 'head' }); }
    if (!d.headOnly) { out.push({ k: 'c', a: [x, y, f + 12 * s * crouch], b: [x, y, f + 20 * s * crouch], r: 5.6 * s, part: 'torso' }); out.push({ k: 'c', a: [x, y, f + 1.5], b: [x, y, f + 9 * s * crouch], r: 4 * s, part: 'legs' }); }
    if (e.shield && e.shieldUp) out.unshift({ k: 'box', box: { x0: x - 9, x1: x - 5, y0: y - 9, y1: y + 9, z0: f + 2, z1: f + 24 }, part: 'shield' });
    return out;
  }
});
// dispatch hits on 'ski'
const _hitEnemy = Sim.prototype.hitEnemy;
Sim.prototype.hitEnemy = function (p, e, part, dmg, wi, pos, dir) {
  if (e.type === 'jetski') { const vol = this.volumes(e).find(v => v.ski); if (part === 'legs') { e.skiHp -= dmg; this.emit('hit', { p: p.id, id: e.id, part: 'ski', pos }); p.st.hits++; p.chain++; this.addScore(p, 100); if (e.skiHp <= 0) { this.emit('explode', { pos: [e.x, e.y, e.foot], r: 30, big: false }); this.addScore(p, 1000); this.killEnemy(e, p, 3, dir, 'torso'); } return true; } }
  return _hitEnemy.call(this, p, e, part, dmg, wi, pos, dir);
};

// ---- 22-objects.js ----
// 22-objects.js — projectiles (grenades, rockets, torpedoes, flares, the player's GL rounds), breakables,
// explosive barrels, pickups (life rings, intel bottles), gate locks and civilians. Owns: sim.proj, sim.objs.
const OBJ = {
  crate: { rx: 8, ry: 8, h: 14, hp: 3, solid: 1, mat: 'crate', pts: 50 }, barrel: { rx: 5, ry: 5, h: 14, hp: 2, solid: 1, mat: 'barrel', pts: 50, boom: 56, dmg: 8 },
  tank: { rx: 9, ry: 9, h: 22, hp: 3, solid: 1, mat: 'rust', pts: 50, boom: 64, dmg: 8 }, lantern: { rx: 3, ry: 3, h: 7, hp: 1, mat: 'lantern', pts: 50 }, bottle: { rx: 2.5, ry: 2.5, h: 9, hp: 1, mat: 'neon_g', pts: 50 },
  window: { rx: 1, ry: 9, h: 14, hp: 1, mat: 'glass', pts: 50 }, sign: { rx: 2, ry: 12, h: 8, hp: 2, mat: 'white', pts: 50 }, lifering: { rx: 5, ry: 5, h: 10, hp: 1, mat: 'white', pts: 2000, ring: 1 },
  intel: { rx: 3, ry: 3, h: 10, hp: 1, mat: 'neon_g', pts: 2000, intel: 1 }, lock: { rx: 7, ry: 7, h: 14, hp: 6, mat: 'neon_y', pts: 2000, lock: 1 }, lever: { rx: 4, ry: 4, h: 14, hp: 1, mat: 'hazard', pts: 0 },
  section: { rx: 12, ry: 16, h: 20, hp: 3, solid: 1, mat: 'wood_d', pts: 50 }
};
Object.assign(Sim.prototype, {
  addObj(spec) {
    const kind = spec[0], t = OBJ[kind]; if (!t) throw new Error('no object ' + kind); const o = spec[4] || {};
    const ob = Object.assign({ id: this.nextId++, kind, x: spec[1], y: spec[2], z: spec[3] || 0, hpMax: t.hp, dead: false, flash: 0 }, t, o); ob.hp = o.hp || t.hp; this.objs.push(ob); return ob;
  },
  addCiv(c) { (this.civQ = this.civQ && this.sceneId === this.civScene ? this.civQ : []).push({ at: c.at || 0, spec: c, done: false }); this.civScene = this.sceneId; },
  hitObj(p, ob, dmg, pos, fromBlast) {
    if (ob.dead) return false;
    ob.hp -= dmg; ob.flash = .1; this.emit('objhit', { id: ob.id, pos, kind: ob.kind });
    if (ob.hp > 0) return true;
    ob.dead = true; this.addScore(p, ob.pts || 0, true); p.chain++; p.st.hits++;
    this.emit('break', { id: ob.id, idx: this.objs.indexOf(ob), kind: ob.kind, pos: [ob.x, ob.y, ob.z + ob.h / 2], mat: ob.mat });
    if (ob.ring) { p.lives++; this.emit('oneup', { p: p.id }); }
    if (ob.intel) { this.emit('intel', { id: ob.intelId || ob.id, p: p.id }); p.st.bonus++; }
    if (ob.lock) { this.flags['lock' + ob.lockN] = 1; this.flags.locks = (this.flags.locks || 0) + 1; this.emit('lockjam', { n: this.flags.locks }); }
    if (ob.lever) { this.flags.lever = 1; }
    if (ob.boom) { this.boomAt = this.boomAt || []; this.boomAt.push({ t: this.t + .15, ob, p }); }
    if (ob.fall) { for (const e of this.enemies) if (!e.dead && e.entryKind !== 'run' && e.bz > 10 && Math.hypot(e.x - ob.x, e.y - ob.y) < (ob.fallR || 60)) this.killEnemy(e, p, 3, null, 'torso'); this.emit('collapse', { pos: [ob.x, ob.y, ob.z] }); }
    if (ob.onBreak) ob.onBreak(this, ob, p);
    return true;
  },
  stepObjs(dt) {
    for (const o of this.objs) o.flash = Math.max(0, o.flash - dt);
    if (this.boomAt && this.boomAt.length) {
      for (let i = this.boomAt.length - 1; i >= 0; i--) { const b = this.boomAt[i]; if (this.t >= b.t) { this.boomAt.splice(i, 1); this.explode(b.ob.x, b.ob.y, b.ob.z + b.ob.h / 2, b.ob.boom, 'p', b.p.id, b.ob.dmg, false); } }
    }
    if (this.civQ) for (const c of this.civQ) { if (!c.done && (this.phase === 'action' || this.phase === 'boss') && this.actionT >= c.at) { c.done = true; const s = c.spec; const e = this.spawnEnemy(s.kind || 'civilian', null, { route: s.route, dur: s.dur, speed: s.speed || 45 }); e.panic = 1; e.civ = true; } }
  },
  spawnProj(o) { const pr = Object.assign({ id: this.nextId++, team: 'e', hp: 1, r: 5, g: 0 }, o); this.proj.push(pr); return pr; },
  stepProjectiles(dt) {
    for (const pr of this.proj) {
      if (pr.dead) continue;
      if (pr.team === 'p') { this.stepPlayerRound(pr, dt); continue; }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.z += pr.vz * dt; pr.vz -= (pr.g || 0) * dt; pr.age = (pr.age || 0) + dt;
      if (pr.th && !this.threats.includes(pr.th)) { pr.dead = true; this.emit('explode', { pos: [pr.x, pr.y, Math.max(2, pr.z)], r: pr.kind === 'rocket' ? 30 : 36, big: false }); this.emit('landed_proj', { kind: pr.kind }); }
      if (pr.kind === 'flare' || pr.kind === 'torpedo' || pr.kind === 'missile' || pr.kind === 'harpoon') { if (pr.th && !this.threats.includes(pr.th)) pr.dead = true; }
    }
    this.proj = this.proj.filter(p => !p.dead || (p.team === 'p' ? false : p.deadT = (p.deadT || 0) + dt < .02 ? true : false));
  },
  stepPlayerRound(pr, dt) {
    pr.life -= dt; const steps = 3, sdt = dt / steps;
    for (let s = 0; s < steps && !pr.dead; s++) {
      pr.x += pr.vx * sdt; pr.y += pr.vy * sdt; pr.z += pr.vz * sdt; pr.vz -= pr.g * sdt;
      let boom = pr.life <= 0 || pr.z <= 0;
      if (!boom) for (const e of this.enemies) { if (e.dead || e.gone) continue; for (const v of this.volumes(e)) { if (v.k === 's' && Math.hypot(pr.x - v.c[0], pr.y - v.c[1], pr.z - v.c[2]) < v.r + 3) boom = true; else if (v.k === 'c' && R3.raySphere([pr.x, pr.y, pr.z], [1, 0, 0], [(v.a[0]), v.a[1], (v.a[2] + v.b[2]) / 2], v.r + 3) < 1) boom = true; else if (v.k === 'box' && pr.x > v.box.x0 - 2 && pr.x < v.box.x1 + 2 && pr.y > v.box.y0 - 2 && pr.y < v.box.y1 + 2 && pr.z > v.box.z0 - 2 && pr.z < v.box.z1 + 2) boom = true; } }
      if (!boom) for (const b of this.colliders(pr.owner)) if (pr.x > b.x0 && pr.x < b.x1 && pr.y > b.y0 && pr.y < b.y1 && pr.z > b.z0 && pr.z < b.z1 && !(b.cover)) boom = true;
      if (!boom && this.boss) for (const v of this.bossVolumes()) { if (v.dead) continue; if (v.k === 's' ? Math.hypot(pr.x - v.c[0], pr.y - v.c[1], pr.z - v.c[2]) < v.r + 3 : (pr.x > v.box.x0 && pr.x < v.box.x1 && pr.y > v.box.y0 && pr.y < v.box.y1 && pr.z > v.box.z0 && pr.z < v.box.z1)) boom = true; }
      if (!boom) for (const q of this.proj) if (q.team !== 'p' && !q.dead && Math.hypot(pr.x - q.x, pr.y - q.y, pr.z - q.z) < (q.r || 5) + 3) { boom = true; this.shootDown(this.players[pr.owner], q, 99); }
      if (!boom) for (const ob of this.objs) if (!ob.dead && !ob.passive && pr.x > ob.x - ob.rx && pr.x < ob.x + ob.rx && pr.y > ob.y - ob.ry && pr.y < ob.y + ob.ry && pr.z > ob.z && pr.z < ob.z + ob.h) boom = true;
      if (boom) { pr.dead = true; this.explode(pr.x, pr.y, Math.max(1, pr.z), tune.weapon.glRadius, 'p', pr.owner, tune.weapon.glDmg, false); this.players[pr.owner].st.hits += 0; }
    }
  }
});

// ---- 23-boss.js ----
// 23-boss.js — boss framework (parts with hp, weak points, bars, scripted phases) and the bosses:
// STINGRAY/BARRACUDA, HAMMERHEAD, SCYLLA/KRAKE, plus mini-bosses BULLDOG, THE GULL, SEAWOLF.
// Every attack goes through the ThreatDirector and projectile system, so cover and telegraphs work as for grunts.
const BOSS_SRC = { id: 'boss' };
Object.assign(Sim.prototype, {
  spawnBoss(id, o = {}) {
    const d = reg('boss', id); const B = this.boss = { id, name: d.name, title: d.title, mini: !!d.mini, parts: {}, bars: [], phase: 1, dead: false, t: 0, flags: {}, anim: {}, pos: [0, 0, 0], intro: !d.mini };
    B.done = d.done; d.init(this, B, o); if (!d.mini) this.phase = 'boss'; this.emit('boss', { id, name: d.name, title: d.title, mini: !!d.mini });
    if (!this.replica) { this.coro(d.script(this, B, o)); this.cors[this.cors.length - 1].boss = B; } return B;
  },
  stepBoss(dt) { const B = this.boss; B.t += dt; for (const k in B.parts) { const p = B.parts[k]; p.flash = Math.max(0, (p.flash || 0) - dt); } if (B.tick) B.tick(this, B, dt); if (!B.dead && B.done && B.done(this, B)) this.bossDefeated(); },
  bossDefeated() {
    const B = this.boss; if (B.dead) return; B.dead = true; this.emit('bossdown', { id: B.id, pos: B.pos }); const best = this.players.find(p => !p.down) || this.players[0];
    for (const p of this.players) if (!p.down) this.addScore(p, B.mini ? 10000 : 30000, true);
    this.threats.length = 0; for (const q of this.proj) if (q.team === 'e') q.dead = true; this.slow = 1; const d = reg('boss', B.id); if (d.onDefeat) d.onDefeat(this, B);
  },
  bossVolumes() {
    const B = this.boss, out = []; if (!B || B.dead) return out;
    for (const k in B.parts) { const p = B.parts[k]; if (p.dead || !p.vol || p.hidden) continue; const vs = p.vol(this, B, p); for (const v of vs) { v.key = k; out.push(v); } }
    return out;
  },
  hitBoss(pl, vol, dmg, wi, pos) {
    const B = this.boss, p = B.parts[vol.key]; if (!p || p.dead) return false;
    if (vol.shield) { this.emit('impact', { pos, mat: 'steel', p: pl.id, spark: 1 }); if (wi === 2 || wi === 3) { B.shieldDown = 1.5; this.emit('shieldaside', { id: 'boss' }); } return false; }
    if (!p.vulnerable && p.vulnerable !== undefined) { this.emit('impact', { pos, mat: 'steel', p: pl.id, spark: 1 }); return false; }
    if (p.needs && !p.needs.includes(wi)) { this.emit('impact', { pos, mat: 'steel', p: pl.id, spark: 1 }); return false; }
    const mult = (vol.mult || 1) * (p.armor ? (wi === 3 ? 1 : p.armor) : 1), d = dmg * mult * (1 / Math.max(.1, tune.enemy.bossHp)) * (p.dmgMul || 1);
    p.hp -= d; p.flash = .08; pl.st.hits++; pl.chain++; pl.best = Math.max(pl.best, pl.chain); this.addScore(pl, 100); this.emit('hit', { p: pl.id, id: 'boss', part: vol.mult > 1 ? 'head' : 'torso', pos, head: vol.mult > 1 });
    p.lastHit = pl.id; B.lastHit = pl.id; if (p.onHit) p.onHit(this, B, p, pl, wi, d);
    if (p.hp <= 0 && !p.dead) { p.dead = true; p.hp = 0; this.addScore(pl, p.pts || 3000, true); this.emit('partbreak', { id: B.id, key: vol.key, pos: p.pos || pos }); this.explode((p.pos || pos)[0], (p.pos || pos)[1], (p.pos || pos)[2], 40, 'e', pl.id, 0, false); if (p.onBreak) p.onBreak(this, B, p, pl); }
    return true;
  },
  bossExplode(pl, x, y, z, rad, dmg) {
    const B = this.boss; if (!B || B.dead) return;
    for (const v of this.bossVolumes()) { const c = v.k === 's' ? v.c : [(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2]; const d = Math.hypot(c[0] - x, c[1] - y, c[2] - z); if (d < rad + (v.r || 12)) this.hitBoss(pl, v, dmg * (1 - Math.min(.7, d / (rad + 20))), 3, [x, y, z]); }
  },
  bThreat(kind, tel, o = {}) { return this.newThreat(BOSS_SRC, kind, tel * tune.enemy.telegraphMul, o); },
  bTarget() { return this.pickTarget(); },
  bossHpFrac(B, keys) { let h = 0, m = 0; for (const k of keys) { const p = B.parts[k]; if (!p) continue; h += Math.max(0, p.hp); m += p.max; } return m ? h / m : 0; },
  mkPart(B, key, o) { const p = Object.assign({ hp: 1, max: o.hp || 1, vulnerable: true, pts: 3000 }, o); p.max = o.hp; B.parts[key] = p; return p; }
});
function* waitBoss(B, secs, keep) { let t = 0; while (t < secs && !B.cockpitOut && (keep || (!B.toppleNow && !B.toppleNow2))) { yield .1; t += .1; } }
const sphereVol = (c, r, mult) => ({ k: 's', c, r, mult });
const rigVols = (x, y, f, s) => [sphereVol([x, y, f + 24.2 * s], 4.5 * s, 2), { k: 's', c: [x, y, f + 16 * s], r: 7 * s }, { k: 's', c: [x, y, f + 7 * s], r: 6 * s }];
const boxVol = (x, y, z, w, d, h, mult) => ({ k: 'box', box: { x0: x - w / 2, x1: x + w / 2, y0: y - d / 2, y1: y + d / 2, z0: z, z1: z + h }, mult });

// ---------- STINGRAY -> BARRACUDA ----------
def('boss', 'stingray', {
  name: 'BARRACUDA', title: 'Captain of the Black Current',
  init(S, B) {
    B.hull = [270, 0, 0];
    S.mkPart(B, 'turretL', { hp: 12, pos: [286, -80, 24], vol: (s, b, p) => [sphereVol(p.pos, 11)], pts: 5000, lbl: 'turret' });
    S.mkPart(B, 'turretR', { hp: 12, pos: [286, 80, 24], vol: (s, b, p) => [sphereVol(p.pos, 11)], pts: 5000, lbl: 'turret' });
    S.mkPart(B, 'barracuda', { hp: 30, hidden: true, vulnerable: false, pos: [292, 0, 62], pts: 15000, vol: (s, b, p) => rigVols(p.pos[0], p.pos[1], p.pos[2] - 24, 1.05) });
    B.bars = [{ label: 'STINGRAY', parts: ['turretL', 'turretR'] }, { label: 'BARRACUDA', parts: ['barracuda'], late: true }];
    for (const [x, y] of [[262, -52], [262, 56], [258, 4]]) S.addObj(['barrel', x, y, 0, { z: 10, onBreak: (s2, ob) => { for (const k of ['turretL', 'turretR']) { const p = B.parts[k]; if (!p.dead && Math.hypot(p.pos[0] - ob.x, p.pos[1] - ob.y) < 46) { p.hp -= 6; p.flash = .2; if (p.hp <= 0) { p.dead = true; s2.emit('partbreak', { id: B.id, key: k, pos: p.pos }); } } } } }]);
  },
  *script(S, B) {
    yield 2.8; B.intro = false; S.say('barracuda', 'CREST! The Admiral said you\'d come. He didn\'t say you\'d be this slow!'); yield 1.5; S.say('barracuda', 'Say hello to the Stingray!');
    let n = 0;
    while (!(B.parts.turretL.dead && B.parts.turretR.dead)) {
      const live = ['turretL', 'turretR'].filter(k => !B.parts[k].dead), k = S.pick(live, 'boss');
      S.emit('turretspin', { key: k }); const th = S.bThreat('turret', .85, { target: S.bTarget(), sp: B.parts[k].pos, always: true }); yield .85;
      for (let i = 0; i < 3; i++) { S.emit('eshot', { id: 'boss', from: B.parts[k].pos, kind: 'turret' }); yield .1; }
      if (++n % 2 === 0) { const alive = S.enemies.filter(e => !e.dead).length; if (alive < 2) { S.spawnEnemy('deckhand', 'd' + (1 + (n % 4)), { entry: 'jump' }); S.spawnEnemy('deckhand', 'd' + (1 + ((n + 2) % 4)), { entry: 'jump' }); } }
      yield S.rr(1.0, 1.8, 'boss');
    }
    B.phase = 2; S.emit('bossphase', { phase: 2 }); const bar = B.parts.barracuda; bar.hidden = false; S.say('barracuda', 'Enough! I\'ll finish this myself!'); yield 1.2;
    let cyc = 0;
    while (bar.hp > bar.max * .25) {
      bar.vulnerable = true; bar.pos = [292, 0, 62]; B.anim.open = 1; yield .7;
      if (cyc++ % 2 === 0) { const t = S.bTarget(), pose = S.pose(t), m = [bar.pos[0], bar.pos[1], bar.pos[2] - 6], dd = Math.hypot(pose.x - m[0], pose.y - m[1], pose.z - m[2]), T = dd / 300;
        const pr = S.spawnProj({ kind: 'harpoon', x: m[0], y: m[1], z: m[2], vx: (pose.x - m[0]) / T, vy: (pose.y - m[1]) / T, vz: (pose.z - 6 - m[2]) / T, hp: 2, r: 6, src: 'boss', tgt: t }); pr.th = S.bThreat('harpoon', T, { target: t, proj: pr.id, sp: m }); S.emit('throw', { id: 'boss', kind: 'harpoon' }); }
      else { const t = S.bTarget(), pose = S.pose(t); S.say('mari', 'Torpedo in the water! Shoot it!'); const x0 = 300, y0 = pose.y + (S.rng('boss') < .5 ? -70 : 70), T = Math.hypot(pose.x + 30 - x0, pose.y - y0) / 120;
        const pr = S.spawnProj({ kind: 'torpedo', x: x0, y: y0, z: -6, vx: (pose.x + 30 - x0) / T, vy: (pose.y - y0) / T, vz: 0, hp: 2, r: 9, src: 'boss', tgt: t }); pr.th = S.bThreat('torpedo', T, { target: t, proj: pr.id, ignoreCover: true, sp: [x0, y0, -4] }); S.emit('prompt', { id: 'torpedo' }); }
      yield 1.3; bar.vulnerable = false; B.anim.open = 0; yield 1.6;
    }
    B.phase = 3; S.emit('bossphase', { phase: 3 }); S.say('barracuda', 'This isn\'t over, CREST!'); S.emit('swing', {}); yield 1.0;
    for (let c = 0; c < 3 && !bar.dead; c++) {
      const t = S.bTarget(), pose = S.pose(t); bar.pos = [pose.x + 52, pose.y * .5, 24]; bar.vulnerable = false; B.anim.slash = 0; yield .5;
      S.emit('windup', { id: 'boss' }); S.bThreat('slash', .6, { target: t, sp: [bar.pos[0] - 6, bar.pos[1], 20] }); B.anim.slash = 1; yield .75; B.anim.slash = 0;
      bar.vulnerable = true; B.anim.stagger = 1; yield 1.5; B.anim.stagger = 0; bar.vulnerable = false; yield .5;
    }
    bar.vulnerable = true; while (!bar.dead) yield 0;
  },
  done(S, B) { return B.parts.barracuda.dead; },
  onDefeat(S, B) { S.say('barracuda', 'This isn\'t over, CREST!'); S.emit('bigboom', {}); }
});

// ---------- HAMMERHEAD ----------
def('boss', 'hammerhead', {
  name: 'HAMMERHEAD', title: 'Bruno Kessler, the Enforcer',
  init(S, B) {
    B.pos = [300, 0, 0]; B.shield = true; B.coverHp = 3; B.charge = false;
    S.mkPart(B, 'body', { hp: 45, pos: [300, 0, 0], pts: 30000, vulnerable: true, vol: (s, b, p) => {
      const x = b.pos[0], y = b.pos[1], z = b.pos[2], up = b.shield && !(b.shieldDown > 0), v = [];
      if (up) v.push({ k: 'box', box: { x0: x - 14, x1: x - 7, y0: y - 15, y1: y + 15, z0: z, z1: z + 44 }, shield: 1 });
      v.push({ k: 's', c: [x, y, z + 7], r: 7, mult: up ? .5 : 1 });
      if (!up) { v.push(sphereVol([x, y, z + 24.2 * 1.6], 4.5 * 1.6, 2)); v.push({ k: 's', c: [x, y, z + 16 * 1.6], r: 11 }); }
      return v; }, onHit(s, b, p, pl, wi, d) { if (b.charge) { b.recent = (b.recent || 0) + d; } } });
    B.parts.body.dmgMul = 1; B.bars = [{ label: 'HAMMERHEAD', parts: ['body'] }];
    B.shieldDownT = 0; B.tick = (s, b, dt) => { b.shieldDown = Math.max(0, (b.shieldDown || 0) - dt); if (b.charge) { b.recentT = (b.recentT || 0) + dt; if (b.recentT > 1.5) { b.recentT = 0; b.recent = 0; } } };
  },
  *script(S, B) {
    const bd = B.parts.body; yield 2.8; B.intro = false; S.say('hammerhead', 'KESSLER! CREST! I SMASH THEM!');
    let round = 0;
    while (bd.hp > bd.max * .5) {
      // A. shield advance
      B.anim.mode = 'walk'; while (B.pos[0] > 190 && bd.hp > bd.max * .5) { B.pos[0] -= 22 * .05; yield .05; if (B.shieldDown > 0) { B.anim.mode = 'open'; } }
      B.anim.mode = 'plant'; S.emit('prompt', { id: 'shield' });
      if (S.players.some(pl => pl.ammo[2] + pl.ammo[3] < 4) && !B.supplied) { B.supplied = 1; S.spawnEnemy('quartermaster', null, { route: [[340, -90, 0], [340, 90, 0]], drop: 'sg', speed: 36 }); S.say('juno', 'Orange vest! Shotgun shells—knock that door aside!'); } if (round % 3 === 2) B.supplied = 0;
      // B. rotary sweep
      S.say('hammerhead', 'SPINNING UP!'); S.emit('spinup', { id: 'boss' }); const t = S.bTarget(); S.bThreat('sweep', 1.2, { target: t, sp: [B.pos[0] - 8, B.pos[1], 30], always: true }); yield 1.25;
      B.anim.mode = 'sweep'; for (let i = 0; i < 6; i++) { S.emit('eshot', { id: 'boss', from: [B.pos[0] - 8, B.pos[1] + (i - 3) * 8, 30], kind: 'minigun' }); if (i === 2 || i === 4) S.bThreat('sweep', .02, { target: t, sp: [B.pos[0] - 8, B.pos[1], 30], always: true }); yield .42; }
      B.coverHp--; S.emit('covercrack', { hp: B.coverHp });
      if (B.coverHp <= 0) { B.coverHp = 3; S.emit('coverswap', {}); S.say('kai', 'Cover\'s gone—moving!'); for (const p of S.players) if (S.slotsList[p.id]) { const sl = S.slotsList[p.id]; sl.stand.y = -sl.stand.y * .6; sl.cover.y = sl.stand.y + (sl.cover.y > sl.stand.y ? 8 : -8); } S.shake = 1; }
      B.anim.mode = 'idle'; yield 1.0;
      // C. grenade volley
      if (++round % 2 === 0) { S.say('hammerhead', 'GRENADES!'); B.anim.mode = 'throw'; for (let i = 0; i < 3; i++) { const tp = S.bTarget(), pose = S.pose(tp), m = [B.pos[0] - 6, B.pos[1], 52], T = 1.3, to = [pose.x + 36 + i * 8, pose.y + (i - 1) * 14, 0];
        const pr = S.spawnProj({ kind: 'grenade', x: m[0], y: m[1], z: m[2], vx: (to[0] - m[0]) / T, vy: (to[1] - m[1]) / T, vz: (to[2] - m[2] + .5 * GRAV * T * T) / T, g: GRAV, hp: 1, r: 6, src: 'boss', tgt: tp, owner: 'boss', hurtsBoss: 1 }); pr.th = S.bThreat('grenade', T, { target: tp, proj: pr.id, sp: m }); yield .55; } yield 1.0; }
    }
    // charge phase
    B.shield = false; S.emit('shieldbreak', {}); S.say('hammerhead', 'MY DOOR! YOU BROKE MY DOOR!'); B.anim.mode = 'idle'; yield 1.4;
    while (bd.hp > 0) {
      B.charge = true; B.recent = 0; B.recentT = 0; B.anim.mode = 'charge'; const t = S.bTarget(); const pose = S.pose(t); const x0 = B.pos[0];
      for (let i = 0; i < 40 && bd.hp > 0; i++) { B.pos[0] = lerp(x0, pose.x + 54, i / 40); B.pos[1] = lerp(B.pos[1], pose.y * .6, .1); yield .05; if (B.recent >= 6) break; }
      if (B.recent >= 6) { B.anim.mode = 'stagger'; B.recent = 0; S.emit('stagger', {}); yield 1.6; B.pos[0] = 280; yield .5; continue; }
      S.emit('windup', { id: 'boss' }); S.bThreat('slam', .5, { target: t, sp: [B.pos[0] - 8, B.pos[1], 30], always: true }); B.anim.mode = 'slam'; yield .7; S.shake = 1; B.anim.mode = 'idle'; yield .6; B.pos[0] = 300; B.charge = false; yield .6;
      if (S.rng('boss') < .6) { S.emit('beamdazzle', {}); }
    }
  },
  done(S, B) { return B.parts.body.dead; },
  onDefeat(S, B) { S.say('hammerhead', 'HAMMERHEAD… FALLS… DOWN…'); }
});

// ---------- SCYLLA -> KRAKE ----------
def('boss', 'scylla', {
  name: 'SCYLLA', title: 'Admiral Krake\'s crab walker',
  init(S, B) {
    B.pos = [320, 0, 0]; B.phase = 1; B.topple = 0; B.sub = 'scylla';
    const kn = [[-70, 1], [-45, 1], [-20, 1], [20, 1], [45, 1], [70, 1]];
    for (let i = 0; i < 6; i++) S.mkPart(B, 'knee' + i, { hp: 8, pos: [320 + (i % 2) * 14, (i - 2.5) * 30, 30], pts: 3000, vol: (s, b, p) => [sphereVol([b.pos[0] + (i % 2) * 14, (i - 2.5) * 30 + b.pos[1], 26 + (b.toppled ? -14 : 0)], 8)], onBreak: (s, b) => { const down = [0, 1, 2, 3, 4, 5].filter(j => b.parts['knee' + j].dead).length; if (down >= 3 && !b.toppled && !b.once) { b.once = 1; b.toppleNow = true; } else if (down >= 5 && b.rose) { b.toppleNow2 = true; } } });
    S.mkPart(B, 'cockpit', { hp: 20, pos: [320, 0, 62], vulnerable: false, hidden: false, pts: 10000, vol: (s, b, p) => [sphereVol([b.pos[0] - 4, b.pos[1], 56 + (b.toppled ? -26 : 0)], 13)], onBreak: (s, b) => { b.cockpitOut = true; } });
    B.bars = [{ label: 'SCYLLA', parts: ['knee0', 'knee1', 'knee2', 'knee3', 'knee4', 'knee5'] }, { label: 'COCKPIT', parts: ['cockpit'] }];
  },
  *script(S, B) {
    yield 2.8; B.intro = false; S.say('juno', 'Scylla! Knees are the weak point—take them out!');
    let n = 0;
    while (!B.cockpitOut) {
      if (B.toppleNow) { B.toppleNow = false; B.toppled = true; S.emit('topple', {}); S.shake = 1; B.parts.cockpit.vulnerable = true; S.say('kai', 'Hatch is open! Hit the cockpit!'); yield* waitBoss(B, 6, true); B.parts.cockpit.vulnerable = false; if (B.cockpitOut) break; B.toppled = false; B.rose = true; S.emit('rise', {}); for (const k of ['knee0', 'knee1', 'knee2', 'knee3', 'knee4', 'knee5']) { const p = B.parts[k]; if (!p.dead) p.hp = Math.max(p.hp, p.max * .6); } n = 0; B.parts.cockpit.hp = B.parts.cockpit.max; yield 1; continue; }
      if (B.toppleNow2) { B.toppleNow2 = false; B.toppled = true; B.parts.cockpit.vulnerable = true; S.emit('topple', {}); S.shake = 1; yield* waitBoss(B, 8, true); B.parts.cockpit.vulnerable = false; if (!B.cockpitOut) { B.parts.cockpit.hp = 0; B.parts.cockpit.dead = true; B.cockpitOut = true; } break; }
      n++;
      if (n % 3 === 0) { S.say('juno', 'Missiles incoming! Shoot them down or duck!'); for (let i = 0; i < 6; i++) { const t = S.bTarget(), pose = S.pose(t), m = [B.pos[0] - 10, B.pos[1] + (i - 2.5) * 16, 74], T = 1.5 + i * .12, to = [pose.x + 6, pose.y + S.rr(-14, 14, 'boss'), pose.z - 6];
        const pr = S.spawnProj({ kind: 'missile', x: m[0], y: m[1], z: m[2], vx: (to[0] - m[0]) / T, vy: (to[1] - m[1]) / T, vz: (to[2] - m[2] + .5 * 90 * T * T) / T, g: 90, hp: 1, r: 6, src: 'boss', tgt: t }); pr.th = S.bThreat('missile', T, { target: t, proj: pr.id, sp: m, always: true }); S.emit('throw', { id: 'boss', kind: 'missile' }); yield .2; }
        yield* waitBoss(B, 2.8); }
      else { S.emit('clawcharge', {}); const tg = S.bTarget(); S.bThreat('claw', .9, { target: tg, sp: [B.pos[0] - 14, B.pos[1] + (n % 2 ? 40 : -40), 52], always: true }); yield .95; S.emit('eshot', { id: 'boss', from: [B.pos[0] - 14, B.pos[1], 52], kind: 'turret' }); yield* waitBoss(B, S.rr(1.2, 1.9, 'boss')); }
    }
    S.emit('bigboom', {}); S.emit('boss_transition', {}); S.say('krake', 'Impossible! You… you broke my beautiful Scylla!'); yield 1.6;
    S.boss = null; S.spawnBoss('krake'); S.slow = 1;
  },
  done() { return false },
  onDefeat() { }
});
def('boss', 'krake', {
  name: 'ADMIRAL KRAKE', title: 'Silas Krake, the Tide Tyrant',
  init(S, B) {
    B.pos = [250, 0, 0]; B.sub = 'krake';
    S.mkPart(B, 'krake', { hp: 40, pos: [250, 0, 0], pts: 40000, vulnerable: true, vol: (s, b, p) => b.hiding ? [] : rigVols(b.pos[0], b.pos[1], b.pos[2], 1.15) });
    S.mkPart(B, 'lever', { hp: 1, pos: [210, -40, 22], hidden: true, vulnerable: true, pts: 0, vol: (s, b, p) => [boxVol(b.pos[0] + 0, -40, 8, 10, 10, 26, 1)] });
    B.bars = [{ label: 'KRAKE', parts: ['krake'] }];
  },
  *script(S, B) {
    const kr = B.parts.krake; B.intro = false; S.say('krake', 'The sea… always… takes what is hers!'); yield 1.8; const spots = [-70, 0, 70]; let n = 0, tideLevel = 0;
    while (!kr.dead) {
      if (kr.hp <= kr.max * .15 && !B.finalDone) {
        // FINAL SHOT
        B.hiding = false; B.final = true; S.say('krake', 'If I fall, the whole bay falls with me!'); S.emit('finalshot', {}); B.pos[1] = -40; B.pos[0] = 220; S.slow = .3; S.emit('prompt', { id: 'final' });
        const lever = B.parts.lever; lever.hidden = false; lever.hp = 1; lever.dead = false; B.flags.leverHit = false; lever.onBreak = null; lever.onHit = (s, b) => { b.flags.leverHit = true; }; kr.vulnerable = true; kr.dead = false;
        let t = 0; while (t < 3 && !B.flags.leverHit && kr.hp > 0) { yield .1; t += .1 / S.slow; }
        S.slow = 1;
        if (B.flags.leverHit || kr.hp <= 0) { B.finalDone = true; kr.hp = 0; kr.dead = true; B.final = false; S.emit('finalhit', {}); break; }
        S.say('krake', 'TIDE RISING!'); S.emit('tiderise', {}); tideLevel++; S.shake = 1; B.final = false; lever.hidden = true; kr.hp = kr.max * .15 + 1; B.pos[0] = 250; yield 2; continue;
      }
      n++; B.pos[1] = spots[n % 3]; B.hiding = false; B.anim.mode = 'roll'; yield .5; B.anim.mode = 'idle';
      const r = n % 4;
      if (r === 1 || r === 3) { for (let i = 0; i < 2; i++) { const t = S.bTarget(), pose = S.pose(t), m = [B.pos[0] - 6, B.pos[1] + (i ? 6 : -6), 28], dd = Math.hypot(pose.x - m[0], pose.y - m[1]), T = dd / 160;
          const pr = S.spawnProj({ kind: 'flare', x: m[0], y: m[1], z: m[2], vx: (pose.x - m[0]) / T, vy: (pose.y - m[1]) / T, vz: (pose.z - 4 - m[2]) / T, hp: 1, r: 6, src: 'boss', tgt: t }); pr.th = S.bThreat('flare', T, { target: t, proj: pr.id, sp: m, always: true }); S.emit('throw', { id: 'boss', kind: 'flare' }); yield .5; } yield 1.4; }
      else if (r === 2) { S.say('krake', 'Smoke and mirrors, agents!'); S.emit('smoke', { dur: 3 }); B.smoke = 3; for (let i = 0; i < 2; i++) { const e = S.spawnEnemy('redtide', 'k' + (1 + ((n + i) % 3)), { entry: 'roll' }); } yield 3; }
      else { B.anim.mode = 'lunge'; S.emit('windup', { id: 'boss' }); S.bThreat('lunge', .7, { target: S.bTarget(), sp: [B.pos[0] - 8, B.pos[1], 22], always: true }); yield .9; B.anim.mode = 'idle'; yield 1; }
      kr.vulnerable = true;
    }
  },
  done(S, B) { return B.parts.krake.dead; },
  onDefeat(S, B) { S.say('krake', 'The sea… always… wins…'); S.say('kai', 'Not today.'); S.emit('bigboom', {}); }
});
// ---------- mini-bosses ----------
def('boss', 'bulldog', {
  name: 'BULLDOG', title: 'Armored truck', mini: true,
  init(S, B) {
    B.pos = [430, 0, 0];
    S.mkPart(B, 'gunner', { hp: 3, pos: [300, 10, 42], pts: 5000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1] + 10, 42], 6, 2), { k: 's', c: [b.pos[0], b.pos[1] + 10, 33], r: 7 }], vulnerable: true });
    S.mkPart(B, 'fuel', { hp: 6, pos: [320, -10, 22], pts: 8000, vol: (s, b, p) => [boxVol(b.pos[0] + 22, b.pos[1] - 6, 6, 18, 26, 26, 1)], vulnerable: true, onBreak: (s, b) => { s.explode(b.pos[0] + 20, b.pos[1], 20, 110, 'p', 0, 6, false); s.emit('bigboom', {}); } });
    B.bars = [{ label: 'BULLDOG', parts: ['gunner', 'fuel'] }];
  },
  *script(S, B) {
    S.say('juno', 'Something big is coming through the containers!'); while (B.pos[0] > 300) { B.pos[0] -= 4; yield .03; } S.shake = 1; S.emit('bigboom', {}); S.say('kai', 'Armored truck! Take out the gunner!');
    S.spawnEnemy('marine', 'm1', { entry: 'vehicle', from: [310, 20, 12] }); S.spawnEnemy('marine', 'm2', { entry: 'vehicle', from: [310, -36, 12] });
    while (!B.parts.gunner.dead) { if (S.decideThreat({ id: 'boss' }, { chance: [.5, .5, .5] })) { S.bThreat('bullet', 1.0, { target: S.bTarget(), sp: [B.pos[0], B.pos[1] + 10, 42] }); yield 1.0; for (let i = 0; i < 4; i++) { S.emit('eshot', { id: 'boss', from: [B.pos[0], B.pos[1] + 10, 42], kind: 'turret' }); yield .1; } } else { yield .8; } yield S.rr(.6, 1.2, 'boss'); }
    S.say('rook', 'Fuel tank—light it up!'); while (!B.parts.fuel.dead) yield 0;
  },
  done(S, B) { return B.parts.fuel.dead && B.parts.gunner.dead; }
});
def('boss', 'seawolf', {
  name: 'SEAWOLF', title: 'Black Current gunship', mini: true,
  init(S, B, o) {
    B.pos = [380, 0, 76]; B.final = !!o.final; B.retreatAt = o.final ? 0 : 30;
    if (o.final) { S.mkPart(B, 'podL', { hp: 10, pos: [380, -34, 66], pts: 4000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1] - 34, b.pos[2] - 10], 9)] }); S.mkPart(B, 'podR', { hp: 10, pos: [380, 34, 66], pts: 4000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1] + 34, b.pos[2] - 10], 9)] }); S.mkPart(B, 'hub', { hp: 15, pos: [380, 0, 100], pts: 8000, vulnerable: false, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1], b.pos[2] + 22], 11)] }); B.bars = [{ label: 'SEAWOLF', parts: ['podL', 'podR', 'hub'] }]; }
    else { S.mkPart(B, 'body', { hp: 30, pos: [380, 0, 76], pts: 8000, vol: (s, b, p) => [sphereVol([b.pos[0], b.pos[1], b.pos[2]], 16), sphereVol([b.pos[0], b.pos[1] + 14, b.pos[2] - 4], 11)] }); B.bars = [{ label: 'SEAWOLF', parts: ['body'] }]; }
    B.tick = (s, b, dt) => { b.pos[1] = Math.sin(b.t * .55) * 110; b.pos[2] = 76 + Math.sin(b.t * 1.3) * 6; if (b.parts.hub && b.parts.podL.dead && b.parts.podR.dead) b.parts.hub.vulnerable = true; };
  },
  *script(S, B) {
    S.say('juno', 'Gunship! Duck when it strafes!'); yield 1.5; let n = 0;
    while (true) {
      const t = S.bTarget(); S.emit('strafe', {}); S.bThreat('bullet', .9, { target: t, sp: [B.pos[0], B.pos[1], B.pos[2]], always: true }); yield .9;
      for (let i = 0; i < 3; i++) { S.emit('eshot', { id: 'boss', from: [B.pos[0], B.pos[1], B.pos[2]], kind: 'turret' }); if (i) S.bThreat('bullet', .02, { target: t, sp: [B.pos[0], B.pos[1], B.pos[2]], always: true }); yield .4; }
      if (++n % 2 === 0 && S.enemies.filter(e => !e.dead).length < 3) { const c = 'r' + (1 + (n % 3)); if (S.coverOf(c)) S.spawnEnemy('marine', c, { entry: 'rappel' }); }
      yield S.rr(1.2, 2.0, 'boss');
    }
  },
  done(S, B) { return B.final ? (B.parts.hub.dead || (B.parts.podL.dead && B.parts.podR.dead && B.parts.hub.hp <= 0)) : (B.parts.body.hp <= B.parts.body.max - 30 || B.parts.body.dead || B.t > 45); },   // it also flies off after 45 s, so the scene can never soft-lock
  onDefeat(S, B) { S.say('juno', 'Seawolf is going down!'); S.emit('bigboom', {}); }
});
// the Gull is a sniper that hops between perches when hit
def('enemy', 'gull', { name: 'The Gull', hp: 4, score: 8000, ai: 'peek', exposed: [3.2, 3.6], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.4, peeks: ['up'], elite: true, laser: true,
  onHit(S, e) { const alts = S.covers.filter(c => c.perch && c.id !== (e.cover && e.cover.id)); if (!alts.length) return; const c = S.pick(alts, 'ai'); e.cover = c; e.bx = c.x + 12; e.by = c.y; e.bz = c.z0 || 0; e.x = e.bx; e.y = e.by; e.st = 'hide'; e.t = 1.2; e.p = 0; S.emit('gullhop', { id: e.id }); },
  look: { build: 'heroic', size: 1.0, outfit: 'coat', hat: { style: 'pointed', color: '#6b6f78' }, weapon: 'gun', colors: { cloth: '#6b6f78', coat: '#6b6f78', pants: '#2a2c33' } } });

// ---- 30-stagefmt.js ----
// 30-stagefmt.js — stage/scene schema, the scene builder (`b`), environments and validators.
// A scene is data: slots, covers, waves, cues, objects, geometry. Designers add scenes without touching systems.
const ENVS = {
  harbor: { sky: ['#0b1026', '#1b2a52', '#4a3068'], fog: ['#1a2242', 260, 1300], ambient: .5, sun: { dir: [-.35, .45, .82], k: .42 }, stars: 1, moon: { yaw: -.3, pitch: .42, r: 9 }, skyline: [{ h: 46, col: '#141a38', seed: 3, lit: '#ffb347', drop: 0 }, { h: 26, col: '#1c2348', seed: 9, drop: 4 }], sea: { c1: '#173a66', c2: '#0a1830', spark: '#ffcf8a' }, fireworks: 1 },
  market: { sky: ['#1b1426', '#2a1d35', '#3a2a40'], fog: ['#2a2030', 300, 1000], ambient: .55, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#2a2030', c2: '#2a2030' } },
  yard: { sky: ['#0d1224', '#26294e', '#6b4a52'], fog: ['#2a2940', 300, 1500], ambient: .5, sun: { dir: [-.3, .5, .8], k: .38 }, stars: 1, skyline: [{ h: 34, col: '#181c34', seed: 5, lit: '#ffd34a' }], sea: { c1: '#173a66', c2: '#0a1830', spark: '#ffcf8a' } },
  canal: { sky: ['#0b1026', '#1b2a52', '#4a3068'], fog: ['#1a2242', 220, 1100], ambient: .5, sun: { dir: [-.35, .45, .82], k: .4 }, stars: 1, moon: { yaw: .3, pitch: .5, r: 8 }, skyline: [{ h: 40, col: '#161c3c', seed: 12, lit: '#ffb347' }], sea: { c1: '#14325a', c2: '#0a1830', spark: '#ffcf8a' } },
  harborMouth: { sky: ['#0a0e22', '#1f2c58', '#6a3a68'], fog: ['#1a2242', 300, 1600], ambient: .52, sun: { dir: [-.35, .45, .82], k: .42 }, stars: 1, moon: { yaw: 0, pitch: .38, r: 10 }, skyline: [{ h: 30, col: '#10152e', seed: 3, lit: '#ffb347' }], sea: { c1: '#173a66', c2: '#0a1830', spark: '#ffcf8a' } },
  storm: { sky: ['#10171b', '#1d2a30', '#31444a'], fog: ['#26343c', 180, 1100], ambient: .48, sun: { dir: [-.3, .3, .85], k: .3 }, skyline: [{ h: 40, col: '#1a2328', seed: 7, wide: 1 }], sea: { c1: '#1d3a48', c2: '#0c1a22', spark: '#a8c8d8' }, storm: 1 },
  loft: { sky: ['#1a1a1a', '#262320', '#38302a'], fog: ['#2a241e', 260, 900], ambient: .5, sun: { dir: [-.2, .1, .9], k: .28 }, skyline: [], sea: { c1: '#2a241e', c2: '#2a241e' } },
  cliff: { sky: ['#10171b', '#1d2a30', '#31444a'], fog: ['#26343c', 200, 1300], ambient: .46, sun: { dir: [-.3, .3, .85], k: .3 }, skyline: [{ h: 70, col: '#161e22', seed: 4, wide: 1 }], sea: { c1: '#1d3a48', c2: '#0c1a22', spark: '#a8c8d8' }, storm: 1 },
  lighthouse: { sky: ['#0c1216', '#1b282e', '#3a4a50'], fog: ['#26343c', 200, 1500], ambient: .5, sun: { dir: [-.3, .3, .85], k: .32 }, skyline: [], sea: { c1: '#1d3a48', c2: '#0c1a22', spark: '#a8c8d8' }, storm: 1, beam: 1 },
  dawn: { sky: ['#1f1a3a', '#6a3f6f', '#f29e6b'], fog: ['#8a7a8f', 400, 2200], ambient: .55, sun: { dir: [-.5, .6, .6], k: .5 }, skyline: [{ h: 24, col: '#3a2a4a', seed: 21, wide: 1 }], sea: { c1: '#2d6e86', c2: '#14404f', spark: '#ffd7a8' }, moon: { yaw: -.2, pitch: .12, r: 16, col: '#ffe0a0' } },
  turbine: { sky: ['#12141a', '#1c2028', '#2a303a'], fog: ['#1c2028', 300, 1100], ambient: .5, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#1c2028', c2: '#1c2028' } },
  tower: { sky: ['#1f1a3a', '#6a3f6f', '#f29e6b'], fog: ['#8a7a8f', 400, 2400], ambient: .55, sun: { dir: [-.5, .6, .6], k: .5 }, skyline: [{ h: 30, col: '#3a2a4a', seed: 22, wide: 1 }], sea: { c1: '#2d6e86', c2: '#14404f', spark: '#ffd7a8' }, moon: { yaw: .1, pitch: .15, r: 18, col: '#ffe0a0' } },
  control: { sky: ['#0a0e14', '#10161e', '#1a222c'], fog: ['#10161e', 300, 1000], ambient: .52, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#10161e', c2: '#10161e' } },
  range: { sky: ['#20242c', '#2c323c', '#3a424c'], fog: ['#2c323c', 300, 1000], ambient: .62, sun: { dir: [-.2, .1, .9], k: .3 }, skyline: [], sea: { c1: '#2c323c', c2: '#2c323c' } }
};
class Builder {
  constructor(sc) { this.boxes = []; this.solids = []; this.lights = []; this.sc = sc; }
  box(cx, cy, dx, dy, h, mat, z0 = 0, o) { const b = Object.assign({ x0: cx - dx / 2, x1: cx + dx / 2, y0: cy - dy / 2, y1: cy + dy / 2, z0, z1: z0 + h, mat }, o); this.boxes.push(b); if (b.solid) this.solids.push(b); return b; }
  raw(x0, y0, z0, x1, y1, z1, mat, o) { const b = Object.assign({ x0, x1, y0, y1, z0, z1, mat }, o); this.boxes.push(b); if (b.solid) this.solids.push(b); return b; }
  floor(x0, x1, y0, y1, z, mat, o) { return this.raw(x0, y0, z - 6, x1, y1, z, mat, Object.assign({ floor: 1, edge: false }, o)); }
  wall(x, y0, y1, h, mat, z0 = 0, o) { return this.raw(x, y0, z0, x + 10, y1, z0 + h, mat, Object.assign({ solid: 1 }, o)); }
  sideWall(y, x0, x1, h, mat, z0 = 0, o) { return this.raw(x0, y, z0, x1, y + 10, z0 + h, mat, o); }
  light(x, y, z, r, k, col) { this.lights.push({ x, y, z, r, k, col }); }
  lantern(x, y, z) { this.box(x, y, 4, 4, 5, 'lantern', z, { glow: 1, edge: false }); this.light(x, y, z, 90, .6); }
  post(x, y, h = 30, mat = 'wood_d') { this.box(x, y, 3, 3, h, mat); }
  lamppost(x, y, h = 46) { this.post(x, y, h, 'steel'); this.box(x, y, 7, 7, 4, 'lamp', h, { glow: 1, edge: false }); this.light(x, y, h, 140, .8); }
  lanternString(x, y0, y1, z) { const n = Math.max(2, ((y1 - y0) / 24) | 0), cols = ['neon_r', 'neon_y', 'neon_b', 'neon_g']; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; this.box(x, y, 2.4, 2.4, 3, cols[i % 4], z - Math.sin(i / n * Math.PI) * -2 - 4 * Math.sin(i / n * Math.PI), { glow: 1, edge: false }); } this.box(x, (y0 + y1) / 2, 1, y1 - y0, 1, 'black', z + 2, { edge: false }); }
  stall(x, y, mat = 'awn_red') { this.box(x, y, 14, 30, 16, 'planks', 0, { solid: 1 }); this.box(x, y, 20, 38, 3, mat, 36); this.post(x + 8, y - 17, 36); this.post(x + 8, y + 17, 36); this.lantern(x - 6, y, 31); }
  crateStack(x, y, n = 2) { for (let i = 0; i < n; i++) this.box(x, y + i * 16 - (n - 1) * 8, 14, 15, 14, 'crate', 0, { solid: 1 }); if (n > 1) this.box(x, y, 13, 14, 13, 'crate', 14, { solid: 1 }); }
  container(x, y, col = 'corr_red', rot = 0, z0 = 0, h = 42) { if (rot) this.box(x, y, 39, 98, h, col, z0, { solid: 1 }); else this.box(x, y, 98, 39, h, col, z0, { solid: 1 }); }
  warehouse(x, y0, y1, h = 70, mat = 'brick') { this.wall(x, y0, y1, h, mat); for (let y = y0 + 30; y < y1 - 20; y += 60) this.box(x - 1, y, 2, 14, 16, 'glass', 34, { glow: 1, edge: false }); }
  door(x, y) { this.box(x - 1, y, 3, 18, 36, 'black', 0, { edge: false }); }
  skylineBoxes() { }
}
function defScene(id, spec) {
  const sc = Object.assign({ id, stage: +id[0], slots: [{ at: [0, -26, 24] }, { at: [0, 26, 24] }], covers: {}, waves: [], cues: [], objs: [], civ: [], env: 'harbor' }, spec);
  const b = new Builder(sc); if (sc.build) sc.build(b);
  const covers = {}; for (const k in sc.covers) {
    const c = sc.covers[k]; const cv = Object.assign({ w: 28, h: 16, d: 14, mat: 'crate', peek: ['up'], z0: 0 }, c);
    covers[k] = cv; if (!cv.hidden) b.box(cv.x, cv.y, cv.d, cv.w, cv.h, cv.mat, cv.z0, { solid: 1, coverOf: k });
  }
  sc.covers = covers; sc.boxes = b.boxes; sc.solids = b.solids; sc.lights = b.lights;
  sc.envData = Object.assign({}, ENVS[sc.env] || ENVS.harbor, sc.envOver || {}); sc.envData.lights = sc.lights;
  return def('scene', id, sc);
}
// shorthand for waves
const W_at = (at, spawn, o) => Object.assign({ at, spawn }, o), W_after = (spawn, o) => Object.assign({ after: 'clear', spawn }, o);
// validators (tests run these over every stage)
function validateContent() {
  const errs = [];
  for (const sid in TC.REG.stage) {
    const st = TC.REG.stage[sid];
    for (const id of st.scenes) {
      const sc = reg('scene', id); if (!sc) { errs.push('missing scene ' + id); continue; }
      for (const w of sc.waves) for (const sp of w.spawn || []) { if (!reg('enemy', sp[0])) errs.push(id + ': unknown enemy ' + sp[0]); if (sp[1] && !sc.covers[sp[1]]) errs.push(id + ': unknown cover ' + sp[1]); }
      for (const c of sc.cues) if (c.say && !reg('speaker', c.say[0])) errs.push(id + ': unknown speaker ' + c.say[0]);
      if (!reg('song', st.music)) errs.push('stage ' + sid + ': unknown song ' + st.music);
      if (sc.boss && !reg('boss', sc.boss)) errs.push(id + ': unknown boss ' + sc.boss);
      // covers must be on screen from every slot's stand pose
      sc.slots.forEach((sl, si) => {
        const pose = { x: sl.at[0], y: sl.at[1], z: sl.at[2] || 24, yaw: (sl.yaw || 0) * DEG, pitch: (sl.pitch || 0) * DEG, fov: 55 };
        for (const k in sc.covers) { const c = sc.covers[k]; if (c.hidden || c.perch) continue; const a = R3.aimOf(pose, [c.x + 12, c.y, c.z0 + 24]); if (!a) errs.push(id + ':' + k + ' behind slot ' + si); else if (Math.abs(a[0]) > 16 / 9 * 1.0 || Math.abs(a[1]) > 1.05) { if (!sc.moving && !sc.looseView) errs.push(id + ':' + k + ' off-screen from slot ' + si + ' (' + a[0].toFixed(2) + ',' + a[1].toFixed(2) + ')'); } }
      });
    }
  }
  return errs;
}

// ---- 31-stage1.js ----
// 31-stage1.js — STAGE 1: HARBOR LIGHTS (Port Lumen Docks, 23:40, Lantern Festival): 1-1…1-4 and the boss 1-B.
const cvr = (x, y, w, h, mat, peek, o) => Object.assign({ x, y, w, h, mat, peek: peek || ['up'] }, o);
def('stage', 1, { name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'], intro: 'c1-intro', outro: 'c1-outro', brief: 'brief1' });
defScene('1-1', {
  title: 'LANTERN PIER', time: 45, env: 'harbor', from: [-170, 0, 24], whip: .9,
  build(b) {
    b.floor(-200, 420, -130, 130, 0, 'planks'); b.floor(-200, 420, -60, 60, 0, 'planks');
    for (let x = -120; x < 380; x += 60) { b.post(x, -128, 20); b.post(x, 128, 20); b.lantern(x, -128, 22); b.lantern(x, 128, 22); }
    b.stall(110, -82); b.stall(150, 88, 'awn_blue'); b.stall(250, -96); b.stall(300, 78, 'awn_blue');
    b.warehouse(390, -130, 130, 78); b.door(389, 20); b.door(389, -70);
    b.box(240, 105, 40, 60, 30, 'hull', 0, { solid: 1 }); b.box(238, 105, 22, 28, 22, 'hull_w', 30, { solid: 1 });   // fishing boat + cabin
    b.lanternString(60, -120, 120, 46); b.lanternString(200, -120, 120, 50); b.lanternString(330, -120, 120, 52);
    b.lamppost(40, -112); b.lamppost(40, 112); b.lamppost(330, -112); b.lamppost(330, 112);
    b.box(100, 58, 3, 3, 16, 'wood_d');
  },
  covers: { c1: cvr(155, -40, 26, 16, 'crate', ['up', 'left']), c2: cvr(185, 34, 22, 16, 'barrel', ['up', 'right']), c3: cvr(215, -86, 36, 18, 'planks', ['up', 'left']), c4: cvr(245, 40, 30, 17, 'crate', ['up']), c5: cvr(310, -10, 30, 16, 'crate', ['up', 'left', 'right']), c6: cvr(350, 52, 26, 16, 'crate', ['up']) },
  waves: [W_at(.6, [['deckhand', 'c1', { entry: 'stand' }], ['deckhand', 'c2'], ['deckhand', 'c3']]),
    W_after([['deckhand', 'c5', { entry: 'door', from: [380, 20, 0] }], ['deckhand', 'c4', { entry: 'jump', from: [238, 105, 52] }]]),
    W_after([['quartermaster', null, { route: [[380, -100, 0], [380, 90, 0]], drop: 'mg', speed: 38 }], ['deckhand', 'c6', { entry: 'run', from: [420, -40, 0] }]])],
  civ: [{ at: 2, route: [[120, -60, 0], [330, -60, 0]], speed: 30 }, { at: 2.4, route: [[120, -66, 0], [330, -66, 0]], speed: 30 }],
  objs: [['lifering', 100, 58, 17], ['lantern', 110, -82, 26], ['lantern', 150, 88, 28], ['bottle', 110, -88, 13], ['bottle', 118, -78, 13], ['crate', 270, -20, 0, { solid: 0 }]],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'], prompt: 'cover' }, { on: 'qm', say: ['juno', 'Orange vest! He\'s hauling ammo—drop him!'] }, { at: 12, fn: s => { s.flags.qm = 1; } }],
});
defScene('1-2', {
  title: 'FISH MARKET', time: 50, env: 'market', from: [-190, 0, 24], whip: -.8,
  build(b) {
    b.floor(-200, 420, -130, 130, 0, 'cobble'); b.raw(-200, -130, 0, 420, -120, 80, 'brick', { solid: 1 }); b.raw(-200, 120, 0, 420, 130, 80, 'brick', { solid: 1 }); b.raw(-200, -130, 80, 420, 130, 86, 'timber', { solid: 1 });
    b.wall(400, -130, 130, 80, 'brick'); b.box(399, 0, 2, 120, 22, 'black', 0, { edge: false });
    b.box(260, 0, 28, 240, 6, 'timber', 46, { solid: 1 }); b.box(260, -100, 28, 20, 46, 'timber', 0); b.box(260, 100, 28, 20, 46, 'timber', 0);  // the gallery
    for (let y = -90; y <= 90; y += 45) { b.lantern(120, y, 60); b.lantern(220, y, 62); }
    b.box(300, -70, 22, 56, 4, 'white', 16, {});   // ice table top (decor)
    for (const y of [-60, 10, 70]) b.stall(170, y, y > 0 ? 'awn_blue' : 'awn_red');
    b.box(240, -60, 14, 14, 24, 'rust', 0, { solid: 1 }); b.box(240, 60, 14, 14, 24, 'rust', 0, { solid: 1 });
    b.box(398, -55, 3, 24, 30, 'screen', 22, { glow: 1, edge: false });
    b.box(185, 110, 8, 6, 30, 'white', 10, { solid: 0 });
  },
  covers: { c1: cvr(160, -36, 26, 16, 'planks', ['up', 'left']), c2: cvr(185, 40, 26, 16, 'planks', ['up', 'right']), g1: cvr(262, -50, 24, 14, 'timber', ['up'], { z0: 46 }), g2: cvr(262, 52, 24, 14, 'timber', ['up'], { z0: 46 }), g3: cvr(262, 0, 24, 14, 'timber', ['up'], { z0: 46 }), ice: cvr(300, -70, 40, 18, 'steel', ['left', 'up']), s1: cvr(215, -14, 26, 15, 'crate', ['up', 'right']), s2: cvr(340, 38, 30, 16, 'crate', ['up', 'left']), gg: cvr(268, 20, 22, 14, 'timber', ['up'], { z0: 46 }) },
  waves: [W_at(.6, [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'g1'], ['deckhand', 'g2']]),
    W_after([['redtide', 'ice', { entry: 'roll', from: [330, -100, 0] }], ['deckhand', 's1']], { }),
    W_after([['marine', 's2', { entry: 'vault', from: [360, 90, 0] }], ['marine', 'c2', { entry: 'vault', from: [230, 90, 0] }], ['grenadier', 'gg']])],
  objs: [['tank', 225, -98, 0, { fall: 1, fallR: 90, hp: 3 }], ['tank', 230, 98, 0, { fall: 1, fallR: 90, hp: 3 }], ['intel', 150, 106, 18, { intelId: 'i1' }], ['lantern', 170, -60, 40], ['lantern', 170, 70, 40]],
  cues: [{ at: 0, say: ['rook', 'Market hall. Stay sharp.'] }, { on: 'rt', say: ['juno', 'Red uniform! That\'s Red Tide—they don\'t miss. Hit him first!'] }, { at: 14, fn: s => { s.flags.rt = 1; } }, { on: 'gr', say: ['juno', 'Grenade! Shoot it out of the air!'] }, { at: 24, fn: s => { s.flags.gr = 1; } }],
  sceneObjective: null
});
defScene('1-3', {
  title: 'CONTAINER YARD', time: 60, env: 'yard', from: [-170, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 460, -150, 150, 0, 'asphalt');
    const cols = ['corr_red', 'corr_blue', 'corr_ochre', 'corr_green'];
    [[130, -120, 0], [130, 112, 0], [230, -130, 1], [230, 128, 2], [340, -110, 3], [340, 118, 0]].forEach(([x, y, c], i) => { b.container(x, y, cols[c], 0); if (i % 2) b.container(x, y, cols[(c + 1) % 4], 0, 0, 0); b.container(x, y, cols[(c + 2) % 4], 0, 42, 42); });
    b.container(410, -60, 'corr_blue', 1); b.container(410, 60, 'corr_ochre', 1); b.raw(430, -150, 0, 440, 150, 90, 'corr_red', { solid: 1 });
    b.raw(260, -20, 100, 290, 20, 104, 'steel', {}); for (const y of [-40, 40]) b.raw(266, y - 2, 0, 270, y + 2, 100, 'steel', {}); // crane
    b.lamppost(100, -60, 60); b.lamppost(200, 60, 60); b.lamppost(300, -50, 60);
    b.box(180, -66, 22, 12, 12, 'steel', 0, { solid: 1 }); b.box(180, -66, 10, 10, 12, 'black', 12);
  },
  covers: { c1: cvr(150, -44, 26, 16, 'crate', ['up', 'left']), c2: cvr(175, 40, 26, 16, 'barrel', ['up', 'right']), c3: cvr(215, -6, 28, 16, 'crate', ['up']), f1: cvr(250, -62, 26, 15, 'steel', ['up', 'left']), f2: cvr(260, 56, 26, 15, 'steel', ['up', 'right']), m1: cvr(320, 40, 24, 14, 'crate', ['up', 'right']), m2: cvr(320, -34, 24, 14, 'crate', ['up', 'left']), c4: cvr(290, 5, 26, 15, 'barrel', ['up']), c5: cvr(345, 90, 26, 15, 'crate', ['up']) },
  waves: [W_at(.6, [['deckhand', 'c1', { entry: 'jump', from: [150, -44, 90] }], ['deckhand', 'c2', { entry: 'jump', from: [175, 40, 90] }], ['deckhand', 'c3', { entry: 'jump', from: [215, -6, 90] }], ['deckhand', 'f1'], ['deckhand', 'f2']]),
    { after: 'clear', boss: 'bulldog', spawn: [] },
    W_after([['grenadier', 'c4'], ['quartermaster', null, { route: [[420, 110, 0], [150, 110, 0]], drop: 'mg', speed: 55 }]])],
  civ: [{ at: 1, route: [[100, 100, 0], [260, 100, 0]], speed: 30 }],
  objs: [['barrel', 190, -90, 0], ['barrel', 196, -96, 0], ['intel', 300, -100, 40, { intelId: 'i2', hp: 1 }]],
  cues: [{ at: 0, say: ['juno', 'Containers everywhere. Watch the rooftops!'] }, { on: 'wk', say: ['worker', 'Don\'t shoot! I just work here!'] }, { at: 4, fn: s => { s.flags.wk = 1; } }]
});
// the Bulldog set piece is a wave with a boss field: handle it in the scene flow
Sim.prototype._waveBoss = function (w) { if (w.boss) { this.spawnBoss(w.boss); } };
defScene('1-4', {
  title: 'CANAL RUN', time: 60, env: 'canal', from: [-60, 0, 24], whip: .5, moving: { speed: 70, dist: 640 }, sway: [1.6, .006], looseView: 1, coverMat: 'hull_w', coverProp: { h: 15, mat: 'hull_w' },
  build(b) {
    b.floor(-200, 900, -26, 26, -14, 'sea'); b.raw(-200, -140, -80, 900, -26, 6, 'brick', { solid: 0 }); b.raw(-200, 26, -80, 900, 140, 6, 'brick', { solid: 0 });
    for (let x = 60; x < 880; x += 90) { b.lantern(x, -32, 14); b.lantern(x, 32, 14); b.post(x, -34, 28); b.post(x, 34, 28); }
    for (const x of [180, 420, 640]) { b.raw(x, -140, 40, x + 20, 140, 54, 'concrete', { solid: 0 }); b.raw(x, -140, 6, x + 20, -128, 40, 'brick'); b.raw(x, 128, 6, x + 20, 140, 40, 'brick'); b.lanternString(x - 2, -120, 120, 38); }
    b.raw(300, -140, 6, 340, -60, 30, 'planks', { solid: 0 }); b.raw(500, 60, 6, 540, 140, 30, 'planks', { solid: 0 });
    for (let x = 100; x < 800; x += 120) { b.stall(x, -70, 'awn_red'); b.stall(x + 40, 74, 'awn_blue'); }
    b.box(380, 60, 40, 24, 12, 'hull', -8, { solid: 1 }); b.box(560, -60, 40, 24, 12, 'hull', -8, { solid: 1 });
    b.box(740, 0, 40, 30, 10, 'hull_w', -12, { solid: 1 });
  },
  covers: { b1: cvr(250, -22, 24, 14, 'crate', ['up'], { z0: 4 }), b2: cvr(300, 22, 24, 14, 'crate', ['up'], { z0: 4 }), r1: cvr(210, -64, 30, 16, 'planks', ['up', 'left'], { z0: 6 }), r2: cvr(235, 60, 30, 16, 'planks', ['up', 'right'], { z0: 6 }), r3: cvr(360, -66, 30, 16, 'planks', ['up'], { z0: 6 }), r4: cvr(420, 66, 30, 16, 'planks', ['up'], { z0: 6 }), r5: cvr(520, -62, 30, 16, 'planks', ['up'], { z0: 6 }), r6: cvr(560, 62, 30, 16, 'planks', ['up', 'left'], { z0: 6 }), r7: cvr(680, 0, 30, 16, 'planks', ['up'], { z0: 6 }), m1: cvr(600, 20, 26, 14, 'crate', ['up'], { z0: 4 }) },
  waves: [W_at(.5, [['deckhand', 'r1'], ['deckhand', 'r2'], ['jetski', null, { route: [[420, 90, -10], [90, -70, -10]], dur: 4.2 }]]),
    { atD: 120, spawn: [['jetski', null, { route: [[560, -90, -10], [160, 30, -10]], dur: 4 }], ['jetski', null, { route: [[560, 90, -10], [160, -30, -10]], dur: 4.4 }], ['deckhand', 'r3'], ['deckhand', 'r4']] },
    { atD: 300, spawn: [['deckhand', 'r5'], ['deckhand', 'r6'], ['gunner', 'r7', { }], ['quartermaster', null, { route: [[720, 0, 0], [760, -30, 0]], drop: 'sg', speed: 20 }]] },
    { atD: 460, spawn: [['jetski', null, { route: [[760, -80, -10], [420, 40, -10]], dur: 3.6 }], ['jetski', null, { route: [[760, 80, -10], [420, -40, -10]], dur: 3.4 }], ['deckhand', 'm1']] }],
  objs: [['barrel', 520, 20, 0, { z: 2 }]],
  cues: [{ at: 0, say: ['mari', 'Grab something! We\'re taking the canals!'] }, { at: 4, say: ['juno', 'Jet skis, three o\'clock!'] }, { atD: 180, say: ['mari', 'Low bridge! Heads down!'] }, { atD: 380, say: ['rook', 'Fireworks barge. Happy festival.'] }]
});
defScene('1-B', {
  title: 'STINGRAY', time: 100, env: 'harborMouth', boss: 'stingray', from: [-120, 0, 24], whip: .6, sway: [1.2, .01], coverMat: 'hull_w', coverProp: { h: 15 }, looseView: 1,
  build(b) {
    b.floor(-100, 120, -40, 40, 0, 'hull_w'); b.raw(-100, -40, 0, 120, -34, 14, 'hull', { solid: 0 }); b.raw(-100, 34, 0, 120, 40, 14, 'hull', { solid: 0 });
    b.floor(215, 340, -96, 96, 10, 'hull'); b.raw(215, -96, 10, 340, -88, 24, 'hull_w', { solid: 0 }); b.raw(215, 88, 10, 340, 96, 24, 'hull_w', { solid: 0 });
    b.box(310, 0, 36, 70, 44, 'hull_w', 10, { solid: 0 }); b.box(291, 0, 4, 60, 8, 'window', 34, { glow: 1, edge: false }); b.box(310, 0, 20, 30, 18, 'steel', 54, { solid: 0 });
    for (const y of [-80, 80]) { b.box(286, y, 22, 22, 8, 'steel', 10, { solid: 0 }); }
    b.lamppost(230, -60, 50); b.lamppost(230, 60, 50);
  },
  slots: [{ at: [0, -20, 24] }, { at: [0, 20, 24] }],
  covers: { d1: cvr(238, -30, 20, 14, 'crate', ['up', 'left'], { z0: 10, w: 22 }), d2: cvr(244, 30, 20, 14, 'crate', ['up', 'right'], { z0: 10, w: 22 }), d3: cvr(246, -54, 20, 14, 'barrel', ['up', 'left'], { z0: 10, w: 20 }), d4: cvr(250, 54, 20, 14, 'crate', ['up', 'right'], { z0: 10, w: 20 }) },
  waves: [], cues: [{ at: -1, say: ['kai', 'Stingray dead ahead!'] }]
});

// ---- 32-stage2.js ----
// 32-stage2.js — STAGE 2: STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, thunderstorm): 2-1…2-4 and the boss 2-B.
def('stage', 2, { name: 'STORM SIGNAL', place: 'Gull\'s Rest', clock: '02:10', music: 'storm', scenes: ['2-1', '2-2', '2-3', '2-4', '2-B'], intro: 'c2-intro', outro: 'c2-outro', brief: 'brief2' });
const house = (b, x, y, w, mat = 'plaster', h = 54) => { b.box(x, y, 36, w, h, mat, 0, { solid: 1 }); b.box(x, y, 42, w + 8, 10, 'slate', h, { solid: 1 }); b.box(x - 19, y, 2, 10, 14, 'glass', 18, { glow: 1, edge: false }); b.box(x - 19, y + w / 3, 2, 8, 12, 'glass', 34, { glow: 1, edge: false }); };
defScene('2-1', {
  title: 'GULL\'S REST', time: 50, env: 'storm', from: [-180, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 440, -130, 130, 0, 'cobble'); b.raw(-200, -130, -4, 440, -40, 0, 'cobble'); 
    house(b, 300, -84, 60); house(b, 300, 84, 60, 'timber'); house(b, 190, -118, 40, 'timber', 50); house(b, 190, 118, 40); house(b, 380, 0, 70, 'plaster', 70); 
    b.raw(150, -130, 0, 190, -118, 40, 'brick', { solid: 0 }); b.raw(150, 118, 0, 190, 130, 40, 'brick', { solid: 0 });
    b.lamppost(80, -100, 50); b.lamppost(80, 100, 50); b.lamppost(260, 0, 50);
    b.box(120, -80, 40, 24, 12, 'hull', 0, { solid: 1 }); b.box(130, 90, 40, 24, 12, 'hull', 0, { solid: 1 });
    for (const [bx, by] of [[268, -84], [268, 84], [344, -34]]) { b.box(bx + 4, by, 28, 34, 4, 'timber', 26, {}); b.post(bx - 6, by - 14, 26); b.post(bx - 6, by + 14, 26); }
  },
  covers: { cart: cvr(170, -40, 30, 17, 'planks', ['up', 'left']), well: cvr(195, 30, 20, 17, 'rock', ['up', 'right']), w1: cvr(262, -84, 20, 14, 'timber', ['up'], { z0: 30 }), w2: cvr(262, 84, 20, 14, 'timber', ['up'], { z0: 30 }), w3: cvr(350, -34, 20, 14, 'timber', ['up'], { z0: 30 }), c1: cvr(240, -10, 30, 17, 'crate', ['up', 'left']), c2: cvr(300, 36, 30, 17, 'crate', ['up', 'right']), al: cvr(330, 30, 24, 17, 'barrel', ['up']), bar: cvr(275, -25, 36, 18, 'planks', ['up', 'right']) },
  waves: [W_at(.6, [['deckhand', 'w1'], ['deckhand', 'w2'], ['deckhand', 'w3'], ['deckhand', 'cart']]),
    W_after([['rusher', null, { from: [380, -50, 0] }], ['rusher', null, { from: [390, 30, 0] }]]),
    W_after([['rusher', null, { from: [400, -10, 0] }], ['rusher', null, { from: [380, 60, 0] }], ['rusher', null, { from: [380, -70, 0] }]]),
    W_after([['quartermaster', null, { route: [[380, 100, 0], [380, -100, 0]], drop: 'sg', speed: 45 }], ['marine', 'bar'], ['marine', 'c2']])],
  civ: [{ at: 1, route: [[100, 60, 0], [300, 12, 0]], speed: 30 }],
  objs: [['window', 262, 84, 30], ['lantern', 230, -20, 40], ['lantern', 240, 40, 40], ['bottle', 300, 46, 17]],
  cues: [{ at: 0, say: ['rook', 'Gull\'s Rest. Rain, mud, and me being cold.'] }, { on: 'rush', say: ['juno', 'Blades! They\'re rushing you—duck behind cover!'] }, { at: 10, fn: s => { s.flags.rush = 1; } }, { on: 'qm', say: ['juno', 'Orange vest again. A shotgun this time!'] }, { at: 26, fn: s => { s.flags.qm = 1; } }]
});
defScene('2-2', {
  title: 'NET LOFTS', time: 55, env: 'loft', from: [-170, 0, 24], whip: -.7,
  build(b) {
    b.floor(-200, 420, -130, 130, 0, 'planks'); b.raw(-200, -130, 0, 420, -120, 110, 'timber', { solid: 1 }); b.raw(-200, 120, 0, 420, 130, 110, 'timber', { solid: 1 }); b.raw(-200, -130, 110, 420, 130, 120, 'timber', { solid: 1 });
    b.wall(400, -130, 130, 110, 'timber');
    for (let i = 0; i < 6; i++) { b.raw(120 + i * 40, -118, 20 + i * 4, 135 + i * 40, -60, 24 + i * 4, 'grate', { solid: 0 }); b.box(100 + i * 50, -40 + (i % 2) * 80, 2, 50, 30, 'tarp', 56, { edge: false }); }
    b.box(280, 0, 90, 220, 6, 'planks', 56, { solid: 1 });   // upper floor
    b.box(280, -112, 40, 14, 56, 'timber', 0); b.box(280, 112, 40, 14, 56, 'timber', 0);
    for (let y = -90; y <= 90; y += 45) b.lantern(200, y, 90);
    b.box(180, 100, 14, 14, 22, 'barrel', 0, { solid: 1 }); b.box(184, -100, 14, 14, 22, 'barrel', 0, { solid: 1 });
    b.box(398, 0, 2, 30, 56, 'black', 0, { edge: false });
  },
  covers: { c1: cvr(160, -36, 26, 16, 'crate', ['up', 'left']), c2: cvr(180, 34, 26, 16, 'barrel', ['up', 'right']), st: cvr(260, 0, 30, 17, 'crate', ['up', 'left', 'right']), u1: cvr(285, -60, 24, 14, 'timber', ['up'], { z0: 62 }), u2: cvr(285, 60, 24, 14, 'timber', ['up'], { z0: 62 }), u3: cvr(285, 0, 24, 14, 'timber', ['up'], { z0: 62 }), r1: cvr(300, -50, 24, 16, 'crate', ['up'], { z0: 0 }), r2: cvr(310, 10, 24, 16, 'crate', ['up'], { z0: 0 }), r3: cvr(300, 62, 24, 16, 'crate', ['up'], { z0: 0 }) },
  waves: [W_at(.6, [['shield', 'st', { from: [370, 0, 0], advance: [300, 250, 215] }], ['deckhand', 'c1'], ['deckhand', 'c2']]),
    W_after([['marine', 'r1', { entry: 'rappel', from: [300, -50, 100] }], ['marine', 'r2', { entry: 'rappel', from: [310, 10, 100] }], ['marine', 'r3', { entry: 'rappel', from: [300, 62, 100] }]]),
    W_after([['redtide', 'u1'], ['redtide', 'u2'], ['grenadier', 'u3']])],
  objs: [['barrel', 330, -90, 0], ['barrel', 330, 90, 0], ['intel', 200, -105, 20, { intelId: 'i3' }]],
  cues: [{ at: 0, say: ['kai', 'Nets and rope everywhere.'] }, { at: 3, say: ['juno', 'Shotgun! Knock that shield aside!'], prompt: 'shield' }]
});
defScene('2-3', {
  title: 'FUNICULAR', time: 60, env: 'cliff', from: [-70, 0, 26], whip: .4, moving: { speed: 16, dist: 220, hold: 1 }, lift: 1, sway: [1.1, .005], looseView: 1, coverMat: 'timber', coverProp: { h: 15, mat: 'timber' },
  build(b) {
    b.floor(-100, 420, -140, 140, -40, 'rock'); b.raw(-100, -140, -40, 420, -60, 300, 'rock', { solid: 0 }); b.raw(-100, 60, -40, 420, 140, 300, 'rock', { solid: 0 });
    for (let i = 0; i < 8; i++) { b.raw(100 + i * 24, -50, i * 28 - 10, 124 + i * 24, 50, i * 28 + 4, 'rock', { solid: 0 }); b.box(80 + i * 26, 0, 6, 6, 40, 'steel', i * 28 - 10, {}); }
    b.box(380, 0, 40, 100, 220, 'brick', 40, { solid: 0 }); b.box(396, 0, 20, 22, 120, 'white', 160, { solid: 0 });   // lighthouse
    b.box(396, 0, 30, 30, 8, 'steel', 280, { solid: 0 }); b.box(396, 0, 14, 14, 12, 'lamp', 288, { glow: 1, edge: false });
    for (let z = 0; z < 240; z += 40) { b.lantern(160, -70, z); b.lantern(160, 70, z + 10); }
  },
  covers: { t1: cvr(200, -60, 26, 16, 'timber', ['up'], { z0: 22 }), t2: cvr(210, 60, 26, 16, 'timber', ['up'], { z0: 40 }), t3: cvr(240, -20, 26, 16, 'timber', ['up'], { z0: 80 }), t4: cvr(250, 44, 26, 16, 'timber', ['up'], { z0: 110 }), cr1: cvr(180, -24, 24, 14, 'crate', ['up'], { z0: 24 }), cr2: cvr(180, 30, 24, 14, 'crate', ['up'], { z0: 24 }), cs1: cvr(220, -16, 24, 14, 'steel', ['up'], { z0: 140 }), cs2: cvr(220, 30, 24, 14, 'steel', ['up'], { z0: 140 }), cs3: cvr(220, 4, 24, 14, 'steel', ['up'], { z0: 140 }), p1: cvr(330, -30, 20, 12, 'brick', ['up'], { z0: 210, perch: 1 }), p2: cvr(330, 30, 20, 12, 'brick', ['up'], { z0: 220, perch: 1 }), p3: cvr(330, 0, 20, 12, 'brick', ['up'], { z0: 205, perch: 1 }) },
  waves: [W_at(.5, [['deckhand', 't1'], ['deckhand', 't2'], ['deckhand', 'cr1']]),
    { atD: 70, spawn: [['deckhand', 't3'], ['deckhand', 't4'], ['marine', 'cr2']] },
    { atD: 140, spawn: [['gunner', 'cs1'], ['gunner', 'cs2'], ['gunner', 'cs3'], ['quartermaster', null, { route: [[190, 0, 130], [190, 0, 130]], drop: 'mg', speed: 20, dur: 6 }]] },
    { atD: 210, spawn: [['gull', 'p1']] }],
  objs: [['lifering', 150, 70, 100]],
  cues: [{ at: 0, say: ['kai', 'Hold on tight.'] }, { atD: 150, say: ['juno', 'The other car! Three gunners — four seconds!'] }, { atD: 212, say: ['juno', 'The Gull! A sniper—watch for the laser!'], prompt: 'laser' }]
});
defScene('2-4', {
  title: 'LIGHTHOUSE KEEP', time: 60, env: 'lighthouse', from: [-170, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 440, -140, 140, 0, 'cobble'); b.raw(-200, -140, 0, 440, -132, 40, 'rock'); b.raw(-200, 132, 0, 440, 140, 40, 'rock');
    house(b, 300, -100, 70, 'plaster', 56); b.box(380, 0, 60, 60, 160, 'white', 0, { solid: 1 }); b.box(349, 0, 2, 18, 36, 'black', 0, { edge: false }); for (const by of [-80, 82]) { b.box(244, by, 28, 34, 4, 'timber', 26, {}); b.post(236, by - 14, 26); b.post(236, by + 14, 26); }
    b.box(300, 112, 40, 50, 44, 'timber', 0, { solid: 1 }); b.lamppost(100, 0, 50); b.lamppost(300, 100, 50);
    for (let i = 0; i < 10; i++) b.raw(380 + Math.cos(i * .628) * 36 - 6, Math.sin(i * .628) * 36 - 6, 160 + i * 14, 380 + Math.cos(i * .628) * 36 + 6, Math.sin(i * .628) * 36 + 6, 168 + i * 14, 'steel', {});
  },
  covers: { c1: cvr(170, -36, 26, 16, 'rock', ['up', 'left']), c2: cvr(185, 36, 26, 16, 'rock', ['up', 'right']), c3: cvr(250, 8, 28, 17, 'crate', ['up']), k1: cvr(300, -30, 24, 14, 'crate', ['up', 'left']), h1: cvr(330, 0, 12, 16, 'white', ['side'], { w: 18 }), w1: cvr(238, -80, 20, 14, 'timber', ['up'], { z0: 30 }), w2: cvr(238, 82, 20, 14, 'timber', ['up'], { z0: 24 }), s1: cvr(350, 48, 20, 14, 'timber', ['up'], { z0: 32 }), s2: cvr(350, -48, 20, 14, 'timber', ['up'], { z0: 32 }) },
  waves: [W_at(.5, [['marine', 'c1'], ['redtide', 'c2'], ['marine', 'c3']]),
    W_after([['captor', 'h1', { flag: 'free' }]], { fn: (S) => { S.spawnEnemy('hostage', null, { at: [346, 0, 0] }); S.say('captor', 'One more step and the old man swims!'); } }),
    W_after([['rusher', null, { from: [420, -60, 0] }], ['rusher', null, { from: [420, 40, 0] }], ['deckhand', 'w1'], ['deckhand', 'w2'], ['deckhand', 's1'], ['deckhand', 's2']])],
  objs: [['barrel', 140, 80, 0], ['barrel', 150, -86, 0]],
  cues: [{ at: 0, say: ['mari', 'My father is in there. Be careful!'] }, { on: 'free', say: ['tomas', 'Thank you, CREST! The override is in the control tower!'] }]
});
defScene('2-B', {
  title: 'HAMMERHEAD', time: 120, env: 'lighthouse', boss: 'hammerhead', from: [-60, 0, 24], whip: .5, looseView: 1, coverMat: 'rock', coverProp: { h: 15, mat: 'rock' },
  build(b) {
    b.floor(-120, 420, -110, 110, 0, 'steel'); b.raw(-120, -110, 0, 420, -104, 22, 'steel'); b.raw(-120, 104, 0, 420, 110, 22, 'steel');
    b.box(380, 0, 60, 50, 90, 'glass', 0, { glow: 1, solid: 0 }); b.box(380, 0, 80, 70, 8, 'steel', 90); b.box(380, 0, 8, 30, 70, 'lamp', 10, { glow: 1, edge: false });
    for (let i = 0; i < 8; i++) b.box(300 - i * 30, -104, 4, 4, 30, 'steel', 0);
    b.lamppost(80, -90, 50); b.lamppost(80, 90, 50);
  },
  slots: [{ at: [0, -22, 24] }, { at: [0, 22, 24] }], covers: {}, waves: [], cues: [{ at: -1, say: ['kai', 'That is one very large man.'] }]
});

// ---- 33-stage3.js ----
// 33-stage3.js — STAGE 3: THE TIDEWALL (05:20 → 06:00, dawn): 3-1…3-4 and the final boss 3-B (Scylla → Krake).
def('stage', 3, { name: 'THE TIDEWALL', place: 'Meridian Tidewall', clock: '05:20', music: 'tidewall', scenes: ['3-1', '3-2', '3-3', '3-4', '3-B'], intro: 'c3-intro', outro: 'c3-outro', brief: 'brief3' });
defScene('3-1', {
  title: 'CREST ROAD', time: 50, env: 'dawn', from: [-190, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 460, -140, 140, 0, 'concrete'); b.raw(-200, -50, 0, 460, 50, 1, 'asphalt', { floor: 1 }); for (let x = -180; x < 440; x += 40) b.raw(x, -3, 1, x + 20, 3, 2, 'white', { floor: 1, edge: false });
    b.raw(-200, -140, 0, 460, -128, 18, 'hazard', { solid: 0 }); b.raw(-200, 128, 0, 460, 140, 18, 'hazard', { solid: 0 });
    b.box(330, -90, 60, 70, 80, 'concrete', 0, { solid: 1 }); b.box(330, 90, 60, 70, 80, 'concrete', 0, { solid: 1 }); b.box(300, -60, 10, 4, 30, 'screen', 36, { glow: 1, edge: false });
    for (let x = -100; x < 400; x += 80) b.lamppost(x, -120, 54), b.lamppost(x, 120, 54);
    b.raw(430, -140, 0, 450, 140, 100, 'concrete', { solid: 1 }); b.box(300, 0, 6, 60, 6, 'hazard', 20, { solid: 0 });
  },
  covers: { c1: cvr(155, -40, 26, 16, 'concrete', ['up', 'left']), c2: cvr(180, 44, 26, 16, 'concrete', ['up', 'right']), g1: cvr(280, -74, 24, 14, 'steel', ['up'], { z0: 60 }), g2: cvr(285, 78, 24, 14, 'steel', ['up'], { z0: 60 }), b1: cvr(250, 0, 40, 18, 'concrete', ['up', 'left', 'right'], { w: 40 }), b2: cvr(320, 30, 26, 16, 'crate', ['up']), b3: cvr(340, -30, 26, 16, 'crate', ['up']) },
  waves: [W_at(.5, [['drone', null, { at: [230, -60, 0], z: 44 }], ['drone', null, { at: [260, -20, 0], z: 52 }], ['drone', null, { at: [250, 30, 0], z: 40 }], ['drone', null, { at: [270, 70, 0], z: 56 }], ['drone', null, { at: [240, 0, 0], z: 62 }]]),
    W_after([['rocketeer', 'g1'], ['rocketeer', 'g2'], ['deckhand', 'c1']]),
    W_after([['quartermaster', null, { route: [[420, -100, 0], [420, 100, 0]], drop: 'gl', speed: 55 }], ['marine', 'b2'], ['marine', 'b3'], ['shield', 'b1', { from: [400, 0, 0], advance: [330, 290, 260] }]])],
  objs: [['section', 255, 0, 0, { solid: 1, hp: 1 }]],
  cues: [{ at: 0, say: ['juno', 'Drones! Use the machine gun!'] }, { on: 'rk', say: ['juno', 'Rocket! Shoot it down!'] }, { at: 12, fn: s => { s.flags.rk = 1; } }, { on: 'gl', say: ['rook', 'Grenade launcher. Blow that barricade apart.'] }, { at: 26, fn: s => { s.flags.gl = 1; } }]
});
defScene('3-2', {
  title: 'SLUICE LOCKS', time: 100, env: 'dawn', from: [-170, 0, 24], whip: -.8,
  build(b) {
    b.floor(-200, 100, -140, 140, 0, 'grate'); b.floor(100, 440, -140, -40, -30, 'sea'); b.floor(100, 440, 40, 140, -30, 'sea');
    b.floor(100, 440, -40, 40, 0, 'grate'); b.raw(100, -40, 0, 420, -34, 20, 'hazard', { solid: 0 }); b.raw(100, 34, 0, 420, 40, 20, 'hazard', { solid: 0 });
    b.wall(430, -140, 140, 100, 'concrete'); b.box(420, 0, 6, 120, 70, 'steel', 0, { solid: 0 }); for (const y of [-70, -24, 24, 70]) b.box(414, y, 8, 12, 14, 'hazard', 36, { solid: 0 });
    for (let x = 140; x < 400; x += 60) { b.post(x, -48, 24, 'steel'); b.post(x, 48, 24, 'steel'); b.lamppost(x, -60, 42); }
    b.box(250, -90, 60, 40, 30, 'concrete', -30, { solid: 0 }); b.box(250, 90, 60, 40, 30, 'concrete', -30, { solid: 0 });
  },
  covers: { c1: cvr(180, -26, 26, 16, 'steel', ['up', 'left']), c2: cvr(200, 28, 26, 16, 'steel', ['up', 'right']), c3: cvr(260, -2, 26, 16, 'crate', ['up']), c4: cvr(310, -28, 26, 16, 'steel', ['up', 'left']), c5: cvr(320, 30, 26, 16, 'steel', ['up', 'right']), r1: cvr(300, -2, 24, 14, 'steel', ['up'], { z0: 0 }), r2: cvr(240, -36, 24, 14, 'crate', ['up']), r3: cvr(240, 36, 24, 14, 'crate', ['up']) },
  waves: [W_at(.6, [['deckhand', 'c1'], ['redtide', 'c2'], ['deckhand', 'c3'], ['drone', null, { at: [250, -50, 0], z: 48 }]]),
    W_after([['marine', 'c4'], ['marine', 'c5'], ['drone', null, { at: [280, 40, 0], z: 52 }], ['drone', null, { at: [260, -20, 0], z: 60 }]]),
    W_after([['redtide', 'c3'], ['deckhand', 'r2'], ['deckhand', 'r3']])],
  objs: [['lock', 414, -70, 36, { lockN: 1 }], ['lock', 414, -24, 36, { lockN: 2 }], ['lock', 414, 24, 36, { lockN: 3 }], ['lock', 414, 70, 36, { lockN: 4 }]],
  objective: s => (s.flags.locks || 0) >= 4,
  onStart: s => { s.spawnBoss('seawolf', { final: false }); },
  cues: [{ at: 0, say: ['tomas', 'Jam the four gate locks before the tide gauge peaks!'] }, { at: 20, say: ['juno', 'Gunship inbound! Duck on the strafe!'] }]
});
defScene('3-3', {
  title: 'TURBINE HALL', time: 60, env: 'turbine', from: [-180, 0, 24], whip: .8,
  build(b) {
    b.floor(-200, 440, -140, 140, 0, 'concrete'); b.raw(-200, -140, 0, 440, -130, 130, 'metal', { solid: 1 }); b.raw(-200, 130, 0, 440, 140, 130, 'metal', { solid: 1 }); b.raw(-200, -140, 130, 440, 140, 140, 'metal', { solid: 1 }); b.wall(430, -140, 140, 130, 'metal');
    for (const y of [-80, 0, 80]) { b.box(330, y, 40, 40, 70, 'steel', 0, { solid: 1 }); b.box(330, y, 44, 44, 6, 'hazard', 34, {}); b.box(310, y, 6, 30, 6, 'screen', 50, { glow: 1, edge: false }); }
    b.raw(180, -130, 50, 300, 130, 54, 'grate', { solid: 0 }); b.raw(180, -130, 0, 184, -120, 50, 'steel', {}); b.raw(180, 120, 0, 184, 130, 50, 'steel', {});
    for (let x = 120; x < 420; x += 70) { b.lamppost(x, -120, 90); b.lamppost(x, 120, 90); }
    b.box(250, -100, 12, 12, 26, 'white', 0, { solid: 1 }); b.box(256, 102, 12, 12, 26, 'white', 0, { solid: 1 });
  },
  covers: { c1: cvr(160, -36, 26, 16, 'steel', ['up', 'left']), c2: cvr(180, 36, 26, 16, 'steel', ['up', 'right']), cw1: cvr(255, -48, 24, 14, 'steel', ['up'], { z0: 56 }), cw2: cvr(255, 48, 24, 14, 'steel', ['up'], { z0: 56 }), cw3: cvr(255, 0, 24, 14, 'steel', ['up'], { z0: 56 }), t1: cvr(300, -40, 26, 16, 'crate', ['up', 'left']), t2: cvr(300, 40, 26, 16, 'crate', ['up', 'right']), t3: cvr(380, -40, 26, 16, 'crate', ['up']), t4: cvr(380, 40, 26, 16, 'crate', ['up']) },
  waves: [W_at(.5, [['marine', 'cw1'], ['redtide', 'cw2'], ['marine', 'cw3'], ['redtide', 'c1']]),
    W_after([['shield', 't1', { from: [400, -30, 0], advance: [340, 300] }], ['shield', 't2', { from: [400, 40, 0], advance: [345, 310] }], ['rusher', null, { from: [420, 0, 0] }], ['rusher', null, { from: [420, -60, 0] }]]),
    W_after([['grenadier', 't3'], ['rocketeer', 'cw3'], ['deckhand', 't4']])],
  objs: [['tank', 270, -110, 0, { hp: 3 }], ['tank', 280, 110, 0, { hp: 3 }], ['intel', 150, 100, 30, { intelId: 'i4' }]],
  cues: [{ at: 0, say: ['rook', 'Turbine hall. Loud. Watch the steam.'] }, { at: 8, say: ['juno', 'Combination arms! Mix your weapons!'] }]
});
defScene('3-4', {
  title: 'TOWER LIFT', time: 50, env: 'tower', from: [-70, 0, 26], whip: .4, moving: { speed: 22, dist: 240, hold: 1 }, lift: 1, sway: [1.4, .004], looseView: 1, coverMat: 'steel', coverProp: { h: 15, mat: 'steel' },
  build(b) {
    b.floor(-100, 120, -50, 50, -4, 'glass', { glow: 1 }); b.floor(-100, 120, -50, 50, -4, 'steel');
    b.box(340, 0, 50, 120, 700, 'concrete', -100, { solid: 0 }); b.box(250, 0, 4, 160, 700, 'glass', -100, { glow: 1, edge: false, solid: 0 });
    for (let z = 0; z < 280; z += 36) { b.box(160, -60, 6, 6, 20, 'steel', z); b.box(160, 60, 6, 6, 20, 'steel', z + 10); b.lamppost(150, -90, z + 20); }
    b.floor(-300, 600, -300, 300, -120, 'sea');
  },
  covers: { l1: cvr(160, -30, 24, 14, 'steel', ['up'], { z0: 30 }), l2: cvr(170, 28, 24, 14, 'steel', ['up'], { z0: 50 }), l3: cvr(185, 0, 24, 14, 'steel', ['up'], { z0: 100 }), ro1: cvr(160, -36, 20, 14, 'steel', ['up'], { z0: 160 }), ro2: cvr(160, 36, 20, 14, 'steel', ['up'], { z0: 160 }), r1: cvr(170, -20, 20, 14, 'steel', ['up'], { z0: 80 }), r2: cvr(170, 20, 20, 14, 'steel', ['up'], { z0: 120 }) },
  waves: [W_at(.5, [['drone', null, { at: [200, -40, 0], z: 40 }], ['drone', null, { at: [220, 20, 0], z: 54 }], ['drone', null, { at: [210, 50, 0], z: 46 }]]),
    { atD: 70, spawn: [['marine', 'r1', { entry: 'rappel', from: [170, -20, 180] }], ['marine', 'r2', { entry: 'rappel', from: [170, 20, 200] }], ['redtide', 'l3']] },
    { atD: 140, spawn: [['marine', 'ro1'], ['marine', 'ro2'], ['rocketeer', 'ro1']] }],
  objs: [['lifering', 140, 40, 60]],
  objective: s => !s.boss || s.boss.dead,
  onStart: s => { }, bossAtD: 160, bossId: 'seawolf',
  cues: [{ at: 0, say: ['kai', 'Glass elevator. Always the glass elevator.'] }, { atD: 160, say: ['juno', 'Seawolf is back! Take out its weapon pods!'] }]
});
defScene('3-B', {
  title: 'SCYLLA', time: 90, env: 'tower', boss: 'scylla', from: [-70, 0, 24], whip: .5, looseView: 1, coverMat: 'concrete', coverProp: { h: 15, mat: 'concrete' },
  build(b) {
    b.floor(-120, 460, -130, 130, 0, 'concrete'); b.raw(-120, -130, 0, 460, -124, 24, 'concrete', { solid: 0 }); b.raw(-120, 124, 0, 460, 130, 24, 'concrete', { solid: 0 });
    b.floor(300, 460, -130, 130, 0, 'hazard'); for (let y = -100; y <= 100; y += 50) b.box(420, y, 4, 4, 70, 'steel', 0);
    b.box(450, 0, 12, 200, 70, 'screen', 20, { glow: 1, edge: false }); b.lamppost(60, -100, 50); b.lamppost(60, 100, 50);
    b.box(210, -36, 18, 26, 14, 'concrete', 0, { solid: 1 }); 
  },
  slots: [{ at: [0, -22, 24] }, { at: [0, 22, 24] }], covers: { k1: cvr(250, -70, 20, 14, 'concrete', ['up', 'left'], { hidden: 1 }), k2: cvr(255, 0, 20, 14, 'concrete', ['up'], { hidden: 1 }), k3: cvr(250, 70, 20, 14, 'concrete', ['up', 'right'], { hidden: 1 }) }, waves: [], cues: [{ at: -1, say: ['kai', 'Is that a crab? That is a big crab.'] }]
});

// ---- 34-range.js ----
// 34-range.js — TRAINING: the CREST range, four short drills that teach every mechanic (Juno instructs).
def('stage', 0, { name: 'CREST RANGE', place: 'CREST HQ, Port Lumen', clock: '—', music: 'range', scenes: ['T-1', 'T-2', 'T-3', 'T-4'], brief: 'brief0' });
def('enemy', 'turretbot', { name: 'Turret Bot', hp: 3, score: 1000, ai: 'peek', exposed: [9, 9], burst: 1, gap: 0, chance: [1, 1, 1], always: true, tel: 1.3, peeks: ['none'], look: { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'helmet', weapon: 'gun', colors: { cloth: '#8a8f9a', pants: '#555a64', plate: '#c03a3a' } } });
const rangeBuild = b => { b.floor(-200, 420, -110, 110, 0, 'concrete'); b.raw(-200, -110, 0, 420, -100, 60, 'metal', { solid: 1 }); b.raw(-200, 100, 0, 420, 110, 60, 'metal', { solid: 1 }); b.raw(-200, -110, 60, 420, 110, 66, 'metal', { solid: 1 }); b.wall(400, -110, 110, 60, 'steel');
  for (let x = 100; x < 400; x += 60) { b.raw(x, -3, 0, x + 4, 3, 1, 'hazard', { floor: 1 }); b.lamppost(x, -96, 50); b.lamppost(x, 96, 50); }
  for (const y of [-60, 0, 60]) b.raw(150, y - 1, 0, 340, y + 1, 12, 'hazard', { solid: 0 }); b.box(396, 0, 2, 100, 20, 'screen', 24, { glow: 1, edge: false }); };
const rcv = (x, y, w = 24) => ({ x, y, w, h: 16, mat: 'crate', peek: ['up'] });
defScene('T-1', { title: 'AIM & FIRE', stage: 0, time: 90, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(170, -50), b: rcv(200, 30), c: rcv(230, -20), d: rcv(260, 60), e: rcv(290, -60), f: rcv(320, 10) },
  waves: [W_at(.5, [['target', 'a'], ['target', 'b'], ['target', 'c'], ['target', 'd'], ['target', 'e'], ['target', 'f']])], cues: [{ at: 0, say: ['juno', 'Welcome to the CREST range, agent! Aim and shoot the cut-outs.'], prompt: 'cover' }, { at: 1, fn: s => { s.emit('prompt', { id: 'cover' }); } }] });
defScene('T-2', { title: 'COVER & RELOAD', stage: 0, time: 90, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(180, -40), b: rcv(220, 40), c: rcv(260, -10), d: rcv(240, -70), e: rcv(300, 60), t: { x: 330, y: 0, w: 30, h: 18, mat: 'steel', peek: ['none'], hidden: 1 } },
  waves: [W_at(.5, [['turretbot', 't', {}]]), W_after([['target', 'a'], ['target', 'b'], ['target', 'c'], ['target', 'd'], ['target', 'e'], ['target', 'a'], ['target', 'b'], ['target', 'c'], ['target', 'd'], ['target', 'e'], ['target', 'c']])],
  cues: [{ at: 0, say: ['juno', 'The turret telegraphs every shot. Hold cover when the ring closes!'] }, { on: 'rl', say: ['juno', 'Magazine low? Duck behind cover. You reload in cover!'] }, { at: 14, fn: s => { s.flags.rl = 1; s.emit('prompt', { id: 'reload' }); } }] });
defScene('T-3', { title: 'WEAPONS', stage: 0, time: 120, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(190, -40), b: rcv(230, 40), c: rcv(290, 0, 30), t: rcv(300, -60), u: rcv(330, 50) },
  waves: [W_at(.5, [['quartermaster', null, { route: [[380, -90, 0], [380, 90, 0]], drop: 'mg', speed: 36 }]]), W_after([['drone', null, { at: [220, -30, 0], z: 44 }], ['drone', null, { at: [250, 20, 0], z: 52 }], ['drone', null, { at: [240, 60, 0], z: 40 }]]),
    W_after([['quartermaster', null, { route: [[380, -90, 0], [380, 90, 0]], drop: 'sg', speed: 36 }]]), W_after([['shield', 'c', { from: [340, 0, 0], advance: [300, 260] }]]),
    W_after([['quartermaster', null, { route: [[380, -90, 0], [380, 90, 0]], drop: 'gl', speed: 36 }]]), W_after([['grenadier', 'u'], ['target', 't']])],
  objs: [['crate', 340, 20, 0], ['crate', 340, 36, 0], ['crate', 340, 28, 14]],
  cues: [{ at: 0, say: ['juno', 'Orange vest! Shoot him for machine-gun ammo, then switch weapons.'] }, { at: 3, fn: s => { s.emit('prompt', { id: 'switch' }); } }] });
defScene('T-4', { title: 'READ THE CRISIS', stage: 0, time: 90, env: 'range', from: [-150, 0, 24], whip: .5, build: rangeBuild, covers: { a: rcv(180, -40), b: rcv(220, 40), c: rcv(270, -20), d: rcv(250, -70), e: rcv(300, 60), g: rcv(320, 0), h: rcv(340, -50), i: rcv(340, 50) },
  waves: [W_at(.5, [['redtide', 'c']]), W_after([['grenadier', 'g']]), W_after([['target', 'a'], ['target', 'b'], ['target', 'd'], ['target', 'e'], ['target', 'h'], ['target', 'i'], ['target', 'c'], ['target', 'g']])],
  civ: [{ at: 8, route: [[120, 60, 0], [330, 10, 0]], speed: 28 }],
  cues: [{ at: 0, say: ['juno', 'Red Tide never miss! Hit them first, or duck.'] }, { on: 'gr', say: ['juno', 'Grenade! Shoot it out of the air. And never shoot civilians.'] }, { at: 12, fn: s => { s.flags.gr = 1; } }] });
def('brief', 'brief0', { title: 'CREST RANGE', pages: [] });

// ---- 40-draw.js ----
// 40-draw.js — presentation of a Sim: world, actors (engine rigs as billboards), bosses, projectiles, particles,
// threat rings. Reads sim.* only (plain data). Owns: rigs, particles, camera juice.
const Pres = {
  rigs: new Map(), parts: [], tracers: [], lights: [], rings: [], popups: [], trauma: 0, flashT: 0, scratch: null, prevPos: new Map(), decals: [], shakeKick: 0, zaps: [],
  reset() { this.rigs.clear(); this.parts.length = 0; this.tracers.length = 0; this.lights.length = 0; this.popups.length = 0; this.prevPos.clear(); this.decals.length = 0; this.zaps.length = 0; this.trauma = 0; },
  rig(e) {
    let r = this.rigs.get(e.id); if (r) return r;
    const d = reg('enemy', e.type), look = d && d.look; if (!look) return null;
    const o = Object.assign({}, look); o.colors = Object.assign({ skin: e.skin }, look.colors || {}); r = new E.Humanoid(o); this.rigs.set(e.id, r); return r;
  },
  mkRig(key, opts) { let r = this.rigs.get(key); if (!r) { r = new E.Humanoid(opts); this.rigs.set(key, r); } return r; }
};
const ViewCache = {}; const viewFor = (k, pitch) => { const q = Math.max(1 / 8, Math.round(k * 16) / 16), key = q + ':' + pitch; return ViewCache[key] || (ViewCache[key] = new E.View('fp', 'First person', 0, pitch, q, 1)); };
function addParts(n, fn) { for (let i = 0; i < n; i++) Pres.parts.push(fn(i)); }
const prand = (a, b) => a + (b - a) * cosmetic();
// ---- turn sim events into effects ----
function consumeEvents(sim, ctx) {
  for (const ev of sim.events) {
    switch (ev.type) {
      case 'impact': { const mat = ev.mat; const col = mat === 'steel' || mat === 'metal' ? '#ffe9a8' : mat === 'crate' || mat === 'planks' || mat === 'timber' ? '#c89a5a' : mat === 'ground' ? '#9a8f80' : '#cfcfcf'; addParts(ev.spark ? 8 : 5, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-30, 30) - 40, vy: prand(-40, 40), vz: prand(10, 70), life: prand(.2, .5), col, sz: 1, g: 240, add: !!ev.spark })); Pres.decals.push({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], life: 8 }); if (Pres.decals.length > 60) Pres.decals.shift(); break; }
      case 'hit': addParts(5, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-30, 30), vy: prand(-30, 30), vz: prand(0, 50), life: .3, col: '#ff4a3a', sz: 1, g: 200 })); break;
      case 'kill': Pres.popups.push({ t: 0, pos: ev.pos, text: '+' + ev.score, col: '#ffe48a' }); break;
      case 'explode': { const r = ev.r; addParts(ev.big ? 40 : 22, () => { const a = cosmetic() * TAU, s = prand(20, r * 3); return { x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: Math.cos(a) * s * .6, vy: Math.sin(a) * s, vz: prand(10, s * .8), life: prand(.3, .9), col: cosmetic() < .5 ? '#ffb040' : '#ff6a2a', sz: ev.big ? 3 : 2, g: 100, add: true }; }); addParts(14, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-30, 30), vy: prand(-30, 30), vz: prand(10, 50), life: prand(.8, 1.6), col: '#3a3438', sz: 3, g: -15, smoke: 1 })); Pres.lights.push({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2] + 10, r: r * 3, k: 1.2, life: .35, col: '#ffb060' }); Pres.trauma = Math.min(1, Pres.trauma + (ev.big ? .55 : .25)); break; }
      case 'break': addParts(10, () => ({ x: ev.pos[0], y: ev.pos[1], z: ev.pos[2], vx: prand(-50, 50), vy: prand(-50, 50), vz: prand(20, 80), life: prand(.5, 1), col: ev.mat === 'glass' ? '#cfe8ff' : '#9a6a38', sz: 2, g: 260 })); break;
      case 'eshot': { const m = ev.from; Pres.lights.push({ x: m[0], y: m[1], z: m[2], r: 60, k: .8, life: .08, col: '#ffe9a8' }); addParts(3, () => ({ x: m[0], y: m[1], z: m[2], vx: prand(-20, 20) - 30, vy: prand(-20, 20), vz: prand(-10, 20), life: .1, col: '#fff2b0', sz: 2, g: 0, add: true })); break; }
      case 'emiss': Pres.tracers.push({ a: ev.from, b: ev.to, life: .12, col: '#ffe9a8' }); break;
      case 'threat': { const e = sim.enemies.find(x => x.id === ev.src); Pres.rings.push({ id: ev.id, src: ev.src, tgt: ev.tgt, t0: sim.t, tel: ev.tel, sp: ev.sp, kind: ev.kind }); break; }
      case 'shot': { const p = sim.players[ev.p]; if (p && ctx && ctx.local && ctx.local.includes(ev.p)) Pres.shakeKick = .1; Pres.lights.push({ x: sim.pose(ev.p).x + 10, y: sim.pose(ev.p).y, z: sim.pose(ev.p).z, r: 70, k: .5, life: .05, col: '#ffe9a8' }); break; }
      case 'hurt': Pres.trauma = Math.min(1, Pres.trauma + .6); break;
      case 'smoke': ctx.smoke = ev.dur; break;
      case 'bigboom': Pres.trauma = 1; break;
    }
  }
}
function stepPres(dt, sim) {
  const P = Pres; P.trauma = Math.max(0, P.trauma - dt * 1.6); P.shakeKick = Math.max(0, P.shakeKick - dt);
  for (const p of P.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= (p.g || 0) * dt; if (p.z < 0 && !p.smoke) { p.z = 0; p.vz *= -.3; p.vx *= .6; p.vy *= .6; } }
  P.parts = P.parts.filter(p => p.life > 0); if (P.parts.length > 900) P.parts.splice(0, P.parts.length - 900);
  for (const t of P.tracers) t.life -= dt; P.tracers = P.tracers.filter(t => t.life > 0);
  for (const l of P.lights) l.life -= dt; P.lights = P.lights.filter(l => l.life > 0);
  for (const d of P.decals) d.life -= dt; P.decals = P.decals.filter(d => d.life > 0);
  for (const q of P.popups) q.t += dt; P.popups = P.popups.filter(q => q.t < 1.1);
  P.rings = P.rings.filter(r => sim.threats.some(t => t.id === r.id) || sim.t - r.t0 < r.tel + .02);
  // actor rigs
  for (const e of sim.enemies) { const rig = P.rig(e); if (!rig) continue; updateRig(rig, e, dt, sim); }
  if (sim.boss) updateBossRigs(sim, dt);
  if (P.rigs.size > 80) { const live = new Set(sim.enemies.map(e => e.id)); for (const k of P.rigs.keys()) if (typeof k === 'number' && !live.has(k)) P.rigs.delete(k); }
}
function updateRig(rig, e, dt, sim) {
  const prev = Pres.prevPos.get(e.id) || [e.x, e.y, e.foot]; const vx = (e.x - prev[0]) / Math.max(dt, 1e-4), vy = (e.y - prev[1]) / Math.max(dt, 1e-4); Pres.prevPos.set(e.id, [e.x, e.y, e.foot]);
  const st = { x: e.x, y: e.y, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, hurt: e.hurtT > 0 };
  if (e.dead && e.falling) { st.air = true; st.expr = 'wince'; }
  else if (e.dead) { st.pose = e.dt < .9 ? 'die' : 'down'; if (e.dt > .9) st.down = 1; if (e.deathStyle === 'flyback' && e.dt < .5) st.flip = Math.sin(clamp(e.dt / .5, 0, 1) * Math.PI) * .6; st.expr = 'wince'; }
  else {
    switch (e.anim) {
      case 'crouch': st.pose = 'crouch'; break;
      case 'point': st.point = true; st.aim = -.02; break;
      case 'run': st.run = 1; st.vy = 40; st.point = e.st === 'entry' ? false : false; break;
      case 'walk': st.vy = 14; st.point = true; break;
      case 'air': st.air = true; break;
      case 'land': st.land = .9; break;
      case 'roll': st.flip = (e.ent ? e.ent.t / e.ent.dur : 0); break;
      case 'climb': st.climb = true; st.vz = -20; break;
      case 'windup': st.attack = E.move('overhead', .3); break;
      case 'slash': st.attack = E.move('slash', clamp(e.t / .3, 0, 1)); break;
      case 'panic': st.run = 1; st.vy = 30; st.pose = 'cheer'; break;
    }
    if (e.stagger > 0) st.lean = .3; if (e.type === 'civilian' || e.type === 'hostage') st.expr = 'shout';
    if (e.st === 'aim' || e.st === 'fire') st.expr = 'angry';
    if (e.type === 'hostage') { st.pose = 'guard'; }
  }
  rig.update(dt, st);
}
// actor billboard: rig -> scratch canvas -> tinted by fog and flash -> game buffer
function drawActor(g, rig, sx, sy, k, o = {}) {
  if (k < .25) return;
  const S = Pres.scratch || (Pres.scratch = E.mkCanvas(220, 220)); const sg = E.ctx2d(S);
  sg.clearRect(0, 0, 220, 220); E.px.reset(sg); const v = viewFor(k * (o.size || 1), 8);
  rig.draw(sg, 110, 190, v); E.px.reset(sg);
  sg.globalCompositeOperation = 'source-atop';
  if (o.fog > 0) { sg.globalAlpha = o.fog * .7; sg.fillStyle = o.fogCol; sg.fillRect(0, 0, 220, 220); }
  sg.globalAlpha = .22; sg.fillStyle = o.tint || '#0a1430'; sg.fillRect(0, 0, 220, 220);
  if (o.flash) { sg.globalAlpha = .75; sg.fillStyle = '#ffffff'; sg.fillRect(0, 0, 220, 220); }
  sg.globalAlpha = 1; sg.globalCompositeOperation = 'source-over';
  g.drawImage(S, Math.round(sx - 110), Math.round(sy - 190)); E.px.reset(g);
}
// ---- boss geometry ----
function bossBoxes(sim, B) {
  const out = [], P = B.pos, id = B.id, bx = (cx, cy, dx, dy, h, mat, z0, o) => out.push(Object.assign({ x0: cx - dx / 2, x1: cx + dx / 2, y0: cy - dy / 2, y1: cy + dy / 2, z0, z1: z0 + h, mat }, o));
  if (id === 'stingray') {
    for (const k of ['turretL', 'turretR']) { const p = B.parts[k]; if (!p.dead) { bx(p.pos[0], p.pos[1], 16, 16, 10, p.flash > 0 ? 'white' : 'steel', 18); bx(p.pos[0] - 14, p.pos[1], 20, 4, 4, 'black', 25); } else bx(p.pos[0], p.pos[1], 14, 14, 3, 'rust', 12); }
    
    
  } else if (id === 'bulldog') {
    const x = P[0], y = P[1];
    bx(x + 10, y, 80, 40, 20, 'steel', 6, { solid: 0 }); bx(x - 22, y, 24, 40, 18, 'hull_w', 8); bx(x + 8, y - 4, 40, 40, 28, 'corr_ochre', 26);
    bx(x - 28, y, 8, 30, 10, 'glass', 22, { glow: 1, edge: false }); for (const sy of [-14, 14]) for (const sx of [-24, 22]) bx(x + sx, y + sy * 1.4, 14, 6, 14, 'black', 0, { edge: false });
    const f = B.parts.fuel, g_ = B.parts.gunner; if (!f.dead) bx(x + 22, y - 6, 18, 26, 26, f.flash > 0 ? 'white' : 'barrel', 6);
    if (!g_.dead) { bx(x, y + 10, 12, 12, 10, g_.flash > 0 ? 'white' : 'black', 38); bx(x - 12, y + 10, 16, 3, 3, 'steel', 44, { edge: false }); }
  } else if (id === 'scylla') {
    const x = P[0], y = P[1], top = B.toppled ? -26 : 0;
    bx(x + 6, y, 70, 110, 24, B.toppled ? 'rust' : 'steel', 40 + top); bx(x - 4, y, 40, 56, 26, 'hull', 62 + top); bx(x - 18, y, 8, 30, 14, 'glass', 64 + top, { glow: 1, edge: false });
    const cp = B.parts.cockpit; if (cp.vulnerable) bx(x - 22, y, 6, 22, 14, cp.flash > 0 ? 'white' : 'neon_y', 66 + top, { glow: 1, edge: false });
    for (let i = 0; i < 6; i++) { const kp = B.parts['knee' + i], ky = y + (i - 2.5) * 30, kx = x + (i % 2) * 14; if (!kp.dead) { bx(kx, ky, 8, 8, 30 + top * .5, 'steel', 12 + top * .5); bx(kx, ky, 12, 12, 12, kp.flash > 0 ? 'white' : 'neon_y', 24 + top * .5, { glow: 1, edge: false }); bx(kx - 6, ky, 6, 6, 14, 'rust', 0); } else { bx(kx, ky, 8, 8, 12, 'rust', 0); } }
    for (const sy of [-1, 1]) { bx(x - 24, y + sy * 52, 22, 20, 18, 'rust', 44 + top); bx(x - 40, y + sy * 52, 18, 6, 6, 'black', 52 + top); bx(x + 6, y + sy * 36, 14, 18, 10, 'steel', 66 + top); }
  } else if (id === 'seawolf') {
    const x = P[0], y = P[1], z = P[2], f = B.parts.body;
    bx(x, y, 40, 18, 16, f && f.flash > 0 ? 'white' : 'black', z - 8); bx(x + 36, y, 36, 6, 6, 'black', z); bx(x + 52, y, 4, 4, 14, 'steel', z - 2); bx(x - 8, y, 14, 14, 8, 'glass', z, { glow: 1, edge: false });
    bx(x, y, 6, 6, 10, 'steel', z + 8); bx(x, y, 10, 90, 2, 'steel', z + 18, { edge: false }); bx(x, y, 90, 10, 2, 'steel', z + 18 + Math.sin(B.t * 40) * .1, { edge: false });
    for (const k of ['podL', 'podR']) { const p = B.parts[k]; if (p && !p.dead) bx(x, y + (k === 'podL' ? -34 : 34), 14, 10, 8, p.flash > 0 ? 'white' : 'steel', z - 14); }
  }
  return out;
}
function updateBossRigs(sim, dt) {
  const B = sim.boss, id = B.id;
  if (id === 'stingray' && B.parts.barracuda && !B.parts.barracuda.hidden) { const rig = Pres.mkRig('barracuda', { build: 'heroic', size: 1.05, outfit: 'coat', hair: 'ponytail', weapon: 'sword', colors: { cloth: '#1d7a8a', coat: '#1d7a8a', hair: '#f4f4f4', pants: '#154a5a', plate: '#5a7a80' }, armor: true }); const p = B.parts.barracuda; rig.update(dt, { x: p.pos[0], y: p.pos[1], z: 0, facing: Math.PI / 2, point: B.phase === 2 && p.vulnerable, pose: B.phase === 2 && !p.vulnerable ? 'crouch' : (B.anim.stagger ? 'kneel' : undefined), attack: B.anim.slash ? E.move('slash', .5) : undefined, expr: 'angry' }); }
  if (id === 'hammerhead') { const rig = Pres.mkRig('hammerhead', { build: 'bulky', size: 1.6, outfit: 'coat', hat: 'helmet', armor: true, weapon: 'gun', colors: { cloth: '#4a4a56', coat: '#4a4a56', plate: '#7a828e', metal: '#9aa0aa', pants: '#2a2a30' } }); const m = B.anim.mode; rig.update(dt, { x: B.pos[0], y: B.pos[1], z: B.pos[2], vx: 0, facing: Math.PI / 2, point: m === 'sweep' || m === 'plant', run: m === 'charge' ? 1 : 0, vy: m === 'charge' ? 50 : m === 'walk' ? 10 : 0, pose: m === 'stagger' ? 'kneel' : undefined, attack: m === 'slam' ? E.move('overhead', .5) : undefined, expr: 'angry' }); }
  if (id === 'krake') { const rig = Pres.mkRig('krake', { build: 'heroic', size: 1.15, outfit: 'coat', hair: 'long', hat: { style: 'cap', color: '#1d2a4a' }, cape: { len: 8, width: 6, seg: 3 }, weapon: 'sword', colors: { cloth: '#1d2a4a', coat: '#1d2a4a', trim: '#d4af37', hair: '#f0f0f0', cape: '#1d2a4a', capeIn: '#8a1e2a', pants: '#10182a' } }); const m = B.anim.mode; rig.update(dt, { x: B.pos[0], y: B.pos[1], z: B.pos[2], facing: Math.PI / 2, point: m === 'idle' || m === 'lunge', flip: m === 'roll' ? (B.t * 2 % 1) : 0, expr: 'angry', pose: B.final ? 'cheer' : undefined }); }
}
// ---- the world draw ----
function drawWorld(g, sim, pid, W, H, t, opts = {}) {
  const sc = sim.scene; if (!sc) return;
  const pose = Object.assign({}, opts.pose || sim.pose(pid)); const tr = Pres.trauma * Pres.trauma * (E.current && E.current.settings && E.current.settings.shake === false ? 0 : 1);
  pose.yaw += Math.sin(t * 31) * tr * .035 + (opts.noise || 0); pose.pitch += Math.sin(t * 27 + 2) * tr * .03 + Pres.shakeKick * .12; pose.roll = (pose.roll || 0) + Math.sin(t * 23) * tr * .03;
  if (sim.players[pid] && sim.players[pid].hurt > 0) pose.roll += sim.players[pid].hurt * .08 * Math.sin(t * 50);
  R3.setCam(pose, W, H);
  const env = Object.assign({}, sc.envData); env.lights = (sc.lights || []).concat(Pres.lights);
  if (sim.boss && sim.boss.smoke > 0) { env.fog = [env.fog[0], 60, 420]; }
  // lightning (storm)
  let flash = 0; if (env.storm) { const ph = (t % 11); if (ph < .18 || (ph > .3 && ph < .38)) flash = .6; if (flash) { env.sky = [R3.mix(env.sky[0], '#ffffff', flash * .6), R3.mix(env.sky[1], '#ffffff', flash * .6), R3.mix(env.sky[2], '#ffffff', flash * .6)]; env.ambient = (env.ambient || .5) + .3; } }
  const hy = R3.drawSky(g, env, t, W, H); R3.drawSea(g, env, t, W, H, hy);
  // gather
  if (!sc._tess) { sc._tess = []; for (const b of sc.boxes) for (const q of (b.floor ? [b] : R3.tess(b))) sc._tess.push(q); }
  const list = []; const C = R3.cam, rail = sim.rail * (sc.lift ? 0 : 1);
  for (const b of sc._tess) { const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2, czm = (b.z0 + b.z1) / 2; const k = b.floor ? 1e12 - Math.hypot(cxm - C.x, cym - C.y) * 1e6 : R3.sortKey(cxm, cym, czm); list.push({ k, b }); }
  for (let i = 0; i < sim.players.length; i++) { const cb = sim.coverBox(i); list.push({ k: R3.sortKey((cb.x0 + cb.x1) / 2, (cb.y0 + cb.y1) / 2, cb.z1 / 2) - 2000 * 0, b: cb, own: i }); }
  for (const o of sim.objs) { if (o.dead) continue; const mat = o.kind === 'barrel' || o.kind === 'tank' ? o.mat : o.mat; const bb = { x0: o.x - o.rx, x1: o.x + o.rx, y0: o.y - o.ry, y1: o.y + o.ry, z0: o.z, z1: o.z + o.h, mat: o.flash > 0 ? 'white' : mat, glow: o.kind === 'lantern' || o.kind === 'bottle' || o.kind === 'intel' || o.kind === 'lock' ? 1 : 0, edge: o.kind !== 'bottle' }; if (o.kind === 'lifering') { bb.mat = Math.floor(t * 3) % 2 ? 'white' : 'barrel'; bb.glow = 1; } list.push({ k: R3.sortKey(o.x, o.y, o.z), b: bb }); }
  for (const e of sim.enemies) { if (e.gone && e.dt > 3) continue; list.push({ k: R3.sortKey(e.x, e.y, e.foot + 8), e }); }
  if (sim.boss) { for (const q of bossBoxes(sim, sim.boss)) list.push({ k: R3.sortKey((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2), b: q }); const B = sim.boss; const rg = B.id === 'stingray' ? 'barracuda' : B.id; if (Pres.rigs.has(rg) && ((B.id === 'stingray' && !B.parts.barracuda.hidden && !B.parts.barracuda.dead) || B.id === 'hammerhead' || B.id === 'krake')) list.push({ k: R3.sortKey(B.id === 'stingray' ? B.parts.barracuda.pos[0] : B.pos[0], B.id === 'stingray' ? B.parts.barracuda.pos[1] : B.pos[1], 10), boss: rg }); }
  for (const pr of sim.proj) if (!pr.dead) list.push({ k: R3.sortKey(pr.x, pr.y, pr.z), pr });
  for (const p of Pres.parts) list.push({ k: R3.sortKey(p.x, p.y, p.z) - 1, part: p });
  list.sort((a, b) => b.k - a.k);
  const fogC = env.fog[0], fogN = env.fog[1], fogF = env.fog[2];
  for (const it of list) {
    if (it.b) { R3.drawBox(g, env, it.b, t); }
    else if (it.e) drawEnemy(g, sim, it.e, env, t);
    else if (it.boss) { const rig = Pres.rigs.get(it.boss), B = sim.boss, P = it.boss === 'barracuda' ? B.parts.barracuda.pos : B.pos; const pj = R3.proj(P[0], P[1], B.id === 'stingray' ? P[2] - 24 : P[2]); if (pj) drawActor(g, rig, pj[0], pj[1], C.F / pj[2], { fog: clamp((pj[2] - fogN) / (fogF - fogN), 0, 1), fogCol: fogC, size: 1, flash: B.parts[it.boss === 'barracuda' ? 'barracuda' : it.boss === 'hammerhead' ? 'body' : 'krake'].flash > 0 }); if (it.boss === 'hammerhead' && B.shield && !(B.shieldDown > 0)) { const sp = R3.proj(P[0] - 10, P[1], 24); if (sp) { const k = C.F / sp[2]; px.blend(g, .55, 'normal', () => { px.rect(g, sp[0] - 13 * k, sp[1] - 20 * k, 26 * k, 40 * k, '#7a828e'); px.rect(g, sp[0] - 10 * k, sp[1] - 16 * k, 20 * k, 32 * k, '#5a626e'); }); px.rect(g, sp[0] - 13 * k, sp[1] - 20 * k, 26 * k, Math.max(1, k), '#cfd6e0'); } } }
    else if (it.pr) drawProj(g, it.pr, t);
    else if (it.part) drawPart(g, it.part, t);
  }
  // decals and tracers and lasers
  for (const tr of Pres.tracers) { const a = R3.proj(tr.a[0], tr.a[1], tr.a[2]), b = R3.proj(tr.b[0], tr.b[1], tr.b[2]); if (a && b) px.line(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, tr.col, 1); }
  for (const e of sim.enemies) if (!e.dead && reg('enemy', e.type).laser && e.st === 'aim') { const m = sim.muzzle(e), a = R3.proj(m[0], m[1], m[2]), tg = sim.players[sim.threats.find(q => q.src === e.id) ? sim.threats.find(q => q.src === e.id).tgt : 0], pp = R3.proj(tg.aim ? sim.pose(tg.id).x + 8 : 0, sim.pose(tg.id).y, sim.pose(tg.id).z - 3); if (a && pp) { px.blend(g, .8, 'add', () => px.line(g, a[0] | 0, a[1] | 0, pp[0] | 0, pp[1] | 0, '#ff3030', 1)); } }
  if (opts.sea !== false && env.beam) { const bang = t * .8, bx2 = 396 + Math.cos(bang) * 300, by2 = Math.sin(bang) * 300, a = R3.proj(396, 0, 288), bq = R3.proj(bx2, by2, 150); if (a && bq && Math.cos(bang) > -.3) px.blend(g, .35, 'add', () => { px.line(g, a[0] | 0, a[1] | 0, bq[0] | 0, bq[1] | 0, '#ffffd0', 3); }); }
  // rain
  if (env.storm) { const n = 90; for (let i = 0; i < n; i++) { const h = ((i * 2654435761) >>> 0) / 4294967296, h2 = ((i * 40503 + 77) * 2246822519 >>> 0) / 4294967296; const x = (h * W + t * 40) % W, y = ((h2 * H) + t * 520 * (.6 + h)) % H; px.line(g, x | 0, y | 0, (x - 2) | 0, (y + 6) | 0, '#8fb0c8', 1); } }
  if (flash) { px.blend(g, flash * .35, 'add', () => px.rect(g, 0, 0, W, H, '#ffffff')); }
  if (sim.boss && sim.boss.smoke > 0) px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, H, '#6a6a72'));
  // fireworks (stage 1)
  if (env.fireworks) { const n = 3; for (let i = 0; i < n; i++) { const ph = ((t * .5 + i * .37) % 1.6), ang = (i * 1.7 + Math.floor(t * .5 + i * .37 / 1.6) * 2.3), seed = i * 7 + Math.floor((t * .5 + i * .37) / 1.6); const cx = 40 + ((hash32('fw' + seed) % 1000) / 1000) * (W - 80), cy = 28 + ((hash32('fy' + seed) % 100) / 100) * 40; if (ph < 1.1) { const rr = Math.min(1, ph / .6) * 26, a = 1 - ph / 1.1; const col = ['#ff5a5a', '#ffd34a', '#5ad1ff', '#8aff8a'][seed % 4]; px.blend(g, .9 * a, 'add', () => { for (let k = 0; k < 16; k++) { const aa = k / 16 * TAU; px.dot(g, (cx + Math.cos(aa) * rr) | 0, (cy + Math.sin(aa) * rr + ph * ph * 8) | 0, col); } }); } } }
  Pres.fogUsed = fogC;
}
function drawEnemy(g, sim, e, env, t) {
  const d = reg('enemy', e.type); if (!d) return; const C = R3.cam, fogC = env.fog[0], fogN = env.fog[1], fogF = env.fog[2];
  const dead = e.dead; if (dead && e.dt > 1.8 && (e.dt * 10 | 0) % 2) return;
  const sink = dead && e.dt > 1 && e.cover ? (e.dt - 1) * 20 : 0;
  const pj = R3.proj(e.x, e.y, e.foot - sink); if (!pj) return; const k = C.F / pj[2], fog = clamp((pj[2] - fogN) / (fogF - fogN), 0, 1);
  // blob shadow
  const gp = R3.proj(e.x, e.y, e.bz != null && !dead ? Math.max(e.bz, 0) : 0); if (gp && !dead && e.type !== 'drone') px.blend(g, .35, 'normal', () => px.ell(g, gp[0], gp[1], 6 * k, 2.2 * k, '#000000'));
  if (e.type === 'drone') {
    const x = pj[0], y = pj[1], s = Math.max(1, k * 6); px.rect(g, x - s, y - s * .5, s * 2, s, e.flash > 0 ? '#ffffff' : '#2a2f3a'); for (const dx of [-1.6, 1.6]) px.rect(g, x + dx * s - s * .6, y - s * 1.1 + (Math.floor(t * 30) % 2) * .5, s * 1.2, Math.max(1, s * .2), '#8a95a8'); px.blend(g, .9, 'add', () => px.disc(g, x, y + s * .1, Math.max(1, s * .45), e.zapping ? '#ffffff' : '#ff3030')); return;
  }
  const rig = Pres.rigs.get(e.id); if (!rig) return;
  const opts = { fog, fogCol: fogC, flash: e.flash > 0, size: 1 };
  if (e.type === 'jetski') { const x = pj[0], y = pj[1], s = k; px.rect(g, x - 14 * s, y - 2 * s, 28 * s, 6 * s, e.flash > 0 ? '#fff' : '#d83030'); px.rect(g, x - 12 * s, y + 2 * s, 24 * s, 2 * s, '#8a1e1e'); px.rect(g, x - 20 * s, y + 3 * s, 40 * s, 1, '#9fe0ff'); }
  drawActor(g, rig, pj[0], pj[1], k, opts);
  if (e.shield && e.shieldUp) { const sp = R3.proj(e.x - 7, e.y, e.foot + 12); if (sp) { const kk = C.F / sp[2]; px.rect(g, sp[0] - 9 * kk, sp[1] - 12 * kk, 18 * kk, 26 * kk, '#59616f'); px.rect(g, sp[0] - 7 * kk, sp[1] - 10 * kk, 14 * kk, 22 * kk, '#78828f'); px.rect(g, sp[0] - 7 * kk, sp[1] - 3 * kk, 14 * kk, Math.max(1, 3 * kk), '#bfe8ff'); } }
  if (e.type === 'quartermaster' && !dead) { const cp = R3.proj(e.x + 4, e.y, e.foot + 14); if (cp) { const kk = C.F / cp[2]; px.rect(g, cp[0] - 5 * kk, cp[1] - 4 * kk, 10 * kk, 8 * kk, '#e8761e'); px.rect(g, cp[0] - 5 * kk, cp[1] - 4 * kk, 10 * kk, Math.max(1, kk), '#a84a0e'); } }
  if (!dead && e.civ && sim.t % 1 < .5 && false) { }
  if (tune.view.hitVol) for (const v of sim.volumes(e)) if (v.k === 's') { const c = R3.proj(v.c[0], v.c[1], v.c[2]); if (c) px.disc(g, c[0], c[1], v.r * C.F / c[2], v.part === 'head' ? '#ff00ff' : '#00ffff'); }
}
function drawProj(g, pr, t) {
  const p = R3.proj(pr.x, pr.y, pr.z); if (!p) return; const k = R3.cam.F / p[2], s = Math.max(1.5, (pr.r || 5) * k * .8);
  const col = pr.kind === 'grenade' ? '#4a5a3a' : pr.kind === 'rocket' || pr.kind === 'missile' ? '#cfd5df' : pr.kind === 'torpedo' ? '#3a4a5a' : pr.kind === 'flare' ? '#ff8a3a' : pr.kind === 'harpoon' ? '#d8d8d8' : '#ffe9a8';
  if (pr.kind === 'torpedo') { px.rect(g, p[0] - s * 1.8, p[1] - s * .6, s * 3.6, s * 1.2, '#4a5a6a'); px.rect(g, p[0] - s * 3, p[1] + s * .4, s * 2, 1, '#bfe8ff'); }
  else { px.disc(g, p[0], p[1], s, col); if (pr.kind === 'rocket' || pr.kind === 'missile') { for (let i = 1; i < 4; i++) { const q = R3.proj(pr.x - pr.vx * .02 * i, pr.y - pr.vy * .02 * i, pr.z - pr.vz * .02 * i); if (q) px.blend(g, .7 - i * .15, 'add', () => px.disc(g, q[0], q[1], s * (1 - i * .15), '#ffb060')); } } }
  if (pr.kind === 'flare' || pr.team === 'p') px.blend(g, .6, 'add', () => px.disc(g, p[0], p[1], s * 2, pr.team === 'p' ? '#ffd080' : '#ff6a2a'));
}
function drawPart(g, p, t) {
  const q = R3.proj(p.x, p.y, p.z); if (!q) return; const s = Math.max(1, p.sz * R3.cam.F / q[2] * .35 + (p.smoke ? (1.2 - p.life) * 2 : 0));
  if (p.smoke) px.blend(g, clamp(p.life * .35, 0, .45), 'normal', () => px.disc(g, q[0], q[1], s * 1.5, p.col));
  else if (p.add) px.blend(g, clamp(p.life * 2.5, 0, 1), 'add', () => px.rect(g, q[0] - s / 2, q[1] - s / 2, Math.ceil(s), Math.ceil(s), p.col)); else px.rect(g, q[0] - s / 2, q[1] - s / 2, Math.ceil(s), Math.ceil(s), p.col);
}

// ---- 41-hud.js ----
// 41-hud.js — the HUD for one viewport: TIME, SCORE, LIFE, weapon panel, reticle, threat rings, banners, radio, boss bars.
// Everything anchors to the viewport rect and uses input.label() for prompts. Reads sim.*, Pres.*.
const HUD = { banners: [], radio: [], radioCur: null, prompts: {}, seen: {}, hitMark: [0, 0], comboT: 0, shown: {} };
function banner(text, col, o = {}) { HUD.banners.push(Object.assign({ text, col: col || '#ffffff', t: 0, dur: 1.2, scale: 3, y: .38 }, o)); }
const txt = (g, s, x, y, col, o) => E.font.text(g, String(s).replace(/–/g, '-'), Math.round(x), Math.round(y), col, Object.assign({ shadow: '#000000', outline: false }, o));
function glyph(inp, action) { return inp && inp.label ? inp.label(action) : action; }
function promptFor(id, inp) {
  const f = a => '[' + glyph(inp, a) + ']';
  switch (id) {
    case 'cover': return 'HOLD ' + f('cover') + ' TO TAKE COVER — YOU RELOAD IN COVER';
    case 'reload': return 'DUCK TO RELOAD — HOLD ' + f('cover');
    case 'torpedo': return 'SHOOT THE TORPEDO!';
    case 'shield': return 'KNOCK THE SHIELD ASIDE WITH THE SHOTGUN OR GRENADE LAUNCHER';
    case 'laser': return 'THE RED LASER MEANS A SNIPER — DUCK WHEN IT CONVERGES';
    case 'final': return 'FINAL SHOT — HIT THE LEVER!';
    case 'switch': return f('next') + ' / ' + f('prev') + ' — OR FIRE WHILE IN COVER — TO SWITCH WEAPONS';
    default: return null;
  }
}
function pushPrompt(id, inp) { if (HUD.shown[id]) return; HUD.shown[id] = 1; const s = promptFor(id, inp); if (s) HUD.prompt = { t: 0, text: s, dur: id === 'torpedo' ? 2 : 4.5, big: id === 'torpedo' || id === 'final' }; }
function hudEvents(sim, inp, local) {
  for (const ev of sim.events) {
    const mine = ev.p == null || local.includes(ev.p);
    switch (ev.type) {
      case 'action': banner('ACTION!', '#ffd36a', { scale: 4, dur: 1.0, y: .34, slide: 1 }); break;
      case 'clear': banner('AREA CLEAR', '#ffffff', { dur: 1.6, y: .4 }); if (ev.bonus) HUD.bonus = { t: 0, v: ev.bonus }; break;
      case 'stageclear': banner('STAGE CLEAR', '#9fe3ff', { scale: 4, dur: 2.5 }); break;
      case 'timeup': banner('TIDE\'S IN!', '#ff5a5a', { scale: 4, dur: 1.5 }); break;
      case 'extend': banner('TIME EXTEND +' + ev.s, '#9fe3ff', { scale: 2, dur: 1, y: .2 }); break;
      case 'oneup': if (mine) banner('1UP!', '#7cff8a', { scale: 3, dur: 1.2 }); break;
      case 'pickup': if (mine) { banner(WEAPONS[ev.w].name + ' +' + ev.n, '#ffb347', { scale: 2, dur: 1.4, y: .24 }); if (ev.first) HUD.newWeapon = { t: 0, w: ev.w }; } break;
      case 'headshot': if (mine) HUD.hitMark = [1, 0]; break;
      case 'hit': if (mine) { HUD.hitMark = [ev.head ? 1 : .6, 0]; } break;
      case 'quick': if (mine) banner('QUICK KILL +500', '#ffe48a', { scale: 1, dur: .8, y: .62 }); break;
      case 'boss': if (!ev.mini) HUD.bossCard = { t: 0, name: ev.name, title: ev.title }; break;
      case 'bossdown': banner('TARGET DOWN', '#ffd36a', { scale: 3, dur: 2 }); break;
      case 'say': HUD.radio.push({ who: ev.who, text: ev.text }); break;
      case 'prompt': if (ev.p == null || mine) pushPrompt(ev.id, inp); break;
      case 'civhit': if (mine) banner('CIVILIAN HIT!', '#ff5a5a', { scale: 3, dur: 1.4 }); break;
      case 'lockjam': banner('LOCK JAMMED ' + ev.n + '/4', '#ffd36a', { scale: 2, dur: 1.4 }); break;
      case 'intel': banner('INTEL FOUND', '#8aff8a', { scale: 2, dur: 1.3, y: .24 }); if (typeof ev.id === 'string') { const f = E.store.get('tc3.intel', {}); f[ev.id] = 1; E.store.set('tc3.intel', f); } break;
      case 'tiderise': banner('TIDE RISING!', '#ff5a5a', { scale: 4, dur: 1.5 }); break;
      case 'shotdown': if (mine) banner('SHOT DOWN +1000', '#ffe48a', { scale: 1, dur: .9, y: .62 }); break;
      case 'down': if (mine) banner('OUT OF LIVES', '#ff5a5a', { scale: 3, dur: 1.5 }); break;
      case 'stagger': banner('STAGGERED!', '#ffe48a', { scale: 3, dur: 1 }); break;
      case 'shieldbreak': banner('SHIELD BROKEN', '#ffe48a', { scale: 3, dur: 1.2 }); break;
      case 'topple': banner('IT\'S DOWN — COCKPIT OPEN!', '#ffe48a', { scale: 2, dur: 1.8 }); break;
      case 'finalshot': banner('FINAL SHOT!', '#ff5a5a', { scale: 4, dur: 2 }); break;
    }
  }
}
function stepHud(dt) {
  for (const b of HUD.banners) b.t += dt; HUD.banners = HUD.banners.filter(b => b.t < b.dur);
  if (HUD.prompt) { HUD.prompt.t += dt; if (HUD.prompt.t > HUD.prompt.dur) HUD.prompt = null; }
  HUD.hitMark[1] += dt; if (HUD.bossCard) { HUD.bossCard.t += dt; if (HUD.bossCard.t > 2.6) HUD.bossCard = null; }
  if (HUD.bonus) { HUD.bonus.t += dt; if (HUD.bonus.t > 1.6) HUD.bonus = null; }
  if (HUD.newWeapon) { HUD.newWeapon.t += dt; if (HUD.newWeapon.t > 2) HUD.newWeapon = null; }
  // radio
  if (!HUD.radioCur && HUD.radio.length) { const r = HUD.radio.shift(); HUD.radioCur = { who: r.who, text: r.text, t: 0, dur: Math.max(2.4, Math.min(4.5, r.text.length * .06)) }; if (typeof Voice !== 'undefined') Voice.say(r.text, r.who); }
  if (HUD.radioCur) { HUD.radioCur.t += dt; if (HUD.radioCur.t > HUD.radioCur.dur) HUD.radioCur = null; }
}
function resetHud() { HUD.banners.length = 0; HUD.radio.length = 0; HUD.radioCur = null; HUD.prompt = null; HUD.bossCard = null; HUD.bonus = null; HUD.newWeapon = null; }
// threat ring at a muzzle's screen point, plus an edge arrow when off screen
function drawThreats(g, sim, pid, W, H, large) {
  for (const th of sim.threats) {
    const mine = th.tgt === pid, sp = th.sp; if (!sp) continue; const rg = Pres.rings.find(r => r.id === th.id); const total = rg ? rg.tel : th.tel, left = Math.max(0, th.at - sim.t), u = clamp(1 - left / Math.max(.05, total), 0, 1);
    const q = R3.proj(sp[0], sp[1], sp[2]);
    const rad = (large ? 2 : 1) * lerp(26, 6, u), pulse = Math.floor(sim.t * 14) % 2;
    if (q && q[0] > 4 && q[0] < W - 4 && q[1] > 4 && q[1] < H - 4) {
      if (!mine) { px.blend(g, .6, 'normal', () => ring(g, q[0], q[1], rad * .6, '#ff8a8a')); continue; }
      const col = pulse ? '#ff3b30' : '#ff8a80'; ring(g, q[0], q[1], rad, col); ring(g, q[0], q[1], rad - 1, '#ffffff'); px.blend(g, .7, 'add', () => px.disc(g, q[0], q[1], Math.max(2, rad * .35), '#ffffff'));
      txt(g, '!', q[0], q[1] - 3 - (large ? 3 : 0), '#ffffff', { align: 'center', scale: large ? 2 : 1 });
    } else if (mine) {
      const a = q ? Math.atan2(q[1] - H / 2, q[0] - W / 2) : (sp[1] > sim.pose(pid).y ? 0 : Math.PI); const ex = clamp(W / 2 + Math.cos(a) * W, 10, W - 10), ey = clamp(H / 2 + Math.sin(a) * H, 18, H - 24);
      px.poly(g, [[ex + Math.cos(a) * 7, ey + Math.sin(a) * 7], [ex + Math.cos(a + 2.4) * 7, ey + Math.sin(a + 2.4) * 7], [ex + Math.cos(a - 2.4) * 7, ey + Math.sin(a - 2.4) * 7]], pulse ? '#ff3b30' : '#ffffff');
    }
  }
}
function ring(g, cx, cy, r, col) { const n = Math.max(10, Math.round(r * 1.6)); let px0, py0; for (let i = 0; i <= n; i++) { const a = i / n * TAU, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (i) px.line(g, px0 | 0, py0 | 0, x | 0, y | 0, col, 1); px0 = x; py0 = y; } }
const WICON = ['P9', 'MG', 'SG', 'GL'];
function drawReticle(g, x, y, style, size, col, c) {
  const s = size === 'S' ? 5 : size === 'L' ? 9 : 7; if (c > .3) return;
  if (style === 'ring') { ring(g, x, y, s, '#000000'); ring(g, x, y, s - 1, col); px.dot(g, x, y, '#ffffff'); }
  else if (style === 'dot') { px.disc(g, x, y, 2, '#000000'); px.disc(g, x, y, 1, col); }
  else { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { px.rect(g, x + dx * (s + 1) - (dx ? 0 : 1) - (dx < 0 ? 3 : 0), y + dy * (s + 1) - (dy ? 0 : 1) - (dy < 0 ? 3 : 0), dx ? 4 : 3, dy ? 4 : 3, '#000000'); px.rect(g, x + dx * (s) - (dx ? 0 : 0) - (dx < 0 ? 3 : 0) + (dx ? 0 : 0), y + dy * s - (dy < 0 ? 3 : 0), dx ? 3 : 1, dy ? 3 : 1, col); } px.dot(g, x, y, col); }
}
function drawHud(g, sim, pid, R, ctx) {
  const { x: X, y: Y, w: W, h: H } = R, p = sim.players[pid]; if (!p || tune.view.hideHud) return; const inp = ctx.inputs[pid] || ctx.inputs[0], small = W < 300;
  const corner = ctx.corner;
  g.save(); g.beginPath(); g.rect(X, Y, W, H); g.clip(); g.translate(X, Y); E.px.reset(g);
  const set = ctx.settings || {};
  // cover vignette
  if (p.c > .2) { px.blend(g, clamp(p.c, 0, 1) * .5, 'normal', () => { px.rect(g, 0, 0, W, 10, '#000000'); px.rect(g, 0, H - 10, W, 10, '#000000'); px.rect(g, 0, 0, 8, H, '#000000'); px.rect(g, W - 8, 0, 8, H, '#000000'); }); if (p.c > .35) px.blend(g, clamp(p.c, 0, 1) * .22, 'normal', () => { for (let x = 6; x < W; x += 34) px.rect(g, x, Math.round(H * .46), 1, Math.round(H * .54), '#000000'); px.rect(g, 0, Math.round(H * .68), W, 1, '#000000'); px.rect(g, 0, Math.round(H * .46), W, 2, '#ffffff'); });
   }
  drawThreats(g, sim, pid, W, H, set.threatSize === 'large');
  // hit flash on damage
  if (p.hurt > 0) px.blend(g, clamp(p.hurt * 1.2, 0, .5), 'normal', () => { px.rect(g, 0, 0, W, 6, '#ff2020'); px.rect(g, 0, H - 6, W, 6, '#ff2020'); px.rect(g, 0, 0, 6, H, '#ff2020'); px.rect(g, W - 6, 0, 6, H, '#ff2020'); });
  // score popups
  for (const q of Pres.popups) { const sp = R3.proj(q.pos[0], q.pos[1], q.pos[2] + q.t * 22); if (sp && sp[0] > 0 && sp[0] < W) px.blend(g, clamp(1.2 - q.t, 0, 1), 'normal', () => txt(g, q.text, sp[0], sp[1], q.col, { align: 'center', scale: 1 })); }
  // reticle
  const rx = W / 2 + p.aim[0] * H / 2, ry = H / 2 - p.aim[1] * H / 2;
  if (ctx.reticleOn(pid) && !p.down && sim.phase !== 'travel') { drawReticle(g, Math.round(rx), Math.round(ry), set.reticle || 'cross', set.reticleSize || 'M', p.color, p.c); const hm = HUD.hitMark; if (hm[1] < .18 && ctx.local.includes(pid)) { const c = hm[0] >= 1 ? '#ffd36a' : '#ffffff'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) px.line(g, rx + dx * 3, ry + dy * 3, rx + dx * 6, ry + dy * 6, c, 1); } }
  if (p.weapon === 0 && p.mag <= 0 && p.c < .5 && !p.down) txt(g, 'RELOAD!', rx, ry + 14, Math.floor(sim.t * 6) % 2 ? '#ff5a5a' : '#ffffff', { align: 'center', scale: 1 });
  // first-person weapon model: a distinct shape and recoil per weapon type, lowered when ducking, swapped with a dip
  if (!p.down && p.c < .95 && !small) { const k = p.recoil, dip = p.switchT > 0 ? p.switchT * 40 : 0, bx0 = Math.round(rx * .2 + W * .52 + k * 3 * (p.weapon === 2 ? 2 : 1)), by0 = Math.round(H - 34 + dip + p.c * 40 + k * (p.weapon === 3 ? 9 : p.weapon === 2 ? 12 : p.weapon === 1 ? 3 : 6)), O = '#0a0a12';
    const box = (x, y, w, h, c) => { px.rect(g, x - 1, y - 1, w + 2, h + 2, O); px.rect(g, x, y, w, h, c); };
    if (p.weapon === 0) { box(bx0, by0, 12, 34, '#5a626e'); box(bx0 + 2, by0 - 6, 8, 8, '#8a94a4'); box(bx0 + 3, by0 + 24, 6, 14, '#2a2f3a'); }
    else if (p.weapon === 1) { box(bx0 - 4, by0 - 4, 20, 40, '#3a4250'); box(bx0 + 2, by0 - 14, 8, 12, '#7a8494'); box(bx0 + 14, by0 + 14, 6, 18, '#23272f'); }
    else if (p.weapon === 2) { box(bx0 - 6, by0 - 2, 24, 40, '#6a4a2e'); box(bx0, by0 - 12, 5, 14, '#9aa4b4'); box(bx0 + 8, by0 - 12, 5, 14, '#9aa4b4'); }
    else { box(bx0 - 8, by0 - 6, 28, 42, '#4a5a3a'); box(bx0 - 2, by0 - 18, 16, 14, '#2a2f22'); box(bx0 + 4, by0 - 22, 4, 6, '#ffb347'); }
    if (k > .6) px.blend(g, .8, 'add', () => px.disc(g, bx0 + 6, by0 - (p.weapon === 3 ? 22 : 10), 4 + k * 3, '#ffe9a8')); }
  // TIME
  if (!small || pid === 0) {
    const tm = Math.max(0, sim.timer), low = tm < 10, cx = W / 2 + (small ? 14 : 0); const bw = small ? 66 : 90;
    E.ui.box(g, cx - bw / 2, 2 + (corner ? 0 : 0), bw, 27, { bg: ['#10244a', '#081428'], border: low ? '#ff3b30' : '#3aa0e8', alpha: .85 });
    const fill = clamp(tm / Math.max(1, sim.timeMax), 0, 1); px.rect(g, cx - bw / 2 + 2, 26, Math.round((bw - 4) * fill), 2, low ? '#ff3b30' : '#3aa0e8');
    txt(g, 'TIME', cx, 4, '#9fe3ff', { align: 'center', scale: 1 });
    const tcol = low ? (tm < 5 && Math.floor(sim.t * 4) % 2 ? '#ffffff' : '#ff5a5a') : '#ffffff'; txt(g, tm.toFixed(2).padStart(5, '0'), cx, 11, sim.phase === 'travel' ? '#9fb0c8' : tcol, { align: 'center', scale: small ? 1 : 2 });
  }
  // SCORE
  txt(g, String(p.score).padStart(7, '0'), 6, small ? 6 : 5, '#ffffff', { scale: small ? 1 : 2 }); if (p.mark) txt(g, '*'.repeat(Math.min(5, p.mark)), 6, 21, '#ff8a3a', { scale: 1 });
  if (p.chain >= 5) txt(g, '×' + Math.min(2, 1 + Math.floor(p.chain / 5) * .1).toFixed(1), 6, 22 + (p.mark ? 8 : 0), '#ffd36a', { scale: 1 });
  txt(g, p.name, 6, small ? 22 + (p.mark ? 8 : 0) + (p.chain >= 5 ? 8 : 0) : H - 38, p.color, { scale: 1 });
  // LIFE
  for (let i = 0; i < Math.min(p.lives, 9); i++) { const bx = 6 + i * 10, by = H - 28; px.poly(g, [[bx, by], [bx + 8, by], [bx + 8, by + 6], [bx + 4, by + 10], [bx, by + 6]], '#000000'); px.poly(g, [[bx + 1, by + 1], [bx + 7, by + 1], [bx + 7, by + 5], [bx + 4, by + 8], [bx + 1, by + 5]], p.inv > 0 && Math.floor(sim.t * 10) % 2 ? '#ffffff' : p.color); }
  if (p.lives > 9) txt(g, '+' + (p.lives - 9), 98, H - 28, '#ffffff', { scale: 1 });
  // weapon panel
  const w = WEAPONS[p.weapon], bx = W - 96, by = H - 36; E.ui.box(g, bx, by, 90, 32, { bg: ['#10244a', '#081428'], border: p.color, alpha: .85 });
  txt(g, w.name, bx + 4, by + 3, '#ffd36a', { scale: 1 });
  if (p.weapon === 0) { for (let i = 0; i < 9; i++) px.rect(g, bx + 4 + i * 9, by + 14, 6, 9, i < p.mag ? '#ffe9a8' : '#2a3350'); if (p.reloadT > 0 || p.mag < 9 && p.c > .6) { px.rect(g, bx + 4, by + 26, 82, 2, '#2a3350'); px.rect(g, bx + 4, by + 26, Math.round(82 * (p.mag >= 9 ? 1 : clamp(p.reloadT / tune.player.reload, 0, 1))), 2, '#9fe3ff'); } }
  else { txt(g, String(p.ammo[p.weapon]), bx + 4, by + 13, '#ffffff', { scale: 2 }); px.rect(g, bx + 40, by + 20, 46, 4, '#2a3350'); px.rect(g, bx + 40, by + 20, Math.round(46 * clamp(p.ammo[p.weapon] / WEAPONS[p.weapon].pool, 0, 1)), 4, '#ffb347'); }
  // weapon strip after switch
  if (p.switchT > 0 || HUD.strip && HUD.strip[pid] > 0) { for (let i = 0; i < 4; i++) { const sx = bx + i * 22, ok = i === 0 || p.ammo[i] > 0; px.rect(g, sx, by - 14, 20, 12, i === p.weapon ? '#3aa0e8' : '#10244a'); txt(g, WICON[i], sx + 10, by - 12, ok ? '#ffffff' : '#555e70', { align: 'center', scale: 1 }); } }
  // continue countdown
  if (p.down && p.contT > 0) { px.rect(g, 0, 0, W, H, '#000000c0'); txt(g, 'CONTINUE?', W / 2, H / 2 - 24, '#ffffff', { align: 'center', scale: 2 }); txt(g, String(Math.ceil(p.contT)), W / 2, H / 2 - 6, '#ffd36a', { align: 'center', scale: 4 }); txt(g, 'PRESS ' + glyph(inp, 'start') + ' OR CLICK', W / 2, H / 2 + 24, '#9fe3ff', { align: 'center', scale: 1 }); }
  else if (p.down) { txt(g, 'GAME OVER', W / 2, H / 2 - 6, '#ff5a5a', { align: 'center', scale: 2 }); }
  // phase labels
  if (sim.phase === 'travel' && sim.pt > .3) txt(g, 'WAIT', W / 2, H * .3, Math.floor(sim.t * 3) % 2 ? '#ffffff' : '#9fb0c8', { align: 'center', scale: 3 });
  // banners
  if (pid === ctx.local[0] || ctx.local.length === 1 || true) for (const b of HUD.banners) { const u = b.t / b.dur, a = u > .75 ? (1 - u) * 4 : 1, sl = b.slide ? Math.max(0, 1 - b.t * 6) * 40 : 0; px.blend(g, clamp(a, 0, 1), 'normal', () => txt(g, b.text, W / 2 + sl * (b.slide ? 1 : 0), H * b.y, b.col, { align: 'center', scale: small ? Math.min(b.scale, 2) : b.scale, outline: '#000000' })); }
  if (HUD.bonus) txt(g, 'TIME BONUS +' + HUD.bonus.v, W / 2, H * .56, '#9fe3ff', { align: 'center', scale: small ? 1 : 2 });
  if (HUD.newWeapon) txt(g, 'NEW WEAPON: ' + WEAPONS[HUD.newWeapon.w].name, W / 2, H * .14, '#ffb347', { align: 'center', scale: small ? 1 : 2 });
  // prompt bar
  if (HUD.prompt && pid === ctx.local[0]) { const pr = HUD.prompt, tw = E.font.width(pr.text, { scale: pr.big ? 2 : 1 }); const bw2 = Math.min(W - 8, tw + 14); E.ui.box(g, W / 2 - bw2 / 2, H - (pr.big ? 70 : 52), bw2, pr.big ? 20 : 14, { bg: ['#10244a', '#081428'], border: '#ffd36a', alpha: .85 }); txt(g, pr.text, W / 2, H - (pr.big ? 66 : 49), '#ffffff', { align: 'center', scale: pr.big ? 2 : 1 }); }
  // boss bars
  if (sim.boss && !sim.boss.dead && !sim.boss.intro && ctx.local[0] === pid) { let by2 = 33; for (const bar of sim.boss.bars) { if (bar.late && sim.boss.phase < 2) continue; let h = 0, m = 0; for (const k of bar.parts) { const pt = sim.boss.parts[k]; if (pt) { h += Math.max(0, pt.hp); m += pt.max; } } const bw = Math.min(W - 40, 160); const bx2 = W / 2 - bw / 2; px.rect(g, bx2 - 1, by2 - 1, bw + 2, 8, '#000000'); px.rect(g, bx2, by2, bw, 6, '#3a1018'); px.rect(g, bx2, by2, Math.round(bw * clamp(h / Math.max(1, m), 0, 1)), 6, sim.boss.id === 'krake' ? '#d4af37' : '#ff3b30'); txt(g, bar.label, W / 2, by2 - 1, '#ffffff', { align: 'center', scale: 1 }); by2 += 11; } }
  // boss card
  if (HUD.bossCard && ctx.local[0] === pid) { const c = HUD.bossCard, a = clamp(Math.min(c.t * 4, (2.6 - c.t) * 3), 0, 1); px.blend(g, a, 'normal', () => { px.rect(g, 0, H * .36, W, 40, '#000000b0'); txt(g, c.name, W / 2, H * .38, '#ff5a5a', { align: 'center', scale: 3, outline: '#000' }); txt(g, '— ' + c.title.toUpperCase() + ' —', W / 2, H * .38 + 28, '#ffffff', { align: 'center', scale: 1 }); }); }
  // radio
  if (HUD.radioCur && ctx.local[0] === pid && !tune.view.hideHud) { const rc = HUD.radioCur, sp = reg('speaker', rc.who); if (sp) { const bw = Math.min(W - 40, 230), bx2 = W / 2 - bw / 2, by2 = 33 + (sim.boss && !sim.boss.dead && !sim.boss.intro ? 24 : 0); E.ui.box(g, bx2, by2, bw, 34, { bg: ['#10244a', '#081428'], border: sp.color, alpha: .9 }); const rig = speakerRig(rc.who); if (rig) rig.drawPortrait(g, bx2 + 4, by2 + 4, 24); txt(g, sp.name, bx2 + 38, by2 + 4, sp.color, { scale: 1 }); if (set.subtitles !== false) { const lines = E.font.wrap(rc.text, bw - 46, { scale: 1 }); for (let i = 0; i < Math.min(2, lines.length); i++) txt(g, lines[i], bx2 + 38, by2 + 14 + i * 9, '#ffffff', { scale: 1 }); } } }
  if (tune.view.perf && pid === 0) txt(g, 'PERF ' + (ctx.perf || ''), 4, 40, '#00ff80', { scale: 1 });
  g.restore(); E.px.reset(g);
}
const _srig = {};
function speakerRig(id) { if (_srig[id]) return _srig[id]; const sp = reg('speaker', id); if (!sp || !sp.rig) return null; return _srig[id] = new E.Humanoid(sp.rig); }

// ---- 42-story.js ----
// 42-story.js — speakers, briefings, cutscenes and intel notes. All lines are original, in the B-movie tone of the
// source: short, earnest, partners groaning at one-liners, a grandiose villain with sea metaphors.
const SP = (id, name, color, voice, rig) => def('speaker', id, { name, color, voice, rig });
SP('kai', 'KAI', '#e8443a', { pitch: 150, rate: 11, fx: 'none', wave: 'sawtooth' }, { build: 'heroic', size: 1.05, outfit: 'coat', hair: 'short', weapon: 'gun', colors: { cloth: '#2a2f3d', coat: '#2a2f3d', trim: '#e8443a', hair: '#1a1a1a', skin: '#e0b090' } });
SP('rook', 'ROOK', '#3b82f6', { pitch: 105, rate: 9, fx: 'gravel', wave: 'sawtooth' }, { build: 'bulky', size: 1.1, outfit: 'coat', hair: 'bald', weapon: 'gun', colors: { cloth: '#3b5aa0', coat: '#6a4a2e', skin: '#c68c5c' } });
SP('mari', 'MARI', '#22c55e', { pitch: 230, rate: 12, fx: 'none', wave: 'triangle' }, { build: 'heroic', size: 1.0, outfit: 'coat', hair: 'ponytail', weapon: 'gun', colors: { cloth: '#f08a2a', coat: '#f4f4f4', trim: '#22c55e', hair: '#3a2418', skin: '#d6a07a' } });
SP('juno', 'JUNO', '#f5b700', { pitch: 200, rate: 13, fx: 'radio', wave: 'square' }, { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#f5b700' }, weapon: null, colors: { cloth: '#2a2f3d', hair: '#2ac4b4', skin: '#e8b894' } });
SP('hale', 'DIR. HALE', '#c8d4e8', { pitch: 175, rate: 10, fx: 'radio', wave: 'triangle' }, { build: 'heroic', size: 1.0, outfit: 'coat', hair: 'long', weapon: null, colors: { cloth: '#6a6e78', coat: '#6a6e78', hair: '#d8dce6', skin: '#e0b090' } });
SP('tomas', 'DR. TEJADA', '#ffffff', { pitch: 140, rate: 9, fx: 'radio', wave: 'triangle' }, { build: 'chibi', size: 1.0, outfit: 'coat', hair: 'short', weapon: null, colors: { cloth: '#f4f4f4', coat: '#f4f4f4', hair: '#b8b8b8', skin: '#d6a07a' } });
SP('krake', 'ADM. KRAKE', '#d4af37', { pitch: 95, rate: 8, fx: 'boom', wave: 'sawtooth' }, { build: 'heroic', size: 1.15, outfit: 'coat', hair: 'long', hat: { style: 'cap', color: '#1d2a4a' }, weapon: null, colors: { cloth: '#1d2a4a', coat: '#1d2a4a', trim: '#d4af37', hair: '#f0f0f0', skin: '#e8c8a8' } });
SP('barracuda', 'BARRACUDA', '#1d9aaa', { pitch: 210, rate: 13, fx: 'none', wave: 'square' }, { build: 'heroic', size: 1.05, outfit: 'coat', hair: 'ponytail', weapon: null, colors: { cloth: '#1d7a8a', coat: '#1d7a8a', hair: '#f4f4f4', skin: '#e0b090' } });
SP('hammerhead', 'HAMMERHEAD', '#aab0be', { pitch: 80, rate: 6, fx: 'gravel', wave: 'sawtooth' }, { build: 'bulky', size: 1.2, outfit: 'coat', hat: 'helmet', weapon: null, colors: { cloth: '#4a4a56', coat: '#4a4a56', skin: '#c68c5c' } });
SP('gull', 'THE GULL', '#9aa4b0', { pitch: 190, rate: 10, fx: 'radio', wave: 'triangle' }, { build: 'heroic', size: 1.0, outfit: 'coat', hat: { style: 'pointed', color: '#6b6f78' }, weapon: null, colors: { cloth: '#6b6f78', coat: '#6b6f78', skin: '#e0b090' } });
SP('worker', 'DOCK WORKER', '#e8c84a', { pitch: 140, rate: 11, fx: 'none', wave: 'triangle' }, { build: 'chibi', size: 1.0, outfit: 'shirt', hat: 'cap', weapon: null, colors: { cloth: '#e8c84a', skin: '#c68c5c' } });
SP('captor', 'RED TIDE', '#b01c2a', { pitch: 120, rate: 12, fx: 'gravel', wave: 'sawtooth' }, { build: 'heroic', size: 1.0, outfit: 'coat', hat: 'cap', weapon: null, colors: { cloth: '#b01c2a', coat: '#b01c2a', skin: '#e0b090' } });
SP('hud', 'CREST', '#9fe3ff', { pitch: 170, rate: 12, fx: 'radio', wave: 'square' }, { build: 'chibi', size: 1, outfit: 'shirt', weapon: null, colors: { cloth: '#10244a' } });
const L2 = (who, text) => [who, text];
def('brief', 'brief1', { title: 'BRIEFING — HARBOR LIGHTS', pages: [L2('hale', 'Agents. Two hours ago the Black Current seized Port Lumen\'s harbor and the Tidewall.'), L2('hale', 'Their leader is Silas Krake. A disgraced admiral with a grudge the size of an ocean.'), L2('juno', 'He\'ll open the floodgates at dawn. King tide. The whole city goes under.'), L2('hale', 'You have until 06:00. Land at Lantern Pier. Find his signal. End this.'), L2('kai', 'Understood. CREST is on it.'), L2('rook', 'Into a storm. Naturally.')], obj: ['Take the pier and the market', 'Break through the container yard', 'Beat Barracuda\'s Stingray'] });
def('brief', 'brief2', { title: 'BRIEFING — STORM SIGNAL', pages: [L2('hale', 'The lighthouse relays Krake\'s commands to the whole fleet.'), L2('juno', 'Take it out and his ships go deaf. Also, it\'s raining. A lot.')], obj: ['Fight up through Gull\'s Rest', 'Rescue Dr. Tejada', 'Stop Hammerhead'] });
def('brief', 'brief3', { title: 'BRIEFING — THE TIDEWALL', pages: [L2('hale', 'This is it, agents. Jam the gates, reach the tower, stop Krake.'), L2('juno', 'And maybe don\'t fall in. The water\'s rising.')], obj: ['Jam the four gate locks', 'Climb the control tower', 'Stop Admiral Krake'] });
def('cutscene', 'c1-intro', { scene: '1-1', stage: 1, pages: [L2('mari', 'Hang on! Lumen Coast Guard express—next stop, trouble!'), L2('krake', 'Citizens of Port Lumen! Enjoy your lanterns. They are the last lights you will see.'), L2('krake', 'At dawn the king tide comes, and I open every gate. The sea takes back what you stole!'), L2('rook', 'Charming guy.'), L2('kai', 'Let\'s make some waves.'), L2('rook', 'Kid, you say that every mission.')] });
def('cutscene', 'c1-outro', { scene: '1-B', stage: 1, pages: [L2('juno', 'Krake\'s signal is coming from Lighthouse Point.'), L2('mari', 'Gull\'s Rest. They\'ve held my father there since yesterday.'), L2('kai', 'Then that\'s where we\'re going.')] });
def('cutscene', 'c2-intro', { scene: '2-1', stage: 2, pages: [L2('krake', 'Hammerhead. No one reaches the lamp.'), L2('hammerhead', 'NOBODY. PASSES. HAMMERHEAD.'), L2('rook', 'He talks in capital letters.')] });
def('cutscene', 'c2-outro', { scene: '2-B', stage: 2, pages: [L2('tomas', 'The override is in the Tidewall control tower. At the peak, Krake opens every gate.'), L2('juno', 'Forty minutes to dawn. The maintenance tram can get you there.'), L2('kai', 'Then let\'s catch a ride.')] });
def('cutscene', 'c3-intro', { scene: '3-1', stage: 3, pages: [L2('krake', 'Look at the sea, CREST. It rises for me.'), L2('krake', 'At dawn, Port Lumen returns to the deep!'), L2('kai', 'Not on our watch.'), L2('rook', 'Did you rehearse that?'), L2('kai', '…Maybe.')] });
def('cutscene', 'c3-outro', { scene: '3-B', stage: 3, ending: 1, pages: [L2('juno', 'All forty gates closing! You did it!'), L2('mari', 'Silas Krake, you\'re under arrest by the Lumen Coast Guard.'), L2('krake', 'The tide will turn again.'), L2('rook', 'Twice a day. It\'s called science.'), L2('hale', 'Outstanding work, agents. Port Lumen owes you its dawn.'), L2('kai', 'Tell the festival to save us some lanterns.'), L2('rook', 'Kid. No puns at the debriefing.'), L2('kai', 'No promises.')] });
def('intel', 'i1', { text: 'Note to self: never trust a fish that winks. —J.' });
def('intel', 'i2', { text: 'Krake\'s coffee order: black, like the Current. Two sugars.' });
def('intel', 'i3', { text: 'Memo: please stop naming the boats after my ex. —Barracuda' });
def('intel', 'i4', { text: 'The tide gauge says "HIGH". It has said "HIGH" since Tuesday.' });
def('intel', 'i5', { text: 'Hammerhead\'s shopping list: doors (spare), doors (shields), soup.' });
def('intel', 'i6', { text: 'If you can read this, Krake\'s monologue is already too long.' });
// the radio barks (scene-independent)
const BARKS = { hold: 'Hold your fire!', reload: 'Reloading!', hey: 'Hey—watch it!' };

// ---- 43-audio.js ----
// 43-audio.js — music (tracker songs as code), SFX voices, and the Animalese/Simlish gibberish voice synth.
// No audio files. Songs use the engine's tracker; the voice synth is Web Audio formants on audio.bus('sfx').
const rep = (s, n) => Array(n).fill(s).join(' ');
const bars = (...b) => b.join(' ');
// a 16-step bar from a pattern: 'x' = hit the note, '-' = hold, '.' = rest
const pat = (note, p) => p.split('').map((c, i, a) => c === 'x' ? note : c === '-' ? '-' : '.').join(' ');
const song = (id, o) => def('song', id, o);
const drumsA = 'k . h . s . h . k . h k s . h h', drumsB = 'k . h h s . h . k k h . s . h o';
// theme — D minor, 140 bpm: rising wave arpeggio, brassy pulse lead, saw bass, rock drums
song('theme', { bpm: 140, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .16, notes: bars(pat('D2', 'x.x.x.x.x.x.x.x.'), pat('Bb1', 'x.x.x.x.x.x.x.x.'), pat('F2', 'x.x.x.x.x.x.x.x.'), pat('C2', 'x.x.x.x.x.x.x.x.')) },
  { name: 'lead', wave: 'square', vol: .12, notes: bars('D4 - - - F4 - A4 - D5 - - - C5 - A4 -', 'Bb4 - - - A4 - F4 - D4 - - - . . . .', 'F4 - - - A4 - C5 - F5 - - - E5 - C5 -', 'C5 - - - D5 - E5 - G4 - - - . . . .') },
  { name: 'arp', wave: 'pulse12', vol: .07, notes: bars(rep('D4 F4 A4 D5', 4), rep('Bb3 D4 F4 Bb4', 4), rep('F3 A3 C4 F4', 4), rep('C4 E4 G4 C5', 4)) },
  { name: 'drums', wave: 'drums', vol: .22, notes: bars(drumsA, drumsB, drumsA, drumsB) }] });
song('briefing', { bpm: 90, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .13, notes: bars('D3 - - - - - - - - - - - - - - -', 'Bb2 - - - - - - - - - - - - - - -', 'G2 - - - - - - - - - - - - - - -', 'A2 - - - - - - - - - - - - - - -') },
  { name: 'lead', wave: 'pulse12', vol: .07, notes: bars('. . . . D4 - - - F4 - - - E4 - - -', '. . . . D4 - - - Bb3 - - - . . . .', '. . . . G4 - - - F4 - - - D4 - - -', 'E4 - - - . . . . A3 - - - . . . .') },
  { name: 'tick', wave: 'drums', vol: .12, notes: rep('h . h . h . h . h . h . h . h .', 4) }] });
song('harbor', { bpm: 150, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .24, notes: bars('E2 . . E2 . . E2 . B1 . . B1 . . . .', 'A1 . . A1 . . A1 . E2 . . E2 . . . .', 'C2 . . C2 . . C2 . G1 . . G1 . . . .', 'B1 . . B1 . . B1 . F#1 . . B1 . . . .') },
  { name: 'lead', wave: 'square', vol: .1, notes: bars('E5 - . G5 - . B5 - A5 - G5 - E5 - . .', 'A5 - . C6 - . B5 - A5 - G5 - E5 - . .', 'G5 - . E5 - . C5 - E5 - G5 - A5 - . .', 'B5 - . A5 - . F#5 - B5 - . . . . . .'), on: false },
  { name: 'arp', wave: 'pulse12', vol: .06, notes: bars(rep('E4 G4 B4 G4', 4), rep('A3 C4 E4 C4', 4), rep('C4 E4 G4 E4', 4), rep('B3 D#4 F#4 D#4', 4)) },
  { name: 'drums', wave: 'drums', vol: .2, notes: bars('k . h . s . h h k . h k s . h .', 'k . h h s . h . k . h . s . h h', 'k . h . s . h h k . h k s . h .', 'k . h h s . h . k h k . s s s s'), on: false }] });
song('storm', { bpm: 160, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .16, notes: bars(rep('A1 . A1 A1', 4), rep('F1 . F1 F1', 4), rep('G1 . G1 G1', 4), rep('E1 . E1 E1', 4)) },
  { name: 'lead', wave: 'pulse12', vol: .1, notes: bars('A4 - - C5 - - E5 - D5 - C5 - A4 - - .', 'F4 - - A4 - - C5 - B4 - A4 - F4 - - .', 'G4 - - B4 - - D5 - C5 - B4 - G4 - - .', 'E4 - - G#4 - - B4 - A4 - G#4 - E4 - . .'), on: false },
  { name: 'arp', wave: 'square', vol: .05, notes: bars(rep('A3 C4 E4 A4', 4), rep('F3 A3 C4 F4', 4), rep('G3 B3 D4 G4', 4), rep('E3 G#3 B3 E4', 4)) },
  { name: 'drums', wave: 'drums', vol: .22, notes: bars('k . h . s . h . k . h k s . h h', 'k k h . s . h . k . h k s . h o', 'k . h . s . h . k . h k s . h h', 'k . h h s . s . k . k . s s s s'), on: false }] });
song('tidewall', { bpm: 155, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .16, notes: bars(rep('C2 . C2 .', 4), rep('G1 . G1 .', 4), rep('Ab1 . Ab1 .', 4), rep('Bb1 . Bb1 .', 4)) },
  { name: 'lead', wave: 'square', vol: .1, notes: bars('G4 - - C5 - - E5 - G5 - - E5 - C5 - -', 'D5 - - G4 - - B4 - D5 - - B4 - G4 - -', 'Eb5 - - C5 - - Ab4 - C5 - - Eb5 - . . .', 'F5 - - D5 - - Bb4 - D5 - - F5 - G5 - -'), on: false },
  { name: 'arp', wave: 'pulse12', vol: .06, notes: bars(rep('C4 E4 G4 E4', 4), rep('G3 B3 D4 B3', 4), rep('Ab3 C4 Eb4 C4', 4), rep('Bb3 D4 F4 D4', 4)) },
  { name: 'drums', wave: 'drums', vol: .22, notes: bars(drumsA, drumsB, drumsA, 'k . h . s . h . k k k . s s s s'), on: false }] });
song('boss', { bpm: 170, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .2, notes: bars(rep('E1 E1 . E1', 4), rep('G1 G1 . G1', 4), rep('F1 F1 . F1', 4), rep('B0 B0 . B0', 4)) },
  { name: 'lead', wave: 'square', vol: .1, notes: bars('E4 . E4 G4 . G4 B4 . A4 G4 . E4 . . . .', 'G4 . G4 B4 . B4 D5 . C5 B4 . G4 . . . .', 'F4 . F4 A4 . A4 C5 . B4 A4 . F4 . . . .', 'B3 . D#4 F#4 . B4 . . A#4 . . . F#4 . . .') },
  { name: 'drums', wave: 'drums', vol: .24, notes: bars('k . k . s . k k k . k . s . h h', 'k k k . s . h h k . k k s . s s', 'k . k . s . k k k . k . s . h h', 'k k s s k k s s k k s s s s s s') }] });
song('kingtide', { bpm: 165, steps: 4, tracks: [
  { name: 'bass', wave: 'sawtooth', vol: .2, notes: bars(rep('D1 D1 . D1', 4), rep('Bb0 Bb0 . Bb0', 4), rep('C1 C1 . C1', 4), rep('A0 A0 . A0', 4)) },
  { name: 'lead', wave: 'square', vol: .11, notes: bars('D5 - - A4 - D5 - F5 - E5 - D5 - C5 - .', 'Bb4 - - F4 - Bb4 - D5 - C5 - Bb4 - A4 - .', 'C5 - - G4 - C5 - E5 - D5 - C5 - Bb4 - .', 'A4 - C#5 - E5 - A5 - G5 - E5 - C#5 - . .') },
  { name: 'arp', wave: 'pulse12', vol: .06, notes: bars(rep('D4 F4 A4 D5', 4), rep('Bb3 D4 F4 Bb4', 4), rep('C4 E4 G4 C5', 4), rep('A3 C#4 E4 A4', 4)) },
  { name: 'drums', wave: 'drums', vol: .24, notes: bars(drumsB, drumsB, drumsB, 'k k s s k k s s k s k s s s s s') }] });
song('range', { bpm: 112, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .22, notes: bars('G1 . . G1 . G1 . . Bb1 . . Bb1 . C2 . .', 'C2 . . C2 . C2 . . G1 . . G1 . F1 . .') },
  { name: 'lead', wave: 'pulse12', vol: .08, notes: bars('. . D5 . F5 . . G5 . . F5 . D5 . . .', '. . C5 . Eb5 . . G5 . . F5 . C5 . . .') },
  { name: 'drums', wave: 'drums', vol: .16, notes: bars('k . h . s . h h k . h . s . h .', 'k . h . s . h h k . h k s . h o') }] });
song('results', { bpm: 120, steps: 4, tracks: [{ name: 'lead', wave: 'square', vol: .1, notes: bars('C5 - E5 - G5 - E5 - C5 - G4 - . . . .', 'F5 - A5 - C6 - A5 - F5 - C5 - . . . .') }, { name: 'bass', wave: 'triangle', vol: .2, notes: bars('C2 . . . G1 . . . C2 . . . G1 . . .', 'F1 . . . C2 . . . F1 . . . C2 . . .') }] });
song('clear', { bpm: 150, steps: 4, loop: false, tracks: [{ name: 'lead', wave: 'square', vol: .14, notes: 'C5 E5 G5 C6 - - - - G5 - C6 - - - - -' }, { name: 'bass', wave: 'triangle', vol: .2, notes: 'C3 . . . G2 . . . C3 - - - - - - -' }] });
song('gameover', { bpm: 80, steps: 4, loop: false, tracks: [{ name: 'lead', wave: 'triangle', vol: .16, notes: 'G4 - - - Eb4 - - - C4 - - - G3 - - -' }] });
song('continue', { bpm: 100, steps: 4, tracks: [{ name: 'lead', wave: 'pulse12', vol: .1, notes: 'E4 . . . E4 . . . G4 . . . E4 . . .' }, { name: 'tick', wave: 'drums', vol: .14, notes: 'k . . . h . . . k . . . h . . .' }] });
song('ending', { bpm: 70, steps: 4, tracks: [
  { name: 'lead', wave: 'triangle', vol: .16, notes: bars('D5 - - - F5 - - - A5 - - - G5 - F5 -', 'E5 - - - D5 - - - C5 - - - D5 - - -', 'F5 - - - A5 - - - C6 - - - Bb5 - A5 -', 'G5 - - - E5 - - - D5 - - - - - - -') },
  { name: 'pad', wave: 'pulse12', vol: .07, notes: bars(rep('D3 F3 A3 D4', 4), rep('C3 E3 G3 C4', 4), rep('Bb2 D3 F3 Bb3', 4), rep('A2 C#3 E3 A3', 4)) },
  { name: 'bass', wave: 'sawtooth', vol: .1, notes: bars('D2 - - - - - - - - - - - - - - -', 'C2 - - - - - - - - - - - - - - -', 'Bb1 - - - - - - - - - - - - - - -', 'A1 - - - - - - - - - - - - - - -') }] });
// ---- SFX ----
const N = (f, to, dur, vol, filter) => ({ wave: 'noise', freq: f, to, dur, vol, filter: filter || 'lowpass' });
const SFXD = {
  w_handgun: [N(2800, 500, .1, .5), { wave: 'sine', freq: 240, to: 60, dur: .1, vol: .5 }, { wave: 'square', freq: 700, to: 120, dur: .05, vol: .12 }],
  w_mg: [N(2400, 600, .06, .38), { wave: 'sine', freq: 200, to: 80, dur: .06, vol: .35 }],
  w_sg: [N(1800, 200, .3, .7), { wave: 'sine', freq: 120, to: 40, dur: .3, vol: .6 }],
  w_gl: [N(900, 150, .3, .55), { wave: 'sine', freq: 180, to: 50, dur: .25, vol: .6 }, { wave: 'saw', freq: 90, to: 400, dur: .18, vol: .15 }],
  empty: { wave: 'square', freq: 220, to: 180, dur: .04, vol: .18 }, reload: [{ wave: 'square', freq: 500, to: 380, dur: .04, vol: .2 }, { wave: 'triangle', freq: 300, dur: .09, vol: .3 }], switch: { wave: 'square', freq: 440, arp: [0, 7], step: .04, dur: .12, vol: .16 },
  cover_in: [N(500, 150, .12, .4), { wave: 'triangle', freq: 120, to: 60, dur: .1, vol: .4 }], cover_out: N(300, 1500, .1, .3, 'highpass'), whizz: { wave: 'sine', freq: 2200, to: 700, dur: .09, vol: .12 },
  ping: { wave: 'square', freq: 2400, to: 1800, dur: .08, vol: .18 }, thud: [N(700, 120, .12, .5), { wave: 'sine', freq: 100, to: 50, dur: .12, vol: .5 }], splinter: N(3000, 800, .1, .35, 'highpass'),
  e_hit: [N(1800, 500, .1, .4), { wave: 'square', freq: 200, to: 80, dur: .08, vol: .2 }], head: { wave: 'triangle', freq: 1400, to: 2000, dur: .1, vol: .35 }, e_die: { wave: 'saw', freq: 300, to: 60, dur: .35, vol: .22 },
  tick: { wave: 'square', freq: 1800, dur: .03, vol: .16 }, chirp: { wave: 'square', freq: 1400, to: 2600, dur: .14, vol: .3 }, time_tick: { wave: 'square', freq: 1200, dur: .05, vol: .12 }, timeup: [{ wave: 'saw', freq: 600, to: 100, dur: .8, vol: .3 }, N(500, 100, .8, .3)],
  pickup: { wave: 'square', freq: 523, arp: [0, 4, 7, 12], step: .05, dur: .25, vol: .24 }, oneup: { wave: 'square', freq: 659, arp: [0, 3, 12, 8, 10, 15], step: .08, dur: .5, vol: .26 }, newweapon: { wave: 'square', freq: 392, arp: [0, 4, 7, 11, 12], step: .06, dur: .4, vol: .24 }, extend: { wave: 'triangle', freq: 880, arp: [0, 7, 12], step: .06, dur: .3, vol: .3 },
  boom_s: [N(900, 100, .5, .6), { wave: 'sine', freq: 90, to: 30, dur: .45, vol: .6 }], boom_b: [N(700, 60, 1.2, .8), { wave: 'sine', freq: 60, to: 22, dur: 1.1, vol: .8 }, { wave: 'saw', freq: 200, to: 30, dur: .6, vol: .2 }],
  glass: N(5000, 1500, .25, .4, 'highpass'), wood: [N(900, 300, .15, .45), { wave: 'triangle', freq: 180, to: 80, dur: .1, vol: .3 }], lantern: { wave: 'triangle', freq: 1200, to: 400, dur: .15, vol: .2 },
  grenade: { wave: 'triangle', freq: 300, to: 200, dur: .2, vol: .3 }, rocket: [N(600, 2200, .5, .35, 'highpass'), { wave: 'saw', freq: 150, to: 300, dur: .5, vol: .15 }], harpoon: { wave: 'square', freq: 1500, to: 300, dur: .2, vol: .25 }, torpedo: [N(3000, 1000, .8, .2, 'highpass'), { wave: 'sine', freq: 70, to: 90, dur: .8, vol: .3 }], flare: { wave: 'square', freq: 900, to: 1800, dur: .15, vol: .2 },
  spin: { wave: 'saw', freq: 100, to: 600, dur: .8, vol: .26 }, minigun: [N(2200, 700, .06, .4), { wave: 'sine', freq: 150, dur: .06, vol: .4 }], slash: [N(600, 3500, .2, .35, 'highpass'), { wave: 'saw', freq: 700, to: 200, dur: .15, vol: .15 }], windup: { wave: 'saw', freq: 200, to: 900, dur: .45, vol: .18 }, stomp: [N(300, 60, .2, .5), { wave: 'sine', freq: 70, to: 30, dur: .25, vol: .6 }],
  select: { wave: 'square', freq: 700, dur: .04, vol: .16 }, confirm: { wave: 'square', freq: 520, arp: [0, 7], step: .05, dur: .14, vol: .2 }, back: { wave: 'square', freq: 400, to: 250, dur: .1, vol: .18 }, stamp: [N(400, 80, .3, .6), { wave: 'sine', freq: 90, to: 40, dur: .3, vol: .6 }], count: { wave: 'square', freq: 1100, dur: .02, vol: .1 },
  zap: [{ wave: 'saw', freq: 2000, to: 200, dur: .2, vol: .25 }, N(4000, 1000, .2, .25, 'highpass')], rotor: N(250, 150, .12, .18), lock: [{ wave: 'square', freq: 300, to: 800, dur: .12, vol: .25 }, N(2000, 400, .1, .3)]
};
let _audioDefined = false;
function defineAudio(game) { if (_audioDefined && game.audio._defd) return; for (const k in SFXD) game.audio.define(k, SFXD[k]); game.audio._defd = true; _audioDefined = true; }
const SND = { play(name, o) { const g = E.current; if (!g || !g.audio || g.headless) return; try { g.audio.sfx(name, o); } catch (e) { } } };
// ---- the gibberish voice: syllables, formant filters, consonant noise bursts, contour and effect ----
const FORMANTS = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 1900] };
const Voice = {
  active: [],
  syllables(text) {
    const out = []; const s = text.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim(); let cur = '', vow = false, pause = 0;
    for (const ch0 of s) { const ch = ch0.toLowerCase();
      if (/[aeiouy]/.test(ch)) { cur += ch; vow = true; }
      else if (/[a-z]/.test(ch)) { if (vow) { out.push({ s: cur, p: 0, caps: false }); cur = ''; vow = false; } cur += ch; }
      else { if (cur && vow) { out.push({ s: cur, p: 0 }); cur = ''; vow = false; } if (/[,;:]/.test(ch)) pause = .12; else if (/[.!?…—]/.test(ch)) pause = .25; if (pause && out.length) { out[out.length - 1].p = Math.max(out[out.length - 1].p, pause); pause = 0; } if (ch === '!') { if (out.length) out[out.length - 1].excl = 1; } if (ch === '?') { if (out.length) out[out.length - 1].q = 1; } } }
    if (cur && vow) out.push({ s: cur, p: 0 });
    // caps = shouting
    const shout = s.length > 3 && s === s.toUpperCase() && /[A-Z]/.test(s); for (const o of out) o.shout = shout; return out;
  },
  duration(text, who) { const sp = reg('speaker', who), rate = sp ? sp.voice.rate : 11; return Voice.syllables(text).reduce((t, s) => t + 1 / rate + s.p, 0); },
  say(text, who, o = {}) {
    const sp = reg('speaker', who) || reg('speaker', 'kai'), v = sp.voice, syl = Voice.syllables(text), dur = syl.reduce((t, s) => t + 1 / v.rate + s.p, 0);
    const g = E.current, ac = g && g.audio && g.audio.ctx; if (!ac || ac.state === 'suspended' || !g.audio.bus) return dur;
    const bus = g.audio.bus('sfx'); if (!bus) return dur;
    Voice.active = Voice.active.filter(a => a.end > ac.currentTime); while (Voice.active.length >= 2) { const a = Voice.active.shift(); try { a.stop(); } catch (e) { } }
    const t0 = ac.currentTime + .03; let t = t0; const seed = hash32(text), out = ac.createGain(); out.gain.value = o.vol == null ? .55 : o.vol;
    let fxIn = out; if (v.fx === 'radio') { const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .7; out.connect(bp); const ws = ac.createWaveShaper(); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.2); } ws.curve = c; bp.connect(ws); ws.connect(bus); }
    else if (v.fx === 'boom') { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; out.connect(lp); const dl = ac.createDelay(.5); dl.delayTime.value = .09; const fb = ac.createGain(); fb.gain.value = .3; lp.connect(bus); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(bus); }
    else if (v.fx === 'gravel') { const am = ac.createGain(); am.gain.value = .7; const lfo = ac.createOscillator(); lfo.frequency.value = 40; const lg = ac.createGain(); lg.gain.value = .3; lfo.connect(lg); lg.connect(am.gain); lfo.start(t0); lfo.stop(t0 + dur + .5); out.connect(am); am.connect(bus); }
    else out.connect(bus);
    const nodes = [out]; let n = syl.length;
    syl.forEach((sy, i) => {
      const h = ((hash32(sy.s + i + seed) % 1000) / 1000), jit = 1 + (h - .5) * .12, prog = i / Math.max(1, n - 1);
      let contour = 1 - prog * .12; if (sy.q || (i > n - 3 && /\?$/.test(text))) contour = 1 + prog * .22; if (sy.excl || sy.shout) contour *= 1.25;
      const f0 = v.pitch * contour * jit, d = (1 / v.rate) * (.85 + h * .3), vowel = sy.s.replace(/[^aeiouy]/g, '')[0] || 'a', F = FORMANTS[vowel];
      const osc = ac.createOscillator(); osc.type = v.wave || 'sawtooth'; osc.frequency.setValueAtTime(f0 * .96, t); osc.frequency.linearRampToValueAtTime(f0, t + d * .3);
      const env = ac.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(sy.shout ? 1 : .8, t + .012); env.gain.setTargetAtTime(0, t + d * .65, .015);
      for (const f of F) { const bq = ac.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = f * (v.pitch > 180 ? 1.15 : v.pitch < 120 ? .9 : 1); bq.Q.value = 5; osc.connect(bq); bq.connect(env); }
      env.connect(out); osc.start(t); osc.stop(t + d + .08); nodes.push(osc);
      // consonant onset
      const c = sy.s[0]; if (!/[aeiouy]/.test(c)) { const nb = ac.createBufferSource(); nb.buffer = g.audio._noise; const flt = ac.createBiquadFilter(), cg = ac.createGain(), pl = 'ptkbdg'.includes(c), fr = 'sfhzxcj'.includes(c), nas = 'mn'.includes(c); flt.type = fr ? 'highpass' : 'bandpass'; flt.frequency.value = fr ? 4500 : pl ? 1800 : nas ? 300 : 900; const cd = pl ? .012 : fr ? .04 : nas ? .03 : .025; cg.gain.setValueAtTime(pl ? .5 : fr ? .3 : .2, t); cg.gain.exponentialRampToValueAtTime(.001, t + cd); nb.connect(flt); flt.connect(cg); cg.connect(out); nb.start(t, 0, cd + .01); }
      t += d + sy.p;
    });
    const rec = { end: t + .1, stop() { for (const nd of nodes) { try { nd.stop && nd.stop(); nd.disconnect && nd.disconnect(); } catch (e) { } } } }; Voice.active.push(rec); return dur;
  },
  bark(who) { const sp = reg('speaker', who) || reg('speaker', 'kai'); const t = ['hra', 'ugh', 'hup', 'nya', 'gah', 'hey'][Math.floor(cosmetic() * 6)]; return Voice.say(t, who, { vol: .4 }); }
};
// the music layers: drums and lead come in during ACTION, out during WAIT
function musicFor(game, id, o) { const s = reg('song', id); if (!s) return; try { game.audio.music(s, Object.assign({ sync: true, fade: .8 }, o)); } catch (e) { } }

// ---- 50-input.js ----
// 50-input.js — the action map (DualSense / keyboard + mouse), per-player aim (mouse absolute, pad curve + assist,
// keys constant), and the Command each player's device produces for the Sim.
const INPUT = Object.assign({}, E.Input.DEFAULT, {
  fire: ['Mouse0', 'KeyZ', 'KeyJ', 'Pad7', 'Pad0'], cover: ['Mouse2', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyX', 'Pad6', 'Pad1'],
  next: ['WheelDown', 'KeyE', 'Pad5'], prev: ['WheelUp', 'KeyQ', 'Pad4'], reload: ['KeyR', 'Pad2'], w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  tab: ['KeyE', 'Pad5'], tabPrev: ['KeyQ', 'Pad4'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'], more: ['KeyM', 'Pad3'], reset: ['Delete', 'Pad2']
});
['attack', 'dash', 'skill', 'jump'].forEach(k => delete INPUT[k]);
const NAMES = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher', tab: false, tabPrev: false, more: false, reset: false };
const AimState = [{ ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }, { ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }, { ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }, { ax: 0, ay: 0, hold: 0, tog: 0, rel: 0 }];
// Build one player's command. rect = the viewport {x,y,w,h} in buffer pixels (for the pointer).
function readCommand(sim, pid, inp, rect, dt, settings, isMouseOwner) {
  const p = sim.players[pid], A = AimState[pid], H = rect.h / 2, aspect = rect.w / rect.h; p.aspect = aspect;
  const assist = settings && settings.aimAssist != null ? ({ off: 0, low: .35, medium: .6, high: .85 })[settings.aimAssist] : tune.player.assist;
  let ax = p.aim[0], ay = p.aim[1];
  const pt = isMouseOwner ? inp.pointer() : null;
  if (inp.aimSource === 'mouse' && pt && !settings.mouseOff) { ax = (pt[0] - rect.x - rect.w / 2) / H; ay = -((pt[1] - rect.y - rect.h / 2) / H); }
  else if (inp.aimSource === 'pad' || inp.padAim || (inp.padMove && Math.hypot(inp.padMove[0], inp.padMove[1]) > .2)) {
    let s = inp.padAim || inp.padMove || [0, 0]; const mag = Math.hypot(s[0], s[1]);
    if (mag > .05) {
      const c = Math.pow(mag, 2.2) / mag, speed = tune.player.padSpeed * (settings.padSpeed || 1); A.hold = Math.min(1.5, A.hold + dt); const accel = 1 + Math.min(.5, A.hold / .35 * .5);
      let sp = speed * accel;
      if (assist > 0) { const near = nearestTarget(sim, pid, ax, ay); if (near && near.d < .07) sp *= 1 - .55 * assist; if (near && near.d < .12 && mag > .2) { ax += (near.ax - ax) * Math.min(1, assist * 6 * dt); ay += (near.ay - ay) * Math.min(1, assist * 6 * dt); } }
      ax += s[0] * c * sp * dt; ay -= s[1] * c * sp * dt;
    } else A.hold = 0;
    { let dx = 0, dy = 0; if (inp.down('left')) dx -= 1; if (inp.down('right')) dx += 1; if (inp.down('up')) dy += 1; if (inp.down('down')) dy -= 1; ax += dx * .7 * dt; ay += dy * .7 * dt; }   // the d-pad nudges the reticle
  } else {
    let dx = 0, dy = 0; if (inp.down('left')) dx -= 1; if (inp.down('right')) dx += 1; if (inp.down('up')) dy += 1; if (inp.down('down')) dy -= 1;
    if (dx || dy) { ax += dx * 1.2 * dt; ay += dy * 1.2 * dt; }
  }
  ax = clamp(ax, -aspect, aspect); ay = clamp(ay, -1, 1);
  const cmd = { aim: [ax, ay] };
  // cover: hold or toggle
  if (settings.coverMode === 'toggle') { if (inp.pressed('cover')) A.tog = A.tog ? 0 : 1; cmd.coverDown = !!A.tog; } else { A.tog = 0; cmd.coverDown = inp.down('cover'); }
  if (inp.pressed('reload')) A.rel = .55; if (A.rel > 0) { A.rel -= dt; cmd.coverDown = true; }
  cmd.firePressed = inp.pressed('fire'); cmd.fireDown = inp.down('fire'); cmd.autoFire = settings.autoFire !== 'off';
  cmd.next = inp.pressed('next'); cmd.prev = inp.pressed('prev'); cmd.reload = inp.down('reload');
  for (let i = 1; i <= 4; i++) if (inp.pressed('w' + i)) cmd.select = i;
  return cmd;
}
function nearestTarget(sim, pid, ax, ay) {
  const pose = sim.pose(pid); let best = null;
  const consider = (c, civ) => { if (civ) return; const a = R3.aimOf(pose, c); if (!a) return; const d = Math.hypot(a[0] - ax, a[1] - ay); if (!best || d < best.d) best = { d, ax: a[0], ay: a[1] }; };
  for (const e of sim.enemies) { if (e.dead || e.civ || e.gone) continue; const v = sim.volumes(e); if (!v.length) continue; const t = v.find(q => q.part === 'torso') || v[0]; consider(t.k === 's' ? t.c : [(t.a[0] + t.b[0]) / 2, (t.a[1] + t.b[1]) / 2, (t.a[2] + t.b[2]) / 2]); }
  for (const pr of sim.proj) if (!pr.dead && pr.team !== 'p') consider([pr.x, pr.y, pr.z]);
  for (const o of sim.objs) if (!o.dead && (o.ring || o.intel || o.lock)) consider([o.x, o.y, o.z + o.h / 2]);
  if (sim.boss) for (const v of sim.bossVolumes()) if (v.k === 's') consider(v.c);
  return best;
}

// ---- 51-flow.js ----
// 51-flow.js — Run (a session of play: mode, difficulty, stage carry-over), the play scene (single and split screen),
// scene audio mapping, continues, and results/game-over routing. Reads Sim; the Sim never reads this.
let game = null, arcade = null;
const Run = {
  mode: 'arcade', diff: 'normal', stage: 1, np: 1, sim: null, carry: null, results: [], hub: null, attract: false,
  players(n) { return Array.from({ length: n }, (_, i) => ({ name: 'P' + (i + 1), agent: AGENT[i], color: PCOL[i] })); },
  begin(mode, stage, diff, np) { this.mode = mode; this.stage = stage; this.diff = diff || 'normal'; this.np = np || 1; this.carry = null; this.results = []; this.sim = null; },
  newSim(stage, sceneId, extra = {}) {
    const first = reg('stage', stage).scenes[0], sim = new Sim(Object.assign({ mode: this.mode, stage, scene: sceneId || first, difficulty: this.diff, players: this.players(this.np), seed: (Date.now() & 0xffff) + stage * 77 }, extra));
    if (this.carry) this.carry.forEach((c, i) => { const p = sim.players[i]; if (p && c) { p.score = c.score; p.lives = Math.max(c.lives, 1); p.ammo = c.ammo.slice(); p.weapon = 0; p.st = c.st; p.continues = c.continues; p.mark = c.mark; p.nextLife = c.nextLife; p.seen = c.seen; p.best = c.best; } });
    this.sim = sim; return sim;
  },
  keepCarry(sim) { this.carry = sim.players.map(p => ({ score: p.score, lives: p.down ? sim.diff.lives : p.lives, ammo: p.ammo.slice(), st: p.st, continues: p.continues, mark: p.mark || 0, nextLife: p.nextLife, seen: p.seen, best: p.best })); }
};
const Settings_ = () => game.settings || {};
function viewportRects(np, W, H) { if (np <= 1) return [{ x: 0, y: 0, w: W, h: H }]; const w = Math.floor((W - 1) / 2); return [{ x: 0, y: 0, w, h: H }, { x: W - w, y: 0, w, h: H }]; }
function localInputs(np) { const a = [game.input]; for (let i = 1; i < np; i++) a.push(game.players[i] || game.input); return a; }
// ---- audio mapping for sim events ----
function playEvents(sim, local) {
  const near = pid => pid == null || local.includes(pid);
  for (const ev of sim.events) {
    switch (ev.type) {
      case 'shot': SND.play('w_' + WEAPONS[ev.w].id, { pitch: near(ev.p) ? 1 : .8, vol: near(ev.p) ? 1 : .6 }); break;
      case 'empty': SND.play('empty'); break;
      case 'reload': if (near(ev.p)) SND.play('reload'); break;
      case 'switch': if (near(ev.p)) SND.play('switch'); HUD.strip = HUD.strip || []; HUD.strip[ev.p] = .8; break;
      case 'impact': SND.play(ev.mat === 'steel' || ev.mat === 'metal' ? 'ping' : ev.mat === 'crate' || ev.mat === 'planks' || ev.mat === 'timber' ? 'wood' : 'thud', { vol: .6 }); break;
      case 'hit': SND.play(ev.head ? 'head' : 'e_hit', { vol: near(ev.p) ? .8 : .4 }); break;
      case 'kill': SND.play('e_die', { vol: .6 }); if (Math.random() < .5) { } break;
      case 'explode': SND.play(ev.big ? 'boom_b' : 'boom_s'); break;
      case 'break': SND.play(ev.mat === 'glass' ? 'glass' : ev.kind === 'lantern' ? 'lantern' : 'wood'); break;
      case 'eshot': SND.play(ev.kind === 'zap' ? 'zap' : ev.kind === 'turret' ? 'w_mg' : 'w_handgun', { vol: .35, pitch: .85 }); break;
      case 'emiss': SND.play('whizz', { vol: .5 }); break;
      case 'threat': SND.play('tick', { vol: .6 }); break;
      case 'impactme': SND.play('chirp'); break;
      case 'blocked': SND.play('ping'); SND.play('cover_in', { vol: .3 }); break;
      case 'hurt': SND.play('thud'); if (near(ev.p)) { Voice.bark(AGENT[ev.p] || 'kai'); game.input.rumble(.6, .25); } break;
      case 'pickup': SND.play(ev.first ? 'newweapon' : 'pickup'); break;
      case 'oneup': SND.play('oneup'); break;
      case 'extend': SND.play('extend'); break;
      case 'timeup': SND.play('timeup'); break;
      case 'action': SND.play('confirm'); break;
      case 'throw': SND.play(ev.kind === 'grenade' ? 'grenade' : ev.kind === 'harpoon' ? 'harpoon' : ev.kind === 'flare' ? 'flare' : 'rocket'); break;
      case 'windup': SND.play('windup', { vol: .5 }); break;
      case 'slash': SND.play('slash'); break;
      case 'spinup': SND.play('spin'); break;
      case 'stagger': case 'topple': SND.play('stomp'); break;
      case 'bigboom': SND.play('boom_b'); break;
      case 'lockjam': SND.play('lock'); break;
      case 'partbreak': SND.play('boom_s'); break;
      case 'clear': SND.play('stamp'); break;
      case 'turretspin': SND.play('spin', { vol: .5 }); break;
      case 'clawcharge': SND.play('windup', { vol: .6 }); break;
      case 'shotdown': SND.play('head'); break;
      case 'civhit': SND.play('timeup'); break;
    }
  }
}
function sceneMusic(sim) {
  const st = reg('stage', sim.stage), sc = sim.scene; if (!st || !sc) return; const want = sim.boss && !sim.boss.mini ? (sim.boss.id === 'krake' ? 'kingtide' : 'boss') : sim.boss && sim.boss.mini ? 'boss' : sc.stage === 0 ? 'range' : st.music;
  if (Run._song !== want) { Run._song = want; musicFor(game, want); Run._layers = null; }
}
function layerMusic(sim) { const on = sim.phase === 'action' || sim.phase === 'boss'; if (Run._layerOn === on) return; Run._layerOn = on; try { for (const n of ['lead', 'drums']) game.audio.layer(n, on ? 1 : 0, .4); } catch (e) { } }
// ---- the play scene ----
const PlayCtx = { inputs: [], local: [0], settings: {}, corner: null, reticleOn: () => true };
function playEnter(data) {
  data = data || {};
  Pres.reset(); resetHud(); HUD.shown = Run.mode === 'attract' ? { cover: 1, reload: 1, shield: 1, laser: 1, torpedo: 1, final: 1 } : (HUD.seenStore || HUD.shown); 
  const sim = data.sim || Run.sim || Run.newSim(Run.stage); Run.sim = sim; Run._song = null; Run._layerOn = null;
  PlayCtx.local = sim.players.map((p, i) => i); if (Run.hub) PlayCtx.local = sim.mode === 'server' ? [] : [Run.hub.me];
  game.camera && 0; 
  if (sim.players.length > 1 && PlayCtx.local.length > 1) game.splitScreen(2, { layout: 'columns' }); else game.splitScreen(0);
  game.lights.enabled = false; Run.paused = false; Run.endT = 0; Run.contHandled = {};
  if (!Run.sim.started) { Run.sim.started = true; }
}
function applySettings() { const s = game.settings; PlayCtx.settings = { aimAssist: s.aimAssist, padSpeed: s.padSpeed, coverMode: s.coverMode, autoFire: s.autoFire, reticle: s.reticle, reticleSize: s.reticleSize, threatSize: s.threatSize, subtitles: s.subtitles === 'on' || s.subtitles === true, mouseOff: false }; PlayCtx.settings.subtitles = s.subtitles !== 'off' && s.subtitles !== false; }
function playUpdate(dt) {
  const sim = Run.sim; if (!sim) return;
  applySettings(); const np = sim.players.length, isCo = np > 1 && PlayCtx.local.length > 1, rects = viewportRects(isCo ? np : 1, game.W, game.H);
  PlayCtx.inputs = localInputs(np);
  if (Run.hub && sim.mode === 'replica' && window.AIHub.time() < 0) { HUD.countdown = Math.ceil(-window.AIHub.time() / 1000); return; }
  if (Dev.open) { Dev.update(dt); stepPres(0, sim); return; }
  if (tune.view.freecam) { freeCam(dt); }
  const cmds = [];
  if (Run.mode === 'attract' || Run.botOn) { for (const p of sim.players) cmds[p.id] = Bot.command(sim, p, dt); }
  else if (sim.mode === 'replica') { cmds[Run.hub.me] = readCommand(sim, Run.hub.me, game.input, rects[0], dt, PlayCtx.settings, true); }
  else if (sim.mode === 'host' || sim.mode === 'server') { if (Run.hub && window.AIHub.time() < 0) { sim.events.length = 0; HUD.countdown = Math.ceil(-window.AIHub.time() / 1000); stepPres(dt, sim); return; } HUD.countdown = 0; const hc = netHostCommands(sim); for (const k in hc) cmds[k] = hc[k]; if (sim.mode === 'host') cmds[Run.hub.me] = readCommand(sim, Run.hub.me, game.input, rects[0], dt, PlayCtx.settings, true); }
  else for (const i of PlayCtx.local) { const inp = PlayCtx.inputs[i]; cmds[i] = readCommand(sim, i, inp, rects[isCo ? i : 0], dt, PlayCtx.settings, i === 0); if (Run.botP2 && i === 1) cmds[i] = Bot.command(sim, sim.players[1], dt); }
  // continue handling
  for (const p of sim.players) if (p.down && p.contT > 0 && !p.contFail && Run.mode !== 'attract') {
    const inp = PlayCtx.inputs[p.id] || game.input; if (inp.pressed('start') || inp.pressed('confirm') || (p.id === 0 && inp.clicked && inp.clicked())) { sim.continuePlayer(p); SND.play('confirm'); }
  }
  const single = sim.players.length === 1; let frozen = false;
  if (single && sim.players[0].down && sim.players[0].contT > 0) { sim.players[0].contT -= dt; frozen = true; if (sim.players[0].contT <= 0) { sim.players[0].contFail = true; sim.players[0].contT = 0; sim.emit('contfail', {}); sim.checkOver(); frozen = false; } }
  if (!frozen) { if (sim.mode === 'replica') netReplicaStep(sim, dt, cmds); else sim.step(dt * tune.time.speed, cmds); } else sim.events.length = 0;
  for (const p of sim.players) { if (p.down && p.contFail && single) { } }
  if (sim.mode === 'host') netHostStep(sim, dt);
  consumeEvents(sim, PlayCtx); hudEvents(sim, game.input, PlayCtx.local); playEvents(sim, PlayCtx.local); stepHud(dt); stepPres(dt, sim);
  if (sim.events.some(e => e.type === 'timeup' || e.type === 'hurt')) game.flash && game.flash('#ff2020', .12);
  for (let i = 0; i < 4; i++) if (HUD.strip && HUD.strip[i] > 0) HUD.strip[i] -= dt;
  sceneMusic(sim); layerMusic(sim);
  if (sim.timer < 10 && sim.phase === 'action' && Math.floor(sim.timer) !== Run._lastTick) { Run._lastTick = Math.floor(sim.timer); SND.play('time_tick'); }
  // end conditions
  if (sim.phase === 'stageclear') { Run.endT += dt; if (Run.endT > 2.2) endStage(); }
  else if (sim.phase === 'over') { Run.endT += dt; if (Run.endT > 2.5) { if (Run.mode === 'attract') attractNext(); else if (!Run.hub) game.go('gameover', { sim }); } }
  if (Run.mode === 'range' && sim.phase === 'clear') { }
  if (Run.mode === 'attract') attractWatch(sim, dt);
  if (sim.mode === 'range' && sim.phase === 'stageclear') { }
}
function freeCam(dt) {
  const I = game.input, c = Dev.cam, sp = (I.down('cover') ? 240 : 90) * dt, ca = Math.cos(c.yaw), sa = Math.sin(c.yaw);
  if (!Dev.camInit) { const p = Run.sim.pose(0); Object.assign(c, { x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }); Dev.camInit = 1; }
  let fx = 0, fy = 0; if (I.down('up')) fx++; if (I.down('down')) fx--; if (I.down('left')) fy--; if (I.down('right')) fy++; const m = I.padMove; if (m && Math.hypot(m[0], m[1]) > .2) { fx -= m[1]; fy += m[0]; }
  c.x += (ca * fx - sa * fy) * sp; c.y += (sa * fx + ca * fy) * sp; if (I.down('next')) c.z += sp; if (I.down('prev')) c.z -= sp; if (I.padAim) { c.yaw += I.padAim[0] * 1.6 * dt; c.pitch = clamp(c.pitch - I.padAim[1] * 1.2 * dt, -1.2, 1.2); }
  if (I.pressed('reload') && navigator.clipboard) { const s = '[' + [c.x, c.y, c.z, c.yaw / DEG, c.pitch / DEG].map(v => +v.toFixed(1)).join(', ') + ']'; try { navigator.clipboard.writeText(s); } catch (e) { } console.log('camera pose', s); Dev.msg = 'Copied ' + s; Dev.msgT = 3; }
}
function drawSimView(g, sim, pid, rect, t) {
  g.save(); g.beginPath(); g.rect(rect.x, rect.y, rect.w, rect.h); g.clip(); g.translate(rect.x, rect.y); E.px.reset(g);
  drawWorld(g, sim, pid, rect.w, rect.h, t, tune.view.freecam ? { pose: Object.assign({ fov: tune.view.fov, roll: 0 }, Dev.cam) } : {}); g.restore(); E.px.reset(g);
}
function playDraw(r) {
  const sim = Run.sim; if (!sim) return; const np = sim.players.length, isCo = np > 1 && PlayCtx.local.length > 1;
  r.overlay(g => {
    const rects = viewportRects(isCo ? np : 1, r.W, r.H); const t = game.time;
    const local = PlayCtx.local; PlayCtx.corner = game.cornerArea && game.cornerArea();
    const pids = isCo ? [0, 1] : [local[0] != null ? local[0] : 0];
    for (let k = 0; k < pids.length; k++) { const pid = pids[k], rect = rects[k]; drawSimView(g, sim, pid, rect, t); drawHud(g, sim, pid, rect, PlayCtx); }
    if (isCo) px.rect(g, rects[0].w, 0, r.W - rects[0].w * 2, r.H, '#000000');
    if (Dev.open) Dev.draw(g, r.W, r.H, sim);
    if (tune.view.rail || tune.view.colliders) devOverlays(g, sim, rects[0]);
    if (Run.mode === 'attract') attractOverlay(g, r.W, r.H);
    if (sim.phase === 'travel' && sim.pt < .45) { px.blend(g, 1 - sim.pt / .45, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#000000')); }
  });
}
function endStage() {
  const sim = Run.sim; Run.keepCarry(sim);
  if (Run.mode === 'attract') { attractNext(); return; }
  if (Run.hub) return;
  game.go('results', { sim, stage: sim.stage });
}

// ---- 52-screens.js ----
// 52-screens.js — title, main menu, difficulty, stage select, co-op join, briefing/cutscene pages, results,
// game over + initials, records, about, ending/credits, touch-only notice. 10-foot sizes (scale 2+), one big focus,
// hover moves focus, prompts from input.label().
const Backdrop = { sim: null, t: 0 };
function backdropSim() { if (!Backdrop.sim) { Backdrop.sim = new Sim({ scene: '1-1', stage: 1, players: [{}] }); } return Backdrop.sim; }
function drawBackdrop(g, W, H, t, dim = .35) {
  const sim = backdropSim(); const a = t * .12;
  drawWorld(g, sim, 0, W, H, t, { pose: { x: -90 + Math.sin(a) * 40, y: Math.sin(a * .7) * 50, z: 30 + Math.sin(a * .5) * 4, yaw: Math.sin(a * .9) * .35, pitch: .02, roll: 0, fov: 55 } });
  px.blend(g, dim, 'normal', () => px.rect(g, 0, 0, W, H, '#050a1c'));
}
const T = (g, s, x, y, col, o) => E.font.text(g, String(s).replace(/–/g, '-'), Math.round(x), Math.round(y), col, Object.assign({ shadow: '#000000', outline: false }, o));
function logo(g, W, y, t) {
  E.font.title(g, 'TIDE CRISIS', Math.round(W / 2 - 30), y, { scale: 4, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 3, depthColor: '#08142a', align: 'center' });
  E.font.title(g, '3', Math.round(W / 2 + 96), y - 4, { scale: 6, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#08142a', depth: 3, depthColor: '#2a0808', align: 'center' });
  for (let i = 0; i < 4; i++) { const yy = y + 42 + i * 2; for (let x = 0; x < W; x += 3) { const v = Math.sin(x * .05 + t * 2 + i) * 2; px.rect(g, x, yy + v, 3, 1, ['#3aa0e8', '#1a6fb8', '#124a88', '#0a2a58'][i]); } }
}
// ---- BigMenu: scale-2 entries, one wave-animated focus, hover/click, description line ----
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.t = 0; this.rects = []; this.mt = null; }
  inputs() { return game._players || [game.input]; }
  update(dt) {
    this.t += dt; const n = this.items.length, P = this.inputs(), I = P[0]; let moved = false;
    if (P.some(p => p.repeat('up'))) { this.i = (this.i + n - 1) % n; moved = true; } if (P.some(p => p.repeat('down'))) { this.i = (this.i + 1) % n; moved = true; }
    if (I.mouse.t !== this.mt) { this.mt = I.mouse.t; const pt = I.pointer(); if (pt) for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (pt[0] >= r.x && pt[0] < r.x + r.w && pt[1] >= r.y && pt[1] < r.y + r.h && !this.items[k].disabled) { if (this.i !== k) { this.i = k; SND.play('select'); } } } }
    let tap = -1; const c = I.clicked(); if (c) for (let k = 0; k < this.rects.length; k++) { const r = this.rects[k]; if (c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h) tap = k; }
    if (tap >= 0) this.i = tap; if (moved) SND.play('select');
    if (this.items[this.i] && this.items[this.i].disabled && moved) this.i = (this.i + 1) % n;
    if ((P.some(p => p.pressed('confirm')) || tap >= 0) && !this.items[this.i].disabled) { SND.play('confirm'); P.forEach(p => p.consumeAll()); if (this.o.onPick) this.o.onPick(this.i, this.items[this.i]); return true; }
    if (P.some(p => p.pressed('cancel')) && this.o.onCancel) { SND.play('back'); P.forEach(p => p.consumeAll()); this.o.onCancel(); return true; }
    return false;
  }
  draw(g, W, H, y0 = 92, rowH = 22) {
    this.rects = []; const mid = W / 2;
    this.items.forEach((it, k) => {
      const sel = k === this.i, y = y0 + k * rowH, w = 190, x = mid - w / 2; this.rects.push({ x, y: y - 2, w, h: rowH });
      if (sel) { const wave = Math.sin(this.t * 6) * 2; px.rect(g, x - 4 + wave, y - 2, w + 8, rowH - 2, '#1a4f9c'); px.rect(g, x - 4 + wave, y - 2, w + 8, 1, '#9fe3ff'); px.rect(g, x - 4 + wave, y + rowH - 5, w + 8, 1, '#9fe3ff'); T(g, '▸', x + 2, y + 2, '#ffd36a', { scale: 2 }); }
      T(g, it.label, mid, y + 2, it.disabled ? '#5a6480' : sel ? '#ffd36a' : '#f4f7ff', { scale: 2, align: 'center' });
    });
    const it = this.items[this.i]; if (it && it.desc) T(g, it.desc, mid, y0 + this.items.length * rowH + 6, '#9fb8e8', { scale: 1, align: 'center' });
  }
}
function promptBar(g, W, H, pairs) {
  const inp = game.input; let s = ''; for (const [a, l] of pairs) s += '[' + inp.label(a) + '] ' + l + '    '; T(g, s.trim(), W / 2, H - 14, '#9fb8e8', { scale: 1, align: 'center' });
}
// any input resets the idle timer (a key, a button, the wheel, a stick past its dead zone, a pointer move > 4 px)
const Idle = { t: 0, last: null };
function idleStep(dt) {
  const I = game.input; let any = I.anyPressed(); const pt = I.pointer(); if (pt) { if (Idle.last && Math.hypot(pt[0] - Idle.last[0], pt[1] - Idle.last[1]) > 4) any = true; Idle.last = pt.slice(); }
  if (I.padAim || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3)) any = true;
  if (any) Idle.t = 0; else Idle.t += dt; return Idle.t;
}
const touchOnly = () => { try { return window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches && !(navigator.getGamepads && Array.from(navigator.getGamepads()).some(Boolean)) && !Run.keyed; } catch (e) { return false; } };
// ---- scenes ----
const Scenes = {};
Scenes.title = { camera: { zoom: false }, touch: [],
  enter() { if (Run.hub) { game.go(Run.hub.server ? 'server' : 'session', { fade: 0 }); return; } Idle.t = 0; musicFor(game, 'theme'); Run._song = 'theme'; game.splitScreen(0); Run.attract = false; Run.mode = 'arcade'; Run.hub = null; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (touchOnly()) { Idle.t += dt; if (I.clicked()) { const c = I.clicked(); if (c[0] > game.W - 40 && c[1] < 40) game.menu('settings'); else if (Idle.t > 2) { } } if (I.anyPressed()) { Run.keyed = true; } if (Idle.t > 10) game.go('attract'); return; }
    const idle = idleStep(dt); if (idle > 10) { game.go('attract'); return; }
    if (I.pressed('confirm') || I.pressed('start') || I.clicked() || I.pressed('fire')) { SND.play('confirm'); I.consumeAll(); game.go('menu'); }
  },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .25); logo(g, W, 40, game.time);
    if (touchOnly()) { T(g, 'Controller or keyboard required', W / 2, 124, '#ffd36a', { scale: 2, align: 'center' }); E.ui.box(g, W - 36, 6, 30, 26, { bg: ['#10244a', '#081428'], border: '#3aa0e8' }); T(g, '⚙', W - 21, 12, '#ffffff', { scale: 2, align: 'center' }); }
    else { const pad = game.input.lastDevice === 'gamepad'; if (Math.floor(game.real * 2) % 2 === 0) T(g, pad ? 'PRESS ' + game.input.label('confirm') : (game.input.lastDevice === 'keyboard' ? 'PRESS ENTER' : 'PRESS ENTER OR CLICK'), W / 2, 150, '#ffffff', { scale: 2, align: 'center' }); }
    T(g, 'An original arcade light-gun rail shooter — inspired by Time Crisis 3', W / 2, H - 24, '#9fb8e8', { scale: 1, align: 'center' }); T(g, E.versionLabel ? E.versionLabel() : '', W / 2, H - 12, '#6a7ea8', { scale: 1, align: 'center', font: 'tiny' }); }); }
};
const MAIN_ITEMS = () => [{ label: 'ARCADE', desc: 'One agent, three stages, one tide to beat.' }, { label: 'CO-OP', desc: 'Two agents, split screen, two controllers.' }, { label: 'STAGE SELECT', desc: 'Jump into any stage at any difficulty.' }, { label: 'TRAINING', desc: 'The CREST shooting range: four short drills.' }, { label: 'RECORDS', desc: 'High scores, best range time and intel.' }, { label: 'SETTINGS', desc: 'Sound, controls, aim assist and comfort.' }, { label: 'ABOUT', desc: 'How to play, credits and source information.' }];
Scenes.menu = { camera: { zoom: false }, touch: [],
  enter() { Idle.t = 0; this.m = new BigMenu(MAIN_ITEMS(), { start: Run.menuI || 0, onPick: (i) => { Run.menuI = i; this.pick(i); }, onCancel: () => game.go('title') }); if (Run._song !== 'theme') { musicFor(game, 'theme'); Run._song = 'theme'; } },
  pick(i) {
    if (i === 0) { Run.begin('arcade', 1, game.settings.difficulty, 1); game.go('difficulty', { next: 'arcade' }); }
    else if (i === 1) { game.go('coop'); } else if (i === 2) game.go('select'); else if (i === 3) { Run.begin('range', 0, 'normal', 1); game.go('briefing', { stage: 0 }); }
    else if (i === 4) game.go('records'); else if (i === 5) game.menu('settings'); else if (i === 6) game.go('about');
  },
  update(dt) { const idle = idleStep(dt); if (idle > 10 && !game.paused) { game.go('attract'); return; } this.m.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .5); logo(g, W, 14, game.time); this.m.draw(g, W, H, 66, 20); promptBar(g, W, H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
Scenes.difficulty = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; const cur = ['easy', 'normal', 'hard'].indexOf(game.settings.difficulty || 'normal'); this.m = new BigMenu([{ label: 'EASY', desc: '7 lives · 25% more TIME · fewer threats' }, { label: 'NORMAL', desc: '5 lives · the way it is meant to be played' }, { label: 'HARD', desc: '3 lives · 15% less TIME · more threats at once' }], { start: cur < 0 ? 1 : cur, onPick: (i) => { const k = ['easy', 'normal', 'hard'][i]; Run.diff = k; game.settings.set && game.settings.set('difficulty', k); this.d.diff = k; if (this.d.next === 'arcade' || this.d.next === 'coop') game.go('briefing', { stage: 1 }); else game.go('briefing', { stage: this.d.stage }); }, onCancel: () => game.go('menu') }); },
  update(dt) { this.m.update(dt); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .6); T(g, 'DIFFICULTY', W / 2, 24, '#ffffff', { scale: 3, align: 'center' }); this.m.draw(g, W, H, 80, 26); promptBar(g, W, H, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
Scenes.select = { camera: { zoom: false }, touch: [],
  enter() { this.i = 0; this.t = 0; this.rects = []; },
  update(dt) { this.t += dt; const P = game._players || [game.input], I = P[0];
    if (P.some(p => p.repeat('left'))) { this.i = (this.i + 2) % 3; SND.play('select'); } if (P.some(p => p.repeat('right'))) { this.i = (this.i + 1) % 3; SND.play('select'); }
    if (I.mouse.t !== this.mt) { this.mt = I.mouse.t; const pt = I.pointer(); if (pt) this.rects.forEach((q, k) => { if (pt[0] >= q.x && pt[0] < q.x + q.w && pt[1] >= q.y && pt[1] < q.y + q.h && this.i !== k) { this.i = k; SND.play('select'); } }); }
    const c = I.clicked(); let tap = -1; if (c) this.rects.forEach((q, k) => { if (c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h) tap = k; }); if (tap >= 0) this.i = tap;
    if (P.some(p => p.pressed('confirm')) || tap >= 0) { SND.play('confirm'); P.forEach(p => p.consumeAll()); Run.begin('stage', this.i + 1, game.settings.difficulty, 1); game.go('difficulty', { next: 'stage', stage: this.i + 1 }); }
    if (P.some(p => p.pressed('cancel'))) { SND.play('back'); P.forEach(p => p.consumeAll()); game.go('menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .6); T(g, 'STAGE SELECT', W / 2, 16, '#ffffff', { scale: 3, align: 'center' }); this.rects = [];
    for (let k = 0; k < 3; k++) { const st = reg('stage', k + 1), w = 124, x = W / 2 - 190 + k * 128 + 2 * 0, y = 58, sel = k === this.i; this.rects.push({ x, y, w, h: 140 }); const wave = sel ? Math.sin(this.t * 6) * 1.5 : 0;
      E.ui.box(g, x, y + wave, w, 140, { bg: sel ? ['#1a4f9c', '#0a2858'] : ['#10244a', '#081428'], border: sel ? '#ffd36a' : '#3a5a98' });
      T(g, 'STAGE ' + (k + 1), x + w / 2, y + 8 + wave, sel ? '#ffd36a' : '#9fe3ff', { scale: 1, align: 'center' }); T(g, st.name, x + w / 2, y + 22 + wave, '#ffffff', { scale: 2, align: 'center', wrap: w - 10 });
      T(g, st.place, x + w / 2, y + 66 + wave, '#9fb8e8', { scale: 1, align: 'center' }); T(g, st.clock, x + w / 2, y + 80 + wave, '#ffb347', { scale: 2, align: 'center' });
      const hs = arcade.table('stage' + (k + 1))[0]; T(g, hs ? 'BEST ' + hs.score : 'NO SCORE YET', x + w / 2, y + 108 + wave, '#7cc0ff', { scale: 1, align: 'center' }); T(g, st.scenes.length + ' AREAS', x + w / 2, y + 122 + wave, '#6a7ea8', { scale: 1, align: 'center' }); }
    promptBar(g, W, H, [['left', 'MOVE'], ['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
Scenes.coop = { camera: { zoom: false }, touch: [],
  enter() { this.t = 0; game.allowJoin && game.allowJoin({ max: 2, onJoin: () => { SND.play('oneup'); } }); },
  exit() { game.allowJoin && game.allowJoin(false); },
  update(dt) { this.t += dt; const P = game.players || [game.input]; if (game.input.pressed('cancel')) { SND.play('back'); game.go('menu'); return; } if (P.length > 1 || game.input.pressed('more')) { if (P.length < 2) { game.addPlayer && game.addPlayer({ keys: 'right' }); } Run.begin('coop', 1, game.settings.difficulty, 2); game.go('difficulty', { next: 'coop' }); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .6); T(g, 'CO-OP', W / 2, 20, '#ffffff', { scale: 3, align: 'center' });
    E.ui.box(g, W / 2 - 150, 70, 140, 100, { bg: ['#4a1210', '#200808'], border: PCOL[0] }); T(g, 'PLAYER 1', W / 2 - 80, 80, PCOL[0], { scale: 2, align: 'center' }); T(g, 'KAI', W / 2 - 80, 104, '#ffffff', { scale: 2, align: 'center' }); T(g, 'READY', W / 2 - 80, 140, '#7cff8a', { scale: 2, align: 'center' });
    const joined = (game.players || []).length > 1; E.ui.box(g, W / 2 + 10, 70, 140, 100, { bg: joined ? ['#101e4a', '#080e20'] : ['#181c28', '#0c0e14'], border: joined ? PCOL[1] : '#444c60' }); T(g, 'PLAYER 2', W / 2 + 80, 80, joined ? PCOL[1] : '#6a7ea8', { scale: 2, align: 'center' });
    if (joined) { T(g, 'ROOK', W / 2 + 80, 104, '#ffffff', { scale: 2, align: 'center' }); T(g, 'READY', W / 2 + 80, 140, '#7cff8a', { scale: 2, align: 'center' }); } else if (Math.floor(this.t * 2) % 2) T(g, 'PRESS START', W / 2 + 80, 116, '#ffd36a', { scale: 2, align: 'center' });
    T(g, 'PLAYER 2 — PRESS START ON A CONTROLLER', W / 2, 190, '#9fe3ff', { scale: 1, align: 'center' }); T(g, 'P1 keeps the keyboard and mouse. Split screen: each agent has their own view and cover.', W / 2, 202, '#6a7ea8', { scale: 1, align: 'center' }); promptBar(g, W, H, [['cancel', 'BACK']]); }); }
};
// ---- briefing and cutscene pages ----
function startPages(pages, name) { this.pi = 0; this.chars = 0; this.hold = 0; this.skipping = false; this.pages = pages; this.name = name; this.sayStarted = -1; this.t = 0; }
const PageScene = (kind) => ({ camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; let def_; if (kind === 'brief') { def_ = reg('brief', 'brief' + (this.d.stage || 1)); } else { def_ = reg('cutscene', this.d.id); } if (!def_ || (kind === 'brief' && this.d.stage === 0)) { this.pages = [['juno', 'Welcome to the CREST range. Four drills: aim and fire, cover and reload, weapons, and reading the crisis flash.'], ['juno', 'Listen to the sirens. When the flash says a shot will hit—duck. Let\'s begin!']]; this.title = 'CREST RANGE'; this.obj = ['Aim & fire', 'Cover & reload', 'Weapons', 'Read the crisis']; } else { this.pages = def_.pages; this.title = def_.title || ''; this.obj = def_.obj; }
    this.pi = 0; this.chars = 0; this.hold = 0; this.t = 0; this.said = -1; this.sc = this.d.scene || (def_ && def_.scene) || '1-1'; Run._song = 'briefing'; musicFor(game, 'briefing'); this.stageN = this.d.stage; },
  update(dt) {
    this.t += dt; const I = game.input, pg = this.pages[this.pi]; if (!pg) { this.finish(); return; }
    if (this.said !== this.pi) { this.said = this.pi; this.dur = Voice.say(pg[1], pg[0]); this.chars = 0; }
    this.chars += dt * 48; const full = this.chars >= pg[1].length;
    if (I.down('confirm') && I.down('cancel') === false && false) { }
    if (I.down('start') || I.down('confirm')) this.hold += dt; else this.hold = 0;
    if (this.hold > .7) { this.finish(); return; }
    if (I.pressed('confirm') || I.clicked() || I.pressed('fire')) { if (!full) this.chars = 999; else { this.pi++; this.hold = 0; if (this.pi >= this.pages.length) this.finish(); } I.consumeAll(); }
  },
  finish() { I_(); if (kind === 'brief') { if (Run.mode === 'range') { Run.newSim(0, 'T-1', { mode: 'range', lives: 99 }); game.go('play'); } else { const sim = Run.sim && Run.mode !== 'arcade' ? null : Run.sim; const d = this.d; Run.newSim(d.stage || Run.stage); Run.stage = d.stage || Run.stage; const st = reg('stage', Run.stage); if (st.intro && !Run.hub) game.go('cutscene', { id: st.intro, scene: st.scenes[0], then: 'play' }); else game.go('play'); } } else { if (this.d.then === 'play') game.go('play'); else if (this.d.then === 'ending') game.go('ending'); else if (this.d.then === 'next') { if (Run._after) { const f = Run._after; Run._after = null; f(); } else game.go('menu'); } else game.go('menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, pg = this.pages[Math.min(this.pi, this.pages.length - 1)], who = reg('speaker', pg[0]);
    if (kind === 'cut') { const sc = reg('scene', this.sc), sim = backdropSim(); const a = this.t * .1; if (sc) { const fake = { scene: sc, rail: 0, phase: 'action', pose: () => ({}), players: sim.players, objs: [], enemies: [], proj: [], boss: null, coverBox: () => ({ x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 }), t: this.t, timeMax: 1, timer: 1 }; drawWorld(g, fake, 0, W, H, this.t, { pose: { x: -100 + this.t * 8, y: Math.sin(a) * 30, z: 28, yaw: Math.sin(a * .7) * .3, pitch: .03, fov: 50 } }); }
      px.rect(g, 0, 0, W, 18, '#000000'); px.rect(g, 0, H - 18, W, 18, '#000000'); }
    else { drawBackdrop(g, W, H, game.time, .62); T(g, this.title, W / 2, 10, '#ffffff', { scale: 2, align: 'center' }); if (this.obj) { E.ui.box(g, W - 150, 36, 140, 74, { bg: ['#10244a', '#081428'], border: '#3aa0e8' }); T(g, 'OBJECTIVES', W - 80, 42, '#ffd36a', { scale: 1, align: 'center' }); this.obj.forEach((o, i) => T(g, '• ' + o, W - 144, 56 + i * 12, '#ffffff', { scale: 1 })); if (this.stageN) drawMap(g, 10, 36, 160, 80, this.stageN, this.t); } }
    // dialog box with live portrait
    const bh = 62, by = H - bh - (kind === 'cut' ? 22 : 12); E.ui.box(g, 10, by, W - 20, bh, { bg: ['#10244a', '#081428'], border: who ? who.color : '#3aa0e8' });
    const rig = speakerRig(pg[0]); if (rig) rig.drawPortrait(g, 38, by + 32, 48, {}); T(g, who ? who.name : '', 70, by + 6, who ? who.color : '#fff', { scale: 2 });
    const shown = pg[1].slice(0, this.chars | 0); const lines = E.font.wrap(shown, W - 96, { scale: 1 }); lines.slice(0, 4).forEach((l, i) => T(g, l, 70, by + 24 + i * 9, '#ffffff', { scale: 1 }));
    if (this.chars >= pg[1].length && Math.floor(game.real * 3) % 2) T(g, '▼', W - 22, by + bh - 12, '#ffd36a', { scale: 1 });
    T(g, 'HOLD [' + game.input.label('confirm') + '] TO SKIP', W - 10, 6, '#9fb8e8', { scale: 1, align: 'right' }); if (this.hold > .1) px.rect(g, W - 80, 16, Math.round(70 * clamp(this.hold / .7, 0, 1)), 2, '#ffd36a'); }); }
});
function I_() { game.input.consumeAll(); }
function drawMap(g, x, y, w, h, stage, t) {
  E.ui.box(g, x, y, w, h, { bg: ['#0a2848', '#06182c'], border: '#3aa0e8' });
  for (let i = 0; i < 40; i++) { const hx = hash32('m' + i); px.dot(g, x + 6 + (hx % (w - 12)), y + 6 + ((hx >> 8) % (h - 12)), '#123a68'); }
  const pts = [[.18, .65], [.38, .35], [.6, .6], [.8, .3]]; for (let i = 0; i < pts.length - 1; i++) px.line(g, x + pts[i][0] * w, y + pts[i][1] * h, x + pts[i + 1][0] * w, y + pts[i + 1][1] * h, '#2a6aa8', 1);
  px.poly(g, [[x + w * .1, y + h * .75], [x + w * .3, y + h * .5], [x + w * .55, y + h * .7], [x + w * .9, y + h * .45], [x + w * .9, y + h * .95], [x + w * .1, y + h * .95]], '#164a30');
  const at = pts[Math.min(3, (stage || 1))]; const pulse = 3 + Math.sin(t * 5) * 1.5; px.blend(g, .6, 'add', () => px.disc(g, x + at[0] * w, y + at[1] * h, pulse + 3, '#ff5a2a')); px.disc(g, x + at[0] * w, y + at[1] * h, 2, '#ffffff'); T(g, 'LUMEN ISLES', x + w / 2, y + 4, '#9fe3ff', { scale: 1, align: 'center' });
}
Scenes.briefing = PageScene('brief'); Scenes.cutscene = PageScene('cut');
// ---- results ----
function calcRank(sim, p) { const acc = p.st.shots ? p.st.hits / p.st.shots : 0, lost = p.st.lost - (p.st0 ? 0 : 0); if (p.continues > 0) return 'D'; if (acc >= .75 && p.st.lost === 0) return 'S'; if (acc >= .6 && p.st.lost <= 1) return 'A'; if (acc >= .45) return 'B'; return 'C'; }
Scenes.results = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d; const sim = d.sim; this.sim = sim; this.t = 0; this.rows = sim.players.map(p => { const acc = p.st.shots ? Math.round(p.st.hits / p.st.shots * 100) : 0; const bonusAcc = acc * 300, noDmg = p.st.lost === 0 ? 20000 : 0; return { p, acc, bonusAcc, noDmg, rank: calcRank(sim, p), stats: [['TIME', Math.round(sim.stageStats.time || sim.t) + 's'], ['ACCURACY', acc + '%'], ['KILLS', p.st.kills], ['HEADSHOTS', p.st.heads], ['COVER SAVES', p.st.saves], ['LIVES LOST', p.st.lost]] }; });
    for (const r of this.rows) { if (!r.done) { r.p.score += r.bonusAcc + r.noDmg; r.done = 1; } } Run.keepCarry(sim); Run._song = 'results'; musicFor(game, 'results'); this.stamped = false; this.best = sim.players[0].score; },
  update(dt) { this.t += dt; const I = game.input; if (this.t > 5.2 && !this.stamped) { this.stamped = true; Pres.trauma = .6; SND.play('stamp'); } if (this.t > .8 && (I.pressed('confirm') || I.clicked() || I.pressed('start'))) { I.consumeAll(); if (this.t < 5.5) this.t = 5.6; else this.next(); } },
  next() { nextAfterResults(this.d); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, st = reg('stage', this.d.stage); drawBackdrop(g, W, H, game.time, .7); T(g, st.name + ' - COMPLETE', W / 2, 10, '#ffd36a', { scale: 2, align: 'center' });
    const n = this.rows.length; this.rows.forEach((row, k) => { const x0 = n === 1 ? W / 2 - 150 : 10 + k * (W / 2), w = n === 1 ? 300 : W / 2 - 20; T(g, row.p.name, x0, 38, row.p.color, { scale: 2 });
      row.stats.forEach((s, i) => { const t = this.t - i * .6; if (t < 0) return; const v = typeof s[1] === 'number' ? Math.round(s[1] * clamp(t / .5, 0, 1)) : s[1]; T(g, s[0], x0, 58 + i * 16, '#9fb8e8', { scale: 1 }); T(g, String(v), x0 + w, 56 + i * 16, '#ffffff', { scale: 2, align: 'right' }); });
      if (this.t > 4) { T(g, 'ACCURACY BONUS +' + row.bonusAcc, x0, 160, '#9fe3ff', { scale: 1 }); if (row.noDmg) T(g, 'NO-DAMAGE BONUS +' + row.noDmg, x0, 170, '#7cff8a', { scale: 1 }); T(g, 'SCORE ' + row.p.score, x0, 182, '#ffffff', { scale: 2 }); }
      if (this.t > 5.2) { const sc = this.t < 5.5 ? 2 + (5.5 - this.t) * 8 : 6; T(g, row.rank, x0 + w - 20, 150, { S: '#ffd36a', A: '#7cff8a', B: '#9fe3ff', C: '#ffffff', D: '#ff8a8a' }[row.rank], { scale: Math.round(sc), align: 'center', outline: '#000000' }); } });
    if (this.t > 5.6) promptBar(g, W, H, [['confirm', 'CONTINUE']]); }); }
};
function nextAfterResults(d) {
  const sim = Run.sim, st = Run.stage; const pres = reg('stage', st);
  if (Run.mode === 'range') { const tt = Run.sim ? Run.sim.t : 0; const best = E.store.get('tc3.rangeBest', null); if (!best || tt < best) E.store.set('tc3.rangeBest', +tt.toFixed(1)); E.store.set('tc3.seenTraining', true); game.go('menu'); return; }
  const outro = pres.outro; const goNext = () => {
    if (Run.mode === 'stage') { enterInitials(sim, 'stage' + st); return; }
    if (st >= 3) { enterInitials(sim, Run.mode === 'coop' ? 'coop' : 'arcade', true); return; }
    Run.stage = st + 1; game.go('briefing', { stage: st + 1 });
  };
  Run._after = goNext; if (outro && st < 3) game.go('cutscene', { id: outro, scene: reg('cutscene', outro).scene, then: 'next' }); else if (st >= 3) game.go('cutscene', { id: outro, scene: '3-B', then: 'ending' }); else goNext();
}
function enterInitials(sim, table, ending) { Run.endTable = table; Run.finalScore = sim.players.reduce((a, p) => a + p.score, 0) / Math.max(1, sim.players.length); Run.finalScore = Math.max(...sim.players.map(p => p.score)); game.go('gameover', { sim, ok: true }); }
// ---- game over and initials ----
Scenes.gameover = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; this.t = 0; this.stage = 0; const sim = d.sim; this.score = Math.max(...sim.players.map(p => p.score)); this.table = Run.endTable || (Run.mode === 'coop' ? 'coop' : Run.mode === 'stage' ? 'stage' + sim.stage : 'arcade'); if (!d.ok) { Run._song = 'gameover'; musicFor(game, 'gameover', { loop: false }); this.table = Run.mode === 'coop' ? 'coop' : Run.mode === 'stage' ? 'stage' + sim.stage : 'arcade'; } else { Run._song = 'ending'; musicFor(game, 'results'); } Run.endTable = null; this.phase = 0; this.entered = false; },
  update(dt) { this.t += dt; const I = game.input; if (this.phase === 0 && this.t > (this.d.ok ? .6 : 2.2)) { if (Run.mode !== 'range' && arcade.qualifies(this.score, this.table) && this.score > 0) { this.phase = 1; arcade.enter(this.score, this.table, () => { this.phase = 2; this.t = 0; }); } else { this.phase = 2; this.t = 0; } }
    if (this.phase === 1) arcade.update(dt); if (this.phase === 2 && this.t > .6 && (I.pressed('confirm') || I.clicked())) { I.consumeAll(); game.go('records', { table: this.table, then: 1 }); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .75); if (this.phase === 0) T(g, this.d.ok ? 'MISSION COMPLETE' : 'GAME OVER', W / 2, 90, this.d.ok ? '#7cff8a' : '#ff5a5a', { scale: 4, align: 'center' }); if (this.phase !== 1) T(g, 'SCORE ' + this.score, W / 2, 140, '#ffffff', { scale: 2, align: 'center' }); }); if (this.phase === 1) arcade.draw(r); }
};
// ---- records ----
Scenes.records = { camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; this.tabs = ['arcade', 'coop', 'stage1', 'stage2', 'stage3', 'intel']; this.i = Math.max(0, this.tabs.indexOf(this.d.table || 'arcade')); this.t = 0; },
  update(dt) { this.t += dt; const P = game._players || [game.input], I = P[0]; if (P.some(p => p.repeat('left') || p.pressed('prev'))) { this.i = (this.i + this.tabs.length - 1) % this.tabs.length; SND.play('select'); } if (P.some(p => p.repeat('right') || p.pressed('next'))) { this.i = (this.i + 1) % this.tabs.length; SND.play('select'); } const c = I.clicked(); if (c && c[1] < 36) { const k = Math.floor(c[0] / (game.W / this.tabs.length)); if (k >= 0 && k < this.tabs.length) this.i = k; }
    if (P.some(p => p.pressed('cancel') || p.pressed('confirm')) && this.t > .3) { SND.play('back'); P.forEach(p => p.consumeAll()); game.go(this.d.then ? 'menu' : 'menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .75); T(g, 'RECORDS', W / 2, 6, '#ffffff', { scale: 2, align: 'center' }); const names = ['ARCADE', 'CO-OP', 'STAGE 1', 'STAGE 2', 'STAGE 3', 'INTEL']; names.forEach((n, k) => { const x = k * (W / 6); px.rect(g, x + 1, 24, W / 6 - 2, 12, k === this.i ? '#1a4f9c' : '#10244a'); T(g, n, x + W / 12, 26, k === this.i ? '#ffd36a' : '#9fb8e8', { scale: 1, align: 'center' }); });
    const tab = this.tabs[this.i]; if (tab === 'intel') { const found = E.store.get('tc3.intel', {}); const ids = ['i1', 'i2', 'i3', 'i4', 'i5', 'i6']; let y = 46; T(g, 'MESSAGE BOTTLES FOUND ' + Object.keys(found).length + '/6', W / 2, 40, '#8aff8a', { scale: 1, align: 'center' }); ids.forEach((id, k) => { const got = found[id]; T(g, got ? reg('intel', id).text : '??? — shoot the green bottles to find this note', 20, 56 + k * 18, got ? '#ffffff' : '#555e70', { scale: 1, wrap: W - 40 }); });
      const best = E.store.get('tc3.rangeBest', null); T(g, 'BEST TRAINING TIME: ' + (best ? best.toFixed(1) + 's' : '—'), W / 2, 176, '#ffd36a', { scale: 1, align: 'center' }); }
    else arcade.drawTable(r, tab, 44, { arcade: 'ARCADE HIGH SCORES', coop: 'CO-OP HIGH SCORES', stage1: 'STAGE 1 — HARBOR LIGHTS', stage2: 'STAGE 2 — STORM SIGNAL', stage3: 'STAGE 3 — THE TIDEWALL' }[tab]);
    promptBar(g, W, H, [['prev', '◂'], ['next', '▸'], ['cancel', 'BACK']]); }); }
};
// ---- about / how to play ----
Scenes.about = { camera: { zoom: false }, touch: [],
  enter() { this.i = 0; this.t = 0; }, 
  pages() { return aboutPages(game.input); },
  update(dt) { this.t += dt; const P = game._players || [game.input], n = this.pages().length; if (P.some(p => p.repeat('left') || p.pressed('prev'))) { this.i = (this.i + n - 1) % n; SND.play('select'); } if (P.some(p => p.repeat('right') || p.pressed('next') || p.pressed('confirm'))) { this.i = (this.i + 1) % n; SND.play('select'); P.forEach(p => p.consumeAll()); } const c = P[0].clicked(); if (c) { this.i = c[0] < game.W / 2 ? (this.i + n - 1) % n : (this.i + 1) % n; SND.play('select'); P[0].consumeAll(); } if (P.some(p => p.pressed('cancel'))) { SND.play('back'); game.go('menu'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, pgs = this.pages(), pg = pgs[this.i]; drawBackdrop(g, W, H, game.time, .8); T(g, pg.title, W / 2, 6, '#ffd36a', { scale: 2, align: 'center' }); T(g, (this.i + 1) + ' / ' + pgs.length, W - 8, 6, '#6a7ea8', { scale: 1, align: 'right' });
    if (pg.draw) pg.draw(g, W, H, this.t); else { let y = 26; for (const l of pg.lines) { const lines = E.font.wrap(l.t, W - 36, { scale: l.s || 1 }); for (const ln of lines) { T(g, ln, 18, y, l.c || '#ffffff', { scale: l.s || 1 }); y += (l.s || 1) * 9 + 1; } y += 3; } }
    promptBar(g, W, H, [['prev', '◂'], ['next', '▸ NEXT'], ['cancel', 'BACK']]); }); }
};
function deviceName(inp) { return inp.lastDevice === 'gamepad' ? 'controller' : 'keyboard and mouse'; }
function howToPage(inp) {
  const L = a => inp.label(a), dev = inp.lastDevice;
  const rows = [['AIM', dev === 'gamepad' ? 'RIGHT STICK' : dev === 'keyboard' ? 'ARROWS / WASD' : 'MOUSE'], ['FIRE', L('fire')], ['TAKE COVER (HOLD)', L('cover')], ['NEXT / PREV WEAPON', L('next') + ' / ' + L('prev')], ['QUICK RELOAD (DUCKS)', L('reload')], ['PAUSE', dev === 'gamepad' ? 'OPTIONS' : 'ESC / P']];
  return { title: 'HOW TO PLAY', draw(g, W, H, t) { rows.forEach((r, i) => { T(g, r[0], 24, 30 + i * 17, '#9fb8e8', { scale: 1 }); E.ui.box(g, W / 2 + 10, 26 + i * 17, 140, 14, { bg: ['#10244a', '#081428'], border: '#3aa0e8' }); T(g, r[1], W / 2 + 80, 29 + i * 17, '#ffffff', { scale: 1, align: 'center' }); });
    const tips = ['Hold cover to dodge and reload — you cannot be hit in cover, but TIME keeps running.', 'Every shot that can hit you shows a shrinking red ring. Duck before it closes!', 'Shoot orange-vest quartermasters for machine-gun, shotgun and grenade ammo.', 'Fire while hiding to cycle weapons. Shoot grenades and rockets out of the air.', 'Never shoot civilians or hostages. Clear each area before TIME runs out.']; let y = 134; for (const s of tips) { for (const ln of E.font.wrap('• ' + s, W - 40, { scale: 1 })) { T(g, ln, 20, y, '#ffffff', { scale: 1 }); y += 9; } y += 1; } } };
}

// ---- 53-bot.js ----
// 53-bot.js — the Autopilot (produces the same Commands a player's device does) and the attract mode controller:
// DEMO (highlight i, ~28 s) -> HIGH SCORES (6 s) -> DEMO (i+1) -> TITLE (8 s) -> repeat. Any input exits to the title.
const SKILL = { fair: { react: .30, speed: 2.2, head: .3 }, expert: { react: .18, speed: 3.5, head: .6 }, showoff: { react: .18, speed: 3.5, head: .6 } };
const Bot = {
  style: 'showoff', st: {},
  S(pid) { return this.st[pid] || (this.st[pid] = { ax: 0, ay: 0, seen: {}, cov: 0, fireT: 0, cooldown: 0 }); },
  setStyle(s) { this.style = s; },
  command(sim, p, dt) {
    const S = this.S(p.id), sk = SKILL[this.style] || SKILL.fair, cmd = { aim: [S.ax, S.ay], coverDown: false, autoFire: true };
    if (p.down) return cmd; const pose = sim.pose(p.id);
    // threats on me
    let soon = 9; for (const th of sim.threats) if (th.tgt === p.id) soon = Math.min(soon, th.at - sim.t);
    const hasShield = () => false;
    let needCover = soon < .3 + (this.style === 'fair' ? .05 : 0) && soon > -.1;
    if (needCover && S.onT && soon > .1) { const th0 = sim.threats.find(t => t.tgt === p.id && t.at - sim.t === soon); const src = th0 && sim.enemies.find(x => x.id === th0.src); if (src && !src.dead && src.hp <= (p.weapon === 0 ? tune.weapon.hgDmg : 1) * 1.0 + .01 && S.lastTarget === src.id) needCover = false; }
    if (S.cov > 0) { S.cov -= dt; needCover = true; }
    if (!needCover && p.weapon === 0 && p.mag <= (this.style === 'fair' ? 1 : 2) && soon > .6 && p.c < 1) { needCover = true; S.cov = Math.max(S.cov, .45); }
    if (needCover && soon < .3) S.cov = Math.max(S.cov, .35);
    // persisting until the reload is finished
    if (p.weapon === 0 && p.mag < 9 && p.c > .5 && soon > .5) needCover = true;
    // target
    const tg = this.pickTarget(sim, p, pose, S, sk); let want = 0;
    if (tg) {
      want = tg.w == null ? 0 : tg.w; if (want > 0 && p.ammo[want] <= 0) want = 0;
      const dx = tg.ax - S.ax, dy = tg.ay - S.ay, d = Math.hypot(dx, dy), gain = Math.min(1, dt * sk.speed * 3.2); S.ax += dx * gain; S.ay += dy * gain; if (d > 0) { const mx = sk.speed * dt * 1.0; const step = Math.min(d, Math.max(mx, d * gain)); }
      cmd.aim = [S.ax, S.ay]; S.onT = d < .045; S.lastTarget = typeof tg.id === 'string' ? parseInt(tg.id) : tg.id;
      if (p.weapon !== want && p.c < .3 && p.switchT <= 0) { cmd.select = want + 1; }
      if (S.onT && !tg.pre && p.c < .2 && p.weapon === want) { cmd.firePressed = true; cmd.fireDown = true; }
    } else { S.ax += (0 - S.ax) * Math.min(1, dt * 2); S.ay += (-.15 - S.ay) * Math.min(1, dt * 2); cmd.aim = [S.ax, S.ay]; if (p.weapon !== 0 && p.c < .3) cmd.select = 1; }
    cmd.coverDown = needCover;
    if (needCover) { cmd.fireDown = false; cmd.firePressed = false; }
    return cmd;
  },
  pickTarget(sim, p, pose, S, sk) {
    const cand = [], aimOf = (pt) => R3.aimOf(pose, pt);
    const add = (pt, pri, w, id, extra) => { const a = aimOf(pt); if (!a) return; if (Math.abs(a[0]) > p.aspect * 1.2 || Math.abs(a[1]) > 1.1) return; if (id != null) { const k = id; if (S.seen[k] == null) S.seen[k] = sim.t; if (sim.t - S.seen[k] < sk.react) return; } cand.push(Object.assign({ ax: a[0], ay: a[1], pri, w, id }, extra)); };
    for (const th of sim.threats) if (th.tgt === p.id) { const e = sim.enemies.find(x => x.id === th.src); if (e && !e.dead) { const v = sim.volumes(e).find(q => q.part === 'torso'); if (v) add(v.k === 's' ? v.c : [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2], 0, this.weaponFor(e), e.id); } }
    for (const pr of sim.proj) if (!pr.dead && pr.team !== 'p') add([pr.x, pr.y, pr.z], 1, 0, 'p' + pr.id);
    for (const e of sim.enemies) {
      if (e.dead || e.gone || e.civ || e.ally) continue; const vs = sim.volumes(e); if (!vs.length) continue; const d = reg('enemy', e.type);
      const pri = (e.type === 'quartermaster' ? 1 : d.elite ? 2 : d.ai === 'rush' ? 3 : e.type === 'shield' ? 4 : 5) + (e.exposedAt != null && sim.t - e.exposedAt < 1 ? 0 : 1);
      const centre = v => v.k === 's' ? v.c : v.k === 'c' ? [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2, (v.a[2] + v.b[2]) / 2] : [(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2];
      const wantHead = d.elite || (e.id * 7 % 10) / 10 < sk.head, order = vs.filter(v => v.part !== 'shield').sort((a, b) => (wantHead ? (a.part === 'head' ? -1 : 0) - (b.part === 'head' ? -1 : 0) : (a.part === 'torso' ? -1 : 0) - (b.part === 'torso' ? -1 : 0)));
      let pick = null; for (const v of order) { const pt = centre(v), a = aimOf(pt); if (!a) continue; const ray = R3.ray(pose, a[0], a[1]), hit = sim.castRay(ray.o, ray.d, { skip: p.id }); if (hit.ent === e || (v.ski && hit.ent === e)) { pick = pt; break; } }
      if (pick) add(pick, pri, this.weaponFor(e), e.id + ':' + e.exposures);
    }
    if (sim.boss && !sim.boss.dead) for (const v of sim.bossVolumes()) { const pt = v.k === 's' ? v.c : [(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2]; const part = sim.boss.parts[v.key]; if (v.shield && (p.ammo[2] > 0 || p.ammo[3] > 0) && !(sim.boss.shieldDown > 0)) { const aa0 = aimOf([(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2]); if (aa0) { const r0 = R3.ray(pose, aa0[0], aa0[1]), h0 = sim.castRay(r0.o, r0.d, { skip: p.id }); if (h0.kind === 'boss') add([(v.box.x0 + v.box.x1) / 2, (v.box.y0 + v.box.y1) / 2, (v.box.z0 + v.box.z1) / 2], 3, p.ammo[2] > 0 ? 2 : 3, 'bshield'); } continue; } if (!part || part.vulnerable === false || v.shield) continue; const aa = aimOf(pt); if (!aa) continue; const rr = R3.ray(pose, aa[0], aa[1]), hh = sim.castRay(rr.o, rr.d, { skip: p.id }); if (hh.kind !== 'boss') continue; add(pt, 4, sim.boss.id === 'seawolf' ? 1 : sim.boss.id === 'scylla' || sim.boss.id === 'stingray' ? 3 : sim.boss.id === 'hammerhead' ? 2 : 0, 'b' + v.key + (v.mult || 0)); }
    for (const o of sim.objs) { if (o.dead || (!o.lock && !o.ring && !o.intel && !(o.kind === 'lever'))) continue; add([o.x, o.y, o.z + o.h / 2], o.lock || o.kind === 'lever' ? 3 : 8, 0, 'o' + o.id); }
    if (!cand.length) { let best = null; for (const e of sim.enemies) { if (e.dead || e.gone || e.civ || !e.cover) continue; const pt = sim.exposedPos(e); const a = aimOf(pt); if (!a || Math.abs(a[0]) > p.aspect || Math.abs(a[1]) > 1) continue; const d = Math.hypot(a[0] - S.ax, a[1] - S.ay); if (!best || d < best.d) best = { d, ax: a[0], ay: a[1], pri: 99, w: 0, pre: true }; } if (best) return best; return null; }
    cand.sort((a, b) => a.pri - b.pri || Math.hypot(a.ax - S.ax, a.ay - S.ay) - Math.hypot(b.ax - S.ax, b.ay - S.ay)); return cand[0];
  },
  weaponFor(e) { const t = e.type; if (this.style === 'fair') return t === 'drone' ? 1 : t === 'rusher' || t === 'shield' ? 2 : 0; return t === 'drone' ? 1 : t === 'rusher' ? 2 : t === 'shield' ? 2 : t === 'marine' || t === 'grenadier' ? 1 : 0; }
};
// ---- attract mode ----
const PLAYLIST = [['highlight', 1, '1-1'], ['highlight', 1, '1-4'], ['highlight', 1, '1-B'], ['highlight', 2, '2-1'], ['highlight', 2, '2-3'], ['highlight', 2, '2-B'], ['highlight', 3, '3-2'], ['highlight', 3, '3-3'], ['highlight', 3, '3-B']];
PLAYLIST.forEach(h => def('highlight', h[2], { stage: h[1], scene: h[2] }));
const Attract = { i: 0, phase: 'demo', t: 0, wd: 0, sig: '', demoT: 0, count: 0 };
function attractStart(i) { Attract.i = i % PLAYLIST.length; const [, stage, scene] = PLAYLIST[Attract.i]; Run.mode = 'attract'; Run.diff = 'normal'; Run.np = 1; Run.hub = null; Run.attract = true; Run.carry = null;
  const sim = new Sim({ mode: 'attract', stage, scene, difficulty: 'normal', players: [{}], cheats: { god: 1, ammo: 1 }, seed: 1000 + Attract.i, fast: true, lives: 99 }); Run.sim = sim; Run.stage = stage; Pres.reset(); resetHud(); HUD.shown = { cover: 1, reload: 1, shield: 1, laser: 1, torpedo: 1, final: 1 }; Bot.setStyle('showoff'); Bot.st = {}; Attract.phase = 'demo'; Attract.demoT = 0; Attract.wd = 0; Attract.sig = ''; Run._song = null; Run._layerOn = null; for (const p of sim.players) { p.ammo = [9, 240, 36, 6]; p.seen = { 1: 1, 2: 1, 3: 1 }; } }
function attractNext() { Attract.phase = 'scores'; Attract.t = 0; Attract.count++; }
function attractWatch(sim, dt) {
  Attract.demoT += dt; const sig = sim.phase + ':' + sim.enemies.filter(e => !e.dead).length + ':' + sim.players[0].st.kills + ':' + Math.round(sim.pt) + ':' + Math.round(sim.rail) + ':' + (sim.boss ? Math.round(Object.values(sim.boss.parts).reduce((a, p) => a + p.hp, 0)) : 0);
  if (sig === Attract.sig) Attract.wd += dt; else { Attract.wd = 0; Attract.sig = sig; }
  if (Attract.wd > 8 || Attract.demoT > 28 || sim.phase === 'stageclear' || (sim.phase === 'clear' && sim.clearT > 1.2 && Attract.demoT > 14)) attractNext();
  const I = game.input; if (Idle.t === 0 || I.anyPressed()) { }
}
function attractOverlay(g, W, H) { px.blend(g, .8, 'normal', () => { px.rect(g, 0, 0, W, 14, '#000000'); }); T(g, 'DEMO PLAY', 8, 3, '#ffffff', { scale: 1 }); E.font.title(g, 'TIDE CRISIS 3', W - 60, 3, { scale: 1, colors: ['#ffffff', '#3aa0e8'], outline: '#08142a', align: 'center' }); if (Math.floor(game.real * 2) % 2) T(g, 'PRESS ' + (game.input.lastDevice === 'gamepad' ? game.input.label('start') : 'ENTER') + ' TO START', W / 2, H - 22, '#ffd36a', { scale: 2, align: 'center' }); }
Scenes.attract = { camera: { zoom: false }, touch: [], pausable: false,
  enter() { Idle.t = 0; Attract.count = 0; attractStart(Attract.i || 0); this.armed = 0; },
  update(dt) {
    this.armed += dt; const I = game.input; let any = this.armed > .5 && (I.anyPressed() || I.clicked()); const pt = I.pointer(); if (pt) { if (this.lastPt && Math.hypot(pt[0] - this.lastPt[0], pt[1] - this.lastPt[1]) > 4 && this.armed > .5) any = true; this.lastPt = pt.slice(); } if (this.armed > .5 && (I.padAim || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3))) any = true;
    if (any) { I.consumeAll(); Idle.t = 0; Run.mode = 'arcade'; Run.attract = false; Run.sim = null; game.go('title'); return; }
    if (Attract.phase === 'demo') playUpdate(dt);
    else { Attract.t += dt; if (Attract.phase === 'scores' && Attract.t > 6) { if (Attract.count % 2 === 0) { Attract.phase = 'title'; Attract.t = 0; } else attractStart(Attract.i + 1); } else if (Attract.phase === 'title' && Attract.t > 8) attractStart(Attract.i + 1); }
  },
  draw(r) { if (Attract.phase === 'demo') { playDraw(r); return; } r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .45); if (Attract.phase === 'scores') { arcade.drawTable(r, 'arcade', 36, 'HIGH SCORES'); } else { logo(g, W, 40, game.time); } attractOverlay(g, W, H); }); }
};

// ---- 54-dev.js ----
// 54-dev.js — dev mode (from the pause menu): a canvas panel generated from a descriptor list. Six tabs of live
// sliders, toggles and actions; changed values show gold with the default grey; RESET ALL TO DEFAULTS at the bottom.
// Every slider's key is a path into `tune`, so adding a variable takes one line.
const getPath = (o, p) => p.split('.').reduce((a, k) => a[k], o), setPath = (o, p, v) => { const ks = p.split('.'); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };
const DEVTABS = ['PLAYER', 'WEAPONS', 'ENEMIES', 'TIME', 'VIEW', 'ACTIONS'];
const sl = (tab, label, path, min, max, step) => ({ tab, kind: 'slider', label, path, min, max, step });
const tg = (tab, label, path) => ({ tab, kind: 'toggle', label, path });
const ac = (tab, label, fn, o) => Object.assign({ tab, kind: 'action', label, fn }, o);
const Dev = {
  open: false, tab: 0, i: 0, conf: 0, free: false, cam: { x: 0, y: 0, z: 40, yaw: 0, pitch: 0 }, jumpI: 0, spawnI: 0, rects: [], hold: 0, msg: '', msgT: 0,
  items: [], 
  build() {
    const S = () => Run.sim, allScenes = () => { const o = []; for (const s of [1, 2, 3, 0]) for (const id of reg('stage', s).scenes) o.push([s, id]); return o; }, enemyTypes = ['deckhand', 'marine', 'redtide', 'quartermaster', 'grenadier', 'rocketeer', 'shield', 'rusher', 'sniper', 'drone', 'gunner', 'target'];
    this.allScenes = allScenes; this.enemyTypes = enemyTypes;
    this.items = [
      tg(0, 'God mode', 'player.godMode'), tg(0, 'Infinite ammo', 'player.infAmmo'), sl(0, 'Start lives', 'player.lives', 1, 9, 1), sl(0, 'I-frames (s)', 'player.iframes', .5, 3, .1), sl(0, 'Cover in (s)', 'player.coverIn', .05, .4, .01), sl(0, 'Cover out (s)', 'player.coverOut', .05, .4, .01), sl(0, 'Reload (s)', 'player.reload', .1, 1, .05), sl(0, 'Pad aim speed', 'player.padSpeed', .5, 3, .1), sl(0, 'Aim assist', 'player.assist', 0, 1, .05),
      sl(1, 'Handgun damage', 'weapon.hgDmg', .5, 3, .1), sl(1, 'MG rate /s', 'weapon.mgRate', 4, 20, 1), sl(1, 'MG damage', 'weapon.mgDmg', .1, 1, .05), sl(1, 'Shotgun pellets', 'weapon.sgPellets', 4, 14, 1), sl(1, 'Shotgun spread °', 'weapon.sgSpread', 2, 12, .5), sl(1, 'GL radius', 'weapon.glRadius', 24, 96, 4), sl(1, 'GL damage', 'weapon.glDmg', 2, 12, .5), sl(1, 'Ammo pickups ×', 'weapon.ammoMul', .5, 3, .1),
      sl(2, 'Enemy HP ×', 'enemy.hpMul', .5, 3, .1), sl(2, 'Threat chance ×', 'enemy.threatMul', 0, 3, .1), sl(2, 'Telegraph ×', 'enemy.telegraphMul', .5, 2, .05), sl(2, 'Fire interval ×', 'enemy.fireMul', .5, 2, .05), sl(2, 'Max threats (0 = auto)', 'enemy.maxThreats', 0, 4, 1), sl(2, 'Minimum gap (s)', 'enemy.minGap', .1, 1, .05), sl(2, 'Reaction delay ×', 'enemy.reactMul', .5, 2, .05), sl(2, 'Boss HP ×', 'enemy.bossHp', .25, 3, .05),
      tg(3, 'Freeze timer', 'time.freeze'), sl(3, 'Scene time ×', 'time.sceneMul', .5, 2, .05), sl(3, 'Elite bonus (s)', 'time.elite', 0, 5, .5), sl(3, 'Refill after time-up %', 'time.refill', 20, 100, 5), sl(3, 'Game speed', 'time.speed', .25, 1.5, .05),
      sl(4, 'FOV', 'view.fov', 45, 75, 1), tg(4, 'Show hit volumes', 'view.hitVol'), tg(4, 'Colliders', 'view.colliders'), tg(4, 'Rail and cover points', 'view.rail'), tg(4, 'AI state labels', 'view.ai'), tg(4, 'Threat debug', 'view.threats'), tg(4, 'Perf overlay', 'view.perf'), tg(4, 'Free camera', 'view.freecam'), tg(4, 'Hide HUD', 'view.hideHud'),
      ac(5, 'Restart scene', () => { const s = S(); s.jump(s.stage, s.sceneId); }), ac(5, 'Next scene', () => { const s = S(), st = reg('stage', s.stage), i = (s.sceneIdx + 1) % st.scenes.length; s.jump(s.stage, st.scenes[i]); }), ac(5, 'Previous scene', () => { const s = S(), st = reg('stage', s.stage), i = (s.sceneIdx + st.scenes.length - 1) % st.scenes.length; s.jump(s.stage, st.scenes[i]); }),
      { tab: 5, kind: 'cycle', label: 'Jump to', get: () => this.allScenes()[this.jumpI][1], step: d => { this.jumpI = (this.jumpI + d + this.allScenes().length) % this.allScenes().length; }, fn: () => { const [st, id] = this.allScenes()[this.jumpI]; const s = S(); if (st !== s.stage) { Run.stage = st; const ns = Run.newSim(st, id, { mode: s.mode }); Pres.reset(); resetHud(); } else s.jump(st, id); this.open = false; } },
      ac(5, 'Kill all', () => { const s = S(); for (const e of s.enemies.slice()) if (!e.dead && !e.civ) s.killEnemy(e, s.players[0], 0, null, 'torso'); if (s.boss && !s.boss.dead) for (const k in s.boss.parts) { s.boss.parts[k].hp = 0; s.boss.parts[k].dead = true; } }),
      { tab: 5, kind: 'cycle', label: 'Spawn enemy', get: () => enemyTypes[this.spawnI], step: d => { this.spawnI = (this.spawnI + d + enemyTypes.length) % enemyTypes.length; }, fn: () => { const s = S(), free = s.covers.filter(c => !c.hidden && !s.enemies.some(e => !e.dead && e.cover === c)); const c = free[0] || s.covers[0]; const t = enemyTypes[this.spawnI], d = reg('enemy', t); if (d.ai === 'peek' && c) s.spawnEnemy(t, c.id, {}); else if (d.ai === 'route') s.spawnEnemy(t, null, { route: [[380, -80, 0], [380, 80, 0]], drop: 'mg' }); else if (d.ai === 'fly') s.spawnEnemy(t, null, { at: [220, 0, 0], z: 44 }); else if (d.ai === 'rush' || d.ai === 'shield') s.spawnEnemy(t, c ? c.id : null, { from: [360, 0, 0], advance: [300, 260] }); else s.spawnEnemy(t, c ? c.id : null, {}); } },
      ac(5, 'All weapons + full ammo', () => { for (const p of S().players) { p.ammo = [9, 240, 36, 6]; p.mag = 9; p.seen = { 1: 1, 2: 1, 3: 1 }; } }), ac(5, '+1 life', () => { S().players[0].lives++; }), ac(5, 'Lose a life', () => { const s = S(); const g = s.cheats.god; s.cheats.god = 0; const k = tune.player.godMode; tune.player.godMode = 0; s.players[0].inv = 0; s.loseLife(s.players[0], 'dev'); tune.player.godMode = k; s.cheats.god = g; }),
      ac(5, 'Trigger a threat on me', () => { const s = S(); s.newThreat({ id: 'dev' }, 'bullet', 1, { target: 0, sp: [200, 0, 30] }); }), ac(5, 'Clear stage', () => { const s = S(); s.phase = 'stageclear'; s.emit('stageclear', { stage: s.stage }); }), ac(5, 'Game over', () => { const s = S(); for (const p of s.players) { p.down = true; p.contFail = true; } s.over = true; s.phase = 'over'; }),
      ac(5, 'Bot plays (Autopilot)', () => { Run.botOn = !Run.botOn; Bot.setStyle('fair'); this.msg = 'Autopilot ' + (Run.botOn ? 'ON' : 'OFF'); this.msgT = 2; }), ac(5, 'Add a P2 bot', () => { Run.botP2 = !Run.botP2; this.msg = 'P2 bot ' + (Run.botP2 ? 'ON (use CO-OP for a split screen)' : 'OFF'); this.msgT = 2; }),
      ac(5, 'Voice test', () => { let t = 0; for (const id of ['kai', 'rook', 'mari', 'juno', 'hale', 'krake', 'hammerhead']) { setTimeout(() => Voice.say('Hang on! CREST is on it, kid.', id), t); t += 1900; } }), ac(5, 'Music test (next song)', () => { const ids = Object.keys(TC.REG.song); this.songI = ((this.songI || 0) + 1) % ids.length; musicFor(game, ids[this.songI], {}); this.msg = 'Song: ' + ids[this.songI]; this.msgT = 2; })
    ];
    this.items.push({ tab: 5, kind: 'reset', label: 'RESET ALL TO DEFAULTS' });
  },
  vis() { return this.items.filter(it => it.tab === this.tab || it.kind === 'reset'); },
  def(it) { return it.path ? getPath(TUNE, it.path) : null; },
  adjust(it, dir, fast) { if (it.kind === 'slider') { const v = getPath(tune, it.path), st = it.step * (fast ? 4 : 1); setPath(tune, it.path, clamp(Math.round((v + dir * st) / it.step) * it.step, it.min, it.max)); } else if (it.kind === 'toggle') setPath(tune, it.path, getPath(tune, it.path) ? 0 : 1); else if (it.kind === 'cycle') it.step(dir); },
  run(it) { if (it.kind === 'toggle') this.adjust(it, 1); else if (it.kind === 'action' || it.kind === 'cycle') { try { it.fn(); } catch (e) { game.fail('dev', e); } } else if (it.kind === 'reset') { if (this.conf) { resetTune(); this.conf = 0; this.msg = 'All values restored.'; this.msgT = 2; } else { this.conf = 1; this.msg = 'Press again to confirm reset'; this.msgT = 2.5; } } },
  update(dt) {
    if (!this.items.length) this.build(); const P = game._players || [game.input], I = P[0], v = this.vis(); this.msgT = Math.max(0, this.msgT - dt); this.rects = this.rects || [];
    if (P.some(p => p.pressed('cancel')) || P.some(p => p.pressed('pause'))) { this.open = false; P.forEach(p => p.consumeAll()); return; }
    if (P.some(p => p.pressed('tab') || p.pressed('next'))) { this.tab = (this.tab + 1) % 6; this.i = 0; this.conf = 0; SND.play('select'); } if (P.some(p => p.pressed('tabPrev') || p.pressed('prev'))) { this.tab = (this.tab + 5) % 6; this.i = 0; this.conf = 0; SND.play('select'); }
    if (P.some(p => p.repeat('up'))) { this.i = (this.i + v.length - 1) % v.length; this.conf = 0; SND.play('select'); } if (P.some(p => p.repeat('down'))) { this.i = (this.i + 1) % v.length; this.conf = 0; SND.play('select'); }
    const it = v[this.i]; if (!it) return; const fast = this.hold > 1;
    if (P.some(p => p.repeat('left', .3, .06))) { this.adjust(it, -1, fast); this.hold += .1; } if (P.some(p => p.repeat('right', .3, .06))) { this.adjust(it, 1, fast); this.hold += .1; } if (!P.some(p => p.down('left') || p.down('right'))) this.hold = 0;
    if (P.some(p => p.pressed('confirm'))) { this.run(it); P.forEach(p => p.consumeAll()); }
    if (P.some(p => p.pressed('reset')) && it.path) { setPath(tune, it.path, this.def(it)); }
    const pt = I.pointer(); if (pt) { if (I.mouse.t !== this.mt) { this.mt = I.mouse.t; this.rects.forEach((q, k) => { if (pt[0] >= q.x && pt[0] < q.x + q.w && pt[1] >= q.y && pt[1] < q.y + q.h) this.i = k; }); } }
    const c = I.clicked(); if (c) { if (c[1] < 18) { const k = Math.floor((c[0] - 8) / 52); if (k >= 0 && k < 6) { this.tab = k; this.i = 0; } } this.rects.forEach((q, k) => { if (c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h) { this.i = k; const t2 = v[k]; if (t2.kind === 'slider') { const f = clamp((c[0] - q.sx) / q.sw, 0, 1); setPath(tune, t2.path, clamp(Math.round((t2.min + (t2.max - t2.min) * f) / t2.step) * t2.step, t2.min, t2.max)); } else this.run(t2); } }); }
    if (I.down('fire') && I.aimSource === 'mouse' && pt) { const t2 = v[this.i]; const q = this.rects[this.i]; if (t2 && t2.kind === 'slider' && q && pt[0] >= q.sx - 4 && pt[0] <= q.sx + q.sw + 4 && pt[1] >= q.y && pt[1] < q.y + q.h) { const f = clamp((pt[0] - q.sx) / q.sw, 0, 1); setPath(tune, t2.path, clamp(Math.round((t2.min + (t2.max - t2.min) * f) / t2.step) * t2.step, t2.min, t2.max)); } }
  },
  draw(g, W, H, sim) {
    if (!this.items.length) this.build(); px.rect(g, 0, 0, W, H, '#000000b8'); const v = this.vis(); this.rects = [];
    for (let k = 0; k < 6; k++) { px.rect(g, 8 + k * 52, 2, 50, 13, k === this.tab ? '#1a4f9c' : '#10244a'); T(g, DEVTABS[k], 33 + k * 52, 5, k === this.tab ? '#ffd36a' : '#9fb8e8', { scale: 1, align: 'center' }); }
    T(g, 'DEV MODE  [' + game.input.label('tab') + '/' + game.input.label('tabPrev') + '] TAB   [' + game.input.label('reset') + '] RESET ITEM   [Backspace / ' + game.input.label('cancel') + '] CLOSE', 8, 18, '#6a7ea8', { scale: 1 });
    const per = 12, first = Math.max(0, Math.min(this.i - 6, v.length - 15)), rowH = 11;
    for (let k = first; k < Math.min(v.length, first + 15); k++) {
      const it = v[k], y = 30 + (k - first) * rowH, sel = k === this.i; px.rect(g, 8, y - 1, W - 16, rowH, sel ? '#1a3a78' : '#0a1428');
      T(g, it.label, 14, y + 1, sel ? '#ffd36a' : '#ffffff', { scale: 1 });
      if (it.kind === 'slider') { const val = getPath(tune, it.path), d = this.def(it), ch = Math.abs(val - d) > 1e-9, sx = W - 190, sw = 110; px.rect(g, sx, y + 4, sw, 2, '#2a3350'); px.rect(g, sx, y + 4, sw * (val - it.min) / (it.max - it.min), 2, ch ? '#ffd36a' : '#3aa0e8'); px.rect(g, sx + sw * (val - it.min) / (it.max - it.min) - 1, y + 1, 3, 8, ch ? '#ffd36a' : '#ffffff'); T(g, String(+val.toFixed(2)), W - 76, y + 1, ch ? '#ffd36a' : '#ffffff', { scale: 1, align: 'right' }); if (ch) T(g, '(' + +d.toFixed(2) + ')', W - 14, y + 1, '#6a7ea8', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx, sw }); }
      else if (it.kind === 'toggle') { const val = getPath(tune, it.path), d = this.def(it), ch = val !== d; T(g, val ? 'ON' : 'OFF', W - 14, y + 1, ch ? '#ffd36a' : val ? '#7cff8a' : '#6a7ea8', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx: 0, sw: 1 }); }
      else if (it.kind === 'cycle') { T(g, '◂ ' + it.get() + ' ▸', W - 14, y + 1, '#9fe3ff', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx: 0, sw: 1 }); }
      else { T(g, it.kind === 'reset' && this.conf ? 'CONFIRM?' : '▸', W - 14, y + 1, it.kind === 'reset' ? '#ff8a8a' : '#9fe3ff', { scale: 1, align: 'right' }); this.rects.push({ x: 8, y: y - 1, w: W - 16, h: rowH, sx: 0, sw: 1 }); }
    }
    if (this.msgT > 0) T(g, this.msg, W / 2, H - 12, '#7cff8a', { scale: 1, align: 'center' });
  }
};
function devOverlays(g, sim, rect) {
  if (!sim.scene) return; const C = R3.cam; if (!C) return;
  if (tune.view.colliders) for (const b of sim.colliders()) { const pts = [[b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]].map(p => R3.proj(p[0], p[1], p[2])); if (pts.every(Boolean)) for (let i = 0; i < 4; i++) px.line(g, pts[i][0] | 0, pts[i][1] | 0, pts[(i + 1) % 4][0] | 0, pts[(i + 1) % 4][1] | 0, '#00ff80', 1); }
  if (tune.view.rail) for (const c of sim.covers) { const p = R3.proj(c.x, c.y, (c.z0 || 0) + c.h); if (p) { px.disc(g, p[0], p[1], 2, '#ffff00'); T(g, c.id, p[0], p[1] + 3, '#ffff00', { scale: 1, align: 'center' }); } }
  if (tune.view.ai) for (const e of sim.enemies) { if (e.dead) continue; const p = R3.proj(e.x, e.y, e.foot + 30); if (p) T(g, e.type + ' ' + e.st + ' ' + e.hp.toFixed(1), p[0], p[1], '#ff80ff', { scale: 1, align: 'center' }); }
  if (tune.view.threats) for (const th of sim.threats) { const p = th.sp && R3.proj(th.sp[0], th.sp[1], th.sp[2]); if (p) T(g, 't' + th.id + ' ' + (th.at - sim.t).toFixed(2), p[0], p[1] + 10, '#ff4040', { scale: 1, align: 'center' }); }
  if (tune.view.hitVol) for (const e of sim.enemies) if (!e.dead) for (const v of sim.volumes(e)) { if (v.k === 'c') { const a = R3.proj(v.a[0], v.a[1], v.a[2]), b = R3.proj(v.b[0], v.b[1], v.b[2]); if (a && b) px.line(g, a[0] | 0, a[1] | 0, b[0] | 0, b[1] | 0, '#00ffff', 2); } }
}

// ---- 55-ending.js ----
// 55-ending.js — the ending: the credits roll (cast with live portraits, "Made with my-3D2dge", the music), the final score.
Scenes.ending = { camera: { zoom: false }, touch: [],
  enter() { this.t = 0; this.cast = [['kai', 'KAI NAVARRO', 'CREST agent'], ['rook', 'ROOK HALVORSEN', 'CREST demolitions'], ['mari', 'MARI TEJADA', 'Lumen Coast Guard'], ['juno', 'JUNO ACHTERBERG', 'CREST tech'], ['hale', 'DIRECTOR INES HALE', 'CREST HQ'], ['tomas', 'DR. TOMAS TEJADA', 'Chief engineer'], ['krake', 'ADMIRAL SILAS KRAKE', 'The Tide Tyrant'], ['barracuda', 'BARRACUDA', 'Captain of the Stingray'], ['hammerhead', 'HAMMERHEAD', 'The Enforcer']]; Run._song = 'ending'; musicFor(game, 'ending'); this.sim = Run.sim; },
  update(dt) { this.t += dt; const I = game.input; if (this.t > 2 && (I.pressed('start') || I.pressed('confirm') || I.clicked()) && this.t > 6) { I.consumeAll(); this.done(); } if (this.t > 4 + this.cast.length * 3.2 + 8) this.done(); },
  done() { if (this.went) return; this.went = true; enterInitials(Run.sim, Run.mode === 'coop' ? 'coop' : 'arcade', true); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H; drawBackdrop(g, W, H, game.time, .55); const sc = this.t;
    E.font.title(g, 'TIDE CRISIS 3', W / 2, 14, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
    T(g, 'THE END', W / 2, 52, '#ffd36a', { scale: 2, align: 'center' }); T(g, 'Port Lumen owes you its dawn.', W / 2, 74, '#ffffff', { scale: 1, align: 'center' });
    this.cast.forEach((c, i) => { const t0 = 3 + i * 3.2, u = (sc - t0); if (u < 0 || u > 3.6) return; const a = clamp(Math.min(u * 2, (3.6 - u) * 2), 0, 1); px.blend(g, a, 'normal', () => { const rig = speakerRig(c[0]); E.ui.box(g, W / 2 - 100, 100, 200, 60, { bg: ['#10244a', '#081428'], border: reg('speaker', c[0]).color }); if (rig) rig.drawPortrait(g, W / 2 - 70, 130, 44, {}); T(g, c[1], W / 2 - 40, 112, '#ffffff', { scale: 1 }); T(g, c[2], W / 2 - 40, 126, '#9fb8e8', { scale: 1 }); T(g, 'CAST ' + (i + 1) + '/' + this.cast.length, W / 2 - 40, 142, '#6a7ea8', { scale: 1 }); }); });
    if (sc > 4 + this.cast.length * 3.2) { T(g, 'Made with my-3D2dge · music, sound and voices written in code', W / 2, 120, '#9fe3ff', { scale: 1, align: 'center' }); const sim = this.sim; if (sim) T(g, 'FINAL SCORE ' + Math.max(...sim.players.map(p => p.score)), W / 2, 150, '#ffd36a', { scale: 2, align: 'center' }); }
    if (sc > 6) promptBar(g, W, H, [['confirm', 'CONTINUE']]); }); }
};

// ---- 60-net.js ----
// 60-net.js — AI Hub shared-world co-op (protocol v1, lib/hub). The host runs the authoritative Sim with every player;
// clients send inputs (`in`, unreliable ~15/s) and render snapshots (`s`, unreliable ~10/s, <= 1,100 bytes) plus
// batched events (`ev`, reliable). A token bucket keeps each copy under 18 messages a second. Network only via AIHub.send.
const ANIMS = ['idle', 'crouch', 'stand', 'point', 'run', 'walk', 'air', 'land', 'roll', 'climb', 'windup', 'slash', 'panic'];
const KINDS = ['grenade', 'rocket', 'torpedo', 'flare', 'harpoon', 'missile', 'gl'];
const NET = { bucket: 18, last: 0, sent: 0, seq: 0, inbox: {}, evq: [], snapT: 0, inT: 0, stats: { s: 0, ev: 0, in: 0, maxS: 0 }, over: false, types: null, rem: {}, snap: null, snapAt: 0, ended: false };
const q1 = n => Math.round(n);
function netSend(data, reliable) { const A = window.AIHub; if (!A || NET.over) return false; const now = performance.now(); NET.bucket = Math.min(18, NET.bucket + (now - NET.last) / 1000 * 18); NET.last = now; if (NET.bucket < 1) return false; NET.bucket--; const ok = A.send(data, { reliable }); return ok !== false; }
function typeList() { return NET.types || (NET.types = Object.keys(TC.REG.enemy)); }
// ---- host ----
function netHostInit(sim) {
  const A = window.AIHub; NET.over = false; NET.inbox = {}; NET.evq.length = 0; NET.finished = false; NET.t0 = performance.now(); NET.downT = {};
  A.on('message', (d, from) => { if (!d || !sim.players[from]) return; if (d.t === 'in') { const b = NET.inbox[from] || (NET.inbox[from] = { n: 0, k: 0 }); b.a = [d.a[0] / 1000, d.a[1] / 1000]; b.c = !!d.c; b.f = !!d.f; b.n += d.n | 0; b.k += d.k | 0; b.w = d.w; b.r = !!d.r; b.seen = performance.now(); } });
  A.on('leave', ev => { const p = sim.players[ev.id]; if (p) { p.left = true; p.down = true; p.contFail = true; p.contT = 0; sim.threats = sim.threats.filter(t => t.tgt !== ev.id); } });
  A.on('time-up', () => netFinish(sim, true));
}
function netHostCommands(sim) {
  const cmds = []; for (const p of sim.players) { if (p.id === Run.hub.me && !Run.hub.server) continue; const b = NET.inbox[p.id]; if (!b) { cmds[p.id] = { aim: p.aim, coverDown: p.wantCover }; continue; } const c = { aim: b.a, coverDown: b.c, fireDown: b.f && p.weapon === 1 || b.f && p.weapon === 0, autoFire: true }; if (b.n > 0) { c.firePressed = true; b.n--; } if (b.k > 0) { c.next = true; b.k--; } if (b.w != null && b.w !== p.weapon && (b.w === 0 || p.ammo[b.w] > 0)) c.select = b.w + 1; b.w = null; cmds[p.id] = c; }
  return cmds;
}
function netHostStep(sim, dt) {
  const A = window.AIHub; if (!A || NET.over) return; const now = performance.now();
  // recompose events for clients
  for (const ev of sim.events) { const e = Object.assign({}, ev); if (e.pos) e.pos = e.pos.map(q1); if (e.from) e.from = e.from.map(q1); if (e.to) e.to = e.to.map(q1); if (e.sp) e.sp = e.sp.map(q1); delete e.t; if (ev.type === 'threat') { e.at = +(sim.threats.find(t => t.id === ev.id) ? sim.threats.find(t => t.id === ev.id).at : sim.t + ev.tel).toFixed(2); } NET.evq.push(e); }
  if (NET.evq.length > 60) NET.evq.splice(0, NET.evq.length - 60);
  // auto-return of downed players (-5,000)
  for (const p of sim.players) if (p.down && !p.left) { NET.downT[p.id] = (NET.downT[p.id] || 0) + dt; if (NET.downT[p.id] > 6) { NET.downT[p.id] = 0; p.down = false; p.contT = 0; p.contFail = false; p.lives = 3; p.score = Math.max(0, p.score - 5000); p.inv = 2; sim.over = false; if (sim.phase === 'over') sim.phase = 'action'; sim.emit('continue', { p: p.id }); } }
  NET.evAcc = (NET.evAcc || 0) + dt; NET.snapT += dt;
  if (NET.evAcc >= .125 && NET.evq.length) { NET.evAcc = 0; const batch = NET.evq.splice(0, 12); netSend({ t: 'ev', e: batch }, true); NET.stats.ev++; }
  if (NET.snapT >= .1) { NET.snapT = 0; const s = buildSnapshot(sim); const n = JSON.stringify(s).length; NET.stats.maxS = Math.max(NET.stats.maxS, n); if (netSend(s, false)) NET.stats.s++; }
  // end of round
  const alive = sim.players.filter(p => !p.left);
  if (!NET.finished && (sim.phase === 'stageclear' || !alive.length)) netFinish(sim, false);
}
function buildSnapshot(sim) {
  const types = typeList(), pl = sim.players.map(p => [p.id, p.score, p.lives, p.chain, p.weapon, p.ammo[p.weapon] | 0, Math.round(p.c * 100), p.down ? 1 : 0, p.mag, p.ammo[1] | 0, p.ammo[2] | 0, p.ammo[3] | 0]);
  const pose = sim.pose(0); let en = sim.enemies.filter(e => !(e.gone && e.dt > 1)).map(e => [e.id, types.indexOf(e.type), q1(e.x), q1(e.y), q1(e.foot), Math.round(e.p * 100), Math.max(0, ANIMS.indexOf(e.anim)), (e.dead ? 1 : 0) | (e.flash > 0 ? 2 : 0) | (e.shield && e.shieldUp ? 4 : 0) | (e.zapping ? 8 : 0) | (e.civ ? 16 : 0), e.hp > 0 ? Math.round(e.hp * 10) : 0, e.deathStyle === 'flyback' ? 1 : e.deathStyle === 'spin' ? 2 : 0]);
  const pr = sim.proj.filter(p => !p.dead && p.team !== 'p').map(p => [p.id, KINDS.indexOf(p.kind), q1(p.x), q1(p.y), q1(p.z)]);
  const s = { t: 's', at: +sim.t.toFixed(2), ph: ['idle', 'travel', 'action', 'clear', 'boss', 'stageclear', 'over'].indexOf(sim.phase), sc: sim.sceneId, tm: +sim.timer.toFixed(1), d: q1(sim.rail), pt: +sim.pt.toFixed(2), p: pl, e: en, pr };
  if (sim.boss) { const B = sim.boss; s.b = [B.id, B.phase, B.anim.mode || '', q1(B.pos[0]), q1(B.pos[1]), q1(B.pos[2]), Object.keys(B.parts).map(k => Math.round(B.parts[k].hp * 10) * (B.parts[k].dead ? -1 : 1) + (B.parts[k].dead ? -1 : 0)), B.toppled ? 1 : 0, B.shield ? 1 : 0, B.dead ? 1 : 0]; }
  // budget: drop the enemies furthest from the first camera until it fits
  let n = JSON.stringify(s).length; if (n > 1080) { const cx = pose.x, cy = pose.y; s.e.sort((a, b) => Math.hypot(a[2] - cx, a[3] - cy) - Math.hypot(b[2] - cx, b[3] - cy)); while (JSON.stringify(s).length > 1080 && s.e.length > 1) s.e.pop(); }
  return s;
}
function netFinish(sim, timeUp) {
  const A = window.AIHub; if (NET.finished || !A) return; NET.finished = true;
  const ps = sim.players, sorted = ps.map(p => p.id).sort((a, b) => ps[b].score - ps[a].score), standings = []; for (const id of sorted) { const last = standings[standings.length - 1]; if (last && ps[last[0]].score === ps[id].score) last.push(id); else standings.push([id]); }
  const scores = {}, stats = {}, acc = ps.map(p => p.st.shots ? p.st.hits / p.st.shots : 0); for (const p of ps) { scores[p.id] = p.score; stats[p.id] = { Kills: p.st.kills, Accuracy: Math.round(acc[p.id] * 100) + '%', Headshots: p.st.heads, 'Cover saves': p.st.saves, 'Lives lost': p.st.lost }; }
  const awards = []; const best = (f, title, detail) => { let bi = -1, bv = 0; ps.forEach((p, i) => { const v = f(p, i); if (v > bv) { bv = v; bi = i; } }); if (bi >= 0) awards.push({ id: bi, title, detail: detail(bv) }); };
  best((p, i) => p.st.shots > 5 ? acc[i] : 0, 'Sharpshooter', v => Math.round(v * 100) + '% accuracy'); best(p => p.st.kills, 'Pointman', v => v + ' kills'); best(p => p.st.saves, 'Iron Wall', v => v + ' cover saves');
  try { A.finish({ standings, scores, won: !!(sim.boss && sim.boss.dead) || sim.phase === 'stageclear', stats, awards }); } catch (e) { game.fail('hub finish', e); }
}
// ---- client ----
function netClientInit(sim) {
  const A = window.AIHub; NET.over = false; NET.snap = null; NET.evq.length = 0; NET.sentC = { n: 0, k: 0 };
  A.on('message', (d, from) => {
    if (!d) return; if (d.t === 's') { NET.snap = d; NET.snapAt = performance.now(); applySnapshot(sim, d); }
    else if (d.t === 'ev') { for (const e of d.e) NET.evq.push(e); }
  });
  A.on('leave', ev => { const p = sim.players[ev.id]; if (p) p.left = true; });
}
function applySnapshot(sim, s) {
  const types = typeList(); sim.timer = s.tm; sim.rail = s.d; sim.pt = s.pt; const ph = ['idle', 'travel', 'action', 'clear', 'boss', 'stageclear', 'over'][s.ph]; if (ph) { if (ph === 'action' && sim.phase === 'travel') { sim.travelDone = true; sim.actionT = 0; } sim.phase = ph; }
  if (s.sc && s.sc !== sim.sceneId) { sim.jump(+s.sc[0] || sim.stage, s.sc, {}); sim.phase = ph || 'travel'; }
  for (const a of s.p) { const p = sim.players[a[0]]; if (!p) continue; p.score = a[1]; p.lives = a[2]; p.chain = a[3]; if (a[0] !== Run.hub.me) { p.weapon = a[4]; p.c = a[6] / 100; } else { p.weapon = a[4]; p.ammo[p.weapon] = a[5]; } p.down = !!a[7]; p.mag = a[8]; p.ammo[1] = a[9]; p.ammo[2] = a[10]; p.ammo[3] = a[11]; if (a[0] !== Run.hub.me) p.aim = p.aim; if (a[0] === Run.hub.me) { if (Math.abs(p.c - a[6] / 100) > .5) { p.cdis = (p.cdis || 0); } } }
  const seen = new Set(); for (const a of s.e) { let e = sim.enemies.find(x => x.id === a[0]); const dead = !!(a[7] & 1); if (!e) { e = { id: a[0], type: types[a[1]], x: a[2], y: a[3], foot: a[4], z: a[4], bx: a[2], by: a[3], bz: 0, p: a[5] / 100, st: 'rep', hp: 1, maxHp: 1, flash: 0, hurtT: 0, stagger: 0, dead: false, dt: 0, civ: false, size: (reg('enemy', types[a[1]]).look || {}).size || 1, skin: SKIN[a[0] % 4], peek: 'up', anim: 'idle', tx: a[2], ty: a[3], tf: a[4] }; sim.enemies.push(e); }
    e.tx = a[2]; e.ty = a[3]; e.tf = a[4]; e.p = a[5] / 100; e.anim = ANIMS[a[6]] || 'idle'; e.flash = a[7] & 2 ? .08 : 0; e.shield = e.type === 'shield'; e.shieldUp = !!(a[7] & 4); e.zapping = !!(a[7] & 8); e.civ = !!(a[7] & 16); e.hp = a[8] / 10; e.deathStyle = a[9] === 1 ? 'flyback' : a[9] === 2 ? 'spin' : 'crumple'; if (dead && !e.dead) { e.dead = true; e.dt = 0; } seen.add(e.id); }
  sim.enemies = sim.enemies.filter(e => seen.has(e.id) || (e.dead && e.dt < 2.2)); for (const e of sim.enemies) if (!seen.has(e.id) && !e.dead) e.dead = true;
  const keep = new Map(sim.proj.map(p => [p.id, p])); sim.proj = s.pr.map(a => { const old = keep.get(a[0]); const p = old || { id: a[0], team: 'e', hp: 1, r: 6, vx: 0, vy: 0, vz: 0 }; p.kind = KINDS[a[1]]; p.tx = a[2]; p.ty = a[3]; p.tz = a[4]; if (!old) { p.x = a[2]; p.y = a[3]; p.z = a[4]; } return p; });
  if (s.b) { const [id, phase, mode, x, y, z, hps, topp, shield, dead] = s.b; if (!sim.boss || sim.boss.id !== id) { sim.boss = null; sim.replica = true; sim.spawnBoss(id, {}); } const B = sim.boss; B.phase = phase; B.anim.mode = mode; B.pos = [x, y, z]; B.toppled = !!topp; B.shield = !!shield; B.dead = !!dead; B.intro = false; Object.keys(B.parts).forEach((k, i) => { const v = hps[i]; if (v == null) return; const dd = v < 0 || (v === 0 && false); const hp = Math.abs(v) / 10; B.parts[k].hp = dd ? 0 : (B.parts[k].hp > 0 ? hp : hp); B.parts[k].dead = v < 0; }); sim.phase = dead ? sim.phase : 'boss'; } else if (sim.boss && !sim.boss.dead) sim.boss = null;
}
function netReplicaStep(sim, dt, cmds) {
  const me = Run.hub.me, p = sim.players[me], cmd = cmds[me] || {}; sim.events.length = 0; sim.t += dt;
  // predicted cover
  const tgt = cmd.coverDown ? 1 : 0, rate = tgt > p.c ? 1 / tune.player.coverIn : 1 / tune.player.coverOut; p.c = approach(p.c, tgt, rate * dt); if (cmd.aim) p.aim = cmd.aim;
  // smoothing of the world toward the latest snapshot
  const k = Math.min(1, dt * 14); for (const e of sim.enemies) { if (e.tx != null) { e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.foot += (e.tf - e.foot) * k; } if (e.dead) e.dt += dt; e.flash = Math.max(0, e.flash - dt); } for (const pr of sim.proj) { if (pr.tx != null) { pr.x += (pr.tx - pr.x) * k; pr.y += (pr.ty - pr.y) * k; pr.z += (pr.tz - pr.z) * k; } }
  // events from the host
  const evs = NET.evq.splice(0); for (const e of evs) { if (e.type === 'threat') { sim.threats.push({ id: e.id, src: e.src, tgt: e.tgt, t0: sim.t, at: sim.t + e.tel, tel: e.tel, kind: e.kind, sp: e.sp }); } else if (e.type === 'break' && e.idx >= 0 && sim.objs[e.idx]) sim.objs[e.idx].dead = true; else if (e.type === 'shot' && e.p === me) { sim.events.push(e); continue; } sim.events.push(e); }
  sim.threats = sim.threats.filter(t => t.at > sim.t - .05); if (sim.pt != null && sim.phase === 'travel') sim.pt += dt;
  // input to the host (unreliable, ~15/s)
  NET.inT += dt; if (cmd.firePressed) NET.sentC.n++; if (cmd.next) NET.sentC.k++;
  if (NET.inT >= 1 / 15) { NET.inT = 0; if (netSend({ t: 'in', a: [Math.round(p.aim[0] * 1000), Math.round(p.aim[1] * 1000)], c: cmd.coverDown ? 1 : 0, f: cmd.fireDown ? 1 : 0, n: NET.sentC.n, k: NET.sentC.k, w: p.weapon }, false)) { NET.stats.in++; NET.sentC.n = 0; NET.sentC.k = 0; } }
  p.exposedSince = p.exposedSince || 0; sim.ticks = 0;
}

// ---- 80-about.js ----
// 99-about.js — About/Credits data: Source Information and the three feedback sections. tools/build.mjs also writes
// exit-interview.json from this same object so the game, the file and the chat reply agree.
const ABOUT = {
  sourceInformation: {
    date: '2026-11-03 18:33:03', source: 'Time Crisis 3 (Namco/Nextech, 2003; PS2 2003)', plan: 'PLAN.md (claude-opus-5-5, max effort), scoped down by the builder where it disagreed with the time budget',
    genre: 'On-rails light-gun shooter with a cover system', perspective: 'First-person rail camera (cutscenes use a letterboxed rail shot)',
    tech: 'my-3D2dge handoff v0.85.2 full engine (patched: PlayStation glyph default, mouse-wheel codes, audio bus), a custom painter\'s-order perspective renderer module ("Rail3D"), AI Hub session client 1.4.0 (protocol v1). No other libraries.',
    artDirection: 'The engine\'s native PS1-era pixel style: banded, fogged, flat-shaded perspective boxes with line textures, and the engine\'s Humanoid rigs as billboards',
    animation: 'The engine\'s procedural Humanoid rigs (crouch, point/aim, run, air, land, roll, climb, slash, die) driven by enemy state, plus code-posed boss machines (Stingray, Bulldog, Scylla, Seawolf)',
    audio: 'All code: the engine chip synth and tracker for music and SFX, plus a Web Audio formant "Animalese" gibberish voice synth for every speaker',
    online: 'AI Hub Session Protocol v1, shared-world co-op for 1–4 players (host-authoritative Sim, input and snapshot messages); local two-player split screen',
    testing: 'One command (node tests/run.mjs --all) prints only failures and a count: 824 checks over headless Node suites (game.advance, game.debug, direct Sim stepping), Autopilot playthroughs of every stage and of the whole ARCADE to the credits, the Training range, a Playwright browser smoke test, and the four AI Hub harness scenarios',
    research: 'The engine handoff docs, the AI Hub protocol docs, and the Wikipedia article on Time Crisis 3 (summarised in PLAN.md). Facts used: pedal-based cover, 4 weapons, crisis flash, time limit per area, link play. Unknown: exact arcade time and weapon-switch rules.',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
    usage: 'unknown'
  },
  testingFeedback: [
    'About 16 real defects were caught by scripted runs and validators (most before any screenshot): enemies shootable only through scenery (gallery floor, ice table, houses, deck crates), a boss whose defeat was never wired, a boss scene that never cleared, a lift whose cover prop stayed on the ground, a moving scene that let the camera pass living enemies, an endless cutscene loop after results, drones too fast to hit, and a Hammerhead fight that was unwinnable without shotgun shells.',
    '7 of them were game-breaking soft-locks (a scene or boss that could never be finished): unreachable enemies, boss never defeated, boss scene never cleared, passing enemies in moving scenes, the lift with no cover, the endless cutscene loop, and Hammerhead with no ammo supply.',
    'The most helpful tests were the scripted Autopilot playthrough of every stage (it finds soft-locks no assertion would) and the content validator that ray-casts every cover point from every player slot.',
    'The least helpful were the screenshot checks for layout (slow for what they found) and the determinism hash test, which never failed; the net suite is covered by the real AI Hub harness instead of a fake hub.'
  ],
  engineFeedback: [
    'The fixed-step headless loop (game.advance, game.debug) that made every system testable in Node, plus the Humanoid rigs that draw from any View, and the ready-made pause menu, settings, rebinding and boot screen.',
    'Yes: I assumed boot steps ran synchronously in Node (they need a tick), assumed the pixel font had a dash and the PlayStation face-button glyphs (it did not), and expected r.overlay in a split screen to give viewport-relative coordinates (it gives the whole buffer).',
    'The perspective renderer ("Rail3D": camera math, painter-order boxes, sky, sea, fog, banded light), the deterministic Sim (cover, threats, director, bosses), the Autopilot, and the AI Hub netcode.',
    'The 2D engine has no perspective view: rigs only draw from orthographic Views, so every enemy is drawn to a scratch canvas per frame, scaled by distance and sorted by hand, with no z-buffer.',
    'Four small patches (engine/PATCHES.md): PlayStation glyphs by default (Xbox as the option), mouse-wheel input codes, audio.bus() for the voice synth, and extra pixel-font glyphs (face buttons, dashes, ellipsis, check, arrows).',
    'A first-class first-person/rail view: a perspective E.View with depth-sorted rigs, boxes and sprites, so light-gun and corridor games do not need their own renderer.'
  ],
  promptFeedback: [
    'The plan\'s concrete numbers (timings, weapon tables, enemy roster, test suites) and the single-file, AI Hub and attract-mode requirements: they made every system verifiable.',
    'The plan and TASK.md name different files and models, and the plan assumes the 3D engine and a very large scope (three stages, three bosses, online, split screen) that does not fit one medium-effort session without cuts.',
    'Shipping everything at once: a feature-complete three-stage game with bosses, split screen, online co-op, a dev panel, an attract mode, and all audio and voices in code.',
    'Add must/should/could tiers and say which plan items may be simplified, and supply the engine\'s perspective renderer or say plainly that none exists.'
  ]
};
function aboutPages(inp) {
  const si = ABOUT.sourceInformation, pages = [];
  pages.push(howToPage(inp));
  pages.push({ title: 'CREDITS', lines: [{ t: 'TIDE CRISIS 3', s: 2, c: '#ffd36a' }, { t: 'An original arcade light-gun rail shooter. A playful riff on Time Crisis 3 (Namco/Nextech, 2003): cover is the game, TIME is the pressure, and the crisis flash tells you when to duck.' }, { t: 'Cast: Kai Navarro, Rook Halvorsen, Mari Tejada, Juno Achterberg, Director Hale, Dr. Tejada, Admiral Krake, Barracuda, Hammerhead, The Gull.', c: '#9fe3ff' }, { t: 'Built on my-3D2dge (MIT). All music, sound and gibberish voices are generated in code. Online play through AI Hub.' }, { t: 'This game is not affiliated with Bandai Namco. No names, levels, music or art from the source are used.', c: '#9fb8e8' }] });
  const keys = Object.keys(si); pages.push({ title: 'SOURCE INFORMATION (1/2)', lines: keys.slice(0, 8).map(k => ({ t: k.toUpperCase() + ': ' + si[k], c: '#ffffff' })) }); pages.push({ title: 'SOURCE INFORMATION (2/2)', lines: keys.slice(8).map(k => ({ t: k.toUpperCase() + ': ' + si[k], c: '#ffffff' })) });
  for (const [k, title] of [['testingFeedback', 'TESTING FEEDBACK'], ['engineFeedback', 'ENGINE FEEDBACK'], ['promptFeedback', 'PROMPT FEEDBACK']]) pages.push({ title, lines: ABOUT[k].map((t, i) => ({ t: (i + 1) + '. ' + t })) });
  return pages;
}

// ---- 90-main.js ----
// 90-main.js — new E.Game, settings, pause-menu items (incl. Dev mode), the AI Hub session flow (card, countdown,
// host/replica/server, end), scene registry, boot steps and game.debug. Starts the game.
const HUBACTIVE = typeof AIHub !== 'undefined' && AIHub.active;
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty (new runs)', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], group: 'Game' },
  { key: 'aimAssist', label: 'Aim assist (controller)', type: 'select', value: 'medium', options: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], group: 'Game' },
  { key: 'padSpeed', label: 'Aim speed (controller)', type: 'slider', value: 1, min: .5, max: 2, step: .1, group: 'Game' },
  { key: 'coverMode', label: 'Cover control', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']], group: 'Game' },
  { key: 'autoFire', label: 'Hold fire to repeat (handgun)', type: 'select', value: 'on', options: [['on', 'On'], ['off', 'Off']], group: 'Game' },
  { key: 'reticle', label: 'Reticle', type: 'select', value: 'cross', options: [['cross', 'Cross'], ['ring', 'Ring'], ['dot', 'Dot']], group: 'Game' },
  { key: 'reticleSize', label: 'Reticle size', type: 'select', value: 'M', options: [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']], group: 'Game' },
  { key: 'threatSize', label: 'Crisis rings', type: 'select', value: 'normal', options: [['normal', 'Normal'], ['large', 'Large']], group: 'Game' },
  { key: 'subtitles', label: 'Subtitles', type: 'select', value: 'on', options: [['on', 'On'], ['off', 'Off']], group: 'Game' }
];
function createGame() {
  const items = HUBACTIVE ? [] : [
    ['Restart scene', () => { game.resume(); const s = Run.sim; if (s && Run.mode !== 'host') { s.jump(s.stage, s.sceneId); Pres.reset(); resetHud(); } }],
    ['Restart stage', () => { game.resume(); if (Run.sim) { Run.carry = null; Run.newSim(Run.sim.stage); game.go('play'); } }],
    ['Dev mode', () => { game.resume(); if (!Dev.items.length) Dev.build(); Dev.open = true; game.input.consumeAll(); }]
  ];
  const g = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, input: INPUT, autoPause: !HUBACTIVE, corner: HUBACTIVE ? false : undefined, fullscreen: HUBACTIVE ? false : undefined,
    menu: { items, settings: SETTINGS, controls: NAMES, quit: HUBACTIVE ? false : 'title' } });
  return g;
}
function applyHubGuards() { }
function buildScenes() {
  const S = Object.assign({}, Scenes);
  S.play = { pausable: !HUBACTIVE, camera: { zoom: false }, touch: [], enter: playEnter, update: playUpdate, draw: playDraw, exit() { game.splitScreen(0); } };
  S.session = Scenes.session; S.server = Scenes.server;
  return S;
}
// ---- AI Hub session ----
const Hub = { card: null, started: false, ended: null };
Scenes.session = { camera: { zoom: false }, touch: [], pausable: false,
  enter() { this.t = 0; musicFor(game, 'briefing'); Run._song = 'briefing'; },
  update(dt) { const A = window.AIHub; this.t += dt; const I = game.input; if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) A.answer('ready'); if (I.pressed('more')) A.answer('more'); if (Hub.started && !Hub.went) { Hub.went = true; game.go('play'); } },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, A = window.AIHub, st = reg('stage', Run.stage), c = Hub.card || {}; drawBackdrop(g, W, H, game.time, .55); E.font.title(g, 'TIDE CRISIS 3', W / 2, 10, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 2, align: 'center' });
    T(g, 'STAGE ' + Run.stage + ' — ' + st.name, W / 2, 46, '#ffd36a', { scale: 2, align: 'center' }); T(g, st.place + ' · ' + st.clock, W / 2, 64, '#9fb8e8', { scale: 1, align: 'center' });
    const pl = (A.players || []); pl.forEach((p, i) => { const x = W / 2 - pl.length * 52 + i * 104 + 6, ready = c.ready && c.ready.includes(p.id); E.ui.box(g, x, 80, 92, 40, { bg: ['#10244a', '#081428'], border: p.color }); T(g, AGENT_NAME[i] || 'AGENT', x + 46, 86, p.color, { scale: 1, align: 'center' }); T(g, String(p.name || '').slice(0, 14), x + 46, 98, '#ffffff', { scale: 1, align: 'center' }); T(g, ready ? '✓ READY' : '…', x + 46, 109, ready ? '#7cff8a' : '#6a7ea8', { scale: 1, align: 'center' }); });
    T(g, 'GOAL: Clear the stage together — most points wins', W / 2, 134, '#ffffff', { scale: 1, align: 'center' });
    const L = a => game.input.label(a); T(g, 'AIM ' + (game.input.lastDevice === 'gamepad' ? 'STICK' : 'MOUSE') + '  ·  FIRE [' + L('fire') + ']  ·  HOLD [' + L('cover') + '] COVER + RELOAD  ·  [' + L('next') + '] WEAPON', W / 2, 150, '#9fe3ff', { scale: 1, align: 'center' });
    const left = c.paused ? 'PAUSED' : c.starting ? 'GET READY…' : c.left != null ? Math.ceil(c.left / 1000) + 's' : ''; T(g, left, W / 2, 172, '#ffd36a', { scale: 3, align: 'center' });
    T(g, '[' + L('confirm') + '] READY   [' + (game.input.lastDevice === 'gamepad' ? '△' : 'M') + '] MORE TIME', W / 2, H - 16, '#9fb8e8', { scale: 1, align: 'center' }); }); }
};
Scenes.server = { camera: { zoom: false }, touch: [], pausable: false,
  enter() { this.t = 0; }, update(dt) { const sim = Run.sim; if (Hub.ended) return; if (window.AIHub.time() < 0) return; const cmds = netHostCommands(sim); sim.step(dt, cmds); netHostStep(sim, dt); stepPres(dt, sim); },
  draw(r) { r.overlay(g => { const W = r.W, H = r.H, sim = Run.sim; px.rect(g, 0, 0, W, H, '#050a1c'); E.font.title(g, 'TIDE CRISIS 3', W / 2, 30, { scale: 3, colors: ['#ffffff', '#3aa0e8'], align: 'center' }); T(g, 'HOSTING · ' + sim.players.length + ' AGENTS · AREA ' + sim.sceneId, W / 2, 100, '#ffd36a', { scale: 2, align: 'center' }); T(g, Hub.ended ? 'ROUND OVER' : 'PHASE ' + sim.phase.toUpperCase() + ' · TIME ' + sim.timer.toFixed(0), W / 2, 130, '#9fe3ff', { scale: 1, align: 'center' }); }); }
};
async function hubBoot() {
  const A = window.AIHub; let info = null;
  try { info = await A.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch (e) { info = null; }
  if (!info) return null;
  const stage = ((info.round - 1) % 3 + 3) % 3 + 1, np = info.players.length;
  Run.hub = { me: info.me, isHost: info.isHost, server: info.server, info }; Run.mode = info.isHost ? (info.server ? 'server' : 'host') : 'replica'; Run.stage = stage; Run.np = np; Run.diff = 'normal'; Run.carry = null;
  const specs = info.players.map((p, i) => ({ name: String(p.name || 'P' + (i + 1)), agent: AGENT[i], color: p.color || PCOL[i] }));
  const sim = new Sim({ mode: Run.mode, stage, scene: reg('stage', stage).scenes[0], difficulty: 'normal', players: specs, seed: info.seed | 0, noContinue: true });
  if (!info.isHost) { sim.replica = true; sim.mode = 'replica'; sim.jump(stage, reg('stage', stage).scenes[0], {}); }
  Run.sim = sim; HUD.shown = {};
  A.on('card', c => { Hub.card = c; }); A.on('start', () => { Hub.started = true; });
  window.addEventListener('keydown', e => { if (Hub.went || Hub.ended) return; if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.key === 'Enter') A.answer('ready'); else if (e.code === 'KeyM') A.answer('more'); });
  A.on('end', ev => { Hub.ended = ev; NET.over = true; game.input.clear(); try { game.audio.stopMusic && game.audio.stopMusic(); game.audio.mute && game.audio.mute(); } catch (e) { } });
  if (info.isHost) netHostInit(sim); else netClientInit(sim);
  A.ready(); return info;
}
function hubOverlay(g, W, H) { const e = Hub.ended; if (!e) return; px.rect(g, 0, 0, W, H, '#000000c0'); const txt_ = e.reason === 'host-left' ? 'HOST LEFT — ROUND VOID' : e.reason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER'; T(g, txt_, W / 2, H / 2 - 8, '#ffffff', { scale: 3, align: 'center' }); }
// ---- boot ----
let started = false;
function boot() {
  if (started) return; started = true;
  game = createGame(); arcade = new E.Arcade(game, { id: 'tc3', lives: 5, hud: false, idle: 1e9, demo: 1e9 });
  game.input.wheelCodes = true; try { game.input.use && 0; } catch (e) { }
  const scenes = buildScenes(); for (const k of ['title', 'menu', 'difficulty', 'select', 'coop', 'briefing', 'cutscene', 'results', 'gameover', 'records', 'about', 'ending', 'attract']) { if (!scenes[k]) scenes[k] = Scenes[k]; }
  const wrapDraw = s => { if (!HUBACTIVE) return; const d = s.draw; s.draw = function (r) { d.call(this, r); r.overlay(g => hubOverlay(g, r.W, r.H)); }; }; if (HUBACTIVE) { wrapDraw(scenes.play); wrapDraw(scenes.server); wrapDraw(scenes.session); }
  game.debug = makeDebug();
  const steps = [['Tuning the lanterns', () => { defineAudio(game); validateOnBoot(); }], ['Raising the tide barrier', () => { backdropSim(); }]];
  steps.push(['Calling the hub', async () => { if (HUBACTIVE) { const info = await hubBoot(); if (info) { Run.bootHub = info; } } }]);
  const startScene = () => HUBACTIVE && Run.hub ? (Run.hub.server ? 'server' : 'session') : 'title';
  game.start({ scene: 'title', scenes, boot: { title: 'TIDE CRISIS 3', steps }, });
}
function validateOnBoot() { const errs = validateContent(); if (errs.length) console.warn('content: ' + errs.slice(0, 6).join(' | ')); }
function makeDebug() {
  return {
    snapshot() { const s = Run.sim; return { scene: game.sceneName, phase: s && s.phase, stage: s && s.stage, sceneId: s && s.sceneId, timer: s && +s.timer.toFixed(1), players: s && s.players.map(p => ({ score: p.score, lives: p.lives, c: +p.c.toFixed(2), weapon: p.weapon, mag: p.mag, ammo: p.ammo.slice(), down: p.down, st: p.st })), enemies: s && s.enemies.filter(e => !e.dead).length, threats: s && s.threats.length, boss: s && s.boss && { id: s.boss.id, dead: s.boss.dead, parts: Object.fromEntries(Object.entries(s.boss.parts).map(([k, p]) => [k, +p.hp.toFixed(1)])) }, errors: game.errors.length, mode: Run.mode }; },
    get sim() { return Run.sim; }, Run, tune, TUNE, TC, NET, Sim, reg, Voice, ABOUT, aboutPages, touchOnly, Attract, WEAPONS, SKIN, Bot, Dev, HUD, Pres, R3, validateContent, game,
    start(mode, stage, diff, np, seed) { Run.begin(mode, stage, diff, np); const sim = Run.newSim(stage, null, Object.assign(mode === 'range' ? { mode: 'range', lives: 99 } : {}, seed != null ? { seed } : {})); if (mode === 'range') { Run.newSim(0, 'T-1', { mode: 'range', lives: 99 }); } game.go('play'); return Run.sim; },
    jump(stage, sceneId, o) { Run.sim.jump(stage, sceneId, o); Pres.reset(); },
    cheat(k, v) { Run.sim.cheats[k] = v === undefined ? 1 : v; }, bot(on, style) { Run.botOn = on; Bot.setStyle(style || 'fair'); },
    aimAt(i, pt) { const s = Run.sim, a = R3.aimOf(s.pose(i), pt); if (a) { s.players[i].aim = [a[0], a[1]]; AimOverride[i] = [a[0], a[1]]; } return a; },
    fire(i) { game.input.tap('fire'); }, cover(i, on) { game.input.hold('cover', on); }
  };
}
const AimOverride = {};
if (typeof document !== 'undefined' || true) boot();

})();
