(() => {
"use strict";
const E = My3D2dge;
// ---- 00-core.js ----
/* 00-core: the TC namespace, units, content registries (def), the event helpers, the tuning tables (TUNE frozen
 * defaults, tune live values) and the difficulty tables. Reads nothing; everything else reads it.
 *
 * THE CORE LOOP: the camera rides the rail to the next area (WAIT) -> ACTION! starts the clock -> pop out and shoot ->
 * duck when a crisis flash says a shot will hit -> reload in cover -> clear the area before TIME runs out -> ride on ->
 * beat the boss -> STAGE CLEAR.
 */
const TC = (typeof window !== 'undefined' ? window : globalThis).TC = {};
const U = 16;                       // world units per metre
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const { clamp, lerp } = E;
const HEADLESS = typeof document === 'undefined';
TC.U = U; TC.HEADLESS = HEADLESS;

/* ---- registries: def(kind, id, spec) ---- */
const REG = {};
function def(kind, id, spec) { const k = REG[kind] || (REG[kind] = {}); spec.id = id; k[id] = spec; return spec; }
function reg(kind, id) { const k = REG[kind]; return k ? k[id] : undefined; }
function regAll(kind) { return Object.values(REG[kind] || {}); }
TC.REG = REG; TC.def = def; TC.reg = reg;

/* ---- small helpers ---- */
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const angWrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const lerpAng = (a, b, t) => a + angWrap(b - a) * t;
const fmt = n => Math.round(n).toLocaleString('en-US');
const pad2 = n => String(n).padStart(2, '0');
const deepClone = o => JSON.parse(JSON.stringify(o));
function deepFreeze(o) { Object.freeze(o); for (const k in o) if (o[k] && typeof o[k] === 'object' && !Object.isFrozen(o[k])) deepFreeze(o[k]); return o; }
function getPath(o, p) { for (const k of p.split('.')) o = o == null ? undefined : o[k]; return o; }
function setPath(o, p, v) { const ks = p.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
TC.fmt = fmt;

/* ---- tuning: the most important gameplay variables, live in dev mode, reset to TUNE ---- */
const TUNE = deepFreeze({
  player: { god: false, infAmmo: false, startLives: 0 /* 0: by difficulty */, iframes: 1.5, coverIn: .12, coverOut: .15, reload: .30, padSpeed: 1.6, assist: .6 },
  weapons: { hgDamage: 1, mgRate: 12, mgDamage: .45, sgPellets: 8, sgSpread: 5.5, glRadius: 48, glDamage: 6, ammoMul: 1 },
  enemy: { hpMul: 1, threatMul: 1, teleMul: 1, fireMul: 1, maxThreats: 0 /* 0: by stage */, minGap: .35, reactMul: 1, bossHpMul: 1 },
  time: { freeze: false, sceneMul: 1, eliteBonus: 2, refill: .6, speed: 1 },
  view: { fov: 55, hitVols: false, colliders: false, rails: false, aiLabels: false, threatDebug: false, perf: false, freeCam: false, hideHud: false }
});
let tune = deepClone(TUNE);
TC.TUNE = TUNE;
Object.defineProperty(TC, 'tune', { get: () => tune, set: v => { tune = v; } });
function resetTune() { tune = deepClone(TUNE); TC.emit('tune'); }
TC.resetTune = resetTune;

const DIFF = {
  easy: { name: 'EASY', lives: 7, time: 1.25, threat: .75, maxThreats: -1, hp: .85, react: 1.25 },
  normal: { name: 'NORMAL', lives: 5, time: 1, threat: 1, maxThreats: 0, hp: 1, react: 1 },
  hard: { name: 'HARD', lives: 3, time: .85, threat: 1.25, maxThreats: 1, hp: 1.2, react: .8 }
};
TC.DIFF = DIFF;

/* ---- a tiny event bus (presentation listens; the Sim emits through sim.events instead) ---- */
const BUS = {};
TC.on = (e, f) => { (BUS[e] || (BUS[e] = [])).push(f); return () => { BUS[e] = BUS[e].filter(g => g !== f); }; };
TC.emit = (e, ...a) => { for (const f of BUS[e] || []) f(...a); };

/* ---- palette for the UI ---- */
const UI = { bg0: '#10244a', bg1: '#081428', accent: '#3aa0e8', text: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c8', green: '#5ad17a', ink: '#08142a' };
TC.UI = UI;
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
TC.SEAT_COLORS = SEAT_COLORS;

// ---- 01-math3d.js ----
/* 01-math3d: vec3 helpers, the camera basis (yaw 0 = east, +pi/2 = south, pitch up, vertical fov), projection and
 * unprojection, aim (view units) <-> rays, ray vs sphere / capsule / box / oriented box, springs. Pure math; no state.
 * View units: ax in [-A, A], ay in [-1, 1], y up, A = the viewport's aspect. */
const V3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: a => Math.hypot(a[0], a[1], a[2]),
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
};
TC.V3 = V3;

/** the camera basis for a pose { x, y, z, yaw, pitch, roll, fov } and a viewport of w x h pixels */
function camBasis(cam, w, h, B = {}) {
  const ps = Math.cos(cam.yaw), sn = Math.sin(cam.yaw), ct = Math.cos(cam.pitch || 0), st = Math.sin(cam.pitch || 0);
  B.x = cam.x; B.y = cam.y; B.z = cam.z;
  B.fx = ct * ps; B.fy = ct * sn; B.fz = st;
  let rx = -sn, ry = ps, rz = 0, ux = -st * ps, uy = -st * sn, uz = ct;
  const rl = cam.roll || 0;
  if (rl) { const c = Math.cos(rl), s = Math.sin(rl), nrx = rx * c + ux * s, nry = ry * c + uy * s, nrz = rz * c + uz * s; ux = ux * c - rx * s; uy = uy * c - ry * s; uz = uz * c - rz * s; rx = nrx; ry = nry; rz = nrz; }
  B.rx = rx; B.ry = ry; B.rz = rz; B.ux = ux; B.uy = uy; B.uz = uz;
  B.w = w; B.h = h; B.cx = w / 2; B.cy = h / 2;
  B.fov = (cam.fov || 55) * DEG; B.tanH = Math.tan(B.fov / 2);
  B.F = (h / 2) / B.tanH; B.near = 2;
  return B;
}
/** world point -> [sx, sy, viewZ] (null behind the near plane) */
function project(B, x, y, z) {
  const dx = x - B.x, dy = y - B.y, dz = z - B.z, Z = dx * B.fx + dy * B.fy + dz * B.fz;
  if (Z < B.near) return null;
  const X = dx * B.rx + dy * B.ry + dz * B.rz, Y = dx * B.ux + dy * B.uy + dz * B.uz;
  return [B.cx + X * B.F / Z, B.cy - Y * B.F / Z, Z];
}
/** view-space of a world point [X, Y, Z] */
function toView(B, x, y, z) {
  const dx = x - B.x, dy = y - B.y, dz = z - B.z;
  return [dx * B.rx + dy * B.ry + dz * B.rz, dx * B.ux + dy * B.uy + dz * B.uz, dx * B.fx + dy * B.fy + dz * B.fz];
}
/** aim (view units) -> a world ray { o, d } from the camera pose */
function aimRay(cam, ax, ay) {
  const B = camBasis(cam, 2, 2, {}), t = B.tanH, X = ax * t, Y = ay * t, Z = 1, l = Math.hypot(X, Y, Z);
  const d = [(B.rx * X + B.ux * Y + B.fx * Z) / l, (B.ry * X + B.uy * Y + B.fy * Z) / l, (B.rz * X + B.uz * Y + B.fz * Z) / l];
  return { o: [cam.x, cam.y, cam.z], d };
}
/** world point -> aim (view units) [ax, ay, Z] for a camera pose, or null behind it */
function worldToAim(cam, p) {
  const B = camBasis(cam, 2, 2, TC._wa || (TC._wa = {})), v = toView(B, p[0], p[1], p[2]);
  if (v[2] < 1) return null;
  return [v[0] / v[2] / B.tanH, v[1] / v[2] / B.tanH, v[2]];
}
TC.camBasis = camBasis; TC.project = project; TC.aimRay = aimRay; TC.worldToAim = worldToAim;

/* ---- rays ---- */
function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc; if (disc < 0) return -1;
  const s = Math.sqrt(disc), t = -b - s; return t >= 0 ? t : (-b + s >= 0 ? 0 : -1);
}
function rayCapsule(o, d, a, b, r) {
  // closest approach between the ray and the segment, then a sphere test there (good enough for hit volumes)
  const ba = V3.sub(b, a), oa = V3.sub(o, a), baba = V3.dot(ba, ba), bard = V3.dot(ba, d), baoa = V3.dot(ba, oa), rdoa = V3.dot(d, oa), oaoa = V3.dot(oa, oa);
  const A = baba - bard * bard; let B = baba * rdoa - baoa * bard, C = baba * oaoa - baoa * baoa - r * r * baba;
  let h = B * B - A * C;
  if (h >= 0 && A > 1e-9) {
    const t = (-B - Math.sqrt(h)) / A, y = baoa + t * bard;
    if (y > 0 && y < baba && t >= 0) return t;
    const cap = y <= 0 ? a : b, ts = raySphere(o, d, cap, r); return ts;
  }
  const t1 = raySphere(o, d, a, r), t2 = raySphere(o, d, b, r);
  return t1 < 0 ? t2 : t2 < 0 ? t1 : Math.min(t1, t2);
}
/** ray vs axis-aligned box [x0, y0, z0, x1, y1, z1] -> t or -1 */
function rayBox(o, d, bx) {
  let t0 = -1e9, t1 = 1e9;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / (d[i] || 1e-12), ta = (bx[i] - o[i]) * inv, tb = (bx[i + 3] - o[i]) * inv;
    t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
  }
  return t1 >= Math.max(t0, 0) ? Math.max(t0, 0) : -1;
}
/** ray vs a collider { box: [x0..z1] (local, about its centre cx, cy), yaw } */
function rayCollider(o, d, c) {
  if (!c.yaw) return rayBox(o, d, c.box);
  const cs = Math.cos(-c.yaw), sn = Math.sin(-c.yaw), lx = o[0] - c.cx, ly = o[1] - c.cy;
  const lo = [lx * cs - ly * sn + c.cx, lx * sn + ly * cs + c.cy, o[2]], ld = [d[0] * cs - d[1] * sn, d[0] * sn + d[1] * cs, d[2]];
  return rayBox(lo, ld, c.box);
}
TC.raySphere = raySphere; TC.rayCapsule = rayCapsule; TC.rayBox = rayBox; TC.rayCollider = rayCollider;
function pointInCollider(p, c, pad = 0) {
  let x = p[0], y = p[1];
  if (c.yaw) { const cs = Math.cos(-c.yaw), sn = Math.sin(-c.yaw), lx = x - c.cx, ly = y - c.cy; x = lx * cs - ly * sn + c.cx; y = lx * sn + ly * cs + c.cy; }
  const b = c.box; return x > b[0] - pad && x < b[3] + pad && y > b[1] - pad && y < b[4] + pad && p[2] > b[2] - pad && p[2] < b[5] + pad;
}
TC.pointInCollider = pointInCollider;

/* ---- springs and noise for the camera ---- */
function spring(s, target, k, damp, dt) { const a = (target - s.x) * k - s.v * damp; s.v += a * dt; s.x += s.v * dt; return s.x; }
const vnoise = t => { const i = Math.floor(t), f = t - i, h = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; const u = f * f * (3 - 2 * f); return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1; };
TC.spring = spring; TC.vnoise = vnoise;

// ---- 02-materials.js ----
/* 02-materials: the game's materials (def('material', id, spec)) and the texture bank Rail3D samples: five light bands
 * per material (E.materialTile for engine materials; our own pattern functions for the rest), lid variants, flags
 * (glow, water, alpha, double, scroll). Canvas textures (signs, live screens) are made lazily in the browser.
 * A spec: { m: engine material id or { color, pattern, ... } } or { colors: [hex...], pat(u, v) -> [colorIndex, step]
 * | null (transparent) }, plus flags. u, v are world units across the surface (2 texels a unit, a tile repeats every
 * 32 units), or 0..1 across a face for face patterns. */
const TEX_N = 64, TEX_PX = 2, TEX_MASK = TEX_N - 1;
const TONES = ['deep', 'sh', 'base', 'lt', 'hi'];
function hexRGB(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const pack = (r, g, b) => (255 << 24 | (b & 255) << 16 | (g & 255) << 8 | (r & 255)) >>> 0;
TC.hexRGB = hexRGB; TC.pack = pack;
function rampOf(hex) { const t = E.tones(hex); return TONES.map(k => hexRGB(t[k])); }

/* ---- engine-pattern materials we add (E.MATERIALS) ---- */
Object.assign(E.MATERIALS, {
  'tc-concrete': { color: '#8a8a88', pattern: 'speck', amount: .12 },
  'tc-concrete-dk': { color: '#5e6066', pattern: 'speck', amount: .1 },
  'tc-asphalt': { color: '#3e4048', pattern: 'speck', amount: .2 },
  'tc-pier': { color: '#7a5434', pattern: 'planks', bw: 5 },
  'tc-pier-dk': { color: '#4e3826', pattern: 'planks', bw: 5 },
  'tc-plywood': { color: '#c8a46a', pattern: 'planks', bw: 8 },
  'tc-brick': { color: '#7a4a3e', pattern: 'bricks' },
  'tc-brick-dk': { color: '#563a36', pattern: 'bricks' },
  'tc-cobble': { color: '#5e5a66', pattern: 'stones', size: 4 },
  'tc-cobble-wet': { color: '#4a5258', pattern: 'stones', size: 4 },
  'tc-stone': { color: '#7a7680', pattern: 'stones', size: 6 },
  'tc-rock': { color: '#5a5660', pattern: 'stones', size: 9 },
  'tc-rock-wet': { color: '#3e4448', pattern: 'stones', size: 9 },
  'tc-slate': { color: '#3e424e', pattern: 'shingles' },
  'tc-rooftile': { color: '#8a4a3a', pattern: 'shingles' },
  'tc-plaster': { color: '#d0c4a8', pattern: 'noise' },
  'tc-plaster-blue': { color: '#8ea4b8', pattern: 'noise' },
  'tc-plaster-ochre': { color: '#c89a5a', pattern: 'noise' },
  'timber': { color: '#5a3a24', pattern: 'planks', bw: 4, dir: 'v' },
  'tc-floortile': { color: '#6a7478', pattern: 'tiles', size: 6 },
  'tc-ice': { color: '#b8e0f0', pattern: 'glaze' },
  'tc-iron': { color: '#4e5262', pattern: 'metal' },
  'tc-steel': { color: '#7e8694', pattern: 'metal' },
  'tc-steel-dk': { color: '#3e434e', pattern: 'metal' },
  'tc-rust': { color: '#6a5a52', pattern: 'metal', over: [['rust']] },
  'tc-tarp': { color: '#3e6a5a', pattern: 'cloth', fold: 1.2 },
  'tc-canvas': { color: '#c8b890', pattern: 'cloth', fold: 1 },
  'tc-rope': { color: '#b89a6a', pattern: 'cloth', fold: 1.6 },
  'tc-rubber': { color: '#2a2a30', pattern: 'noise' },
  'tc-hull-white': { color: '#d8dce4', pattern: 'metal' },
  'tc-hull-dark': { color: '#2e3442', pattern: 'metal' },
  'tc-hull-red': { color: '#a8343a', pattern: 'metal' },
  'tc-hull-gun': { color: '#4a5260', pattern: 'metal' },
  'tc-paint-green': { color: '#3a6a4a', pattern: 'metal' },
  'tc-paint-yellow': { color: '#d8a83a', pattern: 'metal' },
  'tc-paint-orange': { color: '#e07a2a', pattern: 'metal' },
  'brass': { color: '#b8923a', pattern: 'metal' },
  'tc-leaves': { color: '#3a5a3a', pattern: 'foliage' },
  'tc-sand': { color: '#9a8a6a', pattern: 'speck' },
  'tc-cloth-red': { color: '#a83434', pattern: 'cloth' },
  'tc-cloth-navy': { color: '#2a3454', pattern: 'cloth' },
  'tc-fish': { color: '#a8b4c0', pattern: 'glaze' },
  'tc-barrel': { color: '#6a4a2a', pattern: 'planks', bw: 3, dir: 'v' }
});

/* ---- our own patterns ---- */
const P = {
  corrugated: (u, v) => [0, Math.sin(u * Math.PI / 1.5) > .35 ? 1 : Math.sin(u * Math.PI / 1.5) < -.6 ? -1 : 0],
  hazard: (u, v) => [((Math.floor((u + v) / 4) % 2) + 2) % 2, 0],
  stripesV: w => (u, v) => [((Math.floor(u / w) % 2) + 2) % 2, 0],
  stripesH: w => (u, v) => [((Math.floor(v / w) % 2) + 2) % 2, 0],
  grate: (u, v) => { const a = ((u % 2) + 2) % 2, b = ((v % 2) + 2) % 2; return a < .5 || b < .5 ? [0, (a < .5 && b < .5) ? 1 : 0] : null; },
  net: (u, v) => { const a = ((u + v) % 3 + 3) % 3, b = ((u - v) % 3 + 3) % 3; return a < .5 || b < .5 ? [0, 0] : null; },
  windows: (u, v) => { const a = ((u % 12) + 12) % 12, b = ((v % 14) + 14) % 14; return a > 2 && a < 10 && b > 3 && b < 12 ? [1, (Math.floor(u / 12) * 7 + Math.floor(v / 14) * 3) % 5 === 0 ? -3 : 0] : [0, 0]; },
  panel: (u, v) => { const a = ((u % 16) + 16) % 16, b = ((v % 16) + 16) % 16; return [0, a < .5 || b < .5 ? -1 : (a < 1 || b < 1) ? 1 : 0]; },
  lantern: (u, v) => { const b = ((v % 4) + 4) % 4; return [0, b < .6 ? -1 : 0]; },
  plain: () => [0, 0],
  speckle: (u, v) => [0, ((Math.sin(u * 12.9898 + v * 78.233) * 43758.5453) % 1 + 1) % 1 > .92 ? 1 : 0],
  target: (u, v) => { const d = Math.hypot(u - .5, v - .55); return [d < .08 ? 1 : d < .16 ? 0 : d < .24 ? 1 : 0, 0]; },
  foam: (u, v) => [0, Math.sin(u * 1.3 + Math.sin(v * .7) * 2) > .6 ? 1 : 0]
};
TC.PAT = P;

/* ---- the game's materials ---- */
function M(id, spec) { return def('material', id, spec); }
// engine materials straight through
for (const id of ['planks', 'crate', 'brick', 'cobble', 'stone', 'iron', 'steel', 'rusted', 'plaster', 'timber', 'slate', 'sand', 'rock', 'tiles', 'metal', 'oak', 'walnut', 'gold', 'copper', 'leather', 'burlap', 'linen', 'bark', 'needles', 'leaves', 'moss', 'straw', 'glazed', 'porcelain', 'marble', 'granite', 'flagstone', 'shingle', 'wood', 'plank', 'bronze', 'linen', 'wool', 'velvet', 'shrub', 'hedge', 'grass', 'dirt', 'snow', 'mud', 'ice', 'crystal', 'bone', 'clay', 'sandstone', 'birch', 'ruin', 'block', 'bonus', 'ground', 'pipe', 'checker', 'speckle', 'plain', 'slab'])
  if (E.MATERIALS[id]) M(id, { m: id });
for (const id of Object.keys(E.MATERIALS)) if (id.startsWith('tc-')) M(id.slice(3), { m: id });
M('flame', { m: 'flame', glow: 1 });
M('water', { m: 'water', water: true });
// our own
M('corr-red', { colors: ['#9a3a32'], pat: P.corrugated });
M('corr-blue', { colors: ['#2e5a8a'], pat: P.corrugated });
M('corr-ochre', { colors: ['#b8862e'], pat: P.corrugated });
M('corr-green', { colors: ['#3a6a4a'], pat: P.corrugated });
M('corr-grey', { colors: ['#6a707a'], pat: P.corrugated });
M('corr-white', { colors: ['#b8bcc4'], pat: P.corrugated });
M('hazard', { colors: ['#f2c12e', '#1b1b1b'], pat: P.hazard });
M('awning-red', { colors: ['#c83a3a', '#e8e0d0'], pat: P.stripesV(3), double: true });
M('awning-blue', { colors: ['#2e64b0', '#e8e0d0'], pat: P.stripesV(3), double: true });
M('awning-green', { colors: ['#2e8a5a', '#e8e0d0'], pat: P.stripesV(3), double: true });
M('lighthouse', { colors: ['#e8e4dc', '#b02a2a'], pat: P.stripesH(24) });
M('grate', { colors: ['#5a606a'], pat: P.grate, alpha: true, double: true });
M('net', { colors: ['#8a7a5a'], pat: P.net, alpha: true, double: true });
M('city-windows', { colors: ['#20283a', '#ffd88a'], pat: P.windows, glowIdx: 1 });
M('tower-windows', { colors: ['#2a2e3e', '#a8f0ff'], pat: P.windows, glowIdx: 1 });
M('panel-steel', { colors: ['#6e7684'], pat: P.panel });
M('panel-dark', { colors: ['#3a404c'], pat: P.panel });
M('paper-lantern', { colors: ['#ffb347'], pat: P.lantern, glow: 1, double: true });
M('lantern-red', { colors: ['#ff5a4a'], pat: P.lantern, glow: 1, double: true });
M('glow-red', { colors: ['#ff5a5a'], pat: P.plain, glow: 1 });
M('glow-yellow', { colors: ['#ffd34a'], pat: P.plain, glow: 1 });
M('glow-cyan', { colors: ['#5ad1ff'], pat: P.plain, glow: 1 });
M('glow-green', { colors: ['#8aff8a'], pat: P.plain, glow: 1 });
M('glow-white', { colors: ['#fff6e0'], pat: P.plain, glow: 1 });
M('glow-teal', { colors: ['#43f0c8'], pat: P.panel, glow: 1 });
M('glow-amber', { colors: ['#ffb04a'], pat: P.plain, glow: 1 });
M('glow-magenta', { colors: ['#ff4ad1'], pat: P.plain, glow: 1 });
M('glass-lit', { colors: ['#ffd88a'], pat: P.panel, glow: 1 });
M('glass', { colors: ['#9ad0e8'], pat: (u, v) => { const d = ((u * .7 + v) % 9 + 9) % 9; return d < .9 ? [0, 1] : d < 1.4 ? [0, 0] : null; }, alpha: true, double: true });
M('lens', { colors: ['#fff4c0'], pat: P.panel, glow: 1, double: true });
M('screen', { colors: ['#1a2a4a'], pat: P.plain, glow: 1, canvas: true });
M('sign', { colors: ['#e8dcc0'], pat: P.plain, canvas: true });
M('foam', { colors: ['#e8f4f8'], pat: P.foam, glow: .6 });
M('target', { colors: ['#e8dcc0', '#c83a3a'], pat: P.target, face: true });
M('sea-night', { colors: ['#14304a'], pat: P.plain, water: true, sparkle: '#ffd890' });
M('sea-storm', { colors: ['#2a4448'], pat: P.plain, water: true, sparkle: '#c8e0e0' });
M('sea-dawn', { colors: ['#2a6a7a'], pat: P.plain, water: true, sparkle: '#ffe0b0' });
M('canal', { colors: ['#1e3a4a'], pat: P.plain, water: true, sparkle: '#ffc070' });
M('sluice', { colors: ['#3a7a8a'], pat: P.foam, water: true, sparkle: '#ffffff', flow: 60 });

/* ---- the texture bank (built once, lazily, per material: 5 bands, lid variants) ---- */
const BANK = new Map();
function buildTile(spec, band, lid) {
  const n = TEX_N, out = new Uint32Array(n * n);
  if (spec.m) {
    const t = E.materialTile(spec.m, { size: n / TEX_PX, px: TEX_PX, band, lid: !!lid });
    if (!t) return out.fill(pack(255, 0, 255));
    for (let i = 0; i < n * n; i++) out[i] = pack(t.rgba[i * 4], t.rgba[i * 4 + 1], t.rgba[i * 4 + 2]);
    return out;
  }
  const ramps = spec._ramps || (spec._ramps = spec.colors.map(rampOf));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = spec.face ? (x + .5) / n : (x + .5) / TEX_PX, v = spec.face ? (n - 1 - y + .5) / n : (n - 1 - y + .5) / TEX_PX, r = spec.pat(u, v);
    if (!r) { out[y * n + x] = 0; continue; }
    const ramp = ramps[r[0]] || ramps[0], glowI = spec.glowIdx === r[0];
    const k = clamp((glowI ? 4 : band) + r[1], 0, 4), c = ramp[k];
    out[y * n + x] = pack(c[0], c[1], c[2]);
  }
  return out;
}
function texOf(id) {
  let T = BANK.get(id); if (T) return T;
  const spec = reg('material', id) || reg('material', 'plaster');
  T = { id, spec, n: TEX_N, mask: TEX_MASK, bands: [], lid: [], glow: spec.glow || 0, water: !!spec.water, alpha: !!spec.alpha, double: !!spec.double, face: !!spec.face || id === 'crate', canvas: !!spec.canvas };
  for (let b = 0; b < 5; b++) { T.bands[b] = buildTile(spec, b, false); T.lid[b] = spec.m ? buildTile(spec, b, true) : T.bands[b]; }
  if (T.water) { T.ramp = rampOf(spec.colors ? spec.colors[0] : '#2f7fd0').map(c => pack(c[0], c[1], c[2])); T.sparkle = hexRGB(spec.sparkle || '#ffffff'); T.flow = spec.flow || 0; }
  BANK.set(id, T); return T;
}
TC.texOf = texOf; TC.BANK = BANK;
/** replace a canvas material's tile with pixels from a canvas (signs, live broadcast screens); browser only */
function texFromCanvas(id, cv) {
  const T = texOf(id), n = TEX_N, g = cv.getContext('2d', { willReadFrequently: true }), d = g.getImageData(0, 0, cv.width, cv.height).data;
  for (let b = 0; b < 5; b++) {
    const out = T.bands[b], k = T.glow ? 1 : .55 + b * .14;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const sx = Math.floor(x / n * cv.width), sy = Math.floor(y / n * cv.height), j = (sy * cv.width + sx) * 4;
      out[y * n + x] = pack(Math.min(255, d[j] * k), Math.min(255, d[j + 1] * k), Math.min(255, d[j + 2] * k));
    }
    T.lid[b] = out;
  }
}
TC.texFromCanvas = texFromCanvas;
/** a per-instance canvas texture: its own bank entry under a new id (sign texts, screens) */
let _canvasTexN = 0;
function canvasMaterial(base, draw, w = 64, h = 64) {
  const id = base + '#' + (++_canvasTexN), spec = reg('material', base);
  def('material', id, Object.assign({}, spec, { _draw: draw, _w: w, _h: h }));
  return id;
}
TC.canvasMaterial = canvasMaterial;
function refreshCanvasMaterials() {
  if (HEADLESS) return;
  for (const s of regAll('material')) if (s._draw && !s._done) {
    const cv = document.createElement('canvas'); cv.width = s._w; cv.height = s._h; const g = cv.getContext('2d', { willReadFrequently: true });
    E.px.reset && E.px.reset(g); s._draw(g, cv.width, cv.height); s._done = true; s._cv = cv; texFromCanvas(s.id, cv);
  }
}
TC.refreshCanvasMaterials = refreshCanvasMaterials;

// ---- 03-geometry.js ----
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

// ---- 04-rail3d.js ----
/* 04-rail3d: Rail3D, the perspective renderer. A z-buffered, perspective-correct, banded-light (the engine's five
 * bands, Bayer-dithered), fogged triangle rasterizer in JS into the game's own low-resolution buffer; the sky; engine
 * rigs (E.Humanoid) composited as depth-tested billboards drawn by the engine from the bearing they are seen at;
 * particles, glows, lines, decals and blob shadows. Reads the texture bank (02) and meshes (03). Canvas work happens
 * only in draw: headless, nothing here runs. */
const BAYER = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16));
TC.BAYER = BAYER;

class Rail3D {
  constructor() {
    this.W = 0; this.H = 0; this.col = null; this.dep = null; this.B = {}; this.dyn = []; this.env = null; this.t = 0;
    this.S = new Float64Array(8 * 7); this.C = new Float64Array(8 * 7); this.Q = new Float64Array(3 * 7);
    this.stats = { tris: 0, px: 0, actors: 0, shadows: 0, ms: {} }; this.wobble = false; this._views = new Map(); this._skyH = null;
    this.flash = 0; this.dim = 1;
  }
  size(w, h) {
    w = Math.max(8, Math.round(w)); h = Math.max(8, Math.round(h));
    if (w === this.W && h === this.H) return;
    this.W = w; this.H = h; this.col = new Uint32Array(w * h); this.dep = new Float32Array(w * h);
    if (!HEADLESS) { this.cv = document.createElement('canvas'); this.cv.width = w; this.cv.height = h; this.cg = this.cv.getContext('2d'); this.img = this.cg.createImageData(w, h); this.img32 = new Uint32Array(this.img.data.buffer); }
  }
  /** start a frame: camera pose, environment (fog, sky, light), the time */
  begin(cam, env, t) {
    const B = camBasis(cam, this.W, this.H, this.B); this.env = env; this.t = t; this.cam = cam;
    this.dep.fill(0); this.col.fill(0);
    const fog = env.fog || ['#000000', 1e5, 1e6]; this.fogC = hexRGB(fog[0]); this.fogN = fog[1]; this.fogF = fog[2]; this.fogInv = 1 / Math.max(1, fog[2] - fog[1]); this.far = fog[2] * 1.08;
    this.warm = hexRGB(env.warm || '#ffb347');
    const tw = B.tanH * this.W / this.H, th = B.tanH, lw = Math.hypot(1, tw), lh = Math.hypot(1, th);
    this.pl = [[1 / lw, 0, -tw / lw], [-1 / lw, 0, -tw / lw], [0, 1 / lh, -th / lh], [0, -1 / lh, -th / lh]];
    this.stats.tris = 0; this.stats.px = 0; this.stats.actors = 0; this.stats.shadows = 0; this.dyn.length = 0; this._decalN = 0;
    return this;
  }
  /** a dynamic light this frame (muzzle flash, explosion, flare, the lighthouse beam) */
  addLight(x, y, z, r, k = .8) { if (this.dyn.length < 12) this.dyn.push({ x, y, z, r, k }); }
  /** is a sphere (world) inside the view? */
  sees(cx, cy, cz, r) {
    const v = toView(this.B, cx, cy, cz); if (v[2] + r < this.B.near || v[2] - r > this.far) return false;
    for (const p of this.pl) if (p[0] * v[0] + p[1] * v[1] + p[2] * v[2] > r) return false;
    return true;
  }
  project(x, y, z) { return project(this.B, x, y, z); }

  /* ---- meshes ---- */
  /** a baked world: its chunks culled by sphere */
  drawWorld(world, skip) {
    if (!world) return;
    for (const ch of world.chunks) { const s = ch.sphere; if (this.sees(s[0], s[1], s[2], s[3])) this.drawMesh(ch, null, skip); }
  }
  /** a mesh: M (3x4, null for a world-space baked mesh); o: { lit: true (compute light from env), flash (0..1 white),
   *  tint (packed color multiply), dim } */
  drawMesh(mesh, M, o) {
    const B = this.B, env = this.env, dynL = [];
    if (M) { const s = mesh.sphere, c = xform(M, s), k = Math.hypot(M[0], M[4], M[8]); if (!this.sees(c[0], c[1], c[2], s[3] * k)) return; for (const l of this.dyn) if (Math.hypot(l.x - c[0], l.y - c[1], l.z - c[2]) < l.r + s[3] * k) dynL.push(l); }
    else { const s = mesh.sphere; for (const l of this.dyn) if (Math.hypot(l.x - s[0], l.y - s[1], l.z - s[2]) < l.r + s[3]) dynL.push(l); }
    const Q = this.Q, sun = env.sun || { dir: [0, 0, 1], k: .4 }, sd = V3.norm(sun.dir), flash = o && o.flash || 0, lit = !!M;
    const skipTag = o && o.skipTag;
    for (const g of mesh.groups) {
      if (o && o.hide && o.hide.has(g.tex)) continue;
      const T = texOf(g.tex), P = g.pos, N = g.nrm, UV = g.uv, GL = g.L, GT = g.T, nt = N.length / 3;
      for (let t = 0; t < nt; t++) {
        if (skipTag && g.tag && skipTag.has(g.tag[t])) continue;
        const i = t * 9;
        let ax = P[i], ay = P[i + 1], az = P[i + 2], bx = P[i + 3], by = P[i + 4], bz = P[i + 5], cx = P[i + 6], cy = P[i + 7], cz = P[i + 8];
        let nx = N[t * 3], ny = N[t * 3 + 1], nz = N[t * 3 + 2];
        if (M) {
          let x = ax, y = ay, z = az; ax = M[0] * x + M[1] * y + M[2] * z + M[3]; ay = M[4] * x + M[5] * y + M[6] * z + M[7]; az = M[8] * x + M[9] * y + M[10] * z + M[11];
          x = bx; y = by; z = bz; bx = M[0] * x + M[1] * y + M[2] * z + M[3]; by = M[4] * x + M[5] * y + M[6] * z + M[7]; bz = M[8] * x + M[9] * y + M[10] * z + M[11];
          x = cx; y = cy; z = cz; cx = M[0] * x + M[1] * y + M[2] * z + M[3]; cy = M[4] * x + M[5] * y + M[6] * z + M[7]; cz = M[8] * x + M[9] * y + M[10] * z + M[11];
          x = nx; y = ny; z = nz; nx = M[0] * x + M[1] * y + M[2] * z; ny = M[4] * x + M[5] * y + M[6] * z; nz = M[8] * x + M[9] * y + M[10] * z; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        }
        if (!T.double && nx * (B.x - ax) + ny * (B.y - ay) + nz * (B.z - az) <= 0) continue;
        // view space
        const vax = (ax - B.x) * B.rx + (ay - B.y) * B.ry + (az - B.z) * B.rz, vay = (ax - B.x) * B.ux + (ay - B.y) * B.uy + (az - B.z) * B.uz, vaz = (ax - B.x) * B.fx + (ay - B.y) * B.fy + (az - B.z) * B.fz;
        const vbx = (bx - B.x) * B.rx + (by - B.y) * B.ry + (bz - B.z) * B.rz, vby = (bx - B.x) * B.ux + (by - B.y) * B.uy + (bz - B.z) * B.uz, vbz = (bx - B.x) * B.fx + (by - B.y) * B.fy + (bz - B.z) * B.fz;
        const vcx = (cx - B.x) * B.rx + (cy - B.y) * B.ry + (cz - B.z) * B.rz, vcy = (cx - B.x) * B.ux + (cy - B.y) * B.uy + (cz - B.z) * B.uz, vcz = (cx - B.x) * B.fx + (cy - B.y) * B.fy + (cz - B.z) * B.fz;
        if (vaz < B.near && vbz < B.near && vcz < B.near) continue;
        if (vaz > this.far && vbz > this.far && vcz > this.far) continue;
        // light per corner
        let La, Lb, Lc, Ta, Tb, Tc;
        if (lit) {
          let L = env.ambient + sun.k * Math.max(0, nx * sd[0] + ny * sd[1] + nz * sd[2]) + (nz > .7 ? env.skyK || .06 : 0);
          if (o && o.dim) L *= o.dim;
          La = Lb = Lc = L + (o && o.glow || 0); Ta = Tb = Tc = 0;
        } else { La = GL[t * 3]; Lb = GL[t * 3 + 1]; Lc = GL[t * 3 + 2]; Ta = GT[t * 3]; Tb = GT[t * 3 + 1]; Tc = GT[t * 3 + 2]; }
        for (const l of dynL) {
          let d = Math.hypot(l.x - ax, l.y - ay, l.z - az); if (d < l.r) { const f = 1 - d / l.r, k = l.k * f * f; La += k; Ta += k; }
          d = Math.hypot(l.x - bx, l.y - by, l.z - bz); if (d < l.r) { const f = 1 - d / l.r, k = l.k * f * f; Lb += k; Tb += k; }
          d = Math.hypot(l.x - cx, l.y - cy, l.z - cz); if (d < l.r) { const f = 1 - d / l.r, k = l.k * f * f; Lc += k; Tc += k; }
        }
        const j = t * 6;
        Q[0] = vax; Q[1] = vay; Q[2] = vaz; Q[3] = UV[j]; Q[4] = UV[j + 1]; Q[5] = La; Q[6] = Ta;
        Q[7] = vbx; Q[8] = vby; Q[9] = vbz; Q[10] = UV[j + 2]; Q[11] = UV[j + 3]; Q[12] = Lb; Q[13] = Tb;
        Q[14] = vcx; Q[15] = vcy; Q[16] = vcz; Q[17] = UV[j + 4]; Q[18] = UV[j + 5]; Q[19] = Lc; Q[20] = Tc;
        this._clipDraw(T, flash, o && o.tint);
      }
    }
  }
  /** near-clip the triangle in Q (view space + attributes), project, raster */
  _clipDraw(T, flash, tint) {
    const Q = this.Q, S = this.S, B = this.B, near = B.near; let n = 0;
    const inA = Q[2] >= near, inB = Q[9] >= near, inC = Q[16] >= near;
    if (inA && inB && inC) { S.set(Q.subarray(0, 21)); n = 3; }
    else {
      for (let k = 0; k < 3; k++) {
        const a = k * 7, b = ((k + 1) % 3) * 7, za = Q[a + 2], zb = Q[b + 2], ia = za >= near, ib = zb >= near;
        if (ia) { for (let m = 0; m < 7; m++) S[n * 7 + m] = Q[a + m]; n++; }
        if (ia !== ib) { const f = (near - za) / (zb - za); for (let m = 0; m < 7; m++) S[n * 7 + m] = Q[a + m] + (Q[b + m] - Q[a + m]) * f; n++; }
      }
      if (n < 3) return;
    }
    // project in place: [sx, sy, iz, u/z, v/z, L/z, T/z]
    const F = B.F, cx = B.cx, cy = B.cy, wob = this.wobble;
    for (let k = 0; k < n; k++) {
      const o = k * 7, iz = 1 / S[o + 2]; let sx = cx + S[o] * F * iz, sy = cy - S[o + 1] * F * iz;
      if (wob) { sx = Math.round(sx); sy = Math.round(sy); }
      S[o] = sx; S[o + 1] = sy; const u = S[o + 3], v = S[o + 4], L = S[o + 5], Tt = S[o + 6];
      S[o + 2] = iz; S[o + 3] = u * iz; S[o + 4] = v * iz; S[o + 5] = L * iz; S[o + 6] = Tt * iz;
    }
    for (let k = 1; k + 1 < n; k++) this._tri(0, k * 7, (k + 1) * 7, T, flash, tint);
  }
  _tri(a, b, c, T, flash, tint) {
    const S = this.S, W = this.W, H = this.H;
    const x0 = S[a], y0 = S[a + 1], x1 = S[b], y1 = S[b + 1], x2 = S[c], y2 = S[c + 1];
    const e1x = x1 - x0, e1y = y1 - y0, e2x = x2 - x0, e2y = y2 - y0, det = e1x * e2y - e2x * e1y;
    if (det > -1e-7 && det < 1e-7) return;
    const id = 1 / det;
    let d1 = S[b + 2] - S[a + 2], d2 = S[c + 2] - S[a + 2]; const gzx = (d1 * e2y - d2 * e1y) * id, gzy = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 3] - S[a + 3]; d2 = S[c + 3] - S[a + 3]; const gux = (d1 * e2y - d2 * e1y) * id, guy = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 4] - S[a + 4]; d2 = S[c + 4] - S[a + 4]; const gvx = (d1 * e2y - d2 * e1y) * id, gvy = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 5] - S[a + 5]; d2 = S[c + 5] - S[a + 5]; const glx = (d1 * e2y - d2 * e1y) * id, gly = (d2 * e1x - d1 * e2x) * id;
    d1 = S[b + 6] - S[a + 6]; d2 = S[c + 6] - S[a + 6]; const gtx = (d1 * e2y - d2 * e1y) * id, gty = (d2 * e1x - d1 * e2x) * id;
    const ymin = Math.max(0, Math.ceil(Math.min(y0, y1, y2) - .5)), ymax = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2) - .5) - 1);
    if (ymin > ymax) return;
    this.stats.tris++;
    const col = this.col, dep = this.dep, n = T.n, mask = T.mask, bands = T.bands, face = T.face, alpha = T.alpha, glow = T.glow, water = T.water;
    const fogN = this.fogN, fogInv = this.fogInv, fr = this.fogC[0], fgc = this.fogC[1], fb = this.fogC[2], wr = this.warm[0], wg = this.warm[1], wb = this.warm[2];
    const tt = this.t, glowBand = glow >= 1 ? 4 : 3, dim = this.dim;
    const tr = tint ? (tint & 255) / 255 : 1, tg = tint ? ((tint >> 8) & 255) / 255 : 1, tb = tint ? ((tint >> 16) & 255) / 255 : 1;
    const uk = face ? n : TEX_PX, vflow = water && T.flow ? tt * T.flow : 0;
    let px = 0;
    for (let y = ymin; y <= ymax; y++) {
      const yc = y + .5; let xl = 1e9, xr = -1e9;
      if ((yc >= y0) !== (yc >= y1)) { const x = x0 + (yc - y0) * (x1 - x0) / (y1 - y0); if (x < xl) xl = x; if (x > xr) xr = x; }
      if ((yc >= y1) !== (yc >= y2)) { const x = x1 + (yc - y1) * (x2 - x1) / (y2 - y1); if (x < xl) xl = x; if (x > xr) xr = x; }
      if ((yc >= y2) !== (yc >= y0)) { const x = x2 + (yc - y2) * (x0 - x2) / (y0 - y2); if (x < xl) xl = x; if (x > xr) xr = x; }
      const xs = Math.max(0, Math.ceil(xl - .5)), xe = Math.min(W - 1, Math.ceil(xr - .5) - 1);
      if (xs > xe) continue;
      const dx = xs + .5 - x0, dy = yc - y0;
      let iz = S[a + 2] + gzx * dx + gzy * dy, uz = S[a + 3] + gux * dx + guy * dy, vz = S[a + 4] + gvx * dx + gvy * dy, lz = S[a + 5] + glx * dx + gly * dy, tz = S[a + 6] + gtx * dx + gty * dy;
      const row = y * W, by = (y & 3) << 2;
      for (let x = xs; x <= xe; x++, iz += gzx, uz += gux, vz += gvx, lz += glx, tz += gtx) {
        const idx = row + x; if (iz <= dep[idx]) continue;
        const z = 1 / iz, bay = BAYER[by | (x & 3)];
        let c;
        if (water) {
          const u = uz * z, v = vz * z + vflow, L = lz * z;
          const wv = Math.sin(u * .11 + tt * 1.3) * Math.sin(v * .07 - tt) * .6 + Math.sin(u * .31 - v * .23 + tt * 2.1) * .3;
          let bnd = (L * 4 + wv + bay) | 0; bnd = bnd < 0 ? 0 : bnd > 4 ? 4 : bnd;
          c = T.ramp[bnd];
          const sp = Math.sin(u * 1.7 + tt * 3.1) * Math.sin(v * 2.3 - tt * 2.3) * Math.sin(u * .53 + v * .71 + tt);
          if (sp > .8 - L * .12 && bay > .55) { const sr = T.sparkle; c = pack(sr[0], sr[1], sr[2]); }
        } else {
          let tu, tv;
          if (face) { tu = (uz * z * n) | 0; tv = (vz * z * n) | 0; tu = tu < 0 ? 0 : tu > mask ? mask : tu; tv = tv < 0 ? 0 : tv > mask ? mask : tv; }
          else { tu = ((uz * z * uk + 65536) | 0) & mask; tv = ((vz * z * uk + 65536) | 0) & mask; }
          let bnd;
          if (glow) bnd = glowBand;
          else { bnd = (lz * z * 4 * dim + bay) | 0; bnd = bnd < 0 ? 0 : bnd > 4 ? 4 : bnd; }
          c = bands[bnd][(mask - tv) * n + tu];
          if (alpha && c === 0) continue;
        }
        let f = (z - fogN) * fogInv; const tw = glow ? 0 : tz * z;
        if (f > 0 || tw > .04 || flash || tint) {
          let r = c & 255, g = (c >> 8) & 255, b2 = (c >> 16) & 255;
          if (tint) { r *= tr; g *= tg; b2 *= tb; }
          if (tw > .04) { const k = tw > 1 ? .55 : tw * .55; r += wr * k; g += wg * k; b2 += wb * k; }
          if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b2 += (255 - b2) * flash; }
          if (f > 0) { if (f > 1) f = 1; f = f * Math.sqrt(f) * (glow ? .5 : 1); const fq = ((f * 8 + bay) | 0) * .125; if (fq > 0) { r += (fr - r) * fq; g += (fgc - g) * fq; b2 += (fb - b2) * fq; } }
          c = (255 << 24 | (b2 > 255 ? 255 : b2) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0;
        }
        col[idx] = c; dep[idx] = iz; px++;
      }
    }
    this.stats.px += px;
  }

  /* ---- the sky, into every pixel nothing has covered ---- */
  sky() {
    const B = this.B, W = this.W, H = this.H, col = this.col, dep = this.dep, env = this.env, sk = env.sky || {}, t = this.t;
    const stops = (sk.colors || ['#0b1026', '#1b2a52', '#3a3060']).map(hexRGB), below = hexRGB(sk.below || (env.fog ? env.fog[0] : '#101820')), glowC = sk.glow ? hexRGB(sk.glow) : null;
    const moon = sk.moon, md = moon ? V3.norm(moon.dir) : null, mc = moon ? hexRGB(moon.color || '#fff6d8') : null, mr = moon ? Math.cos((moon.r || 2.2) * DEG) : 0, mh = moon ? Math.cos((moon.r || 2.2) * 4 * DEG) : 0;
    const layers = this._skyLayers(sk), flash = this.flash, iF = 1 / B.F, cloud = sk.clouds ? hexRGB(sk.clouds) : null, ck = sk.cloudK || .5;
    const stars = sk.stars;
    for (let y = 0; y < H; y++) {
      const Yc = -(y + .5 - B.cy) * iF, row = y * W, by = (y & 3) << 2;
      for (let x = 0; x < W; x++) {
        const idx = row + x; if (dep[idx] > 0) continue;
        const Xc = (x + .5 - B.cx) * iF;
        let dx = B.rx * Xc + B.ux * Yc + B.fx, dy = B.ry * Xc + B.uy * Yc + B.fy, dz = B.rz * Xc + B.uz * Yc + B.fz;
        const l = 1 / Math.hypot(dx, dy, dz); dx *= l; dy *= l; dz *= l;
        const e = dz, bay = BAYER[by | (x & 3)];
        let r, g, b;
        if (e < 0) { const k = Math.min(1, -e * 6); r = stops[2][0] + (below[0] - stops[2][0]) * k; g = stops[2][1] + (below[1] - stops[2][1]) * k; b = stops[2][2] + (below[2] - stops[2][2]) * k; }
        else if (e < .28) { const k = smooth(e / .28 + (bay - .5) * .08); r = stops[2][0] + (stops[1][0] - stops[2][0]) * k; g = stops[2][1] + (stops[1][1] - stops[2][1]) * k; b = stops[2][2] + (stops[1][2] - stops[2][2]) * k; }
        else { const k = smooth((e - .28) / .55 + (bay - .5) * .08); r = stops[1][0] + (stops[0][0] - stops[1][0]) * k; g = stops[1][1] + (stops[0][1] - stops[1][1]) * k; b = stops[1][2] + (stops[0][2] - stops[1][2]) * k; }
        if (glowC && e > -.05 && e < .12) { const k = (1 - Math.abs(e - .02) / .1) * .45; if (k > 0) { r += (glowC[0] - r) * k; g += (glowC[1] - g) * k; b += (glowC[2] - b) * k; } }
        const az = Math.atan2(dy, dx);
        if (stars && e > .06) { const qa = Math.floor(az * 260), qe = Math.floor(e * 260), h = Math.sin(qa * 12.9898 + qe * 78.233) * 43758.5453, f = h - Math.floor(h); if (f > .994) { const tw = .6 + .4 * Math.sin(t * 3 + f * 900); r += 180 * tw; g += 180 * tw; b += 170 * tw; } }
        if (cloud && e > .01 && e < .6) { const n = E.noise2(az * 3 + t * .004, e * 9) * .6 + E.noise2(az * 7 - t * .007, e * 21) * .4, k = (n - .52) * 3 * (1 - e * 1.4); if (k > bay * .9) { const m = Math.min(1, k) * ck; r += (cloud[0] - r) * m; g += (cloud[1] - g) * m; b += (cloud[2] - b) * m; } }
        if (md) { const c = dx * md[0] + dy * md[1] + dz * md[2]; if (c > mr) { r = mc[0]; g = mc[1]; b = mc[2]; if (moon.phase && dx * md[1] - dy * md[0] > (c - mr) * 40 - .002) { r *= .7; g *= .7; b *= .75; } } else if (c > mh) { const k = (c - mh) / (mr - mh) * .35; r += (mc[0] - r) * k; g += (mc[1] - g) * k; b += (mc[2] - b) * k; } }
        if (layers) for (const L of layers) {
          const ai = ((az / TAU + 1) % 1) * L.n | 0, hgt = L.h[ai];
          if (e < hgt && e > L.base) { if (L.lit && L.win[ai] && ((y * 7 + x * 3) % 11 === 0) && e < hgt - .01) { r = L.lit[0]; g = L.lit[1]; b = L.lit[2]; } else { r = L.c[0]; g = L.c[1]; b = L.c[2]; } }
        }
        if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b += (255 - b) * flash; }
        col[idx] = (255 << 24 | (b > 255 ? 255 : b < 0 ? 0 : b) << 16 | (g > 255 ? 255 : g < 0 ? 0 : g) << 8 | (r > 255 ? 255 : r < 0 ? 0 : r)) >>> 0;
      }
    }
  }
  _skyLayers(sk) {
    if (!sk.layers) return null;
    if (sk._built) return sk._built;
    sk._built = sk.layers.map((L, li) => {
      const n = 1024, h = new Float32Array(n), win = new Uint8Array(n), R = E.rng(L.seed || (li * 31 + 7));
      let cur = L.height || .05, block = 0;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        if (L.kind === 'city') { if (block-- <= 0) { block = 4 + (R() * 14 | 0); cur = (L.height || .06) * (.4 + R() * 1.1); } h[i] = cur; win[i] = 1; }
        else if (L.kind === 'hills') h[i] = (L.height || .05) * (.55 + .45 * E.noise2(a * 2.2 + li * 3, 0.5) + .2 * Math.sin(a * 5 + li));
        else if (L.kind === 'wall') h[i] = Math.abs(Math.cos(a - (L.at || 0))) > (L.arc || .8) ? (L.height || .03) : -1;
        else h[i] = L.height || .03;
        if (L.from !== undefined) { const d = angWrap(a - L.from); if (d < 0 || d > (L.span || Math.PI)) h[i] = -1; }
      }
      return { n, h, win, c: hexRGB(L.color || '#101828'), lit: L.lit ? hexRGB(L.lit) : null, base: L.base === undefined ? -1 : L.base };
    });
    return sk._built;
  }

  /* ---- billboards: engine rigs and sprites ---- */
  _view(yawDeg, pitchDeg, k) {
    const yq = Math.round(yawDeg / 2) * 2, pq = Math.round(pitchDeg / 2) * 2, kq = Math.max(1 / 16, Math.round(k * 16) / 16), key = yq + ':' + pq + ':' + kq;
    let v = this._views.get(key); if (!v) { if (this._views.size > 600) this._views.clear(); v = new E.View('r3', 'Rail3D', yq, pq, kq, 1); this._views.set(key, v); }
    return v;
  }
  _scratch(w, h) {
    if (!this._sc || this._sc.width < w || this._sc.height < h) { this._sc = document.createElement('canvas'); this._sc.width = Math.max(w, this._sc ? this._sc.width : 0); this._sc.height = Math.max(h, this._sc ? this._sc.height : 0); this._sg = this._sc.getContext('2d', { willReadFrequently: true }); this._sg.imageSmoothingEnabled = false; }
    return this._sg;
  }
  /** an engine rig standing at (x, y, z): drawn by the engine from the bearing it is seen at, at the size its distance
   *  gives, composited with depth. o: { light (0.45..1.25 by default from the scene), flash (0..1), alpha (dither 0..1),
   *  height (its world height for culling, 30), tint } -> its screen box or null */
  drawRig(rig, x, y, z, o = {}) {
    const B = this.B, ht = (o.height || 28) * (rig.o ? rig.o.size : 1);
    const vf = toView(B, x, y, z), vc = toView(B, x, y, z + ht * .55);
    if (vc[2] < 6 || vc[2] > this.far) return null;
    const k = B.F / vc[2]; if (k * ht < 3) return null;
    const sx = B.cx + vf[0] * B.F / Math.max(1, vf[2]), sy = B.cy - vf[1] * B.F / Math.max(1, vf[2]);
    if (sx < -k * 40 || sx > this.W + k * 40 || sy < -k * 10 || sy > this.H + k * ht * 1.5) return null;
    const bear = Math.atan2(y - B.y, x - B.x), hd = Math.hypot(x - B.x, y - B.y), el = Math.atan2(B.z - (z + ht * .5), Math.max(1, hd)) / DEG;
    const view = this._view(-bear / DEG - 90, clamp(el, 3, 60), k);
    const w = Math.ceil(k * ht * 2.6 + 16), h = Math.ceil(k * ht * 1.8 + 16), ox = w >> 1, oy = Math.ceil(k * ht * 1.45) + 6;
    const g = this._scratch(w, h); g.clearRect(0, 0, w, h);
    if (E.px.reset) E.px.reset(g);
    try { rig.draw(g, ox, oy, view); } catch (e) { return null; }
    const d = g.getImageData(0, 0, w, h).data;
    const iz = 1 / Math.max(2, vc[2] - (o.depthBias || 4)), light = o.light === undefined ? this.actorLight(x, y, z + ht * .6) : o.light;
    return this._composite(d, w, h, Math.round(sx - ox), Math.round(sy - oy), iz, light, o.flash || 0, o.alpha === undefined ? 1 : o.alpha, o.tint, vc[2]);
  }
  /** pixels (RGBA, w x h) at screen (x0, y0) with depth iz: light multiplies, flash mixes to white, alpha dithers */
  _composite(d, w, h, x0, y0, iz, light, flash, alpha, tint, zv) {
    const W = this.W, H = this.H, col = this.col, dep = this.dep, fogN = this.fogN, fogInv = this.fogInv, fc = this.fogC;
    let f = (zv - fogN) * fogInv; f = f <= 0 ? 0 : f >= 1 ? .85 : f * Math.sqrt(f) * .85;
    const wm = this.warm, wk = Math.max(0, light - 1) * .5, tr = tint ? tint[0] / 255 : 1, tg = tint ? tint[1] / 255 : 1, tb = tint ? tint[2] / 255 : 1;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, n = 0;
    for (let yy = 0; yy < h; yy++) {
      const Y = y0 + yy; if (Y < 0 || Y >= H) continue;
      for (let xx = 0; xx < w; xx++) {
        const j = (yy * w + xx) * 4; if (d[j + 3] < 128) continue;
        const X = x0 + xx; if (X < 0 || X >= W) continue;
        const idx = Y * W + X; if (iz <= dep[idx]) continue;
        if (alpha < 1 && BAYER[((Y & 3) << 2) | (X & 3)] > alpha) continue;
        let r = d[j] * light * tr, g = d[j + 1] * light * tg, b = d[j + 2] * light * tb;
        if (wk > 0) { r += wm[0] * wk * .3; g += wm[1] * wk * .3; b += wm[2] * wk * .3; }
        if (flash) { r += (255 - r) * flash; g += (255 - g) * flash; b += (255 - b) * flash; }
        if (f) { r += (fc[0] - r) * f; g += (fc[1] - g) * f; b += (fc[2] - b) * f; }
        col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0; dep[idx] = iz; n++;
        if (X < bx0) bx0 = X; if (X > bx1) bx1 = X; if (Y < by0) by0 = Y; if (Y > by1) by1 = Y;
      }
    }
    this.stats.actors++;
    return n ? [bx0, by0, bx1, by1] : null;
  }
  /** the light on an actor at a point: ambient + sun + the static and dynamic lights there, kept readable */
  actorLight(x, y, z) {
    const env = this.env; let L = env.ambient + (env.sun ? env.sun.k * .6 : .2);
    const ls = env._lights || []; for (const l of ls) { const d = Math.hypot(l.x - x, l.y - y, l.z - z); if (d < l.r) { const f = 1 - d / l.r; L += l.k * f * f * .8; } }
    for (const l of this.dyn) { const d = Math.hypot(l.x - x, l.y - y, l.z - z); if (d < l.r) { const f = 1 - d / l.r; L += l.k * f * f; } }
    return clamp(L * (env.actorK || 1.15), .5, 1.3);
  }
  /** an E.sprite (or any canvas) as a billboard of world height hw, its foot at (x, y, z) */
  drawSprite(spr, x, y, z, hw, o = {}) {
    const p = this.project(x, y, z); if (!p || p[2] > this.far) return null;
    const cv = spr.cv || spr, k = this.B.F / p[2], hpx = hw * k; if (hpx < 1) return null;
    const s = hpx / cv.height, w = Math.max(1, Math.round(cv.width * s)), h = Math.max(1, Math.round(cv.height * s));
    const g = this._scratch(w, h); g.clearRect(0, 0, w, h); g.drawImage(cv, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    return this._composite(d, w, h, Math.round(p[0] - w / 2), Math.round(p[1] - h), 1 / Math.max(2, p[2] - (o.depthBias || 1)), o.light === undefined ? 1 : o.light, o.flash || 0, 1, null, p[2]);
  }

  /* ---- particles, glows, lines, decals, shadows ---- */
  /** a square splat of world size s at a point: mode 0 opaque, 1 additive, 2 half (dithered) */
  splat(x, y, z, s, c, mode = 0, alpha = 1) {
    const B = this.B, dx = x - B.x, dy = y - B.y, dz = z - B.z, Z = dx * B.fx + dy * B.fy + dz * B.fz;
    if (Z < B.near || Z > this.far) return;
    const X = dx * B.rx + dy * B.ry + dz * B.rz, Y = dx * B.ux + dy * B.uy + dz * B.uz, k = B.F / Z, sx = B.cx + X * k, sy = B.cy - Y * k, r = Math.max(.5, s * k * .5);
    const x0 = Math.max(0, Math.round(sx - r)), x1 = Math.min(this.W - 1, Math.round(sx + r) - 1), y0 = Math.max(0, Math.round(sy - r)), y1 = Math.min(this.H - 1, Math.round(sy + r) - 1);
    const iz = 1 / Z, col = this.col, dep = this.dep, W = this.W, cr = c[0], cg = c[1], cb = c[2];
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const idx = yy * W + xx; if (dep[idx] >= iz) continue;
      if ((mode === 2 || alpha < 1) && BAYER[((yy & 3) << 2) | (xx & 3)] > (mode === 2 ? .5 : 1) * alpha) continue;
      if (mode === 1) { const o = col[idx]; let r = (o & 255) + cr * alpha, g = ((o >> 8) & 255) + cg * alpha, b = ((o >> 16) & 255) + cb * alpha; col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0; }
      else col[idx] = pack(cr, cg, cb);
    }
  }
  /** a soft additive glow disc (world radius) */
  glow(x, y, z, rad, c, k = 1) {
    const p = this.project(x, y, z); if (!p || p[2] > this.far) return;
    const r = rad * this.B.F / p[2]; if (r < .5) return;
    const iz = 1 / Math.max(2, p[2] - rad), col = this.col, dep = this.dep, W = this.W, H = this.H;
    const x0 = Math.max(0, Math.floor(p[0] - r)), x1 = Math.min(W - 1, Math.ceil(p[0] + r)), y0 = Math.max(0, Math.floor(p[1] - r)), y1 = Math.min(H - 1, Math.ceil(p[1] + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const idx = yy * W + xx; if (dep[idx] > iz) continue;
      const d = Math.hypot(xx + .5 - p[0], yy + .5 - p[1]) / r; if (d >= 1) continue;
      let a = (1 - d) * (1 - d) * k; a = Math.round(a * 4) / 4; if (a <= 0) continue;
      const o = col[idx]; let rr = (o & 255) + c[0] * a, g = ((o >> 8) & 255) + c[1] * a, b = ((o >> 16) & 255) + c[2] * a;
      col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (rr > 255 ? 255 : rr)) >>> 0;
    }
  }
  /** a depth-tested line between two world points (tracers, lasers, ropes); additive with mode 1 */
  line(a, b, c, mode = 0, width = 1) {
    const B = this.B; let va = toView(B, a[0], a[1], a[2]), vb = toView(B, b[0], b[1], b[2]);
    if (va[2] < B.near && vb[2] < B.near) return;
    if (va[2] < B.near) { const f = (B.near - va[2]) / (vb[2] - va[2]); va = V3.lerp(va, vb, f); }
    if (vb[2] < B.near) { const f = (B.near - vb[2]) / (va[2] - vb[2]); vb = V3.lerp(vb, va, f); }
    const x0 = B.cx + va[0] * B.F / va[2], y0 = B.cy - va[1] * B.F / va[2], x1 = B.cx + vb[0] * B.F / vb[2], y1 = B.cy - vb[1] * B.F / vb[2];
    const n = Math.min(2000, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1), iza = 1 / va[2], izb = 1 / vb[2], col = this.col, dep = this.dep, W = this.W, H = this.H;
    for (let i = 0; i <= n; i++) {
      const f = i / n, X = Math.round(x0 + (x1 - x0) * f), Y = Math.round(y0 + (y1 - y0) * f); if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const iz = iza + (izb - iza) * f;
      for (let w = 0; w < width; w++) {
        const XX = X + (w & 1 ? 1 : 0) * ((w + 1) >> 1), YY = Y + (w & 1 ? 0 : 1) * (w >> 1); if (XX >= W || YY >= H) continue;
        const idx = YY * W + XX; if (dep[idx] > iz * 1.002) continue;
        if (mode === 1) { const o = col[idx]; let r = (o & 255) + c[0], g = ((o >> 8) & 255) + c[1], b = ((o >> 16) & 255) + c[2]; col[idx] = (255 << 24 | (b > 255 ? 255 : b) << 16 | (g > 255 ? 255 : g) << 8 | (r > 255 ? 255 : r)) >>> 0; }
        else col[idx] = pack(c[0], c[1], c[2]);
      }
    }
  }
  /** a dithered dark ellipse on the ground under an actor */
  shadow(x, y, z, r = 7) {
    const B = this.B, p = this.project(x, y, z + .3); if (!p) return;
    const k = B.F / p[2], rx = r * k, el = Math.max(.15, Math.abs(Math.sin(Math.atan2(B.z - z, Math.max(1, Math.hypot(x - B.x, y - B.y)))))), ry = rx * el;
    if (rx < 1) return;
    this.stats.shadows++;
    const iz = 1 / Math.max(2, p[2] - 3), col = this.col, dep = this.dep, W = this.W, H = this.H;
    for (let yy = Math.max(0, Math.floor(p[1] - ry)); yy <= Math.min(H - 1, Math.ceil(p[1] + ry)); yy++) for (let xx = Math.max(0, Math.floor(p[0] - rx)); xx <= Math.min(W - 1, Math.ceil(p[0] + rx)); xx++) {
      const dx = (xx + .5 - p[0]) / rx, dy = (yy + .5 - p[1]) / ry; if (dx * dx + dy * dy > 1) continue;
      const idx = yy * W + xx; if (dep[idx] > iz * 1.05 || dep[idx] === 0) continue;
      if (((xx + yy) & 1) && dx * dx + dy * dy > .45) continue;
      const o = col[idx]; col[idx] = (255 << 24 | (((o >> 16) & 255) * .5) << 16 | (((o >> 8) & 255) * .5) << 8 | ((o & 255) * .5)) >>> 0;
    }
  }
  /** darken or tint the whole frame (cover vignette, smoke, flashes) */
  vignette(k, c = [0, 0, 0], edge = true) {
    const col = this.col, W = this.W, H = this.H, cx = W / 2, cy = H / 2, inv = 1 / Math.hypot(cx, cy);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = edge ? Math.hypot(x - cx, y - cy) * inv : 1, a = clamp((d - .45) * 1.8, 0, 1) * k; if (a <= 0) continue;
      if (BAYER[((y & 3) << 2) | (x & 3)] > a * 1.6) continue;
      const i = y * W + x, o = col[i], m = 1 - Math.min(1, a);
      col[i] = (255 << 24 | (((o >> 16) & 255) * m + c[2] * (1 - m)) << 16 | (((o >> 8) & 255) * m + c[1] * (1 - m)) << 8 | ((o & 255) * m + c[0] * (1 - m))) >>> 0;
    }
  }
  /** copy the frame onto the game's buffer at (x, y) */
  present(g, x, y) {
    if (HEADLESS || !this.img) return;
    this.img32.set(this.col); this.cg.putImageData(this.img, 0, 0); g.drawImage(this.cv, x, y);
  }
}
TC.Rail3D = Rail3D;

// ---- 05-fx.js ----
/* 05-fx: presentation-only effects in 3D: particles (sparks, splinters, dust, glass, water spray, smoke, fire, debris,
 * fireworks), tracers and lasers, muzzle flashes and explosion lights, decals (bullet holes, scorch), rain and
 * lightning. Its own random stream (cosmetic), never the Sim's. Drawn by Rail3D after the world and actors. */
class FX {
  constructor() { this.p = []; this.tr = []; this.dec = []; this.lights = []; this.t = 0; this.seed = 1234567; this.rain = 0; this.flash = 0; this.nextBolt = 6; }
  r() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296; }
  add(o) { if (this.p.length > 900) this.p.splice(0, 100); this.p.push(Object.assign({ t: 0, life: 1, vel: [0, 0, 0], g: 0, size: 2, mode: 0, drag: 0, grow: 0 }, o)); }
  burst(at, n, o) {
    for (let i = 0; i < n; i++) {
      const a = this.r() * TAU, e = (this.r() - .3) * Math.PI * .8, s = (o.speed || 80) * (.4 + this.r() * .8);
      this.add(Object.assign({}, o, { pos: at.slice(), vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(a) * Math.cos(e) * s, Math.sin(e) * s + (o.up || 0)], life: (o.life || .5) * (.6 + this.r() * .8), color: Array.isArray(o.colors) ? o.colors[(this.r() * o.colors.length) | 0] : o.color }));
    }
  }
  spark(at, n = 6, c = [255, 210, 120]) { this.burst(at, n, { speed: 110, g: 240, life: .35, size: 1.2, mode: 1, color: c }); }
  impact(at, mat) {
    if (!at) return;
    if (mat === 'metal') { this.spark(at, 8); this.add({ pos: at.slice(), life: .06, size: 5, mode: 1, color: [255, 240, 200] }); }
    else if (mat === 'wood') this.burst(at, 7, { speed: 70, g: 300, life: .6, size: 1.6, color: [150, 100, 60], colors: [[150, 100, 60], [200, 150, 90], [110, 70, 40]] });
    else if (mat === 'water') this.burst(at, 10, { speed: 50, up: 60, g: 260, life: .6, size: 1.8, mode: 2, color: [200, 230, 255] });
    else if (mat === 'glass') this.burst(at, 9, { speed: 80, g: 300, life: .6, size: 1.2, mode: 1, color: [180, 230, 255] });
    else if (mat === 'cloth') this.burst(at, 4, { speed: 30, g: 60, life: .5, size: 1.5, mode: 2, color: [220, 200, 170] });
    else { this.burst(at, 6, { speed: 40, g: 120, life: .5, size: 2.4, mode: 2, grow: 4, color: [170, 160, 150] }); this.spark(at, 2); }
    if (mat !== 'water' && mat !== 'cloth') this.decal(at, mat === 'glass' ? [40, 60, 80] : [26, 22, 24], 1.4);
  }
  decal(at, c, s) { this.dec.push({ pos: at.slice(), c, s }); if (this.dec.length > 160) this.dec.shift(); }
  blood(at) { this.burst(at, 6, { speed: 40, g: 200, life: .4, size: 1.6, mode: 2, color: [120, 20, 30] }); }
  muzzle(at, k = 1, c = [255, 220, 140]) { this.add({ pos: at.slice(), life: .05, size: 5 * k, mode: 1, color: c }); this.add({ pos: at.slice(), life: .08, size: 9 * k, mode: 1, color: [120, 80, 30] }); this.lights.push({ x: at[0], y: at[1], z: at[2], r: 70 * k, k: .6, t: .06 }); }
  tracer(a, b, c = [255, 230, 160], life = .07) { this.tr.push({ a: a.slice(), b: b.slice(), c, t: 0, life }); }
  explosion(at, r = 40) {
    const k = r / 40;
    this.add({ pos: at.slice(), life: .18, size: 30 * k, mode: 1, color: [255, 240, 200] });
    for (let i = 0; i < 14 * k + 6; i++) { const a = this.r() * TAU, e = this.r() * Math.PI * .5, s = 40 + this.r() * 90 * k; this.add({ pos: at.slice(), vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(a) * Math.cos(e) * s, Math.sin(e) * s + 30], life: .35 + this.r() * .4, size: (6 + this.r() * 8) * k, grow: -6, mode: 1, drag: 2.5, color: [255, 140 + this.r() * 80 | 0, 40] }); }
    for (let i = 0; i < 10 * k + 4; i++) this.add({ pos: [at[0] + (this.r() - .5) * r * .6, at[1] + (this.r() - .5) * r * .6, at[2] + this.r() * r * .3], vel: [(this.r() - .5) * 30, (this.r() - .5) * 30, 25 + this.r() * 30], life: 1.2 + this.r() * 1.2, size: (8 + this.r() * 8) * k, grow: 10, mode: 2, drag: 1, color: [70 + this.r() * 30 | 0, 66, 70] });
    this.burst(at, 6 * k + 3, { speed: 140 * k, up: 80, g: 300, life: 1, size: 1.3, color: [50, 44, 40], colors: [[50, 44, 40], [90, 80, 70], [30, 28, 30]] });
    this.spark(at, 12);
    this.lights.push({ x: at[0], y: at[1], z: at[2] + 10, r: 220 * k, k: 1.2, t: .4 });
    this.decal([at[0], at[1], at[2]], [20, 16, 16], 10 * k);
  }
  smoke(at, n = 1, c = [80, 80, 86], s = 6, grow = 5) { for (let i = 0; i < n; i++) this.add({ pos: [at[0] + (this.r() - .5) * 4, at[1] + (this.r() - .5) * 4, at[2]], vel: [(this.r() - .5) * 8, (this.r() - .5) * 8, 18 + this.r() * 10], life: .9 + this.r() * .6, size: s, grow, mode: 2, color: c }); }
  fire(at, n = 1, s = 1) { for (let i = 0; i < n; i++) this.add({ pos: [at[0] + (this.r() - .5) * 8 * s, at[1] + (this.r() - .5) * 8 * s, at[2] + this.r() * 4], vel: [0, 0, 30 + this.r() * 25], life: .35 + this.r() * .3, size: (4 + this.r() * 4) * s, grow: -4, mode: 1, color: [255, 120 + this.r() * 100 | 0, 30] }); }
  firework(at, kind = 0) {
    const cols = [[255, 90, 90], [255, 211, 74], [90, 209, 255], [138, 255, 138], [255, 120, 220]], c = cols[(this.r() * cols.length) | 0], n = 40;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, e = kind === 1 ? 0 : (this.r() - .5) * Math.PI, s = 110 + this.r() * 30; this.add({ pos: at.slice(), vel: [Math.cos(a) * Math.cos(e) * s, Math.sin(a) * Math.cos(e) * s, Math.sin(e) * s + (kind === 2 ? 40 : 0)], g: kind === 2 ? 70 : 30, drag: 1.2, life: 1.4 + this.r() * .6, size: 3.5, mode: 1, color: c, trail: kind === 2 }); }
    this.add({ pos: at.slice(), life: .25, size: 60, mode: 1, color: c.map(v => v * .5) });
    this.lights.push({ x: at[0], y: at[1], z: at[2], r: 400, k: .5, t: .5 });
  }
  step(dt, sim) {
    this.t += dt;
    for (const p of this.p) {
      p.t += dt; const v = p.vel;
      if (p.drag) { const k = Math.exp(-p.drag * dt); v[0] *= k; v[1] *= k; v[2] *= k; }
      v[2] -= p.g * dt; p.pos[0] += v[0] * dt; p.pos[1] += v[1] * dt; p.pos[2] += v[2] * dt; p.size = Math.max(.3, p.size + p.grow * dt);
      if (p.trail && this.r() < .3) this.add({ pos: p.pos.slice(), life: .3, size: 1.5, mode: 1, color: p.color.map(c => c * .6) });
      if (p.g && sim && p.pos[2] < sim.waterZ() && !p.splashed) { p.splashed = true; p.t = p.life; }
    }
    this.p = this.p.filter(p => p.t < p.life);
    for (const t of this.tr) t.t += dt; this.tr = this.tr.filter(t => t.t < t.life);
    for (const l of this.lights) l.t -= dt; this.lights = this.lights.filter(l => l.t > 0);
    this.flash = Math.max(0, this.flash - dt * 4);
  }
  draw(R3) {
    for (const l of this.lights) R3.addLight(l.x, l.y, l.z, l.r, l.k * Math.min(1, l.t * 10));
  }
  drawAfter(R3) {
    for (const d of this.dec) R3.splat(d.pos[0], d.pos[1], d.pos[2], d.s, d.c, 0);
    for (const p of this.p) { const f = 1 - p.t / p.life; R3.splat(p.pos[0], p.pos[1], p.pos[2], p.size, p.mode === 1 ? p.color.map(c => c * (.4 + .6 * f)) : p.color, p.mode, p.mode === 2 ? Math.min(1, f * 1.5) : 1); }
    for (const t of this.tr) R3.line(t.a, t.b, t.c, 1);
  }
}
TC.FX = FX;

/* ---- presentation camera: shake (trauma), recoil, hit jolt, carrier sway, travel bob; dev free camera ---- */
class CamFX {
  constructor() { this.trauma = 0; this.rec = { x: 0, v: 0 }; this.jolt = { x: 0, v: 0 }; this.t = 0; }
  kick(k) { this.trauma = Math.min(1, this.trauma + k); }
  recoil(deg) { this.rec.v += deg * 14; }
  hit() { this.jolt.v += 30; this.kick(.35); }
  step(dt) { this.t += dt; this.trauma = Math.max(0, this.trauma - dt * 1.6); spring(this.rec, 0, 220, 22, dt); spring(this.jolt, 0, 160, 14, dt); }
  apply(cam, sway) {
    const S = TC.game && TC.game.settings, shakeK = S ? (S.reduceMotion ? 0 : (S.shake === undefined ? 1 : +S.shake)) : 1, tr = this.trauma * this.trauma * 2.5 * DEG * shakeK;
    const out = Object.assign({}, cam);
    out.yaw += vnoise(this.t * 18) * tr; out.pitch += vnoise(this.t * 18 + 50) * tr + this.rec.x * DEG + this.jolt.x * -.5 * DEG;
    out.roll = (cam.roll || 0) + this.jolt.x * DEG * 1.2 + vnoise(this.t * 15 + 9) * tr * .5;
    if (sway) { out.roll += Math.sin(this.t * .9) * sway * DEG; out.pitch += Math.sin(this.t * .7 + 1) * sway * .6 * DEG; out.z += Math.sin(this.t * 1.3) * sway * .8; }
    return out;
  }
}
TC.CamFX = CamFX;

// ---- 10-input.js ----
/* 10-input: the action map (a DualSense first: R2 fires, L2 takes cover; the mouse aims like a light gun, left click
 * fires, right click or Space takes cover, the wheel switches), each player's aim (mouse absolute, pad and keys
 * relative, with the response curve, acceleration and aim assist), building the Sim's command from a device, and the
 * prompt labels that follow the device used last. Reads the engine's input; the Sim only ever sees commands. */
const PRESET = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'KeyJ', 'KeyZ', 'Pad7', 'Pad0'],
  cover: ['Mouse2', 'Space', 'KeyX', 'ShiftLeft', 'Pad6', 'Pad1'],
  next: ['WheelDown', 'KeyE', 'Pad5'],
  prev: ['WheelUp', 'KeyQ', 'Pad4'],
  reload: ['KeyR', 'Pad2'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  more: ['KeyM', 'Pad3'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1']
};
TC.PRESET = PRESET;
const ACTION_NAMES = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher', more: false };
TC.ACTION_NAMES = ACTION_NAMES;

/** the label for an action on a player's last device (PlayStation glyphs by default; Xbox via Settings) */
function label(input, a, device) {
  const dev = device || input.lastDevice;
  if (dev === 'mouse' || dev === 'keyboard') {
    const m = input.map[a] || [], keys = m.filter(c => !c.startsWith('Pad') && !c.startsWith('Act:'));
    const c = dev === 'mouse' ? (keys.find(c => c.startsWith('Mouse') || c.startsWith('Wheel')) || keys[0]) : (keys.find(c => !c.startsWith('Mouse') && !c.startsWith('Wheel')) || keys[0]);
    return c ? input.codeLabel(c) : input.label(a, dev);
  }
  return input.label(a, dev === 'touch' ? 'gamepad' : dev);
}
TC.label = label;
/** which family of prompt to show: 'pad' or 'kbm' (before any input: both) */
function promptFamily(input) { return input.lastDevice === 'gamepad' ? 'pad' : 'kbm'; }
TC.promptFamily = promptFamily;

/* ---- aim state per player (presentation side; the Sim gets only aim [ax, ay]) ---- */
class Aim {
  constructor(input, idx) { this.input = input; this.idx = idx; this.ax = 0; this.ay = 0; this.hold = 0; this.lastMouse = null; this.src = 'mouse'; this.wasCover = false; }
  /** advance one step: rect = the player's viewport in screen pixels { x, y, w, h }; targets: [[ax, ay, r]] for assist */
  update(dt, rect, targets, inCover) {
    const I = this.input, A = rect.w / rect.h, tn = tune.player;
    const p = I.lastDevice === 'mouse' || I.aimSource === 'mouse' ? I.pointer() : null;
    let moved = false;
    if (p && this.idx === 0 && (!this.lastMouse || p[0] !== this.lastMouse[0] || p[1] !== this.lastMouse[1])) {
      this.lastMouse = [p[0], p[1]];
      this.ax = clamp((p[0] - (rect.x + rect.w / 2)) / (rect.h / 2), -A, A); this.ay = clamp(-(p[1] - (rect.y + rect.h / 2)) / (rect.h / 2), -1, 1);
      this.src = 'mouse'; return;
    }
    // pad: right stick, else left stick; keys: the moves (arrows / WASD)
    let sx = 0, sy = 0;
    if (I.padAim) { sx = I.padAim[0]; sy = I.padAim[1]; this.src = 'pad'; }
    else if (Math.hypot(I.padMove[0], I.padMove[1]) > 0) { sx = I.padMove[0]; sy = I.padMove[1]; this.src = 'pad'; }
    const km = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), kv = (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0);
    if (!sx && !sy && (km || kv)) {
      const dpad = I.lastDevice === 'gamepad';
      this.ax = clamp(this.ax + km * dt * (dpad ? .5 : 1.2), -A, A); this.ay = clamp(this.ay - kv * dt * (dpad ? .5 : 1.2), -1, 1); this.src = dpad ? 'pad' : 'keys'; return;
    }
    const l = Math.hypot(sx, sy);
    if (l > 0) {
      moved = true; this.hold += dt;
      const k = Math.pow(l, 2.2) / l, acc = this.hold > .35 ? Math.min(1.5, 1 + (this.hold - .35) * 1.2) : 1;
      let sp = (tn.padSpeed || 1.6) * (TC.settingsPadSpeed || 1) * acc;
      // aim assist: friction near a target, magnetism while the stick moves
      const as = TC.assistLevel === undefined ? tn.assist : TC.assistLevel * tn.assist / .6;
      let near = null, nd = 1e9;
      for (const t of targets || []) { const d = Math.hypot(t[0] - this.ax, t[1] - this.ay) - t[2]; if (d < nd) { nd = d; near = t; } }
      if (near && nd < .07) sp *= 1 - .55 * as;
      this.ax = clamp(this.ax + sx * k * sp * dt, -A, A); this.ay = clamp(this.ay - sy * k * sp * dt, -1, 1);
      if (near && nd < .12 && l > .2) { const m = Math.min(1, as * 6 * dt); this.ax += (near[0] - this.ax) * m; this.ay += (near[1] - this.ay) * m; }
    } else this.hold = 0;
    void moved; void inCover;
  }
}
TC.Aim = Aim;

/** a player's command this step from their input and aim */
function commandFrom(input, aim) {
  const I = input, sel = I.pressed('w1') ? 1 : I.pressed('w2') ? 2 : I.pressed('w3') ? 3 : I.pressed('w4') ? 4 : 0;
  return { aim: [aim.ax, aim.ay], fireDown: I.down('fire'), firePressed: I.pressed('fire'), coverDown: I.down('cover'), coverPressed: I.pressed('cover'), next: I.pressed('next'), prev: I.pressed('prev'), select: sel, reload: I.pressed('reload') };
}
TC.commandFrom = commandFrom;
const NOCMD = Object.freeze({ aim: [0, 0], fireDown: false, firePressed: false, coverDown: false, coverPressed: false, next: false, prev: false, select: 0, reload: false });
TC.NOCMD = NOCMD;

// ---- 12-weapons.js ----
/* 12-weapons: the weapon registry (def('weapon', ...)) and the player's firing: hitscan rays, shotgun pellets,
 * grenade-launcher rounds, ammo, magazines, the machine gun's bloom, switching. Numbers read tune.weapons live.
 * Reads the Sim (shots resolve through sim.resolveRay); emits 'shot', 'empty', 'switch' events. */
def('weapon', 'hg', { slot: 1, name: 'P9 MARLIN', kind: 'HANDGUN', icon: 'hg', mag: 9, rate: 6, auto: 3.5, sw: .20, recoil: .6, sfx: 'hg',
  dmg: () => tune.weapons.hgDamage, pellets: () => 1, spread: () => 0 });
def('weapon', 'mg', { slot: 2, name: 'RIPTIDE', kind: 'MACHINE GUN', icon: 'mg', pool: 240, pickup: 60, full: true, sw: .25, recoil: .25, sfx: 'mg',
  rate: () => tune.weapons.mgRate, dmg: () => tune.weapons.mgDamage, pellets: () => 1, spread: p => .6 + p.bloom * 2.4 });
def('weapon', 'sg', { slot: 3, name: 'BREAKWATER', kind: 'SHOTGUN', icon: 'sg', pool: 36, pickup: 8, rate: 1.5, sw: .30, recoil: 2.2, sfx: 'sg',
  dmg: () => .45, pellets: () => Math.round(tune.weapons.sgPellets), spread: () => tune.weapons.sgSpread, stagger: true, knock: true });
def('weapon', 'gl', { slot: 4, name: 'SQUALL', kind: 'GRENADE LAUNCHER', icon: 'gl', pool: 6, pickup: 2, rate: 1, sw: .35, recoil: 1.5, sfx: 'gl', projectile: true,
  dmg: () => tune.weapons.glDamage, pellets: () => 1, spread: () => 0 });
const WEAPONS = ['hg', 'mg', 'sg', 'gl'];
TC.WEAPONS = WEAPONS;

function hasAmmo(p, w) { return w === 'hg' || p.ammo[w] > 0; }
function cycleWeapon(sim, p, dir) {
  let i = WEAPONS.indexOf(p.weapon);
  for (let k = 0; k < 4; k++) { i = (i + dir + 4) % 4; if (hasAmmo(p, WEAPONS[i]) || sim.cheat(p, 'ammo')) { if (WEAPONS[i] !== p.weapon) selectWeapon(sim, p, WEAPONS[i]); return; } }
}
function selectWeapon(sim, p, w) {
  if (p.weapon === w || (!hasAmmo(p, w) && !sim.cheat(p, 'ammo'))) return false;
  p.weapon = w; p.switchT = reg('weapon', w).sw; p.stripT = .8; p.bloom = 0;
  sim.ev({ type: 'switch', p: p.id, w });
  return true;
}
TC.cycleWeapon = cycleWeapon;

/** the player's trigger this step (called by the Sim with the player's command) */
function weaponStep(sim, p, cmd, dt) {
  p.cool = Math.max(0, p.cool - dt); p.switchT = Math.max(0, p.switchT - dt); p.stripT = Math.max(0, p.stripT - dt);
  p.bloom = Math.max(0, p.bloom - dt * 2.2);
  if (cmd.select) selectWeapon(sim, p, WEAPONS[cmd.select - 1]);
  if (cmd.next) cycleWeapon(sim, p, 1);
  if (cmd.prev) cycleWeapon(sim, p, -1);
  const W = reg('weapon', p.weapon);
  if (p.c > .2) {   // in cover: no firing; a trigger pull switches to the next weapon with ammo (one-trigger players)
    if (cmd.firePressed && p.c >= .5) cycleWeapon(sim, p, 1);
    return;
  }
  if (p.switchT > 0 || p.cool > 0) return;
  const inf = sim.cheat(p, 'ammo');
  if (p.weapon === 'hg') {
    const auto = TC.autoFire !== false && cmd.fireDown && !cmd.firePressed && p.heldT > .18;
    if (!cmd.firePressed && !auto) return;
    if (p.mag <= 0 && !inf) { if (cmd.firePressed) { sim.ev({ type: 'empty', p: p.id }); p.cool = .15; } return; }
    if (!inf) p.mag--;
    p.cool = cmd.firePressed ? 1 / W.rate : 1 / W.auto;
    fireRound(sim, p, W);
  } else {
    const held = W.full ? cmd.fireDown : (cmd.firePressed || (cmd.fireDown && p.heldT > .1));
    if (!held) return;
    if (p.ammo[p.weapon] <= 0 && !inf) { sim.ev({ type: 'empty', p: p.id }); selectWeapon(sim, p, 'hg'); return; }
    if (!inf) p.ammo[p.weapon]--;
    p.cool = 1 / (typeof W.rate === 'function' ? W.rate() : W.rate);
    fireRound(sim, p, W);
    if (!inf && p.ammo[p.weapon] <= 0) { p.switchBack = .3; }
  }
}
TC.weaponStep = weaponStep;

/** one trigger pull: rays (or a launched round) from the player's camera through the aim */
function fireRound(sim, p, W) {
  const cam = sim.cameraFor(p.id), n = W.pellets(), spread = W.spread(p) * DEG, results = [];
  p.stats.shots++; p.recoil = W.recoil;
  if (W.projectile) {
    const ray = aimRay(cam, p.aim[0], p.aim[1]);
    sim.launch({ kind: 'pgl', owner: p.id, pos: V3.add(ray.o, V3.mul(ray.d, 6)), vel: V3.add(V3.mul(ray.d, 640), [0, 0, 40]), gravity: 240, life: 1.4, r: 2 });
    sim.ev({ type: 'shot', p: p.id, w: p.weapon, from: [cam.x, cam.y, cam.z - 3], to: V3.add(ray.o, V3.mul(ray.d, 80)), hits: [] });
    return;
  }
  let anyHit = false;
  for (let k = 0; k < n; k++) {
    let ax = p.aim[0], ay = p.aim[1];
    if (spread > 0) { const a = sim.rng('spread') * TAU, r = Math.sqrt(sim.rng('spread')) * Math.tan(spread) / Math.tan(cam.fov * DEG / 2); ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
    const ray = aimRay(cam, ax, ay), res = sim.resolveRay(ray, p, W, k === 0);
    results.push(res); if (res && res.scoring) anyHit = true;
  }
  if (p.weapon === 'mg') p.bloom = Math.min(1, p.bloom + .18);
  if (!anyHit) { if (p.chain > 0) sim.ev({ type: 'chainbreak', p: p.id }); p.chain = 0; }
  sim.ev({ type: 'shot', p: p.id, w: p.weapon, from: [cam.x, cam.y, cam.z - 4], to: results.map(r => r ? r.at : null), hits: results.map(r => r && r.kind) });
}
TC.fireRound = fireRound;

// ---- 13-player.js ----
/* 13-player: PlayerState: the cover blend (exposed means c < .5), hold or toggle cover, reloading in cover, lives,
 * invulnerability after a hit, score, the chain multiplier, extra lives, stats, continues. Reads tune.player and the
 * Sim; emits 'hurt', 'reload', '1up', 'out' events. */
const AGENTS = ['kai', 'rook', 'mari', 'juno'];
function newPlayer(sim, o, i) {
  const lives = tune.player.startLives || sim.diff.lives;
  return {
    id: i, name: o.name || 'P' + (i + 1), color: o.color || SEAT_COLORS[i % 4], agent: o.agent || AGENTS[i % 4], aspect: o.aspect || 16 / 9,
    slot: i, c: 0, coverOn: false, coverT: 0, weapon: 'hg', mag: 9, ammo: { mg: 0, sg: 0, gl: 0 }, reloadT: 0, quickT: 0,
    cool: 0, switchT: 0, stripT: 0, bloom: 0, heldT: 0, recoil: 0, aim: [0, 0], lives, score: 0, chain: 0, best: 0, inv: 0,
    out: false, contT: 0, conts: 0, extra: 0, present: true, left: false, hurtT: 0,
    stats: { shots: 0, hits: 0, heads: 0, kills: 0, quick: 0, saves: 0, lost: 0, civ: 0, bestChain: 0, time: 0, reloads: 0 }
  };
}
TC.newPlayer = newPlayer;
const chainMul = p => Math.min(2, 1 + Math.floor(p.chain / 5) * .1);
TC.chainMul = chainMul;

/** cover, reload and the trigger's hold time for one step */
function playerStep(sim, p, cmd, dt) {
  p.aim[0] = cmd.aim[0]; p.aim[1] = cmd.aim[1];
  if (sim.cheat(p, 'ammo')) { p.ammo.mg = 240; p.ammo.sg = 36; p.ammo.gl = 6; p.mag = Math.max(p.mag, 1); (p.seen || (p.seen = {})).mg = p.seen.sg = p.seen.gl = true; }
  p.heldT = cmd.fireDown ? p.heldT + dt : 0;
  p.inv = Math.max(0, p.inv - dt); p.recoil = Math.max(0, p.recoil - dt * 6); p.hurtT = Math.max(0, p.hurtT - dt);
  if (TC.coverToggle && cmd.coverPressed) p.coverOn = !p.coverOn;
  if (cmd.reload && p.c < .5 && p.weapon === 'hg' && p.mag < 9) p.quickT = tune.player.reload + tune.player.coverIn + .05;
  p.quickT = Math.max(0, p.quickT - dt);
  const want = (TC.coverToggle ? p.coverOn : cmd.coverDown) || p.quickT > 0 || sim.forceCover;
  const was = p.c;
  p.c = want ? Math.min(1, p.c + dt / tune.player.coverIn) : Math.max(0, p.c - dt / tune.player.coverOut);
  if (was < .5 && p.c >= .5) sim.ev({ type: 'cover', p: p.id, on: true });
  if (was >= .5 && p.c < .5) { sim.ev({ type: 'cover', p: p.id, on: false }); sim.threatsPopOut(p); }
  // reloading: in cover the magazine refills after the reload time
  if (p.c >= .99) {
    if (p.mag < 9) { p.reloadT += dt; if (p.reloadT >= tune.player.reload) { p.mag = 9; p.reloadT = 0; p.stats.reloads++; sim.ev({ type: 'reload', p: p.id }); } }
    else p.reloadT = 0;
  } else p.reloadT = 0;
  if (p.switchBack !== undefined) { p.switchBack -= dt; if (p.switchBack <= 0) { delete p.switchBack; if (!hasAmmo(p, p.weapon)) { p.weapon = 'hg'; p.switchT = .2; sim.ev({ type: 'switch', p: p.id, w: 'hg' }); } } }
}
TC.playerStep = playerStep;

/** a hit on the player (a threat that landed): ignoreInv for time-up and civilian penalties */
function hurtPlayer(sim, p, why, ignoreInv) {
  if (p.out || (!ignoreInv && p.inv > 0)) return false;
  if (sim.cheat(p, 'god')) { sim.ev({ type: 'godblock', p: p.id }); return false; }
  if (sim.mode !== 'range') p.lives--; p.stats.lost++; p.inv = tune.player.iframes; p.hurtT = .5; if (p.chain) sim.ev({ type: 'chainbreak', p: p.id }); p.chain = 0;
  sim.ev({ type: 'hurt', p: p.id, why });
  if (p.lives <= 0) { p.lives = 0; p.out = true; p.contT = sim.mode === 'host' ? 6 : 10; sim.ev({ type: 'out', p: p.id }); }
  return true;
}
TC.hurtPlayer = hurtPlayer;

/** points with the chain multiplier (and extra lives at the thresholds) */
function addScore(sim, p, pts, at, noChain) {
  const v = Math.round(pts * (noChain ? 1 : chainMul(p)) / 10) * 10; p.score += v;
  if (at) sim.ev({ type: 'score', p: p.id, pts: v, at });
  for (const th of [150000, 400000]) if (p.score >= th && !(p.extra & (th === 150000 ? 1 : 2))) { p.extra |= th === 150000 ? 1 : 2; p.lives++; sim.ev({ type: '1up', p: p.id }); }
  return v;
}
TC.addScore = addScore;
function addHitChain(p) { p.chain++; if (p.chain > p.stats.bestChain) p.stats.bestChain = p.chain; }
TC.addHitChain = addHitChain;

/** a stage's rank from a player's stats */
function rankOf(p, stats, conts) {
  const acc = stats.shots ? stats.hits / stats.shots : 0;
  if (conts > 0) return 'D';
  if (acc >= .75 && stats.lost === 0) return 'S';
  if (acc >= .60 && stats.lost <= 1) return 'A';
  if (acc >= .45) return 'B';
  return 'C';
}
TC.rankOf = rankOf;

// ---- 21-enemies.js ----
/* 21-enemies: the enemy roster (def('enemy', ...)) and their behaviour: entries (stand, run, jump, rappel, door, vault,
 * roll, vehicle), hide <-> peek (up over low cover, a side step from tall cover, over a shield), aim and the fire plan
 * through the ThreatDirector, relocation, reactions, the five death styles, corpses; the special AIs (quartermaster,
 * rusher, shield, sniper, grenadier, rocketeer, drone, jet ski, mounted gunner, captor and hostage, civilians, allies).
 * Hit volumes are rebuilt from the rig's joints every step (rig.update runs headless, so they are deterministic). */
const SKIN = ['#e8b894', '#c8906a', '#a0704a', '#6a4430', '#f0c8a8'];
const HAIR = ['#2a2018', '#4a3020', '#1a1a1e', '#6a4a2a', '#8a7a6a'];
function lookFor(sim, def0) {
  const L = def0.look || {}, R = () => sim.rng('look');
  const colors = Object.assign({ skin: SKIN[R() * SKIN.length | 0], hair: HAIR[R() * HAIR.length | 0] }, L.colors || {});
  return Object.assign({ size: 1, build: 'heroic', outfit: 'shirt', sleeves: 'long' }, L, { colors });
}
function makeRig(sim, opts) { const r = new E.Humanoid(opts); r.t = sim.rng('rig') * 10; return r; }
TC.makeRig = makeRig;

/* ---- the roster ---- */
const ENEMY = (id, spec) => def('enemy', id, Object.assign({ hp: 1, score: 1000, ai: 'gunner', expose: [1.4, 2.2], burst: 3, gap: .12, threat: [.25, .32, .4], tele: 1.1, aim: [.35, .6], hide: [.7, 1.5], cycles: [2, 4], speed: 110 }, spec));
ENEMY('deckhand', { name: 'Deckhand', look: { weapon: 'rifle', hat: { style: 'cap', color: '#22283a' }, colors: { cloth: '#2a3454', pants: '#34363e', boot: '#1a1a1e', metal: '#2e3038', belt: '#3a2a1a' } } });
ENEMY('marine', { name: 'Marine', hp: 2, score: 1500, expose: [1.6, 2.4], burst: 4, threat: [.35, .35, .4], tele: .95, look: { weapon: 'rifle', armor: true, hat: { style: 'helmet', color: '#4a563a' }, colors: { cloth: '#4e5a3e', pants: '#3e4632', plate: '#5e6a4a', boot: '#2a2a22', metal: '#2a2c30' }, size: 1.05 } });
ENEMY('redtide', { name: 'Red Tide', hp: 2, score: 3000, elite: true, expose: [.9, 1.3], burst: 2, threat: [1, 1, 1], always: true, tele: .55, aim: [.2, .3], look: { weapon: 'smg', outfit: 'coat', hat: { style: 'cap', color: '#7a0c12' }, colors: { coat: '#b81e24', cloth: '#7a1418', pants: '#2a1a1e', boot: '#140c0e', skin: '#3a3036', hair: '#1a1416', trim: '#e8c040', metal: '#1e1e24' } } });
ENEMY('quartermaster', { name: 'Quartermaster', ai: 'runner', score: 2000, speed: 95, look: { weapon: 'gun', armor: true, hat: { style: 'cap', color: '#f2c12e' }, colors: { cloth: '#ff7a1a', plate: '#ff8a2a', pants: '#3a4a5a', metal: '#3a3a40' } } });
ENEMY('grenadier', { name: 'Grenadier', hp: 2, score: 2000, ai: 'thrower', expose: [1.2, 1.4], look: { build: 'bulky', weapon: null, hat: { style: 'cap', color: '#3a3a2a' }, colors: { cloth: '#4a4a36', pants: '#3a3a30', belt: '#5a4020' } } });
ENEMY('rocketeer', { name: 'Rocketeer', hp: 2, score: 2500, ai: 'rocket', expose: [2.2, 2.6], look: { weapon: 'launcher', hat: { style: 'helmet', color: '#3a4048' }, colors: { cloth: '#3a4250', pants: '#2a2e36', metal: '#4a5a4a' } } });
ENEMY('shield', { name: 'Shield', hp: 3, score: 3000, ai: 'shield', burst: 3, threat: [.4, .4, .45], tele: .9, speed: 40, look: { build: 'bulky', size: 1.05, weapon: 'smg', armor: true, hat: { style: 'helmet', color: '#2a3040' }, colors: { cloth: '#2a3040', plate: '#3a4252', pants: '#22262e', metal: '#1e2026' } } });
ENEMY('rusher', { name: 'Rusher', hp: 1.5, score: 2000, ai: 'rusher', speed: 150, tele: .45, look: { weapon: 'cutlass', sleeves: 'none', hat: { style: 'band', color: '#c8282a' }, colors: { cloth: '#d8d4c8', pants: '#3a3430', metal: '#c8ccd4' } } });
ENEMY('sniper', { name: 'Sniper', score: 3000, elite: true, ai: 'sniper', tele: 1.4, look: { weapon: 'sniper', outfit: 'coat', hood: true, colors: { coat: '#5a6066', cloth: '#4a5056', hair: '#4a5056', pants: '#34383c' } } });
ENEMY('drone', { name: 'Drone', hp: 2, score: 1500, ai: 'drone', threat: [.3, .3, .3], tele: .9, mesh: 'drone' });
ENEMY('jetski', { name: 'Jet ski', hp: 1, score: 1500, ai: 'jetski', threat: [.3, .3, .3], tele: 1, look: { weapon: 'gun', colors: { cloth: '#2a3454', pants: '#2a2e3a' } } });
ENEMY('gunner', { name: 'Gunner', hp: 3, score: 2500, ai: 'turret', burst: 6, gap: .09, threat: [.5, .5, .5], tele: 1, expose: [2.4, 3], look: { weapon: 'minigun', hat: { style: 'helmet', color: '#3a3e44' }, colors: { cloth: '#3a4250', pants: '#2a2e36' } } });
ENEMY('captor', { name: 'Captor', hp: 1, score: 5000, ai: 'captor', always: true, tele: .8, look: { weapon: 'gun', outfit: 'coat', hat: { style: 'cap', color: '#7a0c12' }, colors: { coat: '#b81e24', cloth: '#7a1418', pants: '#2a1a1e', skin: '#3a3036' } } });
ENEMY('civilian', { name: 'Civilian', ai: 'civilian', score: -5000, civ: true });
ENEMY('ally', { name: 'Ally', ai: 'ally', ally: true });
TC.ENEMY = ENEMY;

const CIV_LOOKS = [
  { outfit: 'shirt', sleeves: 'short', hair: 'ponytail', colors: { cloth: '#e85a8a', pants: '#3a4a7a' } },
  { outfit: 'shirt', sleeves: 'short', hair: 'short', colors: { cloth: '#5ac8e8', pants: '#e8dcc0' } },
  { outfit: 'coat', hat: { style: 'cap', color: '#f2c12e' }, colors: { coat: '#f2c12e', cloth: '#d8a820', pants: '#2a3a5a' } },
  { outfit: 'robe', hair: 'long', colors: { cloth: '#ffd36a', pants: '#a83a3a' } },
  { outfit: 'shirt', sleeves: 'long', hat: { style: 'cap', color: '#3a6a9a' }, colors: { cloth: '#6a8aaa', pants: '#3a3a44' } }
];

/* ---- spawning ---- */
function spawnEnemy(sim, type, coverId, o = {}) {
  const D = reg('enemy', type); if (!D) throw new Error('unknown enemy ' + type);
  const sc = sim.scene, cv = coverId ? sc.coversById[coverId] : null;
  const e = { id: sim.nid(), type, D, hp: D.hp * (D.civ || D.ally ? 1 : tune.enemy.hpMul * sim.diff.hp), alive: true, state: 'enter', st: 0, x: 0, y: 0, z: 0, dz: 0, facing: 0, vx: 0, vy: 0,
    target: -1, exposed: false, expT: 0, cycles: 0, flash: 0, hurtT: 0, stag: null, wave: o.wave, o, cover: cv, deathT: 0, alpha: 1, entry: o.entry || (cv ? 'stand' : 'run'), mesh: D.mesh || null, civ: !!D.civ, ally: !!D.ally, elite: !!D.elite, drop: o.drop || null };
  e.hp0 = e.hp;
  if (!D.mesh) {
    const look = D.civ ? Object.assign({ size: 1, build: sim.rng('look') < .5 ? 'heroic' : 'chibi', weapon: null }, CIV_LOOKS[o.look !== undefined ? o.look : sim.rng('look') * CIV_LOOKS.length | 0]) : D.ally ? reg('speaker', o.who).rig : lookFor(sim, D);
    if (D.civ) look.colors = Object.assign({ skin: SKIN[sim.rng('look') * 5 | 0], hair: HAIR[sim.rng('look') * 5 | 0] }, look.colors);
    e.rig = makeRig(sim, look);
  }
  if (cv) { e.hide = cv.at.slice(); e.face = cv.face; }
  const from = o.from || (cv ? cv.at : o.route ? o.route[0] : [0, 0, 0]);
  e.x = from[0]; e.y = from[1]; e.z = from[2] || 0;
  if (e.entry === 'stand' && cv) { e.state = 'hide'; e.st = 0; e.hideFor = .3 + sim.rng('ai') * .8; e.dz = duckDz(e); }
  if (e.entry === 'rappel' && cv) { e.x = cv.at[0]; e.y = cv.at[1]; e.z = cv.at[2] + (o.ropeH || 72); e.rope = [cv.at[0], cv.at[1], e.z + 6]; }
  if (e.entry === 'jump' && cv && !o.from) { e.x = cv.at[0] - Math.cos(cv.face) * 30; e.y = cv.at[1] - Math.sin(cv.face) * 30; e.z = cv.at[2] + 40; }
  e.route = o.route || null; e.ri = 0;
  e.facing = cv ? cv.face : (o.facing !== undefined ? o.facing : Math.atan2(sim.focus()[1] - e.y, sim.focus()[0] - e.x));
  if (D.ai === 'drone') { e.center = from.slice(); e.orbit = o.orbit || 60; e.ph = sim.rng('ai') * TAU; e.hp = D.hp * tune.enemy.hpMul; }
  if (D.ai === 'jetski') { e.path = new E.Path(o.route, { smooth: 'catmull' }); e.d = 0; e.speed = o.speed || 150; e.skiHp = 3; e.rig.o.size = 1; }
  if (D.ai === 'captor') { e.hostage = makeRig(sim, reg('speaker', o.hostage || 'tejada').rig); e.state = 'hold'; e.side = o.side || 1; }
  if (D.ai === 'civilian') { e.state = 'flee'; e.ri = 0; }
  if (D.ai === 'ally') { e.state = 'stand'; }
  if (D.ai === 'shield') { e.shieldOn = true; e.shieldOff = 0; }
  if (o.carrier) { e.carrier = o.carrier; e.local = o.local || [0, 0, 0]; }
  sim.enemies.push(e);
  sim.ev({ type: 'spawn', e: e.id, kind: type });
  if (sim.dir) sim.dir.cue('spawn:' + type);
  if (o.say) sim.say(o.say[0], o.say[1]);
  return e;
}
TC.spawnEnemy = spawnEnemy;

/** how far a hiding enemy sinks so its head stays under its cover's top (feet hide behind the cover) */
function duckDz(e) { const cv = e.cover; if (!cv || cv.h >= 34 || !e.rig) return 0; const top = 26.5 * e.rig.o.size; return Math.min(0, (cv.h - 3) - top); }
/** the side direction (unit, ground) for a side peek */
function sideDir(face, s) { return [-Math.sin(face) * s, Math.cos(face) * s]; }

/* ---- per-step update ---- */
function enemiesStep(sim, dt) {
  for (const e of sim.enemies) {
    e.st += dt; e.flash = Math.max(0, e.flash - dt * 8); e.hurtT = Math.max(0, e.hurtT - dt);
    if (e.carrier) {
      const C = sim.carriers[e.carrier];
      if (e.entry === 'rappel' && e.rz !== 0 && e.alive) { e.rz = (e.rz === undefined ? (e.o.ropeH || 60) : e.rz) - 40 * dt; e.climb = e.rz > 0; e.state = 'enter'; e.exposed = true; if (e.rz <= 0) { e.rz = 0; e.climb = false; e.state = 'peek'; e.st = .3; e.peekMode = 'up'; } }
      if (C && C.M) { const w = xform(C.M, [e.local[0], e.local[1], e.local[2] + (e.rz || 0)]); e.x = w[0]; e.y = w[1]; e.z = w[2]; if (e.rz > 0) e.rope = [e.x, e.y, e.z + 60]; else e.rope = null; }
    }
    if (!e.alive) { deadStep(sim, e, dt); }
    else if (e.carrier && e.entry === 'rappel' && e.rz > 0) { faceTarget(sim, e); }
    else {
      if (e.stag) { e.x += e.stag[0] * dt; e.y += e.stag[1] * dt; e.stag[0] *= Math.pow(.02, dt); e.stag[1] *= Math.pow(.02, dt); if (Math.hypot(e.stag[0], e.stag[1]) < 4) e.stag = null; }
      (AI[e.D.ai] || AI.gunner)(sim, e, dt);
      if (e.exposed) e.expT += dt; else e.expT = 0;
    }
    if (e.rig) {
      poseRig(sim, e, dt);
      rigVols(e);
      if (e.hostage) { const s = sideDir(e.facing, 1); e.hostage.update(dt, { x: e.x + Math.cos(e.facing) * 7, y: e.y + Math.sin(e.facing) * 7, z: e.z, facing: e.facing, expr: 'wince', pose: e.alive ? null : 'cheer' }); e.hvols = volsOf(e.hostage); void s; }
    } else meshVols(sim, e);
  }
  sim.enemies = sim.enemies.filter(e => !e.gone);
}
TC.enemiesStep = enemiesStep;

/* ---- moving and facing ---- */
function moveTo(e, p, speed, dt) {
  const dx = p[0] - e.x, dy = p[1] - e.y, dz = (p[2] || 0) - e.z, d = Math.hypot(dx, dy);
  if (d < speed * dt + .5) { e.x = p[0]; e.y = p[1]; e.z = p[2] || 0; e.vx = e.vy = 0; return true; }
  e.vx = dx / d * speed; e.vy = dy / d * speed; e.x += e.vx * dt; e.y += e.vy * dt; e.z += dz * Math.min(1, dt * 8);
  e.facing = Math.atan2(dy, dx); return false;
}
function faceTarget(sim, e) {
  if (e.target < 0 || !sim.players[e.target] || sim.players[e.target].out) e.target = pickTarget(sim, [e.x, e.y]);
  if (e.target < 0) return null;
  const c = sim.cameraFor(e.target); e.facing = Math.atan2(c.y - e.y, c.x - e.x);
  e.aimA = Math.atan2(c.z - (e.z + e.dz + 22), Math.hypot(c.x - e.x, c.y - e.y));
  return c;
}
function muzzle(e) { if (e.rig) return e.rig.tip(); return [e.x, e.y, e.z]; }
TC.muzzle = muzzle;
function threatChance(sim, e) { const t = e.D.threat; return t[Math.min(t.length - 1, (sim.stageNum || 1) - 1)]; }
/** an enemy shot that misses: a tracer past the camera, never through the reticle */
function missShot(sim, e, from) {
  const p = sim.players[e.target]; if (!p) return;
  const c = sim.cameraFor(e.target), side = sim.rng('miss') < .5 ? -1 : 1, off = 8 + sim.rng('miss') * 22;
  const r = [-Math.sin(c.yaw), Math.cos(c.yaw)];
  const to = [c.x + r[0] * side * off + Math.cos(c.yaw) * 20, c.y + r[1] * side * off + Math.sin(c.yaw) * 20, c.z + (sim.rng('miss') - .3) * 18];
  sim.ev({ type: 'eshot', from: from || muzzle(e), to, p: e.target, miss: true, e: e.id, kind: e.type });
}
function fireAt(sim, e, threatHit) { sim.ev({ type: 'eshot', from: muzzle(e), to: null, p: e.target, miss: !threatHit, e: e.id, kind: e.type, impact: !!threatHit }); }

/* ---- the AIs ---- */
const AI = {};
TC.AI = AI;
/** the common gunner: enter, hide, peek, aim (a threat or a miss), fire, hide again, relocate */
AI.gunner = (sim, e, dt) => {
  const D = e.D, react = tune.enemy.reactMul * sim.diff.react;
  switch (e.state) {
    case 'enter': {
      if (enterStep(sim, e, dt)) { e.state = e.entry === 'rappel' ? 'peek' : 'hide'; e.st = 0; e.hideFor = (.2 + sim.rng('ai') * .5) * react; if (e.entry === 'rappel') { e.peekMode = 'up'; e.st = .3; } }
      e.exposed = true; break;
    }
    case 'hide': {
      e.exposed = false; e.dz += (duckDz(e) - e.dz) * Math.min(1, dt * 14);
      if (e.cover) { e.x += (e.hide[0] - e.x) * Math.min(1, dt * 12); e.y += (e.hide[1] - e.y) * Math.min(1, dt * 12); }
      faceTarget(sim, e);
      if (e.st >= e.hideFor) {
        const cyc = D.cycles; e.cycles++;
        const alt = e.cover && e.cycles >= cyc[0] + (sim.rng('ai') * (cyc[1] - cyc[0] + 1) | 0) ? freeCover(sim, e) : null;
        if (alt) { releaseCover(sim, e); e.cover = alt; alt.taken = e.id; e.hide = alt.at.slice(); e.state = 'relocate'; e.st = 0; e.cycles = 0; break; }
        const peeks = e.cover ? e.cover.peek : ['up'];
        e.peekMode = peeks[sim.rng('ai') * peeks.length | 0];
        e.state = 'peek'; e.st = 0;
      }
      break;
    }
    case 'relocate': { e.dz += (0 - e.dz) * Math.min(1, dt * 10); e.exposed = true; if (moveTo(e, e.hide, D.speed, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .3 * react; } break; }
    case 'peek': {
      const k = Math.min(1, e.st / .22);
      const target = peekSpot(e);
      e.x += (target[0] - e.x) * Math.min(1, dt * 16); e.y += (target[1] - e.y) * Math.min(1, dt * 16); e.dz += (0 - e.dz) * Math.min(1, dt * 16);
      faceTarget(sim, e);
      if (k > .5) e.exposed = true;
      if (k >= 1) { e.state = 'aim'; e.st = 0; e.aimFor = (D.aim[0] + sim.rng('ai') * (D.aim[1] - D.aim[0])) * react; e.burstLeft = D.burst; e.expFor = (D.expose[0] + sim.rng('ai') * (D.expose[1] - D.expose[0])) * tune.enemy.fireMul; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), always: D.always, tele: D.tele, kind: e.type, src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive && !e.stunned; }
      break;
    }
    case 'aim': {
      faceTarget(sim, e);
      const ready = e.th ? sim.t >= e.th.T - .02 : e.st >= e.aimFor;
      if (ready) { if (e.th) fireAt(sim, e, true); else missShot(sim, e); e.burstLeft--; e.th = null; e.state = 'fire'; e.st = 0; }
      break;
    }
    case 'fire': {
      faceTarget(sim, e);
      if (e.burstLeft > 0 && e.st >= D.gap * tune.enemy.fireMul) { missShot(sim, e); e.burstLeft--; e.st = 0; }
      if (e.burstLeft <= 0 && e.st > .25) { e.state = e.cover ? 'hide' : 'aimagain'; e.st = 0; e.hideFor = (D.hide[0] + sim.rng('ai') * (D.hide[1] - D.hide[0])) * react; }
      break;
    }
    case 'aimagain': { if (e.st > .6 * react) { e.state = 'peek'; e.st = .3; } break; }
    case 'hit': { if (e.st > .25) { e.state = e.after || 'hide'; e.st = 0; e.hideFor = .4; } break; }
  }
};
function peekSpot(e) {
  if (!e.cover) return [e.x, e.y, e.z];
  const m = e.peekMode, at = e.hide;
  if (m === 'left' || m === 'right') { const s = sideDir(e.cover.face, m === 'left' ? -12 : 12); return [at[0] + s[0], at[1] + s[1], at[2]]; }
  return at;
}
function freeCover(sim, e) {
  const all = sim.scene.coverList.filter(c => !c.taken && c !== e.cover && !c.noRelocate && Math.hypot(c.at[0] - e.x, c.at[1] - e.y) < 220 && Math.abs(c.at[2] - e.z) < 8);
  return all.length ? all[sim.rng('ai') * all.length | 0] : null;
}
function releaseCover(sim, e) { if (e.cover && e.cover.taken === e.id) e.cover.taken = 0; }
/** an entry: returns true when it reaches its cover */
function enterStep(sim, e, dt) {
  const cv = e.cover, to = e.hide || (cv ? cv.at : [e.x, e.y, e.z]), en = e.entry;
  if (en === 'stand') return true;
  if (en === 'rappel') { e.climb = true; e.z = Math.max(to[2], e.z - 48 * dt); e.facing = cv ? cv.face : e.facing; if (e.z <= to[2] + .01) { e.climb = false; e.rope = null; return true; } return false; }
  if (en === 'jump') {
    if (!e.jump) e.jump = { from: [e.x, e.y, e.z], t: 0, dur: .75 };
    const J = e.jump; J.t += dt; const u = Math.min(1, J.t / J.dur);
    e.x = lerp(J.from[0], to[0], u); e.y = lerp(J.from[1], to[1], u); e.z = lerp(J.from[2], to[2], u) + Math.sin(u * Math.PI) * 18; e.air = u < 1; e.facing = Math.atan2(to[1] - J.from[1], to[0] - J.from[0]);
    if (u >= 1) { e.air = false; e.land = 1; return true; } return false;
  }
  if (en === 'vault' || en === 'roll') {
    const d = Math.hypot(to[0] - e.x, to[1] - e.y);
    if (en === 'vault') { e.air = d < 40 && d > 4; e.dz = e.air ? Math.sin((1 - d / 40) * Math.PI) * 14 : 0; }
    else e.flip = d < 44 ? clamp(1 - d / 44, 0, 1) : 0;
    const arrived = moveTo(e, to, e.D.speed * (en === 'roll' ? 1.2 : 1), dt);
    if (arrived) { e.air = false; e.flip = 0; e.dz = 0; } return arrived;
  }
  return moveTo(e, to, e.D.speed, dt);   // run, door, vehicle
}

/** the quartermaster: runs a route across the area carrying ammo; drops it when shot; escapes at the end */
AI.runner = (sim, e, dt) => {
  e.exposed = true;
  if (e.state === 'enter') { e.state = 'route'; e.ri = 1; }
  if (e.state === 'route') {
    if (e.o.wait && e.ri === 1 && e.st < e.o.wait) { faceTarget(sim, e); return; }
    const p = e.route[e.ri]; if (!p) { e.gone = true; sim.ev({ type: 'escape', e: e.id }); return; }
    if (moveTo(e, p, e.D.speed, dt)) e.ri++;
    if (sim.rng('ai') < dt * .3) { faceTarget(sim, e); missShot(sim, e); }
  }
};
/** the rusher: sprints in zigzagging, winds up a slash at the target's cover (cover blocks it), staggers back, repeats */
AI.rusher = (sim, e, dt) => {
  const c = faceTarget(sim, e); if (!c) return;
  const stand = sim.slotGround(e.target), fwd = [Math.cos(c.yaw), Math.sin(c.yaw)], spot = [stand[0] + fwd[0] * 30, stand[1] + fwd[1] * 30, stand[2]];
  e.exposed = true;
  switch (e.state) {
    case 'enter': case 'charge': {
      e.state = 'charge'; const dist = Math.hypot(spot[0] - e.x, spot[1] - e.y), zig = Math.sin(e.st * 4 + e.id) * 30 * Math.min(1, dist / 140);
      const side = sideDir(c.yaw, zig), aimP = [spot[0] + side[0], spot[1] + side[1], spot[2]];
      e.sprint = true;
      if (moveTo(e, aimP, e.D.speed * (dist > 120 ? 1 : .75), dt) || dist < 10) {
        e.sprint = false; e.th = requestThreat(sim, e.target, { always: true, tele: e.D.tele, kind: 'slash', src: e.id, pos: () => e.rig.hand(), onResolve: r => { e.slashRes = r; } });
        if (e.th) { e.state = 'wind'; e.st = 0; e.th.srcAlive = () => e.alive && e.state === 'wind'; } else { e.state = 'circle'; e.st = 0; }
        if (!sim.flag('rusher')) sim.cue('rusher');
      }
      break;
    }
    case 'circle': { e.sprint = false; const side = sideDir(c.yaw, Math.sin(e.st * 2 + e.id) * 40); moveTo(e, [spot[0] + fwd[0] * 50 + side[0], spot[1] + fwd[1] * 50 + side[1], spot[2]], 50, dt); faceTarget(sim, e); if (e.st > 1.2) { e.state = 'charge'; e.st = 0; } break; }
    case 'wind': { faceTarget(sim, e); e.atk = { spec: 'overhead', u: Math.min(1, e.st / Math.max(.1, e.th ? e.th.dur : .45)), phase: 'wind' }; if (e.th && e.th.done) { e.atk = { spec: 'overhead', u: 0, phase: 'active' }; e.state = 'slash'; e.st = 0; sim.ev({ type: 'slash', e: e.id, p: e.target, res: e.th.result }); } break; }
    case 'slash': { e.atk = { spec: 'overhead', u: Math.min(1, e.st / .18), phase: e.st < .18 ? 'active' : 'recover' }; if (e.st > .4) { e.atk = null; e.state = 'stagger'; e.st = 0; e.stag = [-fwd[0] * 60, -fwd[1] * 60]; } break; }
    case 'stagger': { e.atk = null; e.hurtT = .2; if (e.st > 1.0) { e.state = 'back'; e.st = 0; } break; }
    case 'back': { e.atk = null; moveTo(e, [spot[0] + fwd[0] * 150, spot[1] + fwd[1] * 150, spot[2]], 110, dt); e.facing = Math.atan2(c.y - e.y, c.x - e.x); if (e.st > 1.2) { e.state = 'charge'; e.st = 0; } break; }
    case 'hit': { e.atk = null; if (e.st > .3) { e.state = 'back'; e.st = .3; } break; }
  }
};
/** the shield trooper: advances behind a riot shield (immune from the front), fires over it; a shotgun or grenade
 *  knocks the shield aside for 1.5 s */
AI.shield = (sim, e, dt) => {
  e.shieldOff = Math.max(0, e.shieldOff - dt); e.shieldOn = e.shieldOff <= 0;
  const D = e.D;
  if (e.state === 'hide') { e.state = 'brace'; e.st = 0; }
  e.dz += (0 - e.dz) * Math.min(1, dt * 10);
  if (e.state === 'enter') { if (enterStep(sim, e, dt)) { e.state = 'brace'; e.st = 0; } faceTarget(sim, e); e.exposed = true; return; }
  if (e.state === 'brace') { faceTarget(sim, e); e.exposed = false; if (e.st > .9) { e.state = 'over'; e.st = 0; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), tele: D.tele, kind: 'shield', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive && e.shieldOn; e.burstLeft = D.burst; } return; }
  if (e.state === 'over') {
    faceTarget(sim, e); e.exposed = true;
    if (e.th ? sim.t >= e.th.T - .02 : e.st > .7) { if (e.th) fireAt(sim, e, true); else missShot(sim, e); e.th = null; e.state = 'fire'; e.st = 0; e.burstLeft--; }
    return;
  }
  if (e.state === 'fire') { faceTarget(sim, e); if (e.burstLeft > 0 && e.st > D.gap) { missShot(sim, e); e.burstLeft--; e.st = 0; } if (e.burstLeft <= 0 && e.st > .3) { e.state = 'advance'; e.st = 0; const nx = e.o.advance && e.o.advance[e.adv = (e.adv || 0)]; e.advTo = nx || null; if (nx) e.adv++; } return; }
  if (e.state === 'advance') { e.exposed = false; if (!e.advTo || moveTo(e, e.advTo, D.speed, dt) || e.st > 3) { e.state = 'brace'; e.st = 0; } return; }
  if (e.state === 'hit') { if (e.st > .3) { e.state = 'brace'; e.st = 0; } }
};
/** the sniper: stands far and high; a laser converges on the target for 1.4 s (always a threat) */
AI.sniper = (sim, e, dt) => {
  if (e.state === 'enter') { if (enterStep(sim, e, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .8; } e.exposed = true; return; }
  if (e.state === 'hide') { e.exposed = false; e.dz += (duckDz(e) - e.dz) * Math.min(1, dt * 10); faceTarget(sim, e); if (e.st > e.hideFor) { e.state = 'peek'; e.st = 0; e.peekMode = (e.cover && e.cover.peek[sim.rng('ai') * e.cover.peek.length | 0]) || 'up'; } return; }
  if (e.state === 'peek') { const t = peekSpot(e); e.x += (t[0] - e.x) * Math.min(1, dt * 12); e.y += (t[1] - e.y) * Math.min(1, dt * 12); e.dz += -e.dz * Math.min(1, dt * 12); faceTarget(sim, e); if (e.st > .3) { e.exposed = true; e.state = 'laser'; e.st = 0; e.th = requestThreat(sim, e.target, { always: true, tele: e.D.tele, kind: 'sniper', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive; else { e.state = 'hide'; e.st = 0; e.hideFor = .4; } } return; }
  if (e.state === 'laser') { faceTarget(sim, e); e.exposed = true; e.laser = e.th ? clamp((sim.t - e.th.t0) / e.th.dur, 0, 1) : 0; if (!e.th || e.th.done) { if (e.th) fireAt(sim, e, true); e.laser = 0; e.th = null; e.state = 'hide'; e.st = 0; e.hideFor = 1.5 * tune.enemy.reactMul; } return; }
  if (e.state === 'relocate') { e.exposed = true; e.laser = 0; if (moveTo(e, e.hide, 70, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .6; } return; }
  if (e.state === 'hit') { e.laser = 0; if (e.st > .3) { e.state = 'hide'; e.st = 0; e.hideFor = 1; } }
};
/** the grenadier: peeks, throws a grenade that lands in front of the target's cover (a threat at landing; shoot it) */
AI.thrower = (sim, e, dt) => {
  if (e.state === 'aim') {
    faceTarget(sim, e); e.atk = { spec: 'throw', u: Math.min(1, e.st / .5), phase: e.st < .5 ? 'wind' : 'active' };
    if (e.st >= .5 && !e.thrown) { e.thrown = true; throwGrenade(sim, e); }
    if (e.st > .9) { e.atk = null; e.thrown = false; e.state = 'hide'; e.st = 0; e.hideFor = (1.6 + sim.rng('ai')) * tune.enemy.reactMul; }
    return;
  }
  if (e.state === 'peek' && e.st >= .22) { e.th = null; e.state = 'aim'; e.st = 0; e.exposed = true; return; }
  AI.gunner(sim, e, dt);
  if (e.state === 'aim' && e.th) { e.th.done = true; e.th.cancelled = true; e.th = null; }
};
function throwGrenade(sim, e) {
  const tgt = e.target; if (tgt < 0) return;
  const c = sim.cameraFor(tgt), g = sim.slotGround(tgt), land = [g[0] + Math.cos(c.yaw) * (30 + sim.rng('ai') * 30), g[1] + Math.sin(c.yaw) * (30 + sim.rng('ai') * 30), g[2]];
  const h = e.rig.hand(), T = 1.1 + sim.rng('ai') * .3;
  const pr = sim.launch({ kind: 'grenade', owner: -1, pos: h, vel: [(land[0] - h[0]) / T, (land[1] - h[1]) / T, (land[2] - h[2]) / T + .5 * 300 * T], gravity: 300, life: T + .05, r: 3.5, hp: 1, target: tgt, land, src: e.id });
  pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'grenade', src: pr.id, pos: () => pr.pos });
  if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.T = pr.th.T; }
  if (!sim.flag('grenade')) sim.cue('grenade');
}
/** the rocketeer: aims with a glint, fires a rocket (shootable; a threat on arrival) */
AI.rocket = (sim, e, dt) => {
  if (e.state === 'aim') {
    faceTarget(sim, e); e.glint = Math.min(1, e.st / .8);
    if (e.st >= .8 && !e.fired) { e.fired = true; fireRocket(sim, e); }
    if (e.st > 1.4) { e.fired = false; e.glint = 0; e.state = 'hide'; e.st = 0; e.hideFor = (1.8 + sim.rng('ai')) * tune.enemy.reactMul; }
    return;
  }
  if (e.state === 'peek' && e.st >= .22) { e.state = 'aim'; e.st = 0; e.exposed = true; return; }
  AI.gunner(sim, e, dt);
  if (e.state === 'aim' && e.th) { e.th.done = true; e.th.cancelled = true; e.th = null; }
};
function fireRocket(sim, e) {
  const tgt = e.target; if (tgt < 0) return;
  const c = sim.cameraFor(tgt), m = muzzle(e), to = [c.x + Math.cos(c.yaw) * 14, c.y + Math.sin(c.yaw) * 14, c.z - 6], d = V3.dist(m, to), sp = 230, T = d / sp;
  const dir = V3.norm(V3.sub(to, m));
  const pr = sim.launch({ kind: 'rocket', owner: -1, pos: m, vel: V3.mul(dir, sp), gravity: 0, life: T + .1, r: 4, hp: 1, target: tgt, land: to, src: e.id });
  pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'rocket', src: pr.id, pos: () => pr.pos });
  if (pr.th) { pr.th.srcAlive = () => pr.alive; const k = d / Math.max(.1, pr.th.dur); pr.vel = V3.mul(dir, k); pr.life = pr.th.dur + .05; }
  sim.ev({ type: 'rocketfire', at: m });
  if (!sim.flag('rocket')) sim.cue('rocket');
}
/** the drone: a quadrotor orbiting its point, zapping (sometimes a threat) */
AI.drone = (sim, e, dt) => {
  e.exposed = true; e.ph += dt * (.8 + (e.id % 3) * .15);
  if (e.o.follow) { const C = sim.carriers[e.o.follow]; if (C && C.M) e.center = xform(C.M, e.o.local || [60, 0, 40]); }
  const c0 = e.center, R = e.orbit;
  if (e.state === 'enter') { e.state = 'fly'; e.st = 0; e.nextShot = 1.2 + sim.rng('ai') * 1.5; }
  const tx = c0[0] + Math.cos(e.ph) * R * .6, ty = c0[1] + Math.sin(e.ph * 1.3) * R, tz = c0[2] + Math.sin(e.ph * 2.1) * 12;
  e.x += (tx - e.x) * Math.min(1, dt * 3); e.y += (ty - e.y) * Math.min(1, dt * 3); e.z += (tz - e.z) * Math.min(1, dt * 3);
  faceTarget(sim, e);
  if (e.state === 'fly' && e.st > e.nextShot) { e.state = 'charge'; e.st = 0; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), tele: e.D.tele, kind: 'drone', src: e.id, pos: () => [e.x, e.y, e.z] }); if (e.th) e.th.srcAlive = () => e.alive; }
  if (e.state === 'charge' && (e.th ? sim.t >= e.th.T - .02 : e.st > .6)) { if (e.th) fireAt(sim, e, true); else missShot(sim, e, [e.x, e.y, e.z]); e.th = null; e.state = 'fly'; e.st = 0; e.nextShot = 1.4 + sim.rng('ai') * 1.6; }
};
/** the jet ski: races a water path, its rider firing a pistol; the ski blows up after 3 hits and takes the rider */
AI.jetski = (sim, e, dt) => {
  e.exposed = true; e.d += e.speed * dt;
  if (e.d >= e.path.length) { e.gone = true; return; }
  const p = e.path.at(e.d); e.x = p.x; e.y = p.y; e.z = p.z + Math.sin(sim.t * 9 + e.id) * 1.2; e.ski = { x: p.x, y: p.y, z: p.z, yaw: p.angle };
  e.skiYaw = p.angle;
  const c = faceTarget(sim, e); void c;
  if (e.state === 'enter') { e.state = 'ride'; e.st = 0; e.nextShot = .8 + sim.rng('ai'); }
  if (e.state === 'ride' && e.st > e.nextShot) { e.state = 'aim'; e.st = 0; e.th = requestThreat(sim, e.target, { chance: threatChance(sim, e), tele: e.D.tele, kind: 'jetski', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive; }
  if (e.state === 'aim' && (e.th ? sim.t >= e.th.T - .02 : e.st > .5)) { if (e.th) fireAt(sim, e, true); else missShot(sim, e); e.th = null; e.state = 'ride'; e.st = 0; e.nextShot = 1 + sim.rng('ai') * 1.2; }
};
/** the mounted gunner: on a bridge or a truck, long bursts */
AI.turret = (sim, e, dt) => {
  if (e.state === 'enter') { if (enterStep(sim, e, dt)) { e.state = 'hide'; e.st = 0; e.hideFor = .6; } return; }
  AI.gunner(sim, e, dt);
};
/** the captor: holds Dr. Tejada; only his head shows, in short windows */
AI.captor = (sim, e, dt) => {
  e.exposed = false;
  if (e.state === 'hold') {
    faceTarget(sim, e);
    if (e.st > 1.2) { e.state = 'lean'; e.st = 0; e.th = requestThreat(sim, e.target, { always: true, tele: e.D.tele * 1.2, kind: 'captor', src: e.id, pos: () => muzzle(e) }); if (e.th) e.th.srcAlive = () => e.alive; }
  } else if (e.state === 'lean') {
    faceTarget(sim, e); e.lean = Math.min(1, e.st / .2); e.exposed = true;
    if (e.th && sim.t >= e.th.T - .02) { fireAt(sim, e, true); e.th = null; }
    if (e.st > .7 + (e.th ? Math.max(0, e.th.T - sim.t) : 0)) { e.lean = 0; e.state = 'hold'; e.st = 0; }
  } else if (e.state === 'hit') { e.state = 'hold'; }
};
/** civilians run their route and crouch with their hands over their heads */
AI.civilian = (sim, e, dt) => {
  if (e.state === 'flee') { const p = e.route && e.route[e.ri + 1]; if (!p) { e.state = 'cower'; e.st = 0; return; } e.sprint = true; if (moveTo(e, p, e.o.speed || 120, dt)) e.ri++; }
  else if (e.state === 'cower') { e.sprint = false; if (e.o.leave && e.st > e.o.leave) e.gone = true; }
};
/** allies (single player): stand at their marks, aim at the nearest live enemy, take scripted shots */
AI.ally = (sim, e, dt) => {
  let best = null, bd = 1e9; for (const o of sim.enemies) if (o.alive && !o.civ && !o.ally) { const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; best = o; } }
  if (best) { e.facing = Math.atan2(best.y - e.y, best.x - e.x); e.aimA = Math.atan2(best.z + 18 - (e.z + 22), bd); }
  e.point = !!best;
  if (best && e.st > (e.o.every || 3.5)) { e.st = 0; sim.ev({ type: 'eshot', from: muzzle(e), to: [best.x, best.y, best.z + 18], ally: true, e: e.id }); if (e.o.kills && sim.rng('ally') < .5) damageEnemy(sim, best, 9, null, 'torso', { ally: true }); }
};

/* ---- the rig's pose from the enemy's state ---- */
function poseRig(sim, e, dt) {
  const s = { x: e.x, y: e.y, z: e.z + e.dz, vx: e.vx, vy: e.vy, facing: e.facing };
  if (e.alive) {
    const st = e.state;
    const aiming = (st === 'aim' || st === 'fire' || st === 'laser' || st === 'over' || st === 'charge' && e.D.ai === 'drone' || (st === 'peek' && e.st > .1) || st === 'lean' || st === 'ride' || st === 'hold');
    s.point = aiming && e.D.ai !== 'thrower' && e.D.ai !== 'rusher' && e.D.ai !== 'civilian' || (e.ally && e.point);
    s.aim = e.aimA || 0;
    if (st === 'hide' && e.cover && e.cover.h < 34) s.pose = 'crouch';
    if (e.D.ai === 'civilian' && st === 'cower') { s.pose = 'crouch'; s.expr = 'wince'; }
    if (e.D.ai === 'civilian' && st === 'flee') { s.expr = 'shout'; }
    if (e.D.ai === 'shield' && st !== 'over' && st !== 'fire') s.stance = 'ready';
    if (e.D.ai === 'jetski') s.pose = 'kneel';
    if (e.climb) { s.climb = true; s.vz = -48; }
    if (e.air) s.air = true;
    if (e.sprint) s.sprint = true;
    if (e.flip) s.flip = e.flip;
    if (e.land) { s.land = e.land; e.land = 0; }
    if (e.hurtT > 0) s.hurt = true;
    if (e.atk) s.attack = { spec: E.MOVES[e.atk.spec] || E.MOVES.slash, phase: e.atk.phase, u: e.atk.u };
    if (e.D.elite || e.type === 'rusher') s.expr = 'angry';
    if (e.lean) { const sd = sideDir(e.facing, e.side * 7 * e.lean); s.x += sd[0]; s.y += sd[1]; }
  } else {
    const k = e.deathT;
    s.pose = e.style === 'flyback' || e.style === 'fall' || e.style === 'splash' ? null : 'die';
    if (e.style === 'flyback') { s.flip = Math.min(1, k / .5); if (k > .5) { s.down = 1; s.flip = 0; } }
    if (e.style === 'fall' || e.style === 'splash') { s.air = e.z > e.floorZ + 1; if (!s.air) s.down = Math.min(1, (k - e.landT) / .2); }
    if (e.style === 'head') s.expr = 'wince';
  }
  e.rig.update(dt, s);
}
/** hit volumes from a rig's joints: head sphere, torso and leg capsules */
function volsOf(rig) {
  const J = rig.J, s = rig.o.size, w = p => { const o = rig.worldOffset(p); return [rig.x + o[0], rig.y + o[1], rig.z + o[2]]; };
  const fl = w(J.footL), fr = w(J.footR), hip = w(J.hipC);
  return { head: { c: w(J.head), r: rig.o.headR * s * 1.25 }, torso: { a: hip, b: w(J.shC), r: rig.o.torsoW * .85 * s }, legs: { a: hip, b: [(fl[0] + fr[0]) / 2, (fl[1] + fr[1]) / 2, (fl[2] + fr[2]) / 2], r: 2.3 * s } };
}
TC.volsOf = volsOf;
function rigVols(e) {
  e.vols = e.alive || e.deathT < .05 ? volsOf(e.rig) : null;
  if (e.vols && e.D.ai === 'shield' && e.shieldOn) {
    const f = [Math.cos(e.facing), Math.sin(e.facing)], c = [e.x + f[0] * 7, e.y + f[1] * 7];
    e.vols.shield = { a: [c[0], c[1], e.z + 3], b: [c[0], c[1], e.z + (e.state === 'over' || e.state === 'fire' ? 19 : 27)], r: 7.5 };
  }
  if (e.vols && e.D.ai === 'captor') { if (!e.lean) e.vols = { head: e.vols.head, hidden: true }; }
}
function meshVols(sim, e) {
  if (e.D.ai === 'drone') e.vols = e.alive ? { body: { c: [e.x, e.y, e.z], r: 7 } } : null;
}

/* ---- damage, reactions, deaths ---- */
/** damage an enemy: part 'head' | 'torso' | 'legs' | 'body' | 'blast'; o = { weapon, ally, from } -> the points it scored */
function damageEnemy(sim, e, dmg, p, part, o = {}) {
  if (!e.alive) return 0;
  if (e.civ) { civHit(sim, e, p); return 0; }
  if (e.ally) { sim.ev({ type: 'allyhit', e: e.id }); return 0; }
  const mul = part === 'head' ? 2 : part === 'legs' ? .75 : 1;
  e.hp -= dmg * mul; e.flash = 1; e.hurtT = .25;
  let pts = 0;
  if (p) { pts += addScore(sim, p, 100, null); p.stats.hits++; addHitChain(p); if (part === 'head') p.stats.heads++; }
  sim.ev({ type: 'ehit', e: e.id, part, p: p ? p.id : -1, at: e.vols && e.vols.head ? e.vols.head.c : [e.x, e.y, e.z + 18] });
  if (e.hp <= 0) return pts + killEnemy(sim, e, p, part, o);
  // reactions
  if ((part === 'legs' || (o.weapon && reg('weapon', o.weapon).stagger)) && e.rig) { const c = p ? sim.cameraFor(p.id) : null; if (c) { const a = Math.atan2(e.y - c.y, e.x - c.x), k = o.weapon === 'sg' ? 60 : 30; e.stag = [Math.cos(a) * k, Math.sin(a) * k]; } }
  if (e.D.ai === 'shield' && o.weapon && (o.weapon === 'sg' || o.weapon === 'gl')) { e.shieldOff = 1.5; e.shieldOn = false; sim.ev({ type: 'shieldoff', e: e.id }); }
  if (e.D.ai === 'gunner' || e.D.ai === 'thrower' || e.D.ai === 'rocket' || e.D.ai === 'sniper' || e.D.ai === 'shield' || e.D.ai === 'turret') {
    if (e.th && !e.D.always && e.hp < e.hp0) { e.th.done = true; e.th.cancelled = true; sim.ev({ type: 'threatoff', th: e.th.id }); e.th = null; }
    if (e.state === 'aim' || e.state === 'fire' || e.state === 'over' || e.state === 'laser') { e.after = 'hide'; e.state = 'hit'; e.st = 0; e.laser = 0; }
  }
  if (e.D.ai === 'rusher' && (o.weapon === 'sg' || o.weapon === 'gl')) { e.state = 'hit'; e.st = 0; const c = p ? sim.cameraFor(p.id) : null; if (c) { const a = Math.atan2(e.y - c.y, e.x - c.x); e.stag = [Math.cos(a) * 160, Math.sin(a) * 160]; } if (e.th) { e.th.done = true; e.th.cancelled = true; } }
  return pts;
}
TC.damageEnemy = damageEnemy;
function killEnemy(sim, e, p, part, o = {}) {
  e.alive = false; e.state = 'dead'; e.deathT = 0; e.exposed = false; releaseCover(sim, e);
  if (e.th && !e.th.done) { e.th.done = true; e.th.cancelled = true; sim.ev({ type: 'threatoff', th: e.th.id }); }
  for (const th of sim.threats) if (!th.done && th.src === e.id && th.kind !== 'grenade' && th.kind !== 'rocket') { th.done = true; th.cancelled = true; sim.ev({ type: 'threatoff', th: th.id }); }
  const w = o.weapon;
  e.style = e.cover && e.cover.water ? 'splash' : e.cover && e.cover.ledge ? 'fall' : part === 'blast' || (w === 'sg' && p && Math.hypot(e.x - sim.cameraFor(p.id).x, e.y - sim.cameraFor(p.id).y) < 200) ? 'flyback' : w === 'mg' ? 'spin' : part === 'head' ? 'head' : 'crumple';
  if (e.D.ai === 'jetski') e.style = 'splash';
  e.floorZ = e.cover && e.cover.floor !== undefined ? e.cover.floor : (e.style === 'splash' ? (sim.waterZ() - 30) : e.z);
  if (e.style === 'fall' || e.style === 'splash') { const c = p ? sim.cameraFor(p.id) : sim.cameraFor(0), a = Math.atan2(c.y - e.y, c.x - e.x); e.fallV = [Math.cos(a) * 30, Math.sin(a) * 30, 40]; e.landT = 99; }
  if (e.style === 'flyback') { const c = p ? sim.cameraFor(p.id) : sim.cameraFor(0), a = Math.atan2(e.y - c.y, e.x - c.x); e.fallV = [Math.cos(a) * 110, Math.sin(a) * 110, 30]; }
  let pts = 0;
  if (p) {
    p.stats.kills++;
    pts += addScore(sim, p, e.D.score, [e.x, e.y, e.z + 30]);
    if (part === 'head') pts += addScore(sim, p, 500, [e.x, e.y, e.z + 40]), sim.ev({ type: 'headshot', p: p.id });
    if (e.expT > 0 && e.expT < .7 && e.D.ai !== 'runner') { pts += addScore(sim, p, 500, [e.x, e.y, e.z + 46]); p.stats.quick++; sim.ev({ type: 'quick', p: p.id }); }
    if (e.elite) sim.timeExtend(tune.time.eliteBonus);
    if (e.drop) givePickup(sim, p, e.drop, e.o.amount);
  }
  sim.ev({ type: 'kill', e: e.id, p: p ? p.id : -1, kind: e.type, style: e.style, at: [e.x, e.y, e.z + 18], pts });
  if (e.hostage) sim.say('tejada', 'Mari! You came!');
  if (e.o.onKill) sim.cue(e.o.onKill);
  sim.cue('kill:' + e.type);
  return pts;
}
TC.killEnemy = killEnemy;
function civHit(sim, e, p) {
  if (!p || e.civHitT > sim.t) return;
  e.civHitT = sim.t + .8; e.flash = 1; e.hurtT = .4;
  p.stats.civ++; addScore(sim, p, -5000, [e.x, e.y, e.z + 30], true); if (p.score < 0) p.score = 0;
  hurtPlayer(sim, p, 'civilian', true);
  sim.ev({ type: 'civhit', p: p.id, e: e.id });
  sim.say('juno', 'Hold your fire! Civilians!');
}
TC.civHit = civHit;
function givePickup(sim, p, w, amount) {
  const W = reg('weapon', w); if (!W) return;
  const n = Math.round((amount || W.pickup) * tune.weapons.ammoMul), had = p.ammo[w] > 0 || p.seen && p.seen[w];
  p.ammo[w] = Math.min(W.pool, p.ammo[w] + n); (p.seen || (p.seen = {}))[w] = true;
  sim.ev({ type: 'pickup', p: p.id, w, n, first: !had });
}
TC.givePickup = givePickup;
function deadStep(sim, e, dt) {
  e.deathT += dt;
  if (e.fallV) {
    e.x += e.fallV[0] * dt; e.y += e.fallV[1] * dt; e.fallV[0] *= Math.pow(.15, dt); e.fallV[1] *= Math.pow(.15, dt);
    if (e.style === 'fall' || e.style === 'splash') { e.fallV[2] -= 320 * dt; e.z += e.fallV[2] * dt; if (e.z <= e.floorZ) { e.z = e.floorZ; if (e.landT === 99) { e.landT = e.deathT; sim.ev({ type: e.style === 'splash' ? 'splash' : 'thud', at: [e.x, e.y, e.z] }); } e.fallV[0] = e.fallV[1] = 0; } }
    if (e.style === 'flyback' && e.deathT > .6) e.fallV = null;
  }
  if (e.style === 'spin' && e.deathT < .4) e.facing += dt * 5;
  if (e.mesh) { e.z -= dt * 80; e.ph = (e.ph || 0) + dt * 9; if (e.z < sim.groundBelow(e) && !e.boom) { e.boom = true; sim.explode([e.x, e.y, e.z], 30, 0, -1, true); e.gone = true; } if (e.deathT > 3) e.gone = true; return; }
  if (e.style === 'splash' && e.z <= e.floorZ + 1 && e.deathT > 1.2) { e.gone = true; return; }
  if (e.deathT > 2.5) e.alpha = Math.max(0, 1 - (e.deathT - 2.5) / .5);
  if (e.deathT > 3) e.gone = true;
}

// ---- 22-threats.js ----
/* 22-threats: the ThreatDirector, our crisis flash. A shot becomes a THREAT (a hit if the player is still exposed when
 * it lands) only if the chance roll passes, the player has fewer active threats than the cap, and no two impacts on one
 * player land closer than minGap; otherwise it is a miss (spectacle). Some attacks are always threats (Red Tide,
 * snipers, rockets, slashes, torpedoes, bosses): they wait for a free slot instead. Pop-out protection slides an impact
 * that is about to land when the player leaves cover. Resolution happens at impact time. Reads tune.enemy. */
function maxThreats(sim) {
  if (tune.enemy.maxThreats > 0) return tune.enemy.maxThreats;
  const base = sim.stage && sim.stage.maxThreats || (sim.stageNum <= 1 ? 1 : 2);
  return Math.max(1, base + sim.diff.maxThreats);
}
TC.maxThreats = maxThreats;
/** choose the player an enemy aims at: alive, present, fewest threats, then the nearest seat */
function pickTarget(sim, from) {
  let best = -1, bs = 1e9;
  for (const p of sim.players) {
    if (p.out || !p.present) continue;
    const n = sim.threats.filter(t => t.target === p.id && !t.done).length, cam = sim.cameraFor(p.id), d = from ? Math.hypot(cam.x - from[0], cam.y - from[1]) : 0;
    const s = n * 1000 + d * .1 + sim.rng('target') * 60;
    if (s < bs) { bs = s; best = p.id; }
  }
  return best;
}
TC.pickTarget = pickTarget;
/**
 * ask for a threat on player `target`: o = { chance, tele (s), always, kind, src (an enemy or object id), pos () => muzzle
 * point, part } -> the threat, or null (a miss). The impact time T respects minGap against every active threat on
 * that player
 */
function requestThreat(sim, target, o) {
  const p = sim.players[target]; if (!p || p.out) return null;
  const active = sim.threats.filter(t => t.target === target && !t.done), cap = maxThreats(sim);
  if (!o.always) {
    const chance = (o.chance || 0) * tune.enemy.threatMul * sim.diff.threat;
    if (sim.rng('threat') >= chance) return null;
    if (active.length >= cap) return null;
  } else if (active.length >= cap + 1) return null;
  const gap = tune.enemy.minGap, tele = (o.tele || 1) * tune.enemy.teleMul;
  let T = sim.t + tele;
  const times = active.map(t => t.T).concat(p.lastImpact !== undefined ? [p.lastImpact] : []).sort((a, b) => a - b);
  for (let k = 0; k < 6; k++) { let moved = false; for (const u of times) if (Math.abs(T - u) < gap) { T = u + gap; moved = true; } if (!moved) break; }
  const th = { id: sim.nid(), target, t0: sim.t, T, dur: T - sim.t, kind: o.kind || 'shot', src: o.src || 0, pos: o.pos || null, done: false, slid: false, part: o.part || null, onResolve: o.onResolve || null, unblockable: !!o.unblockable, at: o.at || null };
  sim.threats.push(th);
  sim.ev({ type: 'threat', th: th.id, p: target, kind: th.kind, src: th.src, dur: th.dur });
  return th;
}
TC.requestThreat = requestThreat;
/** each step: resolve threats that land, drop threats whose source died first */
function threatsStep(sim) {
  for (const th of sim.threats) {
    if (th.done) continue;
    if (th.src && th.srcAlive && !th.srcAlive()) { th.done = true; th.cancelled = true; sim.ev({ type: 'threatoff', th: th.id }); continue; }
    const p = sim.players[th.target];
    // a remote player's impact resolves .2 s late, by the host, against the cover it reported for the impact's time
    if (sim.t < th.T + (p && p.remote ? .2 : 0)) continue;
    th.done = true;
    if (!p || p.out || !p.present) continue;
    p.lastImpact = sim.t;
    let exposed = p.c < .5 || th.unblockable;
    if (p.remote && !th.unblockable) { const f = sim.forced && sim.forced[th.id]; if (f !== undefined) exposed = f === 1; else if (sim.resolver) { const r = sim.resolver(th, p); if (r) exposed = r === 'hit'; } }
    if (exposed && p.inv <= 0 && !sim.cheat(p, 'god')) { hurtPlayer(sim, p, th.kind); th.result = 'hit'; }
    else if (exposed) { th.result = 'immune'; sim.ev({ type: 'graze', p: p.id }); }
    else { th.result = 'blocked'; p.stats.saves++; sim.ev({ type: 'blocked', p: p.id, kind: th.kind, at: th.at }); }
    if (p.remote && sim.onResolved) sim.onResolved(th, exposed ? 'hit' : 'blocked');
    if (th.onResolve) th.onResolve(th.result);
  }
  if (sim.threats.length > 40) sim.threats = sim.threats.filter(t => !t.done || sim.t - t.T < 1);
}
TC.threatsStep = threatsStep;
/** pop-out protection: leaving cover with less than .15 s of a telegraph left slides that impact .15 s later */
function threatsPopOut(sim, p) {
  for (const th of sim.threats) if (!th.done && th.target === p.id && !th.slid && th.T - sim.t < .15) { th.T = sim.t + .15; th.slid = true; }
}
TC.threatsPopOut = threatsPopOut;

// ---- 23-projectiles.js ----
/* 23-projectiles: grenades, rockets, harpoons, torpedoes, missiles, flares and the player's grenade-launcher rounds.
 * Every enemy projectile is shootable (shot down in the air: +1,000) and carries its threat; explosions hurt enemies
 * only (never players: their damage comes from threats). Reads the Sim; emits 'explode', 'shotdown' events. */
const PROJ = {
  pgl: { r: 2, color: '#d8e0e8' },
  grenade: { r: 3.5, hp: 1, color: '#3a4a2a', blast: 40 },
  rocket: { r: 4, hp: 1, color: '#c8ccd4', trail: true, blast: 30 },
  harpoon: { r: 4, hp: 2, color: '#c8c0b0', rope: true },
  torpedo: { r: 7, hp: 2, color: '#3a3e48', wake: true, blast: 40 },
  missile: { r: 4.5, hp: 1, color: '#d8d8d8', trail: true, blast: 34 },
  flare: { r: 5, hp: 1, color: '#ff7a2a', glow: true, blast: 24 }
};
TC.PROJ = PROJ;
function launch(sim, o) {
  const P = PROJ[o.kind] || {};
  const pr = Object.assign({ id: sim.nid(), alive: true, t: 0, gravity: 0, hp: P.hp || 1, r: P.r || 3, life: 3, owner: -1 }, o);
  pr.vel = pr.vel.slice(); pr.pos = pr.pos.slice();
  sim.projectiles.push(pr);
  sim.ev({ type: 'launch', id: pr.id, kind: pr.kind, at: pr.pos.slice() });
  return pr;
}
TC.launch = launch;
function projectilesStep(sim, dt) {
  for (const pr of sim.projectiles) {
    if (!pr.alive) continue;
    pr.t += dt; const prev = pr.pos.slice();
    if (pr.home && pr.th && !pr.th.done) {   // aim the rest of the flight at the landing point, arriving at the threat's time
      const left = Math.max(.02, pr.th.T - sim.t), tgt = pr.land; pr.vel = [(tgt[0] - pr.pos[0]) / left, (tgt[1] - pr.pos[1]) / left, (tgt[2] - pr.pos[2]) / left + (pr.gravity ? .5 * pr.gravity * left : 0)];
    }
    pr.vel[2] -= pr.gravity * dt;
    pr.pos[0] += pr.vel[0] * dt; pr.pos[1] += pr.vel[1] * dt; pr.pos[2] += pr.vel[2] * dt;
    if (pr.kind === 'pgl') {
      const d = V3.sub(pr.pos, prev), L = V3.len(d) || 1, ray = { o: prev, d: V3.mul(d, 1 / L) };
      const hit = sim.rayWorld(ray, L, true);
      const hitE = sim.rayEnemies(ray, L), hb = sim.boss && !sim.boss.dead && sim.boss.rayTest ? sim.boss.rayTest(sim, ray) : null, hitB = hb && hb.t <= L ? hb : null;
      if (hitE || hit || hitB || pr.pos[2] < sim.waterZ() || pr.t > pr.life) {
        const tt = Math.min(hitE ? hitE.t : 1e9, hit ? hit.t : 1e9, hitB ? hitB.t : 1e9), at = tt < 1e9 ? V3.add(prev, V3.mul(ray.d, tt)) : pr.pos;
        pr.alive = false; sim.explode(at, tune.weapons.glRadius, tune.weapons.glDamage, pr.owner, false, 'gl');
      }
      continue;
    }
    if (pr.t >= pr.life || (pr.th && pr.th.done)) {   // it arrived: the threat resolves on its own clock; the blast is spectacle
      pr.alive = false;
      const P = PROJ[pr.kind] || {};
      if (P.blast) sim.ev({ type: 'explode', at: (pr.land || pr.pos).slice(), r: Math.min(18, P.blast), small: true, kind: pr.kind, arrival: true });
    }
  }
  sim.projectiles = sim.projectiles.filter(p => p.alive);
}
TC.projectilesStep = projectilesStep;
/** a projectile shot (by player p): hp down; at 0 it bursts in the air (its threat is cancelled) */
function shootProjectile(sim, pr, p, dmg) {
  pr.hp -= dmg; sim.ev({ type: 'phit', id: pr.id, at: pr.pos.slice() });
  if (pr.hp > 0) return 100;
  pr.alive = false;
  if (pr.th && !pr.th.done) { pr.th.done = true; pr.th.cancelled = true; sim.ev({ type: 'threatoff', th: pr.th.id }); }
  const P = PROJ[pr.kind] || {};
  sim.explode(pr.pos, P.blast || 30, pr.kind === 'grenade' ? 8 : 4, p ? p.id : -1, true, 'shotdown');
  sim.ev({ type: 'shotdown', p: p ? p.id : -1, kind: pr.kind, at: pr.pos.slice() });
  if (pr.onShot) pr.onShot(p);
  return p ? addScore(sim, p, 1000, pr.pos.slice()) : 0;
}
TC.shootProjectile = shootProjectile;

// ---- 24-objects.js ----
/* 24-objects: shootable things in the world: breakables (crates, windows, paper lanterns, market goods, signs),
 * explosive barrels and tanks (chain reactions), life rings (1UP), intel bottles, the sluice locks, training
 * targets. Each has a local mesh (built once per kind) and a box for rays. Explosions hurt enemies only. */
const OBJ = {
  barrel: { hp: 2, box: [-6, -6, 0, 6, 6, 17], explode: 56, dmg: 8, score: 300, impact: 'metal',
    build: G => { G.cyl('hull-red', 0, 0, 0, 6, 17, { seg: 10, top: 'steel-dk' }); G.cyl('hazard', 0, 0, 7, 6.3, 3, { seg: 10, caps: false }); } },
  tank: { hp: 3, box: [-9, -9, 0, 9, 9, 30], explode: 70, dmg: 9, score: 500, impact: 'metal', vapor: true,
    build: G => { G.cyl('hull-white', 0, 0, 0, 9, 26, { seg: 12 }); G.lathe('hull-white', 0, 0, 26, [[9, 0], [6, 3], [0, 4]], { seg: 12 }); G.cyl('hazard', 0, 0, 10, 9.3, 3, { seg: 12, caps: false }); } },
  generator: { hp: 3, box: [-10, -7, 0, 10, 7, 18], explode: 70, dmg: 9, score: 500, impact: 'metal',
    build: G => { G.box('hull-red', -10, -7, 0, 10, 7, 14, { top: 'steel-dk' }); G.cyl('steel-dk', -5, 0, 14, 3, 4); G.box('hazard', -10.2, -7.2, 5, 10.2, 7.2, 7); } },
  fuel: { hp: 3, box: [-7, -7, 0, 7, 7, 18], explode: 60, dmg: 10, score: 300, impact: 'metal',
    build: G => { G.cyl('paint-orange', 0, 0, 0, 7, 18, { seg: 10 }); G.cyl('hazard', 0, 0, 8, 7.3, 2.5, { seg: 10, caps: false }); } },
  crate: { hp: 3, box: [-8, -8, 0, 8, 8, 15], score: 50, impact: 'wood', debris: 'wood', blocks: true, build: G => G.box('crate', -8, -8, 0, 8, 8, 15, { solid: false }) },
  lantern: { hp: 1, box: [-3, -3, -6, 3, 3, 1], score: 50, impact: 'cloth', debris: 'fire', hang: true,
    build: G => { G.lathe('paper-lantern', 0, 0, -6, [[0, 0], [2.6, .8], [3.2, 3], [2.6, 5.2], [0, 6]], { seg: 8 }); } },
  lanternR: { hp: 1, box: [-3, -3, -6, 3, 3, 1], score: 50, impact: 'cloth', debris: 'fire', hang: true,
    build: G => { G.lathe('lantern-red', 0, 0, -6, [[0, 0], [2.6, .8], [3.2, 3], [2.6, 5.2], [0, 6]], { seg: 8 }); } },
  goods: { hp: 1, box: [-6, -3, 0, 6, 3, 7], score: 50, impact: 'glass', debris: 'glass',
    build: G => { for (let i = -2; i <= 2; i++) G.cyl(i % 2 ? 'glass' : 'paint-green', i * 2.4, 0, 0, 1, 5 + (i & 1) * 1.5, { seg: 6 }); } },
  window: { hp: 1, box: [-1, -9, 0, 1, 9, 14], score: 50, impact: 'glass', debris: 'glass', blocks: true,
    build: G => G.box('glass-lit', -.5, -9, 0, .5, 9, 14, { solid: false }) },
  sign: { hp: 2, box: [-1, -10, 0, 1, 10, 8], score: 50, impact: 'wood', debris: 'wood', swing: true,
    build: G => G.box('plywood', -.5, -10, 0, .5, 10, 8, { solid: false }) },
  lifering: { hp: 1, box: [-6, -2, -6, 6, 2, 6], score: 2000, impact: 'cloth', bonus: 'life',
    build: G => { for (let i = 0; i < 12; i++) { const a0 = i / 12 * TAU, a1 = (i + 1) / 12 * TAU; G.tube(i % 3 === 0 ? 'cloth-red' : 'canvas', [0, Math.cos(a0) * 5, Math.sin(a0) * 5], [0, Math.cos(a1) * 5, Math.sin(a1) * 5], 1.4, { seg: 6, caps: false }); } } },
  intel: { hp: 1, box: [-2.5, -2.5, 0, 2.5, 2.5, 9], score: 2000, impact: 'glass', bonus: 'intel', debris: 'glass',
    build: G => { G.lathe('paint-green', 0, 0, 0, [[0, 0], [2, 0], [2.2, 4.5], [.9, 6.5], [.8, 8.5], [0, 9]], { seg: 8 }); G.box('canvas', -.6, -.6, 2, .6, .6, 4); } },
  lock: { hp: 6, box: [-6, -6, -6, 6, 6, 6], score: 1500, impact: 'metal', objective: true,
    build: G => { G.box('panel-dark', -6, -5, -6, 6, 5, 6); G.box('glow-amber', -6.4, -3, -2, 6.4, 3, 2, { solid: false }); } },
  target: { hp: 1, box: [-6, -1, 0, 6, 1, 26], score: 500, impact: 'wood', debris: 'wood', popup: true,
    build: G => { G.box('plywood', -6, -.6, 0, 6, .6, 18); G.box('plywood', -3, -.6, 18, 3, .6, 26); G.box('glow-red', -3, -.8, 13, 3, -.6, 16, { solid: false }); } },
  civtarget: { hp: 1, box: [-6, -1, 0, 6, 1, 26], score: 0, impact: 'wood', debris: 'wood', popup: true, civ: true,
    build: G => { G.box('plaster-blue', -6, -.6, 0, 6, .6, 18); G.box('plaster-blue', -3, -.6, 18, 3, .6, 26); G.box('glow-green', -3, -.8, 13, 3, -.6, 16, { solid: false }); } },
  qmtarget: { hp: 1, box: [-6, -1, 0, 6, 1, 26], score: 500, impact: 'wood', debris: 'wood', popup: true, drop: 'mg',
    build: G => { G.box('paint-orange', -6, -.6, 0, 6, .6, 18); G.box('paint-orange', -3, -.6, 18, 3, .6, 26); } },
  shieldtarget: { hp: 1, box: [-7, -1, 0, 7, 1, 26], score: 800, impact: 'metal', popup: true, needs: ['sg', 'gl'],
    build: G => { G.box('panel-steel', -7, -.8, 0, 7, .8, 24); G.box('glass', -4, -1, 16, 4, -.8, 22, { solid: false }); } },
  dronetarget: { hp: 2, box: [-5, -5, -3, 5, 5, 3], score: 500, impact: 'metal', fly: true,
    build: G => { G.box('steel-dk', -4, -4, -2, 4, 4, 2); for (const [x, y] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) G.cyl('rubber', x, y, 2, 2.6, .5, { seg: 8 }); G.box('glow-red', 4, -1, -1, 4.6, 1, 1, { solid: false }); } },
  stack: { hp: 4, box: [-12, -10, 0, 12, 10, 26], score: 800, impact: 'wood', debris: 'wood', needs: ['gl'],
    build: G => { G.box('crate', -12, -10, 0, 0, 0, 13); G.box('crate', 0, -10, 0, 12, 0, 13); G.box('crate', -12, 0, 0, 0, 10, 13); G.box('crate', 0, 0, 0, 12, 10, 13); G.box('crate', -6, -6, 13, 6, 6, 26); } },
  barricade: { hp: 6, box: [-24, -5, 0, 24, 5, 22], score: 1000, impact: 'metal', debris: 'metal', needs: ['gl'], blocks: true,
    build: G => { G.box('hazard', -24, -4, 0, 24, 4, 18); G.box('steel-dk', -26, -5, 0, -22, 5, 22); G.box('steel-dk', 22, -5, 0, 26, 5, 22); G.box('panel-steel', -20, -3, 18, 20, 3, 22); } }
};
TC.OBJ = OBJ;
const OBJ_MESH = new Map();
function objMesh(kind) { let m = OBJ_MESH.get(kind); if (!m) { const G = new Builder({ local: true, maxEdge: 64 }); OBJ[kind].build(G); m = G.mesh(); OBJ_MESH.set(kind, m); } return m; }
TC.objMesh = objMesh;

function addObject(sim, kind, at, o = {}) {
  const K = OBJ[kind]; if (!K) throw new Error('unknown object ' + kind);
  const ob = { id: sim.nid(), kind, K, at: at.slice(), yaw: o.yaw || 0, hp: K.hp, alive: true, t: 0, flash: 0, o, up: K.popup ? (o.up === undefined ? 0 : o.up) : 1, chain: 0, scene: o.scene || null };
  const b = K.box, c = Math.cos(ob.yaw), s = Math.sin(ob.yaw), xs = [], ys = [];
  for (const [x, y] of [[b[0], b[1]], [b[3], b[1]], [b[3], b[4]], [b[0], b[4]]]) { xs.push(at[0] + x * c - y * s); ys.push(at[1] + x * s + y * c); }
  ob.box = [Math.min(...xs), Math.min(...ys), at[2] + b[2], Math.max(...xs), Math.max(...ys), at[2] + b[5]];
  ob.col = { box: ob.box, yaw: 0, cx: 0, cy: 0, impact: K.impact, alive: true, obj: ob };
  sim.objects.push(ob);
  return ob;
}
TC.addObject = addObject;
function objectsStep(sim, dt) {
  for (const ob of sim.objects) {
    ob.t += dt; ob.flash = Math.max(0, ob.flash - dt * 8);
    if (ob.K.popup) { const want = ob.alive && ob.raised ? 1 : 0; ob.up += (want - ob.up) * Math.min(1, dt * 10); }
    if (ob.K.fly && ob.alive && ob.path) { ob.ph = (ob.ph || 0) + dt * 1.2; ob.at[0] = ob.path[0] + Math.cos(ob.ph) * ob.path[3]; ob.at[1] = ob.path[1] + Math.sin(ob.ph * 1.4) * ob.path[3]; ob.at[2] = ob.path[2] + Math.sin(ob.ph * 2) * 6; const b = ob.K.box; ob.box = [ob.at[0] + b[0], ob.at[1] + b[1], ob.at[2] + b[2], ob.at[0] + b[3], ob.at[1] + b[4], ob.at[2] + b[5]]; ob.col.box = ob.box; }
    if (ob.chain > 0) { ob.chain -= dt; if (ob.chain <= 0 && ob.alive) breakObject(sim, ob, ob.chainBy); }
    if (!ob.alive && ob.K.hang && ob.fall !== undefined) { ob.fall += dt; ob.at[2] = Math.max(ob.floor || 0, ob.at[2] - ob.fall * ob.fall * 160 * dt); }
  }
}
TC.objectsStep = objectsStep;
function hitObject(sim, ob, p, dmg, w) {
  if (!ob.alive || (ob.K.popup && ob.up < .6)) return { kind: 'obj', scoring: false };
  if (ob.K.needs && !(w && ob.K.needs.includes(w))) { ob.flash = .5; sim.ev({ type: 'impact', at: null, mat: ob.K.impact, ob: ob.id }); return { kind: 'deflect', scoring: false }; }
  ob.hp -= dmg; ob.flash = 1;
  if (ob.hp <= 0) breakObject(sim, ob, p);
  return { kind: 'obj', scoring: !!(ob.K.bonus || ob.K.score >= 500), bonus: !!ob.K.bonus };
}
TC.hitObject = hitObject;
function breakObject(sim, ob, p) {
  if (!ob.alive) return;
  ob.alive = false; ob.col.alive = false; ob.hp = 0;
  const K = ob.K, mid = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, (ob.box[2] + ob.box[5]) / 2];
  if (p && K.score) addScore(sim, p, K.score, mid);
  if (K.hang) { ob.fall = 0; ob.floor = ob.o.floor || 0; }
  if (K.explode) sim.explode(mid, K.explode, K.dmg, p ? p.id : -1, false, ob.kind);
  if (K.bonus === 'life' && p) { p.lives++; sim.ev({ type: '1up', p: p.id, ring: true }); }
  if (K.bonus === 'intel' && p) sim.ev({ type: 'intel', p: p.id, n: ob.o.n || 0 });
  if (K.drop && p) givePickup(sim, p, K.drop, 30);
  if (K.civ && p) { addScore(sim, p, -2000, mid, true); if (p.score < 0) p.score = 0; sim.ev({ type: 'civhit', p: p.id, range: true }); }
  sim.ev({ type: 'break', ob: ob.id, kind: ob.kind, at: mid, debris: K.debris || K.impact, vapor: !!K.vapor });
  if (ob.o.onBreak) sim.cue(ob.o.onBreak, ob);
}
TC.breakObject = breakObject;

/** an explosion: enemies inside take damage (falling off with distance), objects break or chain, players never */
function explode(sim, at, r, dmg, owner, air, kind) {
  const p = owner >= 0 ? sim.players[owner] : null;
  sim.ev({ type: 'explode', at: at.slice(), r, kind: kind || 'blast', big: r >= 50 });
  if (dmg > 0) {
    let kills = 0;
    for (const e of sim.enemies) {
      if (!e.alive || e.civ || e.ally) continue;
      const d = Math.hypot(e.x - at[0], e.y - at[1], e.z + 14 - at[2]); if (d > r) continue;
      const k = lerp(1, .25, d / r), was = e.alive;
      damageEnemy(sim, e, dmg * k, p, 'blast', { weapon: kind === 'gl' ? 'gl' : null });
      if (was && !e.alive) kills++;
    }
    for (const ob of sim.objects) {
      if (!ob.alive || ob.K.bonus) continue;
      const c = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, (ob.box[2] + ob.box[5]) / 2], d = V3.dist(c, at);
      if (d > r) continue;
      if (ob.K.explode) { if (!ob.chain) { ob.chain = .15; ob.chainBy = p; } }
      else if (!ob.K.popup && !ob.K.needs || (ob.K.needs && kind === 'gl')) { ob.hp -= dmg * .5; if (ob.hp <= 0) breakObject(sim, ob, p); }
    }
    if (sim.boss && sim.boss.blast) sim.boss.blast(sim, at, r, dmg, p, kind);
    if (p && kills >= 2) sim.ev({ type: 'multikill', p: p.id, n: kills });
  }
}
TC.explode = explode;

// ---- 25-bosses.js ----
/* 25-bosses: the boss framework and the bosses.
 *   def('boss', id, { name, title, card, make(sim, B), step(sim, B, dt), draw(R, B, sim) (presentation), bars(B) })
 * A boss has named parts (hit volumes with hp, optional armor; a weak part pulses gold while it can be hurt), its own
 * rigs and meshes, and every attack goes through the ThreatDirector and the projectile system, so cover, telegraphs and
 * the tests work the same for bosses. Mini-bosses (Bulldog, The Gull, Seawolf) are spawned by a wave and have a bar but
 * no intro card. */
class Boss {
  constructor(sim, D) { this.id = D.id; this.D = D; this.parts = {}; this.t = 0; this.st = 0; this.state = 'intro'; this.dead = false; this.phaseName = 'intro'; this.rigs = []; this.meshes = []; this.mul = tune.enemy.bossHpMul * sim.diff.hp; this.flash = 0; }
  part(id, o) { const hp = (o.hp || 1) * (o.noMul ? 1 : this.mul); return this.parts[id] = Object.assign({ id, alive: true, open: true, flash: 0, vol: null }, o, { hp, max: hp }); }
  set(state, sim) { this.state = state; this.st = 0; if (sim) sim.ev({ type: 'bossstate', id: this.id, state }); }
  hpFrac() { return this.D.frac ? this.D.frac(this) : (() => { let a = 0, b = 0; for (const p of Object.values(this.parts)) if (!p.noBar) { a += Math.max(0, p.hp); b += p.max; } return b ? a / b : 0; })(); }
  rayTest(sim, ray) {
    let best = null;
    for (const p of Object.values(this.parts)) {
      if (!p.alive || !p.vol) continue;
      const v = p.vol, t = v.box ? rayCollider(ray.o, ray.d, v) : v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r);
      if (t >= 0 && (!best || t < best.t)) best = { t, part: p };
    }
    for (const r of this.rigs) if (r.vols && r.hit) for (const k in r.vols) { const v = r.vols[k], t = v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r); if (t >= 0 && (!best || t < best.t)) best = { t, part: r.hit, zone: k }; }
    return best;
  }
  hit(sim, h, p, dmg, w, at) {
    const part = h.part; if (!part || !part.alive) return false;
    if (part.armor || !part.open) { if (part.onArmor) part.onArmor(sim, this, w); sim.ev({ type: 'impact', at, mat: 'metal', armor: true }); return 0; }
    const k = (h.zone === 'head' ? 2 : h.zone === 'legs' ? .75 : 1) * (part.mul || 1) * (part.weapons && w ? (part.weapons[w] || 1) : 1);
    part.hp -= dmg * k; part.flash = 1; this.flash = .5;
    let pts = addScore(sim, p, 100, null); p.stats.hits++; addHitChain(p); if (h.zone === 'head') p.stats.heads++;
    sim.ev({ type: 'bosshit', part: part.id, at, head: h.zone === 'head' });
    if (part.onHit) part.onHit(sim, this, p, w, dmg * k);
    if (part.hp <= 0 && part.alive) { part.alive = false; part.hp = 0; sim.ev({ type: 'partdown', part: part.id, at }); pts += addScore(sim, p, part.score || 2000, at); if (part.onBreak) part.onBreak(sim, this, p); }
    return pts || 1;
  }
  blast(sim, at, r, dmg, p, kind) {
    this.blastRigs(sim, at, r, dmg, p, kind);
    for (const part of Object.values(this.parts)) {
      if (part.alive && part.vol && part.armor && part.onArmor && V3.dist(part.vol.c || (part.vol.a ? V3.lerp(part.vol.a, part.vol.b, .5) : [part.vol.cx, part.vol.cy, (part.vol.box[2] + part.vol.box[5]) / 2]), at) < r + (part.vol.r || 14)) part.onArmor(sim, this, kind === 'gl' ? 'gl' : 'blast');
      if (!part.alive || !part.vol || part.armor || !part.open) continue;
      const c = part.vol.c || V3.lerp(part.vol.a, part.vol.b, .5), d = V3.dist(c, at); if (d > r + (part.vol.r || 0)) continue;
      part.hp -= dmg * .6 * (part.weapons && kind === 'gl' ? (part.weapons.gl || 1) : 1); part.flash = 1;
      if (part.onHit) part.onHit(sim, this, p, kind === 'gl' ? 'gl' : 'blast', dmg * .6);
      if (part.hp <= 0) { part.alive = false; part.hp = 0; sim.ev({ type: 'partdown', part: part.id, at: c }); if (p) addScore(sim, p, part.score || 2000, c); if (part.onBreak) part.onBreak(sim, this, p); }
    }
  }
  colliders() { return this._cols || []; }
  /** an explosion near a rig-based part (Barracuda, Hammerhead, Krake) hurts it like a hit */
  blastRigs(sim, at, r, dmg, p, kind) {
    for (const rr of this.rigs) {
      const part = rr.hit; if (!part || !part.alive || !part.open || !rr.vols || !rr.vols.torso) continue;
      const c = V3.lerp(rr.vols.torso.a, rr.vols.torso.b, .5), d = V3.dist(c, at); if (d > r + 6) continue;
      const k = dmg * .6 * lerp(1, .4, clamp(d / (r + 6), 0, 1)); part.hp -= k; part.flash = 1; if (part.onHit) part.onHit(sim, this, p, kind === 'gl' ? 'gl' : 'blast', k);
      sim.ev({ type: 'bosshit', part: part.id, at: c });
      if (part.hp <= 0 && part.alive && !part.keepAlive) { part.alive = false; part.hp = 0; sim.ev({ type: 'partdown', part: part.id, at: c }); if (p) addScore(sim, p, part.score || 2000, c); if (part.onBreak) part.onBreak(sim, this, p); }
    }
  }
  defeat(sim) { if (this.dead) return; this.dead = true; this.set('dead', sim); for (const t of sim.threats) if (!t.done) { t.done = true; t.cancelled = true; } sim.ev({ type: 'bossdown', id: this.id, name: this.D.name, mini: !this.D.card }); if (this.D.onDefeat) this.D.onDefeat(sim, this); }
}
TC.Boss = Boss;
function makeBoss(sim, id) {
  const D = reg('boss', id), B = new Boss(sim, D);
  D.make(sim, B);
  if (D.card && sim.mode !== 'range') sim.ev({ type: 'bosscard', id, name: D.name, title: D.title, who: D.speaker });
  sim.ev({ type: 'boss', id, name: D.name });
  return B;
}
TC.makeBoss = makeBoss;
function spawnBoss(sim, id) { sim.boss = makeBoss(sim, id); return sim.boss; }
TC.spawnBoss = spawnBoss;
function bossStep(sim, B, dt) {
  B.t += dt; B.st += dt; B.flash = Math.max(0, B.flash - dt * 4);
  for (const p of Object.values(B.parts)) p.flash = Math.max(0, p.flash - dt * 6);
  if (!B.dead || B.D.stepDead) B.D.step(sim, B, dt);
  for (const r of B.rigs) { if (r.pose) r.rig.update(dt, r.pose); if (r.rig && r.live !== false) r.vols = volsOf(r.rig); }
}
TC.bossStep = bossStep;
/** a boss threat: always, with a telegraph */
function bossThreat(sim, B, kind, tele, pos, o = {}) {
  const tgt = o.target !== undefined ? o.target : pickTarget(sim, pos ? pos() : null); if (tgt < 0) return null;
  const th = requestThreat(sim, tgt, Object.assign({ always: true, tele, kind, src: -1, pos }, o));
  if (th) th.srcAlive = () => !B.dead && (o.alive ? o.alive() : true);
  return th;
}
TC.bossThreat = bossThreat;
/** a world point on a carrier-like frame M from local coordinates */
const L2W = (M, p) => xform(M, p);

/* ======================= BULLDOG (1-3): an armored truck smashes in; shoot its gunner, then its fuel tank ======================= */
def('boss', 'bulldog', { name: 'BULLDOG', title: 'Black Current armored truck', card: false,
  make(sim, B) {
    B.path = new E.Path([[1480, -10, 0], [1380, 0, 0], [1262, 0, 0]], { smooth: 'catmull' }); B.d = 0; B.x = 1480; B.y = -10; B.yaw = Math.PI;
    B.fuel = B.part('fuel', { hp: 6, weak: true, score: 5000, onBreak: (sim2, B2, p) => { sim2.explode([B2.x, B2.y, 18], 90, 12, p ? p.id : -1, false, 'bulldog'); B2.defeat(sim2); sim2.cue('bulldog-down'); } });
    sim.carriers.bulldog = { id: 'bulldog', C: { path: [] }, d: 0, M: mat34(B.x, B.y, 0, B.yaw), yaw: B.yaw, pos: [B.x, B.y, 0] };
    B.set('drive', sim); sim.ev({ type: 'sfx', name: 'engine' });
  },
  step(sim, B, dt) {
    if (B.state === 'drive') { B.d = Math.min(B.path.length, B.d + 120 * dt); const p = B.path.at(Math.min(B.path.length - .01, B.d)); B.x = p.x; B.y = p.y; B.yaw = p.angle; if (B.d >= B.path.length) { B.set('stop', sim); sim.ev({ type: 'shake', k: .5 }); sim.say('kai', 'Armored truck! Take out the gunner!'); spawnEnemy(sim, 'gunner', null, { entry: 'stand', carrier: 'bulldog', local: [0, 0, 34], from: [B.x, B.y, 34] }); for (const [s, c] of [[-1, 't1'], [1, 't2']]) spawnEnemy(sim, 'marine', c, { entry: 'run', from: [B.x + 40, B.y + s * 12, 0], delay: 0 }); } }
    if (B.state === 'stop' && B.st > 4 && !sim.flags.fuelSaid) { sim.flags.fuelSaid = true; sim.say('rook', 'Fuel tank! Light it up!'); }
    const M = mat34(B.x, B.y, 0, B.yaw); B.M = M; const C = sim.carriers.bulldog; C.M = M; C.yaw = B.yaw; C.pos = [B.x, B.y, 0];
    B.fuel.vol = { a: L2W(M, [56, -13, 12]), b: L2W(M, [56, 13, 12]), r: 7 };
    B.fuel.open = B.state !== 'drive';
    B._cols = [{ box: [B.x - 36, B.y - 18, 0, B.x + 48, B.y + 18, 44], yaw: B.yaw, cx: B.x, cy: B.y, impact: 'metal', alive: !B.dead }];
    if (B.dead) B._cols = [];
  },
  stepDead: false,
  draw(R, B, sim) { if (B.dead) return; R.mesh('bulldog', B.M, { flash: B.flash * .3 }); R.mesh('fueltank', mulMat34(B.M, mat34(56, 0, 12, Math.PI / 2)), { flash: B.fuel.flash, glow: .3 + .3 * Math.sin(sim.t * 8) }); }
});

/* ======================= STINGRAY -> BARRACUDA (1-B) ======================= */
def('boss', 'stingray', { name: 'STINGRAY', title: 'Black Current gunboat', card: true, speaker: 'barracuda', time: 100,
  frac(B) { if (B.phase === 1) return .6 + .4 * (B.tur.reduce((a, t) => a + Math.max(0, t.hp), 0) / B.tur.reduce((a, t) => a + t.max, 0)); if (B.phase === 2) return .25 + .35 * Math.max(0, B.bar.hp - B.bar.max * .4) / (B.bar.max * .6); return .25 * Math.max(0, B.bar.hp) / (B.bar.max * .4); },
  make(sim, B) {
    B.phase = 1; B.off = 250; B.tur = [];
    for (const [i, lx] of [[0, -40], [1, 34]].map(a => a)) B.tur.push(B.part('tur' + i, { hp: 12, weak: true, score: 3000, lx, ang: 0, spin: 0, onBreak: (s, b) => { s.ev({ type: 'explode', at: b.tur[i].vol.c.slice(), r: 40, big: true }); } }));
    B.drums = [-56, -16, 46].map((lx, i) => B.part('drum' + i, { hp: 2, weak: false, score: 500, lx, noBar: true, noMul: true, onBreak: (s, b, p) => { const at = b.drums[i].vol.c.slice(); s.explode(at, 40, 0, p ? p.id : -1, false, 'fuel'); for (const t of b.tur) if (t.alive && Math.abs(t.lx - lx) < 44) { t.hp -= 6; t.flash = 1; if (t.hp <= 0) { t.alive = false; t.hp = 0; s.ev({ type: 'partdown', part: t.id, at: t.vol.c.slice() }); t.onBreak(s, b, p); } } } }));
    B.bar = B.part('barracuda', { hp: 30, open: false, score: 10000, noBar: true });
    B.rig = makeRig(sim, reg('speaker', 'barracuda').rig); B.rig2 = makeRig(sim, Object.assign({}, reg('speaker', 'barracuda').rig, { weapon: 'cutlass' }));
    B.r = { rig: B.rig, hit: null, live: true }; B.rigs.push(B.r);
    B.set('approach', sim); B.next = 2; B.fire = 0; B.crew = 0;
    sim.carriers.stingray = { id: 'stingray', C: { path: [] }, d: 0, M: null, yaw: 0, pos: [0, 0, 0] };
    B.pose = () => {};
  },
  step(sim, B, dt) {
    const Cb = sim.carriers.boat2, t = sim.t, us = Cb.pos;
    if (B.dead && B.r) { B.fallT = (B.fallT || 0) + dt; B.r.z -= dt * 40 * B.fallT; B.r.x += Math.cos(Cb.yaw + Math.PI / 2) * dt * 30; B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: B.face, air: true, expr: 'wince' }; B.r.hit = null; }
    B.off = lerp(B.off, B.phase === 3 ? 170 : 230 + Math.sin(t * .3) * 40, Math.min(1, dt * .5));
    const bob = Math.sin(t * 1.3) * 2.5, yaw = Cb.yaw, x = us[0] + Math.cos(yaw) * (B.state === 'approach' ? -260 + B.st * 120 : 40) - Math.sin(yaw) * B.off, y = us[1] + Math.sin(yaw) * (B.state === 'approach' ? -260 + B.st * 120 : 40) + Math.cos(yaw) * B.off;
    B.x = x; B.y = y; B.yaw = yaw; B.roll = Math.sin(t * .9) * .04; B.M = mat34(x, y, -14 + bob, yaw, Math.sin(t * .7) * .02, B.roll);
    const C = sim.carriers.stingray; C.M = B.M; C.yaw = yaw; C.pos = [x, y, -14];
    for (const tu of B.tur) { tu.vol = { c: L2W(B.M, [tu.lx, 0, 14]), r: 8 }; }
    for (const d of B.drums) d.vol = d.alive ? { c: L2W(B.M, [d.lx, 12, 12]), r: 6 } : null;
    if (B.state === 'approach') { if (B.st > 2.2) { B.set('turrets', sim); sim.say('barracuda', "CREST! The Admiral said you'd come. He didn't say you'd be this slow!"); } return; }
    if (B.phase === 1) {
      // turrets spin up (the telegraph) and fire bursts; deck crews come two at a time
      B.fire -= dt;
      const live = B.tur.filter(t2 => t2.alive);
      if (!live.length) { B.phase = 2; B.set('bridge', sim); sim.say('barracuda', 'Enough! You want me? Come and get me!'); for (const e of sim.enemies) if (e.alive && e.carrier === 'stingray') damageEnemy(sim, e, 99, null, 'blast', {}); return; }
      for (const tu of live) { const c = sim.cameraFor(0); const w = tu.vol.c; tu.ang = Math.atan2(c.y - w[1], c.x - w[0]); tu.spin = Math.max(0, tu.spin - dt); }
      if (B.fire <= 0) {
        const tu = live[(B.next++) % live.length]; tu.spin = .9;
        const th = bossThreat(sim, B, 'turret', .9, () => tu.vol.c, { alive: () => tu.alive });
        if (th) { th.onResolve = () => { sim.ev({ type: 'eshot', from: tu.vol.c.slice(), to: null, p: th.target, burst: 5, kind: 'turret' }); }; }
        sim.ev({ type: 'spinup', at: tu.vol.c.slice() });
        B.fire = 2.4 * tune.enemy.fireMul;
      }
      if (sim.enemies.filter(e => e.alive && e.carrier === 'stingray').length < 2 && B.st > 1.5 && B.crew < 8) {
        B.st = 0; for (let k = 0; k < 2; k++) { B.crew++; const lx = -60 + ((B.crew * 37) % 110); spawnEnemy(sim, 'deckhand', null, { entry: 'stand', carrier: 'stingray', local: [lx, -14, 6], from: [x, y, 0] }); }
      }
      return;
    }
    if (B.phase === 2) {
      // Barracuda on the bridge wing: harpoons and torpedoes, ducking behind the armored bridge between volleys
      const at = L2W(B.M, [-2, -12, 33]);
      B.r.x = at[0]; B.r.y = at[1]; B.r.z = at[2];
      const c = sim.cameraFor(0), face = Math.atan2(c.y - at[1], c.x - at[0]);
      if (B.state === 'bridge') { B.bar.open = false; B.r.hide = true; if (B.st > 1.4) { B.set('wing', sim); B.vol = 0; } }
      else if (B.state === 'wing') {
        B.bar.open = true; B.r.hide = false; B.r.hit = B.bar;
        if (B.st > .5 && !B.shot) {
          B.shot = true; const torp = (B.vol++ % 2) === 1, tgt = pickTarget(sim, at); if (tgt < 0) return;
          if (torp) {
            const cam = sim.cameraFor(tgt), from = [at[0], at[1], sim.waterZ()], to = [cam.x + Math.cos(cam.yaw) * 30, cam.y + Math.sin(cam.yaw) * 30, sim.waterZ()];
            const pr = sim.launch({ kind: 'torpedo', pos: from, vel: [0, 0, 0], life: 3, target: tgt, land: to, home: true, hp: 2 });
            pr.th = requestThreat(sim, tgt, { always: true, tele: 2.6, kind: 'torpedo', src: pr.id, pos: () => pr.pos, unblockable: true }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
            if (!sim.flag('torpedo')) sim.say('mari', 'Torpedo in the water! Shoot it!');
            sim.ev({ type: 'prompt', id: 'torpedo' });
          } else {
            const cam = sim.cameraFor(tgt), to = [cam.x, cam.y, cam.z - 4], from = B.rig.tip(), d = V3.dist(from, to);
            const pr = sim.launch({ kind: 'harpoon', pos: from, vel: V3.mul(V3.norm(V3.sub(to, from)), 300), life: d / 300, target: tgt, land: to, home: true, hp: 2, rope: from.slice() });
            pr.th = requestThreat(sim, tgt, { always: true, tele: Math.max(1, d / 300), kind: 'harpoon', src: pr.id, pos: () => pr.pos }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
          }
        }
        if (B.st > 2.4) { B.shot = false; B.set('bridge', sim); }
      }
      B.face = face; B.point = B.state === 'wing';
      B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: face, point: B.point, expr: 'angry', aim: Math.atan2(c.z - (B.r.z + 24), Math.hypot(c.x - B.r.x, c.y - B.r.y)) };
      if (B.bar.hp <= B.bar.max * .4) { B.phase = 3; B.set('swing', sim); B.r.hit = null; sim.say('barracuda', "Enough! I'll do this myself!"); B.burn = true; if (sim.scene.alt) sim.swapSlots(sim.scene.alt); }
      return;
    }
    if (B.phase === 3) {
      // boarding: she swings across on a rope and slashes; cover blocks it; each stagger opens her for 1.5 s
      const Mb = Cb.M, land = L2W(Mb, [24, -2, 0]);
      if (B.state === 'swing') {
        const from = L2W(B.M, [-2, -12, 33]), u = Math.min(1, B.st / 1.6), h = Math.sin(u * Math.PI) * 40;
        B.r.x = lerp(from[0], land[0], u); B.r.y = lerp(from[1], land[1], u); B.r.z = lerp(from[2], land[2], u) + h; B.r.air = u < 1; B.r.rig = B.rig2; B.r.hide = false;
        B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: Cb.yaw + Math.PI / 2, air: u < 1, expr: 'shout' };
        B.rope = [L2W(B.M, [-2, -12, 60]), [B.r.x, B.r.y, B.r.z + 30]];
        if (u >= 1) { B.rope = null; B.set('ready', sim); B.cycles = 0; }
        return;
      }
      B.r.x = land[0]; B.r.y = land[1]; B.r.z = land[2]; B.r.air = false;
      const c = sim.cameraFor(0); B.face = Math.atan2(c.y - B.r.y, c.x - B.r.x);
      if (B.state === 'ready') { B.bar.open = false; B.r.hit = B.bar; if (B.st > .6) { B.set('wind', sim); B.th = bossThreat(sim, B, 'slash', .6 * tune.enemy.teleMul, () => B.rig2.hand()); if (!B.th) B.set('ready', sim); } }
      else if (B.state === 'wind') { B.atk = { spec: 'backslash', phase: 'wind', u: Math.min(1, B.st / .6) }; if (B.th && B.th.done) { B.atk = { spec: 'backslash', phase: 'active', u: .5 }; sim.ev({ type: 'slash', boss: true, res: B.th.result }); if (B.th.result === 'blocked') { B.set('stagger', sim); sim.ev({ type: 'prompt', id: 'open' }); } else B.set('ready', sim); } }
      else if (B.state === 'stagger') { B.atk = null; B.bar.open = true; if (B.st > 1.5) { B.bar.open = false; B.cycles++; B.set('ready', sim); } }
      B.r.pose = { x: B.r.x, y: B.r.y, z: B.r.z, facing: B.face, attack: B.atk ? { spec: E.MOVES[B.atk.spec], phase: B.atk.phase, u: B.atk.u } : null, pose: B.state === 'stagger' ? 'kneel' : null, hurt: B.state === 'stagger', expr: 'angry' };
      if (B.bar.hp <= 0 && !B.dead) { sim.say('barracuda', "This isn't over, CREST!"); B.defeat(sim); B.fallT = 0; }
    }
  },
  onDefeat(sim, B) { sim.ev({ type: 'slowmo', s: .8 }); for (const e of sim.enemies) if (e.alive && e.carrier === 'stingray') damageEnemy(sim, e, 99, null, 'blast', {}); sim.ev({ type: 'explode', at: [B.x, B.y, 0], r: 120, big: true }); },
  stepDead: true,
  draw(R, B, sim) {
    if (!B.M) return;
    const sinking = B.dead ? Math.min(40, (sim.t - (B.deadT || (B.deadT = sim.t))) * 14) : 0;
    const M = sinking ? mulMat34(mat34(0, 0, -sinking, 0), B.M) : B.M;
    R.mesh('stingray', M, { flash: B.flash * .2 });
    for (const tu of B.tur) if (tu.alive || !B.dead) { const lm = mulMat34(M, mat34(tu.lx, 0, 8, tu.ang - B.yaw)); R.mesh('turret', lm, { flash: tu.flash, dim: tu.alive ? 1 : .35, glow: tu.spin > 0 ? .5 : 0 }); }
    for (const d of B.drums) if (d.alive) R.meshObj('fuel', L2W(M, [d.lx, 12, 6]), d.flash);
    if (B.burn || B.dead) R.fire(L2W(M, [-10, 0, 30]), 1);
    const r = B.r; if (B.phase >= 2 && !r.hide && !(B.dead && B.fallT > 1.2)) R.rig(r.rig, r.rig.x, r.rig.y, r.rig.z, { flash: B.bar.flash });
    if (B.rope) R.line(B.rope[0], B.rope[1], [200, 180, 140]);
  }
});

// ---- 26-meshes.js ----
/* 26-meshes: the moving machines as local meshes (built once, drawn with a transform): our speedboat, the Stingray
 * gunboat and its turret, the Bulldog truck, jet skis, drones, the Seawolf gunship (body, rotor, pods), the Scylla
 * walker (body, leg segments, claws, cockpit), the funicular cars, the glass lift, turbines, the lighthouse lens, the
 * Hammerhead's hatch-door shield, the master lever. Local frame: x forward, y right, z up. */
const MESHDEF = {};
const MESH = new Map();
function meshDef(id, fn) { MESHDEF[id] = fn; }
function meshOf(id) { let m = MESH.get(id); if (!m) { const G = new Builder({ local: true, maxEdge: 64 }); MESHDEF[id](G); m = G.mesh(); MESH.set(id, m); } return m; }
TC.meshOf = meshOf; TC.MESHDEF = MESHDEF;
meshDef('speedboat', G => {
  G.box('hull-white', -44, -16, -10, 34, 16, 0, { top: 'pier', skip: '' });
  G.lathe('hull-white', 34, 0, -10, [[16, 0], [12, 6], [0, 10]], { seg: 4 });
  G.box('hull-red', -44.5, -16.5, -10, 34, 16.5, -5, { skip: 'tb', solid: false });
  // armored gunwale plates (the cover) along both sides and the bow
  G.box('panel-dark', -44, -17, 0, 30, -14, 14); G.box('panel-dark', -44, 14, 0, 30, 17, 14);
  G.box('panel-dark', 26, -14, 0, 30, 14, 10);
  G.box('steel-dk', -40, -9, 0, -30, 9, 12, { top: 'steel' }); G.box('glass', -30, -9, 12, -29, 9, 18, { solid: false });   // the helm and windscreen at the stern
  G.cyl('steel', -40, 0, 0, 3, 20, { seg: 6 }); G.box('glow-red', -41, -1, 20, -39, 1, 22, { solid: false });
});
meshDef('stingray', G => {
  G.box('hull-dark', -70, -20, -12, 60, 20, 6, { top: 'steel-dk' });
  G.lathe('hull-dark', 60, 0, -12, [[20, 0], [14, 10], [0, 18]], { seg: 4 });
  G.box('hull-red', -70.5, -20.5, -12, 60, 20.5, -6, { skip: 'tb', solid: false });
  G.box('panel-dark', -20, -14, 6, 14, 14, 30, { top: 'steel-dk' }); G.box('tower-windows', 13.5, -12, 20, 14.5, 12, 28, { solid: false });   // the armored bridge
  G.box('panel-dark', -10, -18, 30, 6, 18, 33);                                                                 // the bridge wing
  G.cyl('steel', -6, 0, 33, 1.5, 22, { seg: 5 }); G.box('glow-red', -7, -1, 55, -5, 1, 57, { solid: false });
  KIT.rail(G, [-68, -19, 6], [58, -19, 6], 8, 'steel'); KIT.rail(G, [-68, 19, 6], [58, 19, 6], 8, 'steel');
  G.box('panel-dark', -68, -19, 6, -40, -16, 12); G.box('panel-dark', 30, -19, 6, 56, -16, 12);
});
meshDef('turret', G => { G.cyl('hull-gun', 0, 0, 0, 7, 6, { seg: 10 }); G.box('panel-dark', -5, -6, 6, 6, 6, 12); G.tube('steel-dk', [4, -3, 9], [22, -3, 9], 1.4, { seg: 6 }); G.tube('steel-dk', [4, 3, 9], [22, 3, 9], 1.4, { seg: 6 }); });
meshDef('bulldog', G => {
  G.box('hull-gun', -36, -18, 8, 30, 18, 34, { top: 'panel-dark' }); G.box('hull-gun', 30, -16, 8, 46, 16, 28, { top: 'panel-dark' });
  G.box('glass', 45.5, -12, 18, 46.5, 12, 26, { solid: false }); G.box('steel-dk', 44, -18, 4, 50, 18, 12);
  for (const x of [-24, 0, 34]) for (const y of [-19, 19]) G.tube('rubber', [x, y - 4, 9], [x, y + 4, 9], 9, { seg: 10 });
  G.box('panel-dark', -10, -12, 34, 10, 12, 44);                                    // the gun shield
  G.box('hazard', 46.5, -18, 8, 47, 18, 12, { solid: false });
});
meshDef('fueltank', G => { G.tube('paint-orange', [-14, 0, 0], [14, 0, 0], 6, { seg: 10 }); G.tube('hazard', [-3, 0, 0], [3, 0, 0], 6.3, { seg: 10 }); });
meshDef('jetski', G => { G.box('paint-yellow', -12, -5, -2, 10, 5, 4, { top: 'rubber' }); G.lathe('paint-yellow', 10, 0, -2, [[5, 0], [3, 3], [0, 6]], { seg: 4 }); G.box('rubber', -6, -3, 4, 2, 3, 7); G.box('steel-dk', 4, -5, 6, 6, 5, 8); });
meshDef('drone', G => { G.box('steel-dk', -5, -5, -2, 5, 5, 2); G.box('panel-dark', -3, -3, -4, 3, 3, -2); for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { G.tube('steel', [0, 0, 0], [x, y, 0], .6, { seg: 4 }); G.cyl('rubber', x, y, 1, 4, .6, { seg: 8 }); } G.box('glow-red', 5, -1.5, -1, 5.6, 1.5, 1, { solid: false }); });
meshDef('seawolf', G => {
  G.lathe('hull-gun', -10, 0, 0, [[0, -20], [9, -16], [11, 0], [9, 16], [0, 22]].map(([r, z]) => [r, z]), { seg: 10 });
  G.box('hull-gun', -10, -10, -10, 22, 10, 8, { top: 'panel-dark' }); G.box('glass', 21.5, -8, -6, 24, 8, 4, { solid: false });
  G.box('hull-gun', -70, -3, -2, -10, 3, 5); G.box('hull-gun', -74, -2, -2, -66, 2, 14); G.box('glow-red', -75, -1, 12, -73, 1, 14, { solid: false });
  G.box('steel-dk', -12, -28, -6, 2, 28, -4);   // the short wings (the pods hang under them)
  G.cyl('steel-dk', 0, 0, 8, 3, 6, { seg: 8 });
});
meshDef('rotor', G => { for (const a of [0, Math.PI / 2]) G.box('steel-dk', -46 * Math.cos(a) - 2 * Math.sin(a), -46 * Math.sin(a) - 2 * Math.cos(a), 0, 46 * Math.cos(a) + 2 * Math.sin(a), 46 * Math.sin(a) + 2 * Math.cos(a), 1, { solid: false }); G.cyl('steel', 0, 0, -2, 3, 4, { seg: 8 }); });
meshDef('pod', G => { G.tube('panel-dark', [-10, 0, 0], [10, 0, 0], 4, { seg: 8 }); G.box('glow-amber', 9.6, -2, -2, 10.6, 2, 2, { solid: false }); });
meshDef('scylla-body', G => {
  G.lathe('hull-gun', 0, 0, -12, [[0, 0], [30, 4], [36, 12], [32, 22], [18, 28], [0, 30]], { seg: 12 });
  G.box('panel-dark', 18, -12, 4, 40, 12, 22, { top: 'steel-dk' });             // the armored cockpit
  G.box('glass', 39.5, -8, 10, 41, 8, 18, { solid: false });
  for (const s of [-1, 1]) G.box('panel-dark', -20, s * 26 - 6, 14, 0, s * 26 + 6, 26);   // missile pods
  G.box('glow-red', 34, -4, 22, 38, 4, 24, { solid: false });
});
meshDef('scylla-hatch', G => { G.box('hull-gun', 0, -12, 0, 22, 12, 4); });
meshDef('leg', G => { G.tube('hull-gun', [0, 0, 0], [1, 0, 0], 3.2, { seg: 6 }); });
meshDef('knee', G => { G.lathe('glow-amber', 0, 0, -4, [[0, 0], [4, 1], [4.5, 4], [4, 7], [0, 8]], { seg: 8 }); });
meshDef('claw', G => { G.box('hull-gun', 0, -6, -5, 26, 6, 5); G.tube('steel-dk', [24, 0, 0], [40, 0, 0], 2.2, { seg: 6 }); G.box('panel-dark', 20, -8, 2, 30, -2, 8); });
meshDef('funicular', G => {
  G.box('paint-green', -24, -14, 0, 24, 14, 4, { top: 'planks' }); G.box('paint-green', -24, -14, 4, 24, -12, 16); G.box('paint-green', -24, 12, 4, 24, 14, 16);
  G.box('paint-green', 20, -12, 4, 24, 12, 16); G.box('glass', -24, -14, 16, 24, -13, 30, { solid: false }); G.box('glass', -24, 13, 16, 24, 14, 30, { solid: false });
  G.box('paint-green', -26, -15, 30, 26, 15, 34); G.box('planks', -8, -12, 4, 0, 12, 13);   // the bench (cover)
  G.box('glow-amber', -2, -2, 28, 2, 2, 30, { solid: false });
});
/** the car the players ride up the cliff (2-3): open above the waist, so the roof, its lamp and the side glass never fill
 *  the view of the terraces; the car coming down (full of them) keeps the closed body */
meshDef('funicular-open', G => {
  G.box('paint-green', -24, -14, 0, 24, 14, 4, { top: 'planks' }); G.box('paint-green', -24, -14, 4, 24, -12, 15); G.box('paint-green', -24, 12, 4, 24, 14, 15);
  G.box('paint-green', 20, -12, 4, 24, 12, 15); G.box('paint-green', -24, -12, 4, -20, 12, 15); G.box('brass', -24, -14, 15, 24, -12, 16.5, { solid: false }); G.box('brass', -24, 12, 15, 24, 14, 16.5, { solid: false }); G.box('brass', 20, -12, 15, 24, 12, 16.5, { solid: false });
  G.box('planks', -8, -12, 4, 0, 12, 13);   // the bench (cover)
});
meshDef('lift', G => {
  G.box('steel', -20, -20, 0, 20, 20, 3, { top: 'grate' }); G.box('steel-dk', -20, -20, 52, 20, 20, 55);
  for (const [x, y] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) G.box('steel', x - 1.5, y - 1.5, 3, x + 1.5, y + 1.5, 52);
  G.box('glass', -20, -20, 14, 20, -19, 52, { solid: false }); G.box('glass', -20, 19, 14, 20, 20, 52, { solid: false }); G.box('steel', 19, -20, 14, 20, 20, 16, { solid: false });
  G.box('panel-dark', -2, -16, 3, 10, 16, 16, { top: 'glow-teal' });   // the console (cover)
  G.box('grate', 20, -20, 0, 42, 20, 3, { side: 'steel' }); G.box('steel', 41, -20, 3, 42, 20, 14); G.box('steel', 20, -20, 3, 42, -19, 14); G.box('steel', 20, 19, 3, 42, 20, 14);   // the outer platform
});
/** the lift from inside (3-4): its frame, roof and console without the two glass panes, which up close were all streaks */
meshDef('lift-open', G => {
  G.box('steel', -20, -20, 0, 20, 20, 3, { top: 'grate' }); G.box('steel-dk', -20, -20, 52, 20, 20, 55);
  for (const [x, y] of [[-20, -20], [20, -20], [-20, 20], [20, 20]]) G.box('steel', x - 1.5, y - 1.5, 3, x + 1.5, y + 1.5, 52);
  G.box('steel', -20, -20, 14, 20, -19, 16, { solid: false }); G.box('steel', -20, 19, 14, 20, 20, 16, { solid: false }); G.box('steel', 19, -20, 14, 20, 20, 16, { solid: false });   // the waist rails
  G.box('panel-dark', -2, -16, 3, 10, 16, 16, { top: 'glow-teal' });   // the console (cover)
  G.box('grate', 20, -20, 0, 42, 20, 3, { side: 'steel' }); G.box('steel', 41, -20, 3, 42, 20, 14); G.box('steel', 20, -20, 3, 42, -19, 14); G.box('steel', 20, 19, 3, 42, 20, 14);   // the outer platform
});
meshDef('turbine', G => { G.cyl('steel', 0, 0, -6, 10, 12, { seg: 10 }); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; G.box('panel-steel', -2, 8, -4, 2, 46, 4, { yaw: a, solid: false }); } });
meshDef('lens', G => { G.cyl('lens', 0, 0, 0, 14, 26, { seg: 8 }); G.cyl('brass', 0, 0, -3, 15, 3, { seg: 8 }); G.cyl('brass', 0, 0, 26, 15, 3, { seg: 8 }); });
meshDef('hatchshield', G => { G.box('rust', -1.5, -10, 0, 1.5, 10, 30); G.box('steel-dk', -2, -8, 18, -1.5, -2, 24); G.box('iron', -2, 4, 12, -1.5, 8, 14); });
meshDef('lever', G => { G.box('steel-dk', -4, -4, 0, 4, 4, 22); G.tube('hazard', [0, 0, 20], [0, 0, 44], 1.6, { seg: 6 }); G.box('glow-red', -3, -3, 44, 3, 3, 48, { solid: false }); });
meshDef('riotshield', G => { G.box('glass', -1, -7, 0, 1, 7, 26, { solid: false }); G.box('steel-dk', -1.4, -7, 0, -1, 7, 3, { solid: false }); });
meshDef('rope', G => { G.tube('rope', [0, 0, 0], [0, 0, 1], .5, { seg: 4 }); });
meshDef('crate1', G => { G.box('crate', -7, -7, 0, 7, 7, 13); });

// ---- 27-bosses2.js ----
/* 27-bosses2: The Gull (2-3), Hammerhead (2-B), the Seawolf gunship (3-2 and 3-4), Scylla (3-B, phase 1) and
 * Admiral Krake (3-B, phase 2) with the FINAL SHOT. Every attack is a threat or a shootable projectile. */
ENEMY('gull', { name: 'The Gull', hp: 4, score: 8000, elite: true, ai: 'sniper', tele: 1.4, look: { weapon: 'sniper', outfit: 'coat', hood: true, colors: { coat: '#6a7078', cloth: '#4a5056', hair: '#5a6068', pants: '#34383c', skin: '#c8a080' } } });

/* ======================= THE GULL: a laser sniper among three perches on the lighthouse gallery ======================= */
def('boss', 'gull', { name: 'THE GULL', title: 'Black Current marksman', card: false,
  frac: B => B.e ? Math.max(0, B.e.hp) / B.e.hp0 : 0,
  make(sim, B) { B.e = spawnEnemy(sim, 'gull', 'p1', { entry: 'stand' }); B.e.hp = B.e.hp0 = 4 * tune.enemy.bossHpMul; B.perch = 0; sim.say('gull', 'Hold still, little agents.'); },
  step(sim, B, dt) {
    const e = B.e;
    if (!e.alive) { B.defeat(sim); sim.cue('gull-down'); return; }
    // after each shot he moves to another perch along the gallery
    if (e.state === 'hide' && e.st < dt * 1.5 && B.lastState !== 'hide' && B.lastState) { const ids = ['p1', 'p2', 'p3']; B.perch = (B.perch + 1 + (sim.rng('ai') < .5 ? 1 : 0)) % 3; const cv = sim.scene.coversById[ids[B.perch]]; e.cover = cv; e.hide = cv.at.slice(); e.state = 'relocate'; e.st = 0; }
    B.lastState = e.state;
  },
  draw() {}
});

/* ======================= HAMMERHEAD: a minigun, a hatch-door shield, degrading cover ======================= */
def('boss', 'hammerhead', { name: 'HAMMERHEAD', title: 'The enforcer', card: true, speaker: 'hammerhead',
  frac: B => Math.max(0, B.body.hp) / B.body.max,
  make(sim, B) {
    B.rig = makeRig(sim, reg('speaker', 'hammerhead').rig); B.x = 1622; B.y = -18; B.z = 544; B.face = Math.PI; B.shieldUp = true; B.shieldOff = 0; B.coverHp = 3; B.swapped = false; B.lastHitT = -9;
    B.body = B.part('body', { hp: 60, score: 20000, noBar: false, open: true });
    B.shield = B.part('shield', { hp: 1, armor: true, noBar: true, noMul: true, onArmor: (s2, b, w) => { if ((w === 'sg' || w === 'gl') && b.shieldOff <= 0) { b.shieldOff = 1.5; s2.ev({ type: 'shieldoff' }); } } });
    B.r = { rig: B.rig, hit: B.body, pose: null }; B.rigs.push(B.r);
    B.set('advance', sim); B.next = 'sweep'; B.dmgWin = [];
  },
  step(sim, B, dt) {
    const half = B.body.hp <= B.body.max * .5, c = sim.cameraFor(0);
    B.shieldOff = Math.max(0, B.shieldOff - dt);
    if (half && !B.broke) { B.broke = true; B.shieldUp = false; sim.say('hammerhead', 'MY DOOR! YOU BROKE MY DOOR!'); sim.ev({ type: 'explode', at: [B.x, B.y + 10, B.z + 20], r: 30 }); B.set('charge', sim); }
    const shielded = B.shieldUp && B.shieldOff <= 0;
    // the shield: an armored slab in front of him, from the shins up
    const fx = Math.cos(B.face), fy = Math.sin(B.face), sx = B.x + fx * 13, sy = B.y + fy * 13;
    B.shield.alive = shielded; B.shield.vol = shielded ? { box: [sx - 2, sy - 14, B.z + 13, sx + 2, sy + 14, B.z + 48], yaw: B.face, cx: sx, cy: sy } : null;
    let pose = { x: B.x, y: B.y, z: B.z, vx: 0, vy: 0, facing: B.face, point: true, aim: Math.atan2(c.z - (B.z + 36), Math.hypot(c.x - B.x, c.y - B.y)), expr: 'angry', stance: null };
    if (B.dead) { B.fallT = (B.fallT || 0) + dt; B.x += Math.cos(B.face + Math.PI) * dt * 20; pose = { x: B.x, y: B.y, z: B.z - Math.max(0, B.fallT - .6) * B.fallT * 200, facing: B.face, air: B.fallT > .6, pose: B.fallT < .6 ? 'die' : null, expr: 'wince' }; B.r.pose = pose; B.r.hit = null; return; }
    switch (B.state) {
      case 'advance': {   // walks behind his shield; only the shins are open (a shotgun or launcher hit knocks it aside)
        B.face = Math.atan2(c.y - B.y, c.x - B.x); const tx = 1600 + Math.sin(B.t * .5) * 10, ty = -18 + Math.sin(B.t * .8) * 26;
        B.x += (tx - B.x) * dt * .8; B.y += (ty - B.y) * dt * .8; pose.vx = (tx - B.x) * .8; pose.vy = (ty - B.y) * .8;
        if (B.st > 3.2) B.set(B.next, sim);
        break;
      }
      case 'sweep': {   // spin up (a whine, the barrels glow, a big ring), then a sweep: exposed at any moment = hit
        if (B.st < dt * 1.5) { B.hits = {}; for (const p of sim.players) if (!p.out) bossThreat(sim, B, 'sweep', 1.2, () => B.rig.tip(), { target: p.id }); sim.ev({ type: 'spinup', at: [B.x, B.y, B.z + 30] }); if (!sim.flag('minigun')) sim.say('rook', 'Minigun! Get down!'); }
        B.spin = Math.min(1, B.st / 1.2);
        if (B.st > 1.2 && B.st < 3.7) {
          const u = (B.st - 1.2) / 2.5; B.face = Math.atan2(c.y - B.y, c.x - B.x) + (u - .5) * .9;
          if (Math.floor(B.st * 14) !== Math.floor((B.st - dt) * 14)) sim.ev({ type: 'eshot', from: B.rig.tip(), to: [c.x + (u - .5) * 120, c.y - 40, c.z - 10], miss: true, kind: 'gunner' });
          for (const p of sim.players) if (!p.out && p.present && !B.hits[p.id] && p.c < .5) { B.hits[p.id] = true; if (hurtPlayer(sim, p, 'sweep')) sim.ev({ type: 'eshot', from: B.rig.tip(), to: null, p: p.id, kind: 'gunner' }); }
        }
        if (B.st >= 3.7) { B.spin = 0; B.coverHp--; sim.ev({ type: 'coverhit', hp: B.coverHp }); if (B.coverHp <= 0 && !B.swapped) { B.swapped = true; sim.swapSlots(sim.scene.alt); sim.say('kai', "Cover's gone. Moving!"); } B.next = 'grenades'; B.set('advance', sim); }
        break;
      }
      case 'grenades': {   // three grenades in arcs: shoot them near him and they hurt him
        if (B.st > .4 && !B.thrown) {
          B.thrown = true;
          for (let k = 0; k < 3; k++) {
            const tgt = pickTarget(sim, [B.x, B.y]); if (tgt < 0) break;
            const cam = sim.cameraFor(tgt), g = sim.slotGround(tgt), land = [g[0] + Math.cos(cam.yaw) * (30 + k * 12), g[1] + Math.sin(cam.yaw) * (30 + k * 12) + (k - 1) * 14, g[2]], h = B.rig.hand('L'), T = 1.2 + k * .35;
            const pr = sim.launch({ kind: 'grenade', pos: h, vel: [(land[0] - h[0]) / T, (land[1] - h[1]) / T, (land[2] - h[2]) / T + .5 * 300 * T], gravity: 300, life: T + .05, hp: 1, target: tgt, land });
            pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'grenade', src: pr.id, pos: () => pr.pos }); if (pr.th) pr.th.srcAlive = () => pr.alive;
            pr.onShot = p => { if (V3.dist(pr.pos, [B.x, B.y, B.z + 20]) < 70 && !B.dead) { B.body.hp -= 4; B.body.flash = 1; sim.ev({ type: 'bosshit', part: 'body', at: pr.pos.slice() }); if (p) addScore(sim, p, 1000, pr.pos.slice()); } };
          }
          pose.attack = { spec: E.MOVES.throw, phase: 'active', u: .5 };
        }
        if (B.st > 2.6) { B.thrown = false; B.next = 'sweep'; B.set('advance', sim); }
        break;
      }
      case 'charge': {   // below half: no shield, he charges; 6 damage within 1.5 s staggers him, else he slams the cover
        B.face = Math.atan2(c.y - B.y, c.x - B.x);
        if (!B.chargeTo) { const g = sim.slotGround(0); B.chargeFrom = [B.x, B.y]; B.chargeTo = [g[0] + Math.cos(c.yaw) * 34, g[1] + Math.sin(c.yaw) * 34]; B.chargeHp = B.body.hp; B.lunge = 0; }
        B.lunge += dt; const u = Math.min(1, B.lunge / 1.5);
        B.x = lerp(B.chargeFrom[0], B.chargeTo[0], u); B.y = lerp(B.chargeFrom[1], B.chargeTo[1], u); pose.sprint = true; pose.point = false; pose.vx = (B.chargeTo[0] - B.chargeFrom[0]) / 1.5; pose.vy = (B.chargeTo[1] - B.chargeFrom[1]) / 1.5;
        if (B.chargeHp - B.body.hp >= 6) { B.set('stagger', sim); B.chargeTo = null; sim.ev({ type: 'shake', k: .5 }); break; }
        if (u >= 1) { B.th = bossThreat(sim, B, 'slam', .5, () => [B.x, B.y, B.z + 30]); B.set('slam', sim); B.chargeTo = null; }
        break;
      }
      case 'slam': { pose.attack = { spec: E.MOVES.haymaker, phase: B.st < .5 ? 'wind' : 'active', u: Math.min(1, B.st / .5) }; if (B.st > 1) { B.set('back', sim); } break; }
      case 'stagger': { pose.pose = 'kneel'; pose.point = false; pose.hurt = true; if (B.st > 1.6) B.set('back', sim); break; }
      case 'back': { const tx = 1610, ty = -18; pose.vx = (tx - B.x) * 2; pose.vy = (ty - B.y) * 2; B.x += (tx - B.x) * dt * 2; B.y += (ty - B.y) * dt * 2; if (B.st > 1.2) B.set(B.broke ? (sim.rng('boss') < .5 ? 'sweep' : 'charge') : 'advance', sim); break; }
    }
    if (B.spin > 0) pose.point = true;
    B.r.pose = pose;
    if (B.body.hp <= 0 && !B.dead) { sim.say('hammerhead', 'HAMMERHEAD... FALLS... DOWN...'); B.defeat(sim); }
    // the lighthouse beam dazzles now and then
    if (half && Math.floor(B.t / 8) !== Math.floor((B.t - dt) / 8)) sim.ev({ type: 'cutfx', fx: 'flash' });
  },
  hitShield(sim, B, w) { if (w === 'sg' || w === 'gl') { B.shieldOff = 1.5; sim.ev({ type: 'shieldoff' }); } },
  stepDead: true,
  draw(R, B, sim) {
    if (B.dead && B.fallT > 3) return;
    R.rig(B.rig, B.rig.x, B.rig.y, B.rig.z, { flash: B.body.flash });
    if (B.shieldUp && !B.broke) { const off = B.shieldOff > 0 ? 1.4 : 0, a = B.face + off, M = mat34(B.x + Math.cos(a) * 13, B.y + Math.sin(a) * 13, B.z + 13, a, 0, 0, 1.15); R.mesh('hatchshield', M, { flash: B.shield.flash }); }
    if (B.spin > 0) { const t = B.rig.tip(); R.glow(t, 3 + B.spin * 4, [255, 80, 40], B.spin); }
    const cv = ['', 'cracked', 'broken'][3 - Math.max(0, B.coverHp)] || '';
    if (!B.swapped) { const M = mat34(1508, -30, 544, 0, 0, cv === 'cracked' ? .1 : 0); R.mesh('crate1', M, { dim: cv ? .6 : 1 }); R.mesh('crate1', mat34(1508, -14, 544, 0), { dim: cv ? .6 : 1 }); R.mesh('crate1', mat34(1508, 2, 544, 0), {}); }
  }
});

/* ======================= SEAWOLF: the gunship (3-2: strafes, drops troops, retreats; 3-4: pods, then the rotor) ======================= */
function seawolfCommon(final) {
  return {
    name: 'SEAWOLF', title: 'Black Current gunship', card: false,
    frac: B => final ? (Math.max(0, B.pod0.hp) + Math.max(0, B.pod1.hp) + Math.max(0, B.hub.hp)) / (B.pod0.max + B.pod1.max + B.hub.max) : Math.max(0, B.body.hp) / B.body.max,
    make(sim, B) {
      B.final = final; B.pos = final ? [1300, -320, sim.carriers.lift.pos[2] + 60] : [1000, -380, 180]; B.yaw = 0; B.roll = 0; B.rotor = 0;
      if (final) { B.pod0 = B.part('pod0', { hp: 6, weak: true, score: 3000 }); B.pod1 = B.part('pod1', { hp: 6, weak: true, score: 3000 }); B.hub = B.part('hub', { hp: 10, weak: true, open: false, score: 8000 }); }
      else B.body = B.part('body', { hp: 24, weak: true, score: 6000 });
      B.set('arrive', sim); B.fire = 2; B.drops = 0;
    },
    step(sim, B, dt) {
      B.rotor += dt * 30;
      const c = sim.cameraFor(0);
      if (B.dead) { B.pos[2] -= dt * (B.final ? 90 : -40); B.pos[0] += Math.cos(B.yaw) * dt * 80; B.roll += dt * (B.final ? 2 : 0); if (B.final && !B.splashed && B.pos[2] < sim.waterZ()) { B.splashed = true; sim.ev({ type: 'explode', at: B.pos.slice(), r: 120, big: true }); sim.ev({ type: 'splash', at: B.pos.slice() }); } return; }
      const base = B.final ? [c.x + Math.cos(c.yaw) * 200 - Math.sin(c.yaw) * Math.sin(B.t * .25) * 70, c.y + Math.sin(c.yaw) * 200 + Math.cos(c.yaw) * Math.sin(B.t * .25) * 70, c.z + 30 + Math.sin(B.t * .5) * 12] : [820 + Math.sin(B.t * .25) * 30, Math.sin(B.t * .22) * 50, 125 + Math.sin(B.t * .4) * 12];
      if (B.state === 'arrive') { B.pos = V3.lerp(B.pos, base, Math.min(1, dt * .8)); if (B.st > 3) B.set('hover', sim); }
      else if (B.state === 'hover' || B.state === 'strafe') {
        B.pos = V3.lerp(B.pos, base, Math.min(1, dt * 1.2));
        B.fire -= dt;
        if (B.fire <= 0) {   // a strafing burst: a chain of threats with the minimum gap between them
          const tgt = pickTarget(sim, B.pos); B.fire = 3.2 * tune.enemy.fireMul;
          if (tgt >= 0) for (let k = 0; k < 1; k++) { const th = requestThreat(sim, tgt, { always: true, tele: 1.1, kind: 'gunship', src: -1, pos: () => [B.pos[0], B.pos[1], B.pos[2] - 8] }); if (th) { th.srcAlive = () => !B.dead; th.onResolve = () => sim.ev({ type: 'eshot', from: [B.pos[0], B.pos[1], B.pos[2] - 8], to: null, p: tgt, kind: 'gunner' }); } }
          for (let k = 0; k < 6; k++) sim.ev({ type: 'eshot', from: [B.pos[0], B.pos[1], B.pos[2] - 8], to: [c.x + (k - 3) * 20, c.y - 30 + k * 6, c.z - 16], miss: true, kind: 'gunner' });
          if (!B.final && B.drops < 2 && B.t > 6) { B.drops++; sim.cue('seawolf-drop'); }
          if (B.final && B.t > 4 && sim.enemies.filter(e => e.alive && e.carrier === 'lift').length < 1 && B.drops < 2) { B.drops++; for (const s of [-1, 1]) spawnEnemy(sim, 'deckhand', null, { entry: 'rappel', carrier: 'lift', local: [30, s * 12, 3], ropeH: 60 }); }
        }
      }
      B.yaw = Math.atan2(c.y - B.pos[1], c.x - B.pos[0]); B.roll = Math.sin(B.t * .9) * .12;
      B.M = mat34(B.pos[0], B.pos[1], B.pos[2], B.yaw, 0, B.roll);
      if (B.final) {
        B.pod0.vol = B.pod0.alive ? { c: L2W(B.M, [-4, -24, -10]), r: 7 } : null; B.pod1.vol = B.pod1.alive ? { c: L2W(B.M, [-4, 24, -10]), r: 7 } : null;
        B.hub.open = !B.pod0.alive && !B.pod1.alive; B.hub.vol = { c: L2W(B.M, [0, 0, 14]), r: 8 };
        if (B.hub.open && !B.saidHub) { B.saidHub = true; sim.say('juno', 'Pods are down! Hit the rotor hub!'); }
        if (!B.hub.alive) { B.defeat(sim); sim.cue('seawolf2-down'); }
      } else { B.body.vol = { c: L2W(B.M, [0, 0, 0]), r: 14 }; if (B.body.hp <= 0) { B.defeat(sim); sim.say('juno', "He's pulling out! Seawolf is retreating!"); sim.cue('seawolf-down'); } }
    },
    stepDead: true,
    draw(R, B, sim) {
      if (!B.M || (B.dead && (B.splashed || B.pos[2] > 500))) return;
      const M = mat34(B.pos[0], B.pos[1], B.pos[2], B.yaw, 0, B.roll);
      R.mesh('seawolf', M, { flash: (B.body || B.hub).flash * .5 });
      R.mesh('rotor', mulMat34(M, mat34(0, 0, 14, B.rotor)), {});
      R.mesh('rotor', mulMat34(M, mat34(-72, 0, 8, 0, 0, Math.PI / 2, .25)), {});
      if (B.final) { if (B.pod0.alive) R.mesh('pod', mulMat34(M, mat34(-4, -24, -10, 0)), { flash: B.pod0.flash }); if (B.pod1.alive) R.mesh('pod', mulMat34(M, mat34(-4, 24, -10, 0)), { flash: B.pod1.flash }); if (B.hub.open) R.glow(L2W(M, [0, 0, 14]), 8, [255, 200, 80], .6 + .3 * Math.sin(sim.t * 8)); }
      if (B.dead) R.fire(B.pos, 1.5);
      R.light([B.pos[0], B.pos[1], B.pos[2] - 10], 100, .4);
    }
  };
}
def('boss', 'seawolf', seawolfCommon(false));
def('boss', 'seawolf2', seawolfCommon(true));

/* ======================= SCYLLA (3-B phase 1): six knees, claw cannons, missile volleys, topple, cockpit ======================= */
function segMat(a, b, r = 1) {
  const d = V3.sub(b, a), L = V3.len(d) || 1, x = V3.mul(d, 1 / L), up = Math.abs(x[2]) > .9 ? [1, 0, 0] : [0, 0, 1], y = V3.norm(V3.cross(up, x)), z = V3.cross(x, y);
  return [x[0] * L, y[0] * r, z[0] * r, a[0], x[1] * L, y[1] * r, z[1] * r, a[1], x[2] * L, y[2] * r, z[2] * r, a[2]];
}
TC.segMat = segMat;
def('boss', 'scylla', { name: 'SCYLLA', title: "Admiral Krake's crab walker", card: true, speaker: 'krake',
  frac: B => B.phase === 2 ? .5 * Math.max(0, B.kr.hp) / B.kr.max : .5 + .5 * (B.knees.reduce((a, k) => a + Math.max(0, k.hp), 0) + Math.max(0, B.cock.hp)) / (B.knees.reduce((a, k) => a + k.max, 0) + B.cock.max),
  make(sim, B) {
    B.phase = 1; B.pos = [1560, 60, TW.roof]; B.yaw = Math.PI; B.tilt = 0; B.topples = 0; B.gait = 0;
    B.knees = []; for (let i = 0; i < 6; i++) B.knees.push(B.part('knee' + i, { hp: 6, weak: true, score: 2500, leg: i, onBreak: (s, b) => { s.ev({ type: 'explode', at: b.knees[i].vol.c.slice(), r: 30 }); } }));
    B.cock = B.part('cockpit', { hp: 16, weak: true, open: false, score: 10000 });
    B.claw = [0, 0]; B.fire = 2; B.volley = 6; B.set('walk', sim);
    B.kr = B.part('krake', { hp: 32, noBar: true, open: false, score: 30000 });
    B.krig = makeRig(sim, Object.assign({}, reg('speaker', 'krake').rig, { weapon: 'flare' }));
    B.r = { rig: B.krig, hit: null, pose: null, live: false }; B.rigs.push(B.r);
  },
  step(sim, B, dt) {
    if (B.phase === 2) { krakeStep(sim, B, dt); return; }
    const c = sim.cameraFor(0), body = [B.pos[0], B.pos[1], B.pos[2] + 46 - B.tilt * 18];
    B.gait += dt * (B.state === 'walk' ? 2.2 : .6);
    if (B.state === 'walk' || B.state === 'fire') { B.pos[1] = 60 + Math.sin(B.t * .35) * 34; B.pos[0] = 1565 + Math.sin(B.t * .21) * 14; }
    B.yaw = Math.atan2(c.y - B.pos[1], c.x - B.pos[0]);
    B.M = mat34(body[0], body[1], body[2], B.yaw, 0, B.tilt * 1.05);
    // legs: hips on the body, feet on the roof, knees bent up (IK by construction)
    B.legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3, ang = B.yaw + side * (Math.PI / 2) + (k - 1) * .65 * side, hip = L2W(B.M, [(1 - k) * 20, side * 22, 2]);
      const ph = B.gait + (i % 2) * Math.PI, lift = Math.max(0, Math.sin(ph)) * 10 * (B.state === 'walk' ? 1 : .2), fr = 70 + (B.knees[i].alive ? 0 : -18);
      const foot = [B.pos[0] + Math.cos(ang) * fr + Math.cos(B.yaw) * Math.cos(ph) * 8, B.pos[1] + Math.sin(ang) * fr + Math.sin(B.yaw) * Math.cos(ph) * 8, B.pos[2] + lift];
      const mid = V3.lerp(hip, foot, .45); mid[2] += 34 - B.tilt * (side < 0 ? 20 : -6);
      B.legs.push([hip, mid, foot]);
      B.knees[i].vol = B.knees[i].alive ? { c: mid, r: 6.5 } : null;
      B.knees[i].open = B.state !== 'topple';
    }
    B.cock.vol = { c: L2W(B.M, [34, 0, 12]), r: 12 };
    B.claws = [L2W(B.M, [30, -30, -6]), L2W(B.M, [30, 30, -6])];
    const dead = B.knees.filter(k => !k.alive).length;
    switch (B.state) {
      case 'walk': case 'fire': {
        B.fire -= dt;
        if (B.fire <= 0) {
          if (B.volley-- > 0 && sim.rng('boss') < .6) {   // a claw cannon: a charge glow, then the shot
            const ci = sim.rng('boss') < .5 ? 0 : 1; B.charge = ci; B.chargeT = .9;
            const th = bossThreat(sim, B, 'claw', .9, () => B.claws[ci]); if (th) th.onResolve = () => sim.ev({ type: 'eshot', from: B.claws[ci].slice(), to: null, p: th.target, kind: 'gunner' });
            B.fire = 1.6;
          } else {   // a missile volley of six in arcs: shoot them down or take cover
            for (let k = 0; k < 6; k++) {
              const tgt = pickTarget(sim, body); if (tgt < 0) break;
              const cam = sim.cameraFor(tgt), from = L2W(B.M, [-10, (k % 2 ? 1 : -1) * 26, 18]), land = [cam.x + Math.cos(cam.yaw) * (24 + k * 3), cam.y + Math.sin(cam.yaw) * (24 + k * 3) + (k - 2.5) * 10, cam.z - 14], T = 1.6 + k * .38;
              const pr = sim.launch({ kind: 'missile', pos: from, vel: [(land[0] - from[0]) / T, (land[1] - from[1]) / T, (land[2] - from[2]) / T + .5 * 120 * T], gravity: 120, life: T, hp: 1, target: tgt, land, home: true });
              pr.th = requestThreat(sim, tgt, { always: true, tele: T, kind: 'missile', src: pr.id, pos: () => pr.pos }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
            }
            B.volley = 3 + (sim.rng('boss') * 3 | 0); B.fire = 4.2;
          }
        }
        B.chargeT = Math.max(0, (B.chargeT || 0) - dt);
        if (dead >= 3 * (B.topples + 1) && B.topples < 2) { B.topples++; B.set('topple', sim); sim.ev({ type: 'shake', k: .8 }); sim.say('juno', "It's down! Hit the cockpit!"); }
        break;
      }
      case 'topple': {   // on its side: the cockpit hatch opens for 6 s
        B.tilt = Math.min(1, B.st / .6) * (B.st < 6.4 ? 1 : Math.max(0, 1 - (B.st - 6.4) / .8));
        B.cock.open = B.st > .6 && B.st < 6.4;
        if (B.topples >= 2 && B.st > .6) { B.cock.open = true; }
        if (!B.cock.alive || (B.topples >= 2 && B.knees.every(k => !k.alive) && B.st > 1.5)) { B.cockBreak(sim); return; }
        if (B.st > 7.2) { B.tilt = 0; B.cock.open = false; B.set('walk', sim); B.limp = true; }
        break;
      }
    }
  },
  draw(R, B, sim) {
    if (B.phase === 2) { krakeDraw(R, B, sim); return; }
    if (!B.M) return;
    R.mesh('scylla-body', B.M, { flash: B.flash * .4 });
    R.mesh('scylla-hatch', mulMat34(B.M, mat34(18, 0, 22, 0, B.cock.open ? 1.2 : 0)), { flash: B.cock.flash });
    if (B.cock.open) R.glow(B.cock.vol.c, 10, [255, 180, 60], .7);
    for (let i = 0; i < 6; i++) { const [h, m, f] = B.legs[i]; R.mesh('leg', segMat(h, m, 1.3), {}); R.mesh('leg', segMat(m, f, 1), {}); if (B.knees[i].alive) R.mesh('knee', mat34(m[0], m[1], m[2], 0), { flash: B.knees[i].flash, glow: .4 + .3 * Math.sin(sim.t * 6 + i) }); else R.fire(m, .5); }
    for (let k = 0; k < 2; k++) { const at = B.claws[k]; R.mesh('claw', mat34(at[0], at[1], at[2], B.yaw + (k ? .25 : -.25)), {}); if (B.charge === k && B.chargeT > 0) R.glow(L2W(mat34(at[0], at[1], at[2], B.yaw + (k ? .25 : -.25)), [40, 0, 0]), 4 + (1 - B.chargeT) * 6, [255, 90, 40], 1); }
  }
});
/** the cockpit breaks: Krake ejects; the fight moves into the control room */
reg('boss', 'scylla').make = (orig => function (sim, B) {
  orig.call(this, sim, B);
  B.cockBreak = sim2 => {
    B.phase = 2; B.cock.alive = false; for (const k of B.knees) { k.alive = false; k.vol = null; }
    sim2.ev({ type: 'explode', at: B.cock.vol.c.slice(), r: 80, big: true }); sim2.ev({ type: 'bossstate', id: 'scylla', state: 'krake' });
    sim2.say('krake', 'You think a machine is my only weapon? I am the storm!');
    sim2.swapSlots(sim2.scene.alt); sim2.timer = Math.max(sim2.timer, 0) + 90 * sim2.diff.time * tune.time.sceneMul; sim2.ev({ type: 'extend', s: 90 });
    B.kx = 1580; B.ky = -80; B.kz = TW.roof; B.r.live = true; B.r.hit = B.kr; B.kr.open = true; B.kstate = 'enter'; B.kst = 0; B.flares = 0; B.final = 0; B.lever = 0;
    sim2.ev({ type: 'music', song: 'kingtide' });
    B.D = Object.assign({}, B.D, { name: 'ADMIRAL KRAKE' });
  };
})(reg('boss', 'scylla').make);

/* ======================= ADMIRAL KRAKE (3-B phase 2) and the FINAL SHOT ======================= */
const KSPOTS = [[1584, -96], [1584, -64], [1540, -80], [1572, -110]];
function krakeStep(sim, B, dt) {
  const c = sim.cameraFor(0); B.kst += dt;
  if (B.kr.hp <= B.kr.max * .02 && !B.dead) { B.kr.hp = B.kr.max * .02; B.kr.alive = true; }
  const pose = { x: B.kx, y: B.ky, z: B.kz, facing: Math.atan2(c.y - B.ky, c.x - B.kx), point: true, aim: Math.atan2(c.z - (B.kz + 30), Math.hypot(c.x - B.kx, c.y - B.ky)), expr: 'angry' };
  if (B.dead) { pose.pose = 'die'; pose.point = false; B.r.pose = pose; return; }
  const k = B.kstate;
  if (k === 'enter') { pose.air = B.kst < .6; if (B.kst > 1) { B.kstate = 'shoot'; B.kst = 0; } }
  else if (k === 'dodge') {   // a roll to another console
    const u = Math.min(1, B.kst / .7); B.kx = lerp(B.from[0], B.to[0], u); B.ky = lerp(B.from[1], B.to[1], u); pose.flip = u < 1 ? u : 0; pose.point = false;
    if (u >= 1) { B.kstate = sim.rng('boss') < .3 ? 'smoke' : 'shoot'; B.kst = 0; }
  } else if (k === 'shoot') {   // flares from the pistol: slow, glowing, shootable
    if (B.kst > .5 && B.kst - dt <= .5 || B.kst > 1.3 && B.kst - dt <= 1.3) {
      const tgt = pickTarget(sim, [B.kx, B.ky]); if (tgt >= 0) {
        const cam = sim.cameraFor(tgt), from = B.krig.tip(), to = [cam.x, cam.y, cam.z - 4], d = V3.dist(from, to);
        const pr = sim.launch({ kind: 'flare', pos: from, vel: V3.mul(V3.norm(V3.sub(to, from)), 160), life: d / 160, hp: 1, target: tgt, land: to, home: true });
        pr.th = requestThreat(sim, tgt, { always: true, tele: Math.max(.9, d / 160), kind: 'flare', src: pr.id, pos: () => pr.pos }); if (pr.th) { pr.th.srcAlive = () => pr.alive; pr.life = pr.th.dur + .05; }
      }
    }
    if (B.kst > 2.2) { const spot = KSPOTS[(sim.rng('boss') * KSPOTS.length) | 0]; B.from = [B.kx, B.ky]; B.to = spot; B.kstate = 'dodge'; B.kst = 0; }
    if (sim.enemies.filter(e => e.alive && !e.civ && !e.ally).length === 0 && B.kst > 1 && (B.summons = (B.summons || 0)) < 4 && sim.rng('boss') < dt * .6) { B.summons++; spawnEnemy(sim, 'redtide', 'd1', { entry: 'door', from: [1600, -50, TW.roof] }); spawnEnemy(sim, 'redtide', 'd2', { entry: 'door', from: [1600, -110, TW.roof] }); }
  } else if (k === 'smoke') { pose.attack = { spec: E.MOVES.throw, phase: 'active', u: .5 }; if (B.kst > .4 && !B.smoked) { B.smoked = true; sim.ev({ type: 'smoke', s: 3 }); } if (B.kst > 1) { B.smoked = false; B.kstate = 'shoot'; B.kst = 0; } }
  else if (k === 'lunge') {   // the FINAL SHOT: he lunges for the master lever; slow motion; hit the lever arm within 3 s
    B.kx = lerp(B.kx, 1590, dt * 3); B.ky = lerp(B.ky, -86, dt * 3); pose.facing = 0; pose.point = false; pose.attack = { spec: E.MOVES.thrust, phase: 'wind', u: Math.min(1, B.kst / 3) };
    B.finalT = Math.max(0, 3 - B.kst); B.lever = Math.min(1, B.kst / 3) * .5;
    if (B.kst > 3) { B.finalT = 0; B.lever = 0; sim.waterRise = (sim.waterRise || 0) + 4; sim.ev({ type: 'surge' }); sim.say('juno', 'The water\'s surging! TIDE RISING!'); B.kstate = 'shoot'; B.kst = 0; B.nextFinal = sim.t + 6; B.leverPart.open = false; }
  }
  if (B.kr.hp <= B.kr.max * .15 && k !== 'lunge' && (!B.nextFinal || sim.t > B.nextFinal)) {
    B.kstate = 'lunge'; B.kst = 0; sim.ev({ type: 'final' }); sim.say('tejada', "He's going for the master lever. Stop him!");
    if (!B.leverPart) B.leverPart = B.part('lever', { hp: 1, noBar: true, noMul: true, score: 50000, onBreak: (s, b, p) => { b.finalHit(s, p); } });
    B.leverPart.alive = true; B.leverPart.hp = 1; B.leverPart.open = true;
  }
  if (B.leverPart) B.leverPart.vol = B.leverPart.open ? { a: [1592, -80, TW.roof + 22], b: [1592, -80, TW.roof + 48], r: 5 } : null;
  B.r.pose = pose;
}
reg('boss', 'scylla').make = (orig => function (sim, B) {
  orig.call(this, sim, B);
  B.finalHit = (sim2, p) => { B.finalT = 0; B.kr.hp = 0; sim2.ev({ type: 'explode', at: [1592, -80, TW.roof + 40], r: 30 }); sim2.say('krake', 'The sea... always... wins...'); B.defeat(sim2); sim2.ev({ type: 'slowmo', s: 1.2 }); void p; };
})(reg('boss', 'scylla').make);
function krakeDraw(R, B, sim) {
  R.rig(B.krig, B.krig.x, B.krig.y, B.krig.z, { flash: B.kr.flash });
}
TC.krakeStep = krakeStep;

// ---- 30-stagefmt.js ----
/* 30-stagefmt: the stage and scene schema, the Director (rail travel -> ACTION -> waves by time, by carrier distance,
 * after a clear, after kills, on a cue -> clear -> ride on -> boss -> outro) and the content validators.
 *   def('stage', n, { name, place, clock, music, env, build(G, S), carriers, intro, outro, scenes: [ids] })
 *   def('scene', id, { title, time, arrive: { path, speed, look }, slots: [{ stand: { at, look }, cover: { at, look } }],
 *     carrier, covers: { id: { at, h, peek, face, ledge, water, floor } }, waves: [{ id, at | after | atD | kills | on,
 *     delay, spawn: [[type, coverId, opts]] }], civilians, allies, cues: [{ at | on, say, prompt, do }], boss, objective })
 * Slots 3 and 4 (AI Hub) are slot 1 moved 28 units to its left and slot 2 moved 28 units to its right. */
const EYE = 24, EYE_COVER = 12;
function lookAngles(from, to) { const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2]; return [Math.atan2(dy, dx), Math.atan2(dz, Math.hypot(dx, dy))]; }
TC.lookAngles = lookAngles;

/** prepare a scene for play: derived slots, cover faces, lists */
function prepScene(sc) {
  if (sc._prepped) return sc; sc._prepped = true;
  const s0 = sc.slots[0];
  const off = (slot, k) => {
    const st = slot.stand, look = st.look || [st.at[0] + 100, st.at[1], st.at[2]], [yaw] = sc.carrier ? [(st.yaw || 0) * DEG] : lookAngles(st.at, look);
    const r = [-Math.sin(yaw) * k, Math.cos(yaw) * k], mv = p => p && [p[0] + r[0], p[1] + r[1], p[2]];
    if (sc.carrier) return { stand: Object.assign({}, st, { at: [st.at[0], st.at[1] + k, st.at[2]] }), cover: Object.assign({}, slot.cover, { at: [slot.cover.at[0], slot.cover.at[1] + k, slot.cover.at[2]] }), auto: true };
    return { stand: { at: mv(st.at), look: mv(st.look) }, cover: { at: mv(slot.cover.at), look: mv(slot.cover.look) }, auto: true };
  };
  if (sc.slots.length === 1) sc.slots.push(off(sc.slots[0], 26));
  sc.slots[2] = sc.slots[2] || off(sc.slots[0], -28);
  sc.slots[3] = sc.slots[3] || off(sc.slots[1], 28);
  sc.coverList = []; sc.coversById = {};
  const tgt = sc.carrier ? null : s0.stand.at;
  for (const [id, c] of Object.entries(sc.covers || {})) {
    const cv = Object.assign({ id, h: 20, peek: ['up'] }, c);
    if (cv.face === undefined) cv.face = tgt ? Math.atan2(tgt[1] - cv.at[1], tgt[0] - cv.at[0]) : Math.PI;
    else cv.face *= DEG;
    sc.coverList.push(cv); sc.coversById[id] = cv;
  }
  return sc;
}
TC.prepScene = prepScene;

/* ---- the Director: one scene at a time ---- */
class Director {
  constructor(sim, sc) {
    this.sim = sim; this.sc = prepScene(sc); this.t = 0; this.fired = new Set(); this.kills = 0; this.cues = new Set(); this.pending = [];
    this.waves = (sc.waves || []).map((w, i) => ({ w, id: w.id || 'w' + i, started: false, ids: [], i }));
    this.civs = (sc.civilians || []).map(c => ({ c, done: false }));
    this.allies = [];
  }
  start() {
    const sim = this.sim, sc = this.sc;
    for (const cv of sc.coverList) cv.taken = 0;
    if (sim.players.length === 1 && sim.mode !== 'attract' || sim.mode === 'attract') for (const a of sc.allies || []) this.allies.push(spawnEnemy(sim, 'ally', null, { who: a.who, from: a.at, facing: a.facing, every: a.every, kills: a.kills }));
    if (sc.onStart) sc.onStart(sim);
  }
  waveDone(W) { return W.started && W.ids.every(id => { const e = this.sim.enemyById(id); return !e || !e.alive || e.civ; }) && !this.pending.some(p => p.wave === W.id); }
  step(dt) {
    const sim = this.sim, sc = this.sc; this.t += dt;
    for (const W of this.waves) {
      if (W.started) continue;
      const w = W.w; let go = false;
      if (w.at !== undefined) go = this.t >= w.at;
      else if (w.atD !== undefined) go = sim.carrierD() >= w.atD;
      else if (w.kills !== undefined) go = this.kills >= w.kills;
      else if (w.on) go = this.cues.has(w.on);
      else if (w.after === 'clear' || !w.after) go = this.waves.slice(0, W.i).every(o => this.waveDone(o));
      else go = this.waves.some(o => o.id === w.after && this.waveDone(o));
      if (go && w.delay) { if (W.wait === undefined) W.wait = this.t + w.delay; go = this.t >= W.wait; }
      if (!go) continue;
      W.started = true;
      for (const s of w.spawn || []) { const o = Object.assign({ wave: W.id }, s[2] || {}); if (o.delay) this.pending.push({ at: this.t + o.delay, s, o, wave: W.id }); else W.ids.push(spawnEnemy(sim, s[0], s[1], o).id); }
      if (w.say) sim.say(w.say[0], w.say[1]);
      if (w.cue) sim.cue(w.cue);
      if (w.do) w.do(sim);
    }
    for (const P of this.pending.slice()) if (this.t >= P.at) { this.pending.splice(this.pending.indexOf(P), 1); const W = this.waves.find(x => x.id === P.wave); const e = spawnEnemy(sim, P.s[0], P.s[1], P.o); if (W) W.ids.push(e.id); }
    for (const C of this.civs) if (!C.done && this.t >= C.c.at) { C.done = true; spawnEnemy(sim, 'civilian', null, { route: C.c.route, from: C.c.route[0], look: C.c.look, leave: C.c.leave, speed: C.c.speed }); if (C.c.say) sim.say(C.c.say[0], C.c.say[1]); }
    for (const c of sc.cues || []) if (c.at !== undefined && !this.fired.has(c) && this.t >= c.at) { this.fire(c); }
  }
  cue(name, data) {
    this.cues.add(name);
    for (const c of this.sc.cues || []) if (c.on === name && !this.fired.has(c)) this.fire(c, data);
  }
  fire(c, data) {
    const sim = this.sim; if (!c.repeat) this.fired.add(c);
    if (c.say) sim.say(c.say[0], c.say[1]);
    if (c.prompt) sim.ev({ type: 'prompt', id: c.prompt });
    if (c.do) c.do(sim, data);
    if (c.music) sim.ev({ type: 'music', song: c.music });
  }
  clear() {
    const sim = this.sim;
    if (this.waves.some(W => !W.started) || this.pending.length) return false;
    if (!this.waves.every(W => this.waveDone(W))) return false;
    if (sim.boss && !sim.boss.dead) return false;
    if (sim.enemies.some(e => e.alive && !e.civ && !e.ally)) return false;
    if (this.sc.objective && !this.sc.objective(sim)) return false;
    return true;
  }
}
TC.Director = Director;

/* ---- validators (the tests run them over every stage) ---- */
function validateContent() {
  const errs = [], E2 = m => errs.push(m);
  for (const st of regAll('stage')) {
    for (const id of st.scenes) {
      const sc = reg('scene', id); if (!sc) { E2('stage ' + st.id + ': scene ' + id + ' missing'); continue; }
      prepScene(sc);
      if (!sc.title) E2(id + ': no title');
      if (!(sc.time > 0)) E2(id + ': no time');
      if (!sc.arrive || !sc.arrive.path || (typeof sc.arrive.path === 'function' ? sc.arrive.path(null) : sc.arrive.path).length < 1) E2(id + ': no arrive path');
      for (const w of sc.waves || []) for (const s of w.spawn || []) { if (!reg('enemy', s[0])) E2(id + ': unknown enemy ' + s[0]); if (s[1] && !sc.coversById[s[1]]) E2(id + ': unknown cover ' + s[1]); }
      for (const c of sc.cues || []) if (c.say && !reg('speaker', c.say[0])) E2(id + ': unknown speaker ' + c.say[0]);
      for (const a of sc.allies || []) if (!reg('speaker', a.who)) E2(id + ': unknown ally ' + a.who);
      if (sc.boss && !reg('boss', sc.boss)) E2(id + ': unknown boss ' + sc.boss);
      if (sc.carrier && !(st.carriers && st.carriers[sc.carrier])) E2(id + ': unknown carrier ' + sc.carrier);
      if (sc.slots.length < 4) E2(id + ': slots not derived');
    }
    if (st.intro && !reg('cutscene', st.intro)) E2('stage ' + st.id + ': intro ' + st.intro + ' missing');
    if (st.outro && !reg('cutscene', st.outro)) E2('stage ' + st.id + ': outro ' + st.outro + ' missing');
    if (st.music && !reg('song', st.music)) E2('stage ' + st.id + ': song ' + st.music + ' missing');
  }
  for (const h of regAll('highlight')) if (!reg('scene', h.scene)) E2('highlight ' + h.id + ': scene ' + h.scene + ' missing');
  return errs;
}
TC.validateContent = validateContent;

// ---- 31-stage1.js ----
/* 31-stage1: STAGE 1, HARBOR LIGHTS (Port Lumen Docks, 23:40, the Lantern Festival). Geometry along +x: Lantern Pier
 * (x -320..340), the quay, the Fish Market hall (x 600..880), the Container Yard (x 900..1420), the Silver Canals (the
 * boat, x 1450..2750), the harbor mouth (the Stingray, x 2800..). Scenes 1-1 .. 1-4 and the boss 1-B. */
def('stage', 1, {
  num: 1, name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', maxThreats: 1,
  env: { ambient: .3, skyK: .05, sun: { dir: [-.35, .45, .82], k: .32 }, fog: ['#1a2242', 420, 2100], warm: '#ffb347', water: { z: -24 },
    sky: { colors: ['#0b1026', '#1b2a52', '#3a3060'], glow: '#b8448a', below: '#0e1630', stars: true, moon: { dir: [.55, -.6, .42], r: 2.6 }, clouds: '#26345e', cloudK: .45,
      layers: [{ kind: 'city', color: '#0c1230', lit: '#ffd88a', height: .075, seed: 3 }, { kind: 'hills', color: '#141a3a', height: .05, seed: 9 }] }, fireworks: true, actorK: 1.2 },
  carriers: {
    boat: { path: [[1440, 0, -18], [1700, -10, -18], [1950, 15, -18], [2200, 0, -18], [2450, -12, -18], [2700, 0, -18], [2780, 0, -18]], speed: 105, mesh: 'speedboat' },
    boat2: { path: [[2900, -40, -18], [3300, -40, -18], [3800, -40, -18], [4400, -40, -18], [5200, -40, -18]], speed: 55, mesh: 'speedboat' }
  },
  build(G) {
    // the sea, the far city
    KIT.sea(G, 'sea-night', -1600, -1800, 6200, 1800, -24);
    KIT.skyline(G, -900, -1500, 5600, -1500, 11, 80, 220);
    KIT.skyline(G, 5600, 1500, -900, 1500, 12, 60, 180);
    // ---- 1-1 Lantern Pier ----
    KIT.pier(G, -340, -60, 340, 60, 0);
    KIT.crates(G, 20, -34, 0, 2, 1, 1, 14); KIT.crate(G, 20, -34, 13, 12);              // P1's fish crates
    KIT.barrel(G, 18, 34); KIT.barrel(G, 30, 30); KIT.bollard(G, 24, 46);                 // P2's barrels and bollard
    KIT.stall(G, 170, -38, 0, 0, 'awning-red'); KIT.stall(G, 175, 34, 0, 0, 'awning-blue'); KIT.stall(G, 90, -44, 0, 0, 'awning-green');
    KIT.crates(G, 236, 0, 0, 2, 1, 2, 15);
    KIT.barrel(G, 258, 40); KIT.barrel(G, 258, 52); KIT.crate(G, 316, 50, 0, 16); KIT.bollard(G, 300, 38);
    for (let x = -300; x <= 300; x += 75) { KIT.lamp(G, x, -58, 0, 'glow-amber', 40, .55); }
    KIT.lights(G, [-200, -58, 38], [-80, 58, 38], 14); KIT.lights(G, [-60, -58, 38], [60, 58, 38], 14); KIT.lights(G, [80, -58, 38], [200, 58, 38], 14); KIT.lights(G, [220, -58, 38], [330, 58, 38], 12);
    KIT.fishingBoat(G, 250, 100, -14, 0); KIT.fishingBoat(G, -160, -105, -14, Math.PI);
    // the quay and its warehouses
    KIT.ground(G, 340, -420, 620, 420, 0, 'concrete', 'stone');
    KIT.building(G, 420, -380, 560, -70, 84, { mat: 'brick', roof: 'slate' }); KIT.windowsX(G, 420, -380, -70, 20, 2);
    KIT.building(G, 420, 70, 560, 380, 84, { mat: 'brick-dk', roof: 'slate' }); KIT.windowsX(G, 420, 70, 380, 20, 2);
    KIT.crates(G, 346, -10, 0, 2, 1, 2, 14); KIT.lamp(G, 360, -66, 0); KIT.lamp(G, 360, 66, 0);
    G.box('sign', 421, -280, 52, 423, -150, 70, { solid: false });
    // ---- 1-2 the Fish Market hall (x 600..880, y -160..160) ----
    G.box('floortile', 600, -160, -2, 880, 160, 0, { solid: false });
    G.box('brick', 596, -164, 0, 600, 160, 100, { solid: true, skip: 'b' }); G.box('brick', 596, -164, 0, 884, -160, 100, { skip: 'b' }); G.box('brick', 596, 160, 0, 884, 164, 100, { skip: 'b' }); G.box('brick', 880, -160, 0, 884, 160, 100, { skip: 'b' });
    G.box('timber', 596, -164, 100, 884, 164, 104, { bottom: 'timber', solid: false });
    for (let x = 640; x <= 860; x += 55) G.box('timber', x - 2, -160, 92, x + 2, 160, 100, { solid: false });
    // the door gap: west wall opening at y -16..16 is drawn as a dark doorway (we enter through it)
    G.box('timber', 594, -18, 0, 597, 18, 34, { solid: false });
    // the gallery (east and north), its balustrade
    G.box('planks', 820, -160, 40, 880, 160, 44, { bottom: 'pier-dk' }); G.box('oak', 818, -160, 44, 822, 160, 60, { cover: true });
    for (let y = -150; y <= 150; y += 50) G.cyl('oak', 822, y, 0, 2.5, 40, { seg: 6 });
    G.stairs('planks', 760, -150, 0, 820, -150, 44, 16, 8);
    // stalls, the ice table, crates
    G.box('planks', 656, -42, 0, 672, -8, 20, { top: 'ice', cover: true });           // P1's fish counter
    KIT.crates(G, 664, 28, 0, 1, 2, 2, 14);                                                // P2's crates
    KIT.stall(G, 722, -60, 0, 0, 'awning-red'); KIT.stall(G, 722, 50, 0, 0, 'awning-green');
    G.box('steel', 752, -22, 0, 768, 14, 18, { top: 'ice' });
    KIT.crates(G, 726, -100, 0, 2, 1, 2, 14); KIT.crates(G, 726, 100, 0, 2, 1, 2, 14);
    G.box('planks', 600, -160, 26, 760, -154, 28, { solid: false });                       // a shelf (the intel bottle)
    for (const [x, y] of [[680, -60], [680, 60], [760, 0], [840, -100], [840, 100]]) G.light(x, y, 70, 120, .28);
    // ---- 1-3 the Container Yard (x 900..1420) ----
    KIT.ground(G, 884, -420, 1430, 420, 0, 'asphalt', 'stone');
    G.box('crate', 956, -50, 0, 972, -24, 18, { cover: true }); G.box('steel-dk', 958, -48, 18, 970, -26, 22);   // P1's forklift-crate
    KIT.barrel(G, 962, 26); KIT.barrel(G, 962, 40);
    for (const [y, m] of [[-130, 'corr-red'], [130, 'corr-blue']]) { KIT.container(G, 1089, y, 0, 0, m); KIT.container(G, 1187, y, 0, 0, m === 'corr-red' ? 'corr-green' : 'corr-ochre'); KIT.container(G, 1089, y, 42, 0, 'corr-ochre'); KIT.container(G, 1187, y, 42, 0, 'corr-grey'); }
    KIT.crates(G, 1086, -70, 0, 2, 1, 2, 14); KIT.crates(G, 1086, 80, 0, 2, 1, 2, 14);
    G.box('paint-yellow', 1128, 0, 0, 1144, 24, 16, { cover: true }); G.box('steel-dk', 1128, 0, 16, 1144, 6, 30);     // forklifts
    G.box('paint-yellow', 1160, -52, 0, 1176, -28, 16, { cover: true }); G.box('paint-yellow', 1160, 48, 0, 1176, 72, 16, { cover: true });
    KIT.container(G, 1290, -110, 0, Math.PI / 2, 'corr-white'); KIT.container(G, 1290, 110, 0, Math.PI / 2, 'corr-red'); KIT.container(G, 1290, -110, 42, Math.PI / 2, 'corr-blue');
    // the gantry crane
    for (const y of [-200, 200]) { G.box('paint-yellow', 1340, y - 6, 0, 1352, y + 6, 160); G.box('paint-yellow', 1400, y - 6, 0, 1412, y + 6, 160); }
    G.box('paint-yellow', 1336, -206, 160, 1416, 206, 172, { solid: false }); G.box('steel-dk', 1360, -20, 120, 1392, 20, 160, { solid: false });
    for (const [x, y] of [[1000, -200], [1000, 200], [1240, -200], [1240, 200]]) KIT.lamp(G, x, y, 0, 'glow-amber', 70, .7);
    // ---- 1-4 the Silver Canals (x 1440..2750): quays, houses, bridges, side canals ----
    for (const s of [-1, 1]) {
      for (let x = 1430; x < 2760; x += 220) {
        const gap = (s < 0 && x >= 1540 && x < 1760) || (s > 0 && x >= 1980 && x < 2200);
        if (gap) continue;
        KIT.ground(G, x, s < 0 ? -320 : 72, x + 220, s < 0 ? -72 : 320, 0, 'cobble', 'stone', 40);
        for (let hx = x + 10; hx < x + 210; hx += 52) KIT.house(G, hx, s < 0 ? -230 : 120, hx + 44, s < 0 ? -120 : 230, 60 + ((hx * 7) % 40), { mat: ['plaster', 'plaster-blue', 'plaster-ochre'][((hx / 52) | 0) % 3], roof: 'rooftile', lit: true });
        KIT.lamp(G, x + 110, s * 80, 0, 'paper-lantern', 30, .6);
      }
    }
    KIT.lights(G, [1600, -72, 40], [1600, 72, 40], 12); KIT.lights(G, [2000, -72, 40], [2000, 72, 40], 12); KIT.lights(G, [2350, -72, 40], [2350, 72, 40], 12);
    KIT.bridge(G, 1800, -80, 80, 30, 34); KIT.bridge(G, 2200, -80, 80, 30, 34); KIT.bridge(G, 2560, -80, 80, 14, 26, 'brick');
    G.box('pier-dk', 2360, 30, -24, 2420, 62, -16, { top: 'pier' });                       // the fireworks barge
    G.box('hull-dark', 2420, -60, -24, 2490, -34, -14, { top: 'pier' });                    // the moored gunboat
    // ---- 1-B the harbor mouth: breakwater, a lighthouse light far off ----
    G.box('rock', 2900, 360, -30, 5200, 420, 10, { solid: false, maxEdge: 200 }); G.box('rock', 2900, -520, -30, 5200, -460, 10, { solid: false, maxEdge: 200 });
    for (let x = 3000; x < 5200; x += 400) { G.box('glow-red', x, 356, 10, x + 6, 362, 18, { solid: false }); G.box('glow-green', x, -460, 10, x + 6, -454, 18, { solid: false }); }
  },
  scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'], intro: 'c1-intro', outro: 'c1-outro'
});

def('scene', '1-1', { title: 'LANTERN PIER', time: 45,
  arrive: { start: [-320, 0, 24], path: [[-220, -6, 24], [-120, -14, 24]], speed: 120, walk: true },
  slots: [
    { stand: { at: [0, -20, 24], look: [300, -12, 15] }, cover: { at: [-4, -32, 12], look: [300, -66, 8] } },
    { stand: { at: [0, 22, 24], look: [300, 12, 15] }, cover: { at: [-4, 34, 12], look: [300, 66, 8] } }],
  covers: { c1: { at: [186, -38, 0], h: 19 }, c2: { at: [192, 34, 0], h: 19, peek: ['up', 'right'] }, c3: { at: [256, 0, 0], h: 28, peek: ['up', 'left', 'right'] },
    c4: { at: [270, 46, 0], h: 17 }, c5: { at: [362, -10, 0], h: 26, peek: ['up', 'left'] }, c6: { at: [330, 50, 0], h: 15 } },
  waves: [
    { at: .6, spawn: [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'c3', { delay: .7 }]] },
    { after: 'clear', spawn: [['deckhand', 'c5', { entry: 'door', from: [600, 0, 0] }], ['deckhand', 'c4', { entry: 'jump', from: [236, 100, 14] }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[400, -150, 0], [400, -60, 0], [395, 160, 0]], drop: 'mg', wait: .6 }], ['deckhand', 'c6', { entry: 'run', from: [440, 200, 0] }]] }],
  civilians: [{ at: 1.2, route: [[110, -20, 0], [130, -50, 0], [330, -50, 0], [420, -40, 0]], look: 0, leave: 3 }, { at: 1.4, route: [[118, -8, 0], [140, -46, 0], [330, -44, 0], [420, -30, 0]], look: 1, leave: 3 }],
  objects: [['lifering', [96, 58, 20], { yaw: Math.PI / 2 }], ['goods', [170, -38, 19]], ['goods', [175, 34, 19]], ['lantern', [120, -20, 34]], ['lantern', [160, 18, 33]], ['lanternR', [210, -26, 32]], ['lantern', [280, 22, 32]], ['lanternR', [60, 4, 34]]],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'] }, { at: .2, prompt: 'cover' },
    { on: 'spawn:quartermaster', say: ['juno', "Orange vest! He's hauling ammo. Drop him!"] }, { on: 'clear', say: ['kai', "Pier's clear. Moving!"] }]
});

def('scene', '1-2', { title: 'FISH MARKET', time: 70,
  arrive: { path: [[160, -20, 24], [330, -20, 24], [440, -8, 24], [560, 0, 24], [610, 0, 24]], speed: 150, walk: true },
  slots: [
    { stand: { at: [642, -24, 24], look: [860, -30, 22] }, cover: { at: [636, -34, 12], look: [860, -80, 8] } },
    { stand: { at: [642, 26, 24], look: [860, 30, 22] }, cover: { at: [636, 36, 12], look: [860, 80, 8] } }],
  covers: { m1: { at: [738, -60, 0], h: 19 }, m2: { at: [738, 50, 0], h: 19, peek: ['up', 'left'] }, m3: { at: [778, -4, 0], h: 18, peek: ['up', 'left'] },
    m4: { at: [742, -100, 0], h: 26 }, m5: { at: [742, 100, 0], h: 26 },
    g1: { at: [832, -70, 44], h: 16, ledge: true, floor: 0 }, g2: { at: [832, 60, 44], h: 16, ledge: true, floor: 0 }, g3: { at: [832, -10, 44], h: 16, ledge: true, floor: 0, noRelocate: true } },
  waves: [
    { at: .5, spawn: [['deckhand', 'm1'], ['deckhand', 'm2', { delay: .4 }], ['deckhand', 'g1'], ['deckhand', 'g2', { delay: .8 }]] },
    { after: 'clear', spawn: [['redtide', 'm3', { entry: 'roll', from: [800, 120, 0] }]], cue: 'redtide' },
    { after: 'clear', spawn: [['marine', 'm4', { entry: 'vault', from: [800, -140, 0] }], ['marine', 'm5', { entry: 'vault', from: [800, 140, 0] }], ['grenadier', 'g3', { entry: 'run', from: [850, 150, 44] }]] }],
  objects: [['generator', [800, -60, 0], { onBreak: 'gallery' }], ['generator', [800, 70, 0], { onBreak: 'gallery' }], ['intel', [640, -157, 28], { n: 0 }], ['lantern', [700, -40, 70]], ['lantern', [700, 40, 70]], ['lanternR', [760, -80, 72]], ['lanternR', [760, 80, 72]], ['goods', [722, -60, 19]], ['goods', [722, 50, 19]]],
  allies: [{ who: 'rook', at: [612, 120, 0], facing: 0, every: 4 }],
  cues: [{ at: 0, say: ['rook', 'Market hall. Stay sharp.'] }, { on: 'redtide', say: ['juno', "Red uniform! That's Red Tide. They don't miss. Hit him first!"] },
    { on: 'grenade', say: ['juno', 'Grenade! Shoot it out of the air!'] },
    { on: 'gallery', say: ['rook', "Now that's what I call fresh fish."], do: sim => { for (const e of sim.enemies) if (e.alive && e.z > 30) damageEnemy(sim, e, 99, sim.players[0], 'blast', {}); sim.ev({ type: 'collapse', at: [840, 0, 44] }); } }]
});

def('scene', '1-3', { title: 'CONTAINER YARD', time: 90,
  arrive: { path: [[700, 0, 24], [860, 0, 24], [900, 0, 24]], speed: 150, walk: true },
  slots: [
    { stand: { at: [940, -32, 24], look: [1200, -20, 20] }, cover: { at: [936, -42, 12], look: [1200, -80, 8] } },
    { stand: { at: [940, 28, 24], look: [1200, 30, 20] }, cover: { at: [936, 38, 12], look: [1200, 80, 8] } }],
  covers: { k1: { at: [1100, -70, 0], h: 28 }, k2: { at: [1100, 80, 0], h: 28, peek: ['up', 'left'] }, k3: { at: [1152, 12, 0], h: 16 },
    f1: { at: [1184, -40, 0], h: 16 }, f2: { at: [1184, 60, 0], h: 16, peek: ['up', 'right'] }, t1: { at: [1222, -46, 0], h: 16 }, t2: { at: [1222, 46, 0], h: 16 } },
  waves: [
    { at: .5, spawn: [['deckhand', 'k1', { entry: 'jump', from: [1100, -128, 84] }], ['deckhand', 'k2', { entry: 'jump', from: [1100, 128, 84], delay: .5 }], ['deckhand', 'k3', { entry: 'jump', from: [1180, -128, 84], delay: 1 }], ['deckhand', 'f1'], ['deckhand', 'f2']] },
    { after: 'clear', do: sim => spawnBoss(sim, 'bulldog'), say: ['juno', 'Something big is coming through the containers!'] },
    { on: 'bulldog-down', delay: 1.2, spawn: [['grenadier', 'k3', { entry: 'run', from: [1300, -60, 0] }], ['quartermaster', null, { route: [[1330, -170, 0], [1330, -80, 0], [1320, 170, 0]], drop: 'mg' }], ['deckhand', 'k1', { entry: 'run', from: [1300, -180, 0] }]] }],
  civilians: [{ at: 2.5, route: [[1150, 140, 0], [1166, 100, 0]], look: 4, say: ['worker', "Don't shoot! I just work here!"] }],
  objects: [['intel', [1086, 80, 26], { n: 1 }]],
  cues: [{ on: 'spawn:quartermaster', say: ['juno', 'Another ammo runner. Grab that machine gun!'] }]
});

def('scene', '1-4', { title: 'CANAL RUN', time: 70, carrier: 'boat', carrierHold: 1180, holds: [[230, 'b1'], [640, 'b2'], [940, 'gb']],
  arrive: { path: [[1200, 0, 24], [1380, 0, 20], [1430, 0, 8]], speed: 160 },
  slots: [
    { stand: { at: [-6, -8, 24], yaw: 0, pitch: -2 }, cover: { at: [-10, -9, 13], yaw: -6, pitch: -6 } },
    { stand: { at: [-6, 9, 24], yaw: 0, pitch: -2 }, cover: { at: [-10, 10, 13], yaw: 6, pitch: -6 } }],
  covers: { b1: { at: [1800, -36, 30], h: 12, ledge: true, water: true }, b2: { at: [1800, 36, 30], h: 12, ledge: true, water: true }, bg1: { at: [1806, 0, 30], h: 14 },
    b3: { at: [2200, -36, 30], h: 12, ledge: true, water: true }, b4: { at: [2200, 36, 30], h: 12, ledge: true, water: true }, bg2: { at: [2206, 0, 30], h: 14 },
    gb1: { at: [2456, -46, -14], h: 12, water: true } },
  waves: [
    { atD: 40, spawn: [['jetski', null, { route: [[1640, -360, -24], [1650, -110, -24], [1760, -30, -24], [1900, 30, -24], [2050, 40, -24]], speed: 170 }], ['jetski', null, { route: [[1680, -380, -24], [1690, -120, -24], [1820, 20, -24], [1980, 50, -24]], speed: 165, delay: .8 }]], say: ['juno', 'Jet skis, three o\'clock!'] },
    { id: 'b1', atD: 140, spawn: [['gunner', 'bg1'], ['deckhand', 'b1', { entry: 'run', from: [1800, -120, 30] }], ['deckhand', 'b2', { entry: 'run', from: [1800, 120, 30] }]] },
    { atD: 520, spawn: [['jetski', null, { route: [[2090, 380, -24], [2090, 110, -24], [2200, 20, -24], [2350, -30, -24], [2500, -20, -24]], speed: 170 }], ['jetski', null, { route: [[2120, 400, -24], [2120, 120, -24], [2260, 30, -24], [2420, -20, -24]], speed: 160, delay: .7 }]] },
    { id: 'b2', atD: 560, spawn: [['gunner', 'bg2'], ['deckhand', 'b3', { entry: 'run', from: [2200, -120, 30] }], ['deckhand', 'b4', { entry: 'run', from: [2200, 120, 30] }]] },
    { id: 'gb', atD: 860, spawn: [['quartermaster', null, { route: [[2430, -48, -14], [2488, -48, -14]], drop: 'mg', wait: .4 }], ['deckhand', 'gb1']] }],
  objects: [['fuel', [2380, 46, -16], { onBreak: 'fireworks' }], ['lantern', [1600, -30, 32]], ['lanternR', [1600, 30, 32]], ['lantern', [2000, -20, 32]], ['lanternR', [2350, 10, 32]]],
  cues: [{ at: 0, say: ['mari', "Grab something! We're taking the canals!"] },
    { on: 'fireworks', say: ['rook', 'Fireworks barge. Happy festival.'], do: sim => { sim.ev({ type: 'cutfx', fx: 'fireworks', at: [2390, 46, 0] }); for (const e of sim.enemies) if (e.alive && !e.civ && Math.hypot(e.x - 2440, e.y + 40) < 120) damageEnemy(sim, e, 99, sim.players[0], 'blast', {}); } }],
  tick: (sim, dt) => { const d = sim.carrierD(); if (d > 1060 && !sim.flags.lowbridge) { sim.flags.lowbridge = true; sim.say('mari', 'Low bridge! Heads down!'); } }
});

def('scene', '1-B', { title: 'HARBOR MOUTH', time: 100, carrier: 'boat2', boss: 'stingray',
  arrive: { path: [[2790, -10, 6], [2860, -30, 6]], speed: 120 },
  slots: [
    { stand: { at: [-14, 4, 24], yaw: 62, pitch: -2 }, cover: { at: [-17, 2, 13], yaw: 66, pitch: -8 } },
    { stand: { at: [10, 6, 24], yaw: 58, pitch: -2 }, cover: { at: [7, 4, 13], yaw: 52, pitch: -8 } }],
  alt: [
    { stand: { at: [-14, 4, 24], yaw: -9, pitch: -4 }, cover: { at: [-16, 2, 10], yaw: -12, pitch: -10 } },
    { stand: { at: [8, 8, 24], yaw: -28, pitch: -6 }, cover: { at: [6, 9, 10], yaw: -30, pitch: -12 } }],
  covers: {},
  waves: [],
  cues: [{ at: 0, say: ['mari', 'That gunboat is heading straight for us!'] }]
});

// ---- 32-stage2.js ----
/* 32-stage2: STAGE 2, STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, a thunderstorm). Geometry along +x: the
 * cobbled lane of Gull's Rest climbing east (x 0..440, z 0..40), the Net Lofts (x 480..700, floor z 40), the funicular
 * up the cliff (x 760..1300, z 40..400), the lighthouse courtyard (x 1340..1640, z 400), the lighthouse (centre x 1560,
 * gallery z 540). Scenes 2-1 .. 2-4 and Hammerhead, 2-B. */
const LH = [1560, 0, 400];   // the lighthouse's foot
/* the lighthouse's outside stair: stone steps cantilevered from the tower, climbing anticlockwise from the courtyard's
 * south-west corner, nearly two turns, to the gate in the gallery railing on the west side. s: the angle climbed. */
const LHS = { r0: 74, r1: 88, r: 81, a0: -135 * DEG, sEnd: 695 * DEG, z0: 400, z1: 544 };
LHS.k = (LHS.z1 - LHS.z0) / LHS.sEnd;
/** the point on the stair after climbing s radians, at radius r; z is the step's top */
function stairAt(s, r = LHS.r) { const a = LHS.a0 + s; return [LH[0] + Math.cos(a) * r, LH[1] + Math.sin(a) * r, LHS.z0 + clamp(s, 0, LHS.sEnd) * LHS.k]; }
/** an eye-height path up the stair from s0 to s1 (every 20 degrees) */
function stairPath(s0, s1, r = LHS.r) { const out = []; for (let s = s0; s < s1 - 1e-6; s += 20 * DEG) { const p = stairAt(s, r); out.push([p[0], p[1], p[2] + EYE]); } const e = stairAt(s1, r); out.push([e[0], e[1], e[2] + EYE]); return out; }
/** where on the stair a point is (its s), or -1 when it is not on the stair */
function stairS(p) { const r = Math.hypot(p[0] - LH[0], p[1] - LH[1]); if (Math.abs(r - LHS.r) > 12 || p[2] < LHS.z0 + EYE + 4) return -1; const a = Math.atan2(p[1] - LH[1], p[0] - LH[0]), base = (((a - LHS.a0) % TAU) + TAU) % TAU, zs = (p[2] - EYE - LHS.z0) / LHS.k; let best = base, d = 1e9; for (let t = base; t <= LHS.sEnd + TAU; t += TAU) if (Math.abs(t - zs) < d) { d = Math.abs(t - zs); best = t; } return Math.min(best, LHS.sEnd); }
TC.LHS = LHS; TC.stairAt = stairAt; TC.stairS = stairS; TC.LH = LH;
/* the stair landing where the players fight up the stair (2-4), and the two deckhands on the turn above */
const LANDING = 300 * DEG, STAIR_FOES = { t1: 595 * DEG, t2: 565 * DEG };
def('stage', 2, {
  num: 2, name: 'STORM SIGNAL', place: "Gull's Rest  •  Lighthouse Point", clock: '02:10', music: 'storm', maxThreats: 2,
  env: { ambient: .3, skyK: .04, sun: { dir: [.3, -.5, .8], k: .26 }, fog: ['#26343c', 220, 1300], warm: '#ffc070', water: { z: -24 }, rain: true, storm: true, ambience: 'storm', actorK: 1.25, swayK: .9,
    sky: { colors: ['#10161c', '#1e2a30', '#34444a'], below: '#1a2428', clouds: '#3a4a52', cloudK: .7, layers: [{ kind: 'hills', color: '#141c20', height: .07, seed: 21 }] } },
  carriers: {
    funi: { path: [[770, -30, 44], [1300, -30, 404]], speed: 70, mesh: 'funicular' },
    funi2: { path: [[1300, 30, 404], [770, 30, 44]], speed: 70, mesh: 'funicular' }
  },
  objectives: ['Push up through Gull\'s Rest', 'Ride the funicular to Lighthouse Point', 'Free Dr. Tejada', 'Silence the lighthouse relay'],
  briefing: [['hale', 'The lighthouse relays Krake\'s commands to the whole fleet.'], ['juno', 'Take it out and his ships go deaf. Also, it\'s raining. A lot.'], ['mari', 'They\'re holding my father up there. Let\'s go get him.']],
  build(G) {
    KIT.sea(G, 'sea-storm', -1400, -1600, 2600, 1600, -24);
    // the harbor wall and the lane of Gull's Rest, climbing east
    KIT.ground(G, -200, -300, 0, 300, 0, 'cobble-wet', 'stone');
    G.ramp('cobble-wet', 0, 0, 0, 440, 0, 40, 140, { maxEdge: 40 }); G.collider([0, -70, -40, 440, 70, 0], { impact: 'stone' });
    G.box('rock-wet', 0, -70, -60, 440, 70, -2, { skip: 't', solid: false });
    for (const s of [-1, 1]) for (let x = 0; x < 440; x += 62) {
      const z = x / 440 * 40, y0 = s < 0 ? -150 : 70, y1 = s < 0 ? -70 : 150;
      G.box('cobble-wet', x, y0, z - 60, x + 62, y1, z + 2, { solid: false });
      KIT.house(G, x + 4, y0 + (s < 0 ? 0 : 6), x + 58, y1 - (s < 0 ? 6 : 0), 60 + ((x * 3) % 30), { mat: (x / 62 | 0) % 2 ? 'plaster' : 'timber', roof: 'slate', lit: true, dark: (x / 62 | 0) % 3 === 0 });
      // the balconies (cover for the window gunmen)
      if ((x / 62 | 0) % 2 === 1) { const bz = z + 30; G.box('timber', x + 12, s < 0 ? -76 : 64, bz - 3, x + 50, s < 0 ? -64 : 76, bz, { solid: true }); G.box('timber', x + 12, s < 0 ? -64 : 62, bz, x + 50, s < 0 ? -62 : 64, bz + 14, { cover: true }); }
      KIT.lamp(G, x + 31, s * 64, z, 'glow-amber', 34, .5);
    }
    // the player's cart and well, the cart barricade up the lane
    G.box('planks', 52, -44, 4, 70, -14, 18, { top: 'pier' }); G.tube('rubber', [61, -46, 5], [61, -48, 5], 6); G.tube('rubber', [61, -12, 5], [61, -10, 5], 6);
    G.cyl('stone', 60, 34, 4, 10, 16, { seg: 10, solid: true, top: 'rock-wet' }); G.box('timber', 49, 33, 20, 71, 35, 22, { solid: false });
    G.box('planks', 276, -30, 25, 296, 30, 43, { cover: true }); G.box('crate', 300, 40, 27, 316, 56, 41);
    KIT.crates(G, 220, -50, 20, 1, 1, 2, 14); KIT.barrel(G, 214, 46, 19); KIT.barrel(G, 360, -40, 32);
    for (let k = 0; k < 4; k++) KIT.rail(G, [100 + k * 80, -70, 50 + k * 4], [100 + k * 80, 70, 50 + k * 4], 0, 'rope');   // washing lines
    // ---- 2-2 the Net Lofts (x 480..700, y -110..110, floor z 40, upper floor z 92) ----
    G.box('planks', 440, -150, 30, 760, 150, 40, { side: 'stone' });
    G.box('timber', 480, -114, 40, 700, -110, 170, { skip: 'b' }); G.box('timber', 480, 110, 40, 700, 114, 170, { skip: 'b' }); G.box('timber', 696, -110, 40, 700, 110, 170, { skip: 'b' });
    G.box('timber', 476, -114, 40, 480, -24, 170, { skip: 'b' }); G.box('timber', 476, 24, 40, 480, 114, 170, { skip: 'b' }); G.box('timber', 476, -24, 80, 480, 24, 170, { skip: 'b' });
    G.box('slate', 476, -118, 170, 704, 118, 176, { bottom: 'timber', solid: false });
    G.box('planks', 620, -110, 88, 700, 110, 92, { bottom: 'pier-dk' }); G.box('oak', 618, -110, 92, 622, 110, 106, { cover: true });
    G.stairs('planks', 560, 80, 40, 620, 80, 92, 22, 9);
    G.box('steel-dk', 640, -14, 168, 668, 14, 172, { solid: false });   // the roof hatch
    for (const [x, y] of [[540, -60], [600, 50], [660, -20]]) G.quad('net', [x, y - 30, 160], [x, y + 30, 160], [x, y + 30, 100], [x, y - 30, 100], { uv: [[0, 0], [60, 0], [60, 60], [0, 60]] });
    G.box('crate', 512, -40, 40, 528, -12, 58, { cover: true }); KIT.crates(G, 520, 30, 40, 1, 2, 1, 15);
    KIT.crates(G, 590, -60, 40, 2, 1, 2, 15); G.box('planks', 600, 20, 40, 616, 50, 58, { cover: true });
    for (const [x, y] of [[530, 0], [600, 0], [660, 0]]) G.light(x, y, 150, 120, .5);
    // ---- 2-3 the funicular up the cliff ----
    G.ramp('steel-dk', 760, -30, 40, 1300, -30, 400, 30); G.ramp('steel-dk', 1300, 30, 400, 760, 30, 40, 30);
    for (let k = 0; k <= 10; k++) { const x = 760 + k * 54, z = 40 + k * 36; G.box('rock-wet', x, -130, z - 200, x + 54, -50, z + 4, { solid: false }); G.box('rock-wet', x, 50, z - 200, x + 54, 130, z + 4, { solid: false }); G.box('rock-wet', x, -260, z - 200, x + 54, -130, z + 70, { solid: false }); G.box('rock-wet', x, 130, z - 200, x + 54, 260, z + 60, { solid: false }); }
    for (const [x, s] of [[900, -1], [1040, 1], [1180, -1]]) { const z = 40 + (x - 760) / 540 * 360; G.box('cobble-wet', x - 30, s < 0 ? -128 : 64, z + 6, x + 30, s < 0 ? -64 : 128, z + 10, { solid: true }); G.box('stone', x - 22, s < 0 ? -70 : 62, z + 10, x + 22, s < 0 ? -64 : 70, z + 12, { solid: false }); KIT.lamp(G, x + 26, s * 100, z + 10, 'glow-amber', 30, .5); }
    // ---- 2-4 the lighthouse courtyard (z 400) and the lighthouse ----
    KIT.ground(G, 1300, -260, 1720, 260, 400, 'cobble-wet', 'rock-wet', 80);
    G.box('stone', 1300, -260, 400, 1720, -252, 416); G.box('stone', 1300, 252, 400, 1720, 260, 416);
    G.cyl('lighthouse', LH[0], LH[1], LH[2], 34, 140, { r2: 26, seg: 14, solid: true }); G.cyl('slate', LH[0], LH[1], LH[2] + 136, 72, 8, { seg: 18 });   // the tower and the wide gallery
    for (const [hx, hy] of [[66, 28], [28, 66]]) G.collider([LH[0] - hx, LH[1] - hy, LH[2] + 136, LH[0] + hx, LH[1] + hy, LH[2] + 144], { impact: 'stone' });   // the gallery floor: a cross of boxes inside its circle (the stair passes just outside)
    G.cyl('glass', LH[0], LH[1] + 34, LH[2] + 144, 16, 26, { seg: 10, caps: false }); G.lathe('hull-red', LH[0], LH[1] + 34, LH[2] + 170, [[20, 0], [14, 8], [0, 16]], { seg: 10 });
    const inGate = a => { const d = Math.abs(((a - (LHS.a0 + LHS.sEnd)) % TAU + TAU + Math.PI) % TAU - Math.PI); return d < 14 * DEG; };   // the railing, open at the gate
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, a2 = a + TAU / 24; if (!inGate(a)) G.cyl('iron', LH[0] + Math.cos(a) * 71, LH[1] + Math.sin(a) * 71, LH[2] + 144, .8, 14, { seg: 4, caps: false }); if (!inGate(a) && !inGate(a2)) G.tube('iron', [LH[0] + Math.cos(a) * 71, LH[1] + Math.sin(a) * 71, LH[2] + 158], [LH[0] + Math.cos(a2) * 71, LH[1] + Math.sin(a2) * 71, LH[2] + 158], .8, { seg: 4 }); }
    G.box('brass', 1532, 12, 544, 1552, 40, 560, { top: 'steel-dk', cover: true });   // the lens housing (the second cover)
    { const gate = [LHS.a0 + LHS.sEnd - 13 * DEG, LHS.a0 + LHS.sEnd + 13 * DEG].map(a => [LH[0] + Math.cos(a) * 71, LH[1] + Math.sin(a) * 71]);   // the gate in the railing at the stair's top
      for (const [x, y] of gate) G.box('steel-dk', x - 1.5, y - 1.5, 544, x + 1.5, y + 1.5, 572, { solid: false }); G.tube('steel-dk', [gate[0][0], gate[0][1], 571], [gate[1][0], gate[1][1], 571], 1, { seg: 4 }); }
    G.box('timber', LH[0] - 36, -12, 400, LH[0] - 30, 12, 432, { solid: false });   // the door
    KIT.house(G, 1420, 120, 1500, 230, 54, { mat: 'plaster', roof: 'slate', lit: true });   // the keeper's house
    KIT.house(G, 1420, -230, 1490, -130, 48, { mat: 'timber', roof: 'slate', lit: true });
    G.box('stone', 1390, -40, 400, 1404, -10, 418, { cover: true }); G.box('stone', 1390, 14, 400, 1404, 44, 418, { cover: true });    // the players' low wall
    KIT.crates(G, 1460, -60, 400, 2, 1, 2, 15); KIT.barrel(G, 1470, 70, 400); G.box('planks', 1500, 20, 400, 1516, 54, 418, { cover: true });
    // the outside stair: one stone step every 10 degrees, a bracket to the tower every 40, an iron handrail on the outside
    { const ds = 10 * DEG, n = Math.round(LHS.sEnd / ds);
      for (let k = 0; k < n; k++) { const sm = (k + .5) * ds, c = stairAt(sm), top = LHS.z0 + (k + 1) * ds * LHS.k, hw = LHS.r * ds / 2 + .8; G.box('stone', c[0] - (LHS.r1 - LHS.r0) / 2, c[1] - hw, top - 5, c[0] + (LHS.r1 - LHS.r0) / 2, c[1] + hw, top, { yaw: LHS.a0 + sm, top: 'cobble-wet', solid: false }); }
      for (let s = 20 * DEG; s < LHS.sEnd; s += 40 * DEG) { const a = stairAt(s, 30), b = stairAt(s, LHS.r1 - 3); G.tube('iron', [a[0], a[1], a[2] - 22], [b[0], b[1], b[2] - 5.5], 1.1, { seg: 4 }); }
      let prev = null; for (let s = 0; s <= LHS.sEnd + 1e-6; s += 15 * DEG) { const p = stairAt(s, LHS.r1 - 1); G.cyl('iron', p[0], p[1], p[2], .7, 13, { seg: 4, caps: false }); const t = [p[0], p[1], p[2] + 13]; if (prev) G.tube('iron', prev, t, .7, { seg: 4 }); prev = t; } }
    for (const [x, y] of [[1420, -40], [1420, 40], [1600, -120], [1600, 120]]) KIT.lamp(G, x, y, 400, 'glow-amber', 34, .6);
  },
  /** the lighthouse beam sweeps: a dynamic light and visible edges */
  lights(R3, sim, t) { const a = t * .78, b = [LH[0] + Math.cos(a) * 40, LH[1] + 34 + Math.sin(a) * 40, LH[2] + 158]; R3.addLight(b[0], b[1], b[2], 160, .7); },
  draw(R, sim, t) {
    const a = t * .78, c = [LH[0], LH[1] + 34, LH[2] + 158];
    R.mesh('lens', mat34(LH[0], LH[1] + 34, LH[2] + 144, a), {});
    for (const off of [-.08, .08]) R.line(c, [c[0] + Math.cos(a + off) * 900, c[1] + Math.sin(a + off) * 900, c[2] - 60], [120, 110, 70]);
    R.glow(c, 22, [255, 240, 180], .7);
    for (const id of ['funi', 'funi2']) { const C = sim.carriers[id]; if (C && C.M && id === 'funi2' && sim.scene.id === '2-3') R.R3.drawMesh(meshOf('funicular'), C.M, {}); }
  },
  setup(sim) { sim.carriers.funi2.d = 0; sim.poseCarrier(sim.carriers.funi2); },
  scenes: ['2-1', '2-2', '2-3', '2-4', '2-B'], intro: 'c2-intro', outro: 'c2-outro'
});

def('scene', '2-1', { title: "GULL'S REST", time: 70,
  arrive: { start: [-180, 0, 24], path: [[-100, 0, 24], [0, -10, 26]], speed: 120, walk: true },
  slots: [
    { stand: { at: [40, -28, 27], look: [300, -20, 50] }, cover: { at: [44, -40, 15], look: [300, -60, 30] } },
    { stand: { at: [40, 26, 27], look: [300, 20, 50] }, cover: { at: [44, 38, 15], look: [300, 60, 30] } }],
  covers: { w1: { at: [217, -70, 47], h: 14, ledge: true, floor: 20 }, w2: { at: [341, -70, 58], h: 14, ledge: true, floor: 31 }, w3: { at: [341, 70, 58], h: 14, ledge: true, floor: 31 }, w4: { at: [217, 70, 47], h: 14, ledge: true, floor: 20 },
    k1: { at: [306, 0, 28], h: 18 }, k2: { at: [320, 48, 29], h: 16, peek: ['up', 'left'] }, k3: { at: [230, -50, 21], h: 26 } },
  waves: [
    { at: .5, spawn: [['deckhand', 'w1'], ['deckhand', 'w3', { delay: .5 }], ['deckhand', 'w2', { delay: 1 }]] },
    { after: 'clear', spawn: [['rusher', null, { from: [420, -20, 38] }], ['rusher', null, { from: [430, 30, 39], delay: 1.2 }]], cue: 'rusher' },
    { after: 'clear', spawn: [['rusher', null, { from: [420, 0, 38] }], ['rusher', null, { from: [430, -40, 39], delay: .8 }], ['rusher', null, { from: [440, 40, 40], delay: 1.6 }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[250, -140, 23], [250, -60, 23], [262, 140, 24]], drop: 'sg', amount: 8 }], ['marine', 'k1', { entry: 'run', from: [420, -10, 38] }], ['marine', 'k2', { entry: 'run', from: [420, 50, 38] }], ['deckhand', 'w4']] }],
  civilians: [{ at: 1.5, route: [[110, 60, 10], [126, 66, 11]], look: 2, say: ['fisher', 'Not me! Not me!'] }],
  objects: [['window', [130, -70, 36], { yaw: Math.PI / 2 }], ['window', [192, 70, 40], { yaw: Math.PI / 2 }], ['window', [376, -70, 50], { yaw: Math.PI / 2 }], ['lifering', [340, 66, 48], { yaw: Math.PI / 2 }], ['lanternR', [200, 0, 60]], ['lantern', [330, 10, 72]]],
  cues: [{ at: 0, say: ['juno', 'Storm\'s getting worse. Watch the windows!'] }, { on: 'rusher', say: ['juno', "Blades! Don't let them get close!"] }, { on: 'spawn:quartermaster', say: ['juno', 'Ammo runner in the alley!'] }]
});

def('scene', '2-2', { title: 'NET LOFTS', time: 75,
  arrive: { path: [[240, 0, 50], [400, 0, 62], [470, 0, 64]], speed: 140, walk: true },
  slots: [
    { stand: { at: [500, -24, 64], look: [700, -20, 80] }, cover: { at: [498, -34, 52], look: [700, -70, 60] } },
    { stand: { at: [500, 26, 64], look: [700, 20, 80] }, cover: { at: [498, 36, 52], look: [700, 70, 60] } }],
  covers: { n1: { at: [606, -60, 40], h: 28, peek: ['left', 'right'] }, n2: { at: [624, 36, 40], h: 18, peek: ['up', 'left'] }, u1: { at: [632, -60, 92], h: 14, ledge: true, floor: 40 }, u2: { at: [632, 0, 92], h: 14, ledge: true, floor: 40 }, u3: { at: [632, 60, 92], h: 14, ledge: true, floor: 40 },
    r1: { at: [600, -10, 40], h: 1, peek: ['up'], noRelocate: true }, r2: { at: [650, 20, 40], h: 1, noRelocate: true }, r3: { at: [660, -40, 40], h: 1, noRelocate: true } },
  waves: [
    { at: .5, spawn: [['shield', null, { from: [600, 80, 92], entry: 'run', advance: [[580, 60, 60], [580, 20, 40], [560, 0, 40]] }], ['deckhand', 'n1']], cue: 'shield' },
    { after: 'clear', spawn: [['marine', 'r1', { entry: 'rappel', ropeH: 128 }], ['deckhand', 'r2', { entry: 'rappel', ropeH: 128, delay: .6 }], ['deckhand', 'r3', { entry: 'rappel', ropeH: 128, delay: 1.2 }]], cue: 'ropes' },
    { after: 'clear', spawn: [['redtide', 'u1', { entry: 'run', from: [680, -100, 92] }], ['deckhand', 'u3', { entry: 'run', from: [680, 100, 92], delay: .8 }], ['grenadier', 'u2', { entry: 'run', from: [690, 0, 92], delay: 2.5 }]] }],
  objects: [['barrel', [690, -80, 40], { onBreak: 'oil' }], ['barrel', [690, 80, 40], { onBreak: 'oil' }], ['barrel', [650, -90, 92]], ['intel', [610, 100, 92], { n: 2 }], ['lantern', [560, -30, 130]], ['lantern', [640, 40, 130]]],
  cues: [{ on: 'shield', say: ['juno', 'Shield! Knock it aside with the shotgun!'], prompt: 'shield' }, { on: 'ropes', say: ['rook', "Ropes! They're coming through the roof!"] }, { on: 'oil', say: ['rook', 'Fish oil. Burns like a bad breakup.'] }]
});

def('scene', '2-3', { title: 'FUNICULAR', time: 60, carrier: 'funi', carrierHold: 600, holds: [[12, 'w0'], [181, 'w2'], [351, 'w3']],
  arrive: { path: [[620, -20, 64], [720, -30, 66], [760, -30, 68]], speed: 140, walk: true },
  slots: [
    { stand: { at: [-6, -6, 24], yaw: 0, pitch: 16 }, cover: { at: [-12, -6, 13], yaw: 0, pitch: 4 } },
    { stand: { at: [8, 6, 24], yaw: 4, pitch: 16 }, cover: { at: [2, 6, 13], yaw: 4, pitch: 4 } }],
  covers: { t1: { at: [900, -76, 143], h: 0, ledge: true, floor: 60 }, t2: { at: [1040, 76, 237], h: 0, ledge: true, floor: 150 }, t3: { at: [1180, -76, 330], h: 0, ledge: true, floor: 240 },
    p1: { at: [1520, -40, 544], h: 14, peek: ['up', 'left'], noRelocate: true }, p2: { at: [1514, 30, 544], h: 14, peek: ['up', 'right'], noRelocate: true }, p3: { at: [1510, -6, 544], h: 14, noRelocate: true } },
  waves: [
    { atD: 2, spawn: [['deckhand', 't1', { entry: 'run', from: [900, -120, 143] }], ['marine', 't1', { entry: 'stand', delay: .5 }]] },
    { atD: 120, do: sim => { sim.flags.passing = true; }, spawn: [['gunner', null, { entry: 'stand', carrier: 'funi2', local: [0, -6, 4], from: [1300, 30, 404] }], ['deckhand', null, { entry: 'stand', carrier: 'funi2', local: [-14, 6, 4], from: [1300, 30, 404] }], ['deckhand', null, { entry: 'stand', carrier: 'funi2', local: [14, 6, 4], from: [1300, 30, 404] }]], cue: 'passing' },
    { atD: 165, spawn: [['deckhand', 't2', { entry: 'run', from: [1040, 120, 237] }], ['redtide', 't2', { entry: 'roll', from: [1060, 120, 237], delay: .8 }]] },
    { atD: 335, spawn: [['deckhand', 't3', { entry: 'run', from: [1180, -120, 330] }], ['deckhand', 't3', { entry: 'stand', delay: .5 }]] },
    { atD: 590, do: sim => spawnBoss(sim, 'gull'), cue: 'gull' },
    { on: 'gull-down', spawn: [['quartermaster', null, { route: [[1330, -100, 400], [1330, 100, 400]], drop: 'mg' }]] }],
  objects: [['lifering', [960, -60, 210], { yaw: Math.PI / 2 }]],
  cues: [{ at: 0, say: ['mari', "The funicular's the only way up the cliff."] }, { on: 'passing', say: ['juno', "Car coming down! It's full of them!"] }, { on: 'gull', say: ['juno', 'Laser sight! Sniper on the lighthouse!'] }],
  tick: (sim, dt) => { const C2 = sim.carriers.funi2; if (sim.flags.passing && C2.d < C2.path.length - 1) { C2.d = Math.min(C2.path.length - 1, C2.d + 95 * dt); sim.poseCarrier(C2); } }
});

/** a deckhand's spot on the stair (a ledge: shot, he falls to the courtyard), facing the landing */
function stairCover(s) { const p = stairAt(s), l = stairAt(LANDING); return { at: p, h: 10, ledge: true, floor: 400, noRelocate: true, stair: true, noCheck: true, face: Math.atan2(l[1] - p[1], l[0] - p[0]) / DEG }; }
/** the landing: players 1 and 2 side by side on the step, 3 and 4 two steps below; they look up at the turn above */
const CLIMB = {
  slots: (() => { const foes = [STAIR_FOES.t1, STAIR_FOES.t2].map(s => stairAt(s)), look = [(foes[0][0] + foes[1][0]) / 2, (foes[0][1] + foes[1][1]) / 2, (foes[0][2] + foes[1][2]) / 2 + 22];
    return [[LANDING, 77], [LANDING, 85], [LANDING - 14 * DEG, 77], [LANDING - 14 * DEG, 85]].map(([s, r]) => { const p = stairAt(s, r); return { stand: { at: [p[0], p[1], p[2] + EYE], look }, cover: { at: [p[0], p[1], p[2] + EYE_COVER], look: [look[0], look[1], look[2] - 30] } }; }); })(),
  /** from the courtyard wall, round the crates to the stair's foot, and up it to the landing */
  path: () => [[1420, -30, 424], [1470, -40, 424]].concat(stairPath(0, LANDING - 6 * DEG))
};
TC.CLIMB = CLIMB;
def('scene', '2-4', { title: 'LIGHTHOUSE KEEP', time: 85,
  arrive: { path: [[1310, -30, 428], [1350, -10, 424], [1376, 0, 424]], speed: 120, walk: true },
  slots: [
    { stand: { at: [1384, -26, 424], look: [1560, -20, 430] }, cover: { at: [1380, -26, 412], look: [1560, -60, 410] } },
    { stand: { at: [1384, 30, 424], look: [1560, 20, 430] }, cover: { at: [1380, 30, 412], look: [1560, 60, 410] } }],
  covers: { y1: { at: [1476, -60, 400], h: 28 }, y2: { at: [1526, 36, 400], h: 18, peek: ['up', 'left'] }, y3: { at: [1484, 70, 400], h: 17 },
    door: { at: [1516, 0, 400], h: 40, noRelocate: true }, hw1: { at: [1504, 96, 400], h: 40, peek: ['left', 'up'], noRelocate: true },
    t1: stairCover(STAIR_FOES.t1), t2: stairCover(STAIR_FOES.t2) },
  waves: [
    { at: .5, spawn: [['marine', 'y1'], ['marine', 'y3', { delay: .5 }], ['redtide', 'y2', { entry: 'roll', from: [1600, 80, 400], delay: 1.5 }]] },
    { after: 'clear', spawn: [['captor', 'door', { hostage: 'tejada', side: 1 }]], say: ['captor', 'One more step and the old man swims!'], do: sim => sim.say('kai', 'Easy... easy...') },
    { after: 'clear', spawn: [['rusher', null, { from: [1470, 160, 400] }], ['rusher', null, { from: [1470, -170, 400], delay: 1 }], ['deckhand', 'hw1', { entry: 'door', from: [1500, 150, 400] }]] },
    // up the outside stair to the landing (the clock stops while they climb), then two deckhands on the turn above
    { after: 'clear', say: ['kai', 'Up the stairs. Move!'], do: sim => sim.climb(CLIMB.slots, CLIMB.path(), 100, 'landing') },
    { on: 'landing', say: ['juno', 'Two on the stairs above you!'], spawn: [['deckhand', 't1', { entry: 'run', from: stairAt(STAIR_FOES.t1 + 22 * DEG) }], ['deckhand', 't2', { entry: 'run', from: stairAt(STAIR_FOES.t2 - 22 * DEG), delay: .7 }]] }],
  objects: [['window', [1420, 160, 30 + 400], { yaw: Math.PI / 2 }], ['window', [1420, -180, 26 + 400], { yaw: Math.PI / 2 }], ['barrel', [1600, -150, 400]], ['lantern', [1450, 0, 450]], ['intel', [1470, 70, 417], { n: 3 }]],
  cues: [{ at: 0, say: ['rook', 'Courtyard. Stay low.'] }, { on: 'kill:captor', say: ['mari', 'Papa! Get down!'] }]
});

def('scene', '2-B', { title: 'THE LANTERN GALLERY', time: 120, boss: 'hammerhead',
  arrive: { path: from => { const s0 = from ? stairS([from.x, from.y, from.z]) : -1, g = stairAt(LHS.sEnd, 66); return (s0 >= 0 ? stairPath(s0 + 10 * DEG, LHS.sEnd) : [[1420, -30, 424], [1470, -40, 424]].concat(stairPath(0, LHS.sEnd))).concat([[g[0], g[1], LHS.z1 + EYE]]); }, speed: 110, walk: true },
  slots: [
    { stand: { at: [1500, -26, 568], look: [1620, -24, 560] }, cover: { at: [1494, -32, 556], look: [1620, -60, 548] } },
    { stand: { at: [1500, -6, 568], look: [1620, -4, 560] }, cover: { at: [1494, 2, 556], look: [1620, 30, 548] } }],
  alt: [
    { stand: { at: [1524, 20, 568], look: [1620, -20, 560] }, cover: { at: [1520, 26, 556], look: [1620, 26, 548] } },
    { stand: { at: [1528, 36, 568], look: [1620, 0, 560] }, cover: { at: [1524, 40, 556], look: [1620, 50, 548] } }],
  covers: {},
  waves: [],
  cues: [{ at: 0, say: ['hammerhead', 'LITTLE AGENTS. BIG MISTAKE.'] }]
});

// ---- 33-stage3.js ----
/* 33-stage3: STAGE 3, THE TIDEWALL (05:20 -> 06:00, dawn). The barrier's crest runs along +x at z 0 (y -60..60): the
 * sea high on the north, rising scene by scene; the city far below on the south. Crest Road (x 0..520), the Sluice
 * Locks (x 600..900), the Turbine Hall (x 980..1300), the control tower (centre 1520, 0; roof z 300) with its glass
 * lift on the west face and, on its roof, the helipad (Scylla) and the control room (Krake). */
const TW = { roof: 300, tx: 1520 };
/** the control room's consoles: a front row the four players duck behind (y -110, -88, -66, -48), and Krake's three */
const CONSOLES = [[1462, -110], [1462, -88], [1462, -66], [1462, -48], [1520, -96], [1556, -64], [1580, -100]];
TC.CONSOLES = CONSOLES;
def('stage', 3, {
  num: 3, name: 'THE TIDEWALL', place: 'Meridian Tidewall', clock: '05:20', music: 'tidewall', maxThreats: 2,
  env: { ambient: .44, skyK: .08, sun: { dir: [.7, .25, .35], k: .5 }, fog: ['#8a7a8f', 520, 2500], warm: '#ffb04a', water: { z: -30 }, ambience: 'sluice', actorK: 1.05,
    sky: { colors: ['#1f1a3a', '#6a3f6f', '#f29e6b'], glow: '#ffb070', below: '#3a3048', moon: { dir: [.95, .1, .06], r: 4, color: '#ffe0a0' }, clouds: '#c87a7a', cloudK: .5, layers: [{ kind: 'city', color: '#241a30', lit: '#ffb860', height: .03, seed: 33, from: .3, span: 2.6 }, { kind: 'hills', color: '#3a2a44', height: .045, seed: 7 }] } },
  carriers: {
    tram: { path: [[-260, 0, 0], [-60, 0, 0], [20, 0, 0]], speed: 90 },
    lift: { path: [[1436, 0, 6], [1436, 0, 7], [1436, 0, 286]], speed: 24, fixedYaw: 270, mesh: 'lift' }
  },
  objectives: ['Clear the crest road', 'Jam the four gate locks', 'Cross the turbine hall', 'Ride the tower lift', 'Stop Krake at the master lever'],
  briefing: [['hale', 'This is it, agents. Jam the gates, reach the tower, stop Krake.'], ['juno', "And maybe don't fall in. The water's rising."], ['tejada', 'The gate locks glow amber. Four of them. Hit them hard.']],
  setup(sim) { sim.waterRise = 0; },
  build(G) {
    KIT.sea(G, 'sea-dawn', -1200, -2400, 2600, -60, -30);
    // the barrier: the crest road (z 0), its sea face and its long drop to the city
    G.box('concrete', -300, -60, -200, 1700, 60, 0, { top: 'asphalt', solid: true, maxEdge: 64 });
    G.box('concrete-dk', -300, -64, 0, 1700, -60, 12, { solid: true }); G.box('concrete-dk', -300, 60, 0, 600, 64, 12, { solid: true }); G.box('concrete-dk', 1300, 60, 0, 1700, 64, 12, { solid: true });
    G.box('concrete-dk', -300, 64, -400, 1700, 900, -260, { solid: false, maxEdge: 300 });
    KIT.skyline(G, -400, 1100, 1900, 1100, 41, 30, 120, 'city-windows');
    for (let x = -280; x < 1700; x += 120) G.box('hazard', x, -59, 0, x + 60, -57, 2, { solid: false });
    for (let x = -200; x < 1700; x += 160) KIT.lamp(G, x, 54, 0, 'glow-amber', 46, .5);
    // the tram rails
    G.box('steel-dk', -300, -6, 0, 1400, -4, 1.5, { solid: false }); G.box('steel-dk', -300, 4, 0, 1400, 6, 1.5, { solid: false });
    // ---- 3-1 Crest Road ----
    G.box('concrete', 70, -44, 0, 86, -14, 18, { top: 'hazard', cover: true }); G.box('concrete', 70, 14, 0, 86, 44, 18, { top: 'hazard', cover: true });   // the players' jersey barriers
    G.box('panel-steel', 180, -60, 0, 230, -24, 54, { top: 'steel-dk' }); G.box('panel-steel', 330, 24, 0, 380, 60, 54, { top: 'steel-dk' });               // gate-machinery houses
    for (const x of [270, 470]) { G.box('paint-yellow', x, -62, 0, x + 6, -56, 70); G.box('paint-yellow', x, 56, 0, x + 6, 62, 70); G.box('grate', x - 6, -62, 66, x + 12, 62, 70, { side: 'paint-yellow' }); KIT.rail(G, [x + 12, -62, 70], [x + 12, 62, 70], 12, 'paint-yellow'); }
    KIT.crates(G, 300, -20, 0, 1, 2, 1, 15); KIT.sandbags(G, 440, 40, 0, 30, Math.PI / 2, 4);
    // ---- 3-2 the Sluice Locks: the channel, catwalks, the giant gate ----
    G.box('concrete-dk', 600, -400, -110, 900, -60, -100, { solid: false }); G.quad('sluice', [600, -400, -96], [900, -400, -96], [900, 400, -96], [600, 400, -96], { maxEdge: 100 });
    KIT.catwalk(G, 600, -60, 900, -40, 0); KIT.catwalk(G, 600, 40, 900, 60, 0); KIT.catwalk(G, 660, -40, 680, 40, 0, false); KIT.catwalk(G, 760, -40, 780, 40, 0, false);
    G.box('grate', 600, -40, -2, 900, 40, 0, { side: 'steel-dk' });
    G.box('panel-dark', 860, -110, -110, 880, 110, 120, { top: 'hazard' });   // the gate
    for (const y of [-80, 80]) G.box('concrete-dk', 850, y - 30, -110, 890, y + 30, 140, { top: 'concrete' });
    KIT.catwalk(G, 760, -100, 850, -80, 60); KIT.catwalk(G, 760, 80, 850, 100, 60);
    G.box('panel-steel', 640, -36, 0, 652, -10, 18, { cover: true }); G.box('panel-steel', 640, 12, 0, 652, 38, 18, { cover: true });   // the players' control boxes
    G.box('panel-steel', 724, -30, 0, 740, -6, 20, { cover: true }); G.box('panel-steel', 800, 10, 0, 816, 34, 20, { cover: true });
    // ---- 3-3 the Turbine Hall (x 980..1300, y -130..130, roof z 130) ----
    G.box('concrete-dk', 976, -134, 0, 980, -20, 130, { skip: 'b' }); G.box('concrete-dk', 976, 20, 0, 980, 134, 130, { skip: 'b' }); G.box('concrete-dk', 976, -20, 50, 980, 20, 130, { skip: 'b' });
    G.box('concrete-dk', 976, -134, 0, 1304, -130, 130, { skip: 'b' }); G.box('concrete-dk', 976, 130, 0, 1304, 134, 130, { skip: 'b' }); G.box('concrete-dk', 1300, -130, 0, 1304, 130, 130, { skip: 'b' });
    G.box('panel-dark', 976, -134, 130, 1304, 134, 136, { solid: false });
    G.box('concrete', 980, -130, -2, 1300, 130, 0, { solid: false });
    for (const [x, y] of [[1100, -60], [1200, 60]]) { G.cyl('steel-dk', x, y, 0, 36, 4, { seg: 16, solid: false }); G.cyl('panel-steel', x, y, 0, 14, 24, { seg: 10, solid: true }); }
    KIT.catwalk(G, 1000, -130, 1300, -104, 56); KIT.catwalk(G, 1000, 104, 1300, 130, 56); KIT.catwalk(G, 1270, -104, 1300, 104, 56);
    G.box('panel-steel', 1010, -40, 0, 1024, -12, 18, { cover: true }); G.box('panel-steel', 1010, 14, 0, 1024, 42, 18, { cover: true });
    G.box('glow-teal', 1299, -60, 60, 1300, 60, 100, { solid: false }); G.box('panel-dark', 1150, -20, 0, 1170, 20, 22, { cover: true }); G.box('panel-dark', 1230, -40, 0, 1246, -10, 20, { cover: true });
    for (const [x, y] of [[1050, 0], [1150, 0], [1250, 0]]) G.light(x, y, 110, 160, .55);
    // ---- 3-4 and 3-B: the control tower, its roof, the control room ----
    G.box('concrete', TW.tx - 60, -60, 0, TW.tx + 60, 60, TW.roof, { top: 'concrete', solid: true });
    KIT.windowsX(G, TW.tx - 60, -60, 60, 20, 7, 'tower-windows');
    G.box('steel-dk', 1458, -26, 0, 1460, 26, TW.roof, { solid: false });   // the lift rails
    G.box('concrete', 1400, -120, TW.roof - 10, 1640, 120, TW.roof, { solid: true });
    G.box('concrete-dk', 1400, -120, TW.roof, 1404, 120, TW.roof + 16, { cover: true }); G.box('concrete-dk', 1636, -120, TW.roof, 1640, 120, TW.roof + 16); G.box('concrete-dk', 1400, 116, TW.roof, 1640, 120, TW.roof + 16);
    G.box('concrete-dk', 1428, 20, TW.roof, 1436, 50, TW.roof + 17, { cover: true }); G.box('concrete-dk', 1428, 70, TW.roof, 1436, 100, TW.roof + 17, { cover: true });   // the parapet blocks (phase 1 cover)
    G.cyl('hazard', 1550, 60, TW.roof, 44, .5, { seg: 16, solid: false }); G.cyl('asphalt', 1550, 60, TW.roof + .5, 38, .5, { seg: 16, solid: false });
    // the control room: glass walls, consoles
    G.box('glass', 1440, -120, TW.roof, 1600, -118, TW.roof + 40, { solid: false }); G.box('glass', 1440, -42, TW.roof, 1600, -40, TW.roof + 40, { solid: false }); G.box('panel-dark', 1440, -120, TW.roof + 40, 1600, -40, TW.roof + 44, { solid: false });
    G.box('glass', 1598, -120, TW.roof, 1600, -40, TW.roof + 40, { solid: false });
    for (const [x, y] of CONSOLES) G.box('panel-dark', x - 7, y - 8, TW.roof, x + 7, y + 8, TW.roof + 16, { top: 'glow-teal', cover: true });
    G.box('panel-steel', 1610, -110, TW.roof, 1630, -90, TW.roof + 50, { solid: false });   // the antenna mast base
    G.cyl('steel', 1620, -100, TW.roof + 50, 1.5, 60, { seg: 5 }); G.box('glow-red', 1618, -102, TW.roof + 110, 1622, -98, TW.roof + 114, { solid: false });
  },
  lights(R3, sim, t) { if (sim.scene && sim.scene.id === '3-3') for (const [x, y] of [[1100, -60], [1200, 60]]) R3.addLight(x, y, 30, 60, .3 + .2 * Math.sin(t * 9)); },
  draw(R, sim, t) {
    const sc = sim.scene && sim.scene.id;
    // the turbines turn; steam vents puff
    for (const [x, y, k] of [[1100, -60, 1], [1200, 60, -1]]) R.mesh('turbine', mat34(x, y, 26, t * 2.4 * k), {});
    if (sc === '3-3' && R.fx.r() < .25) for (const [x, y] of [[1040, -120], [1260, 120], [1150, -120]]) R.fx.smoke([x, y, 4], 1, [230, 236, 240], 6);
    if (sc === '3-2' || sc === '3-1') { if (R.fx.r() < .4) R.fx.add({ pos: [600 + R.fx.r() * 300, -60 - R.fx.r() * 20, -90], vel: [0, 60, 40], g: 120, life: .8, size: 4, mode: 2, color: [230, 245, 250] }); }
    // the master lever
    const B = sim.boss; R.mesh('lever', mat34(1592, -80, TW.roof, 0, 0, B && B.lever ? -B.lever * .9 : 0), { glow: B && B.finalT > 0 ? .5 : 0 });
    // the tram at the start
    const C = sim.carriers.tram; if (C && C.M && (sc === '3-1' || sim.cut)) R.mesh('funicular', C.M, {});
  },
  scenes: ['3-1', '3-2', '3-3', '3-4', '3-B'], intro: 'c3-intro', outro: 'c3-outro'
});

def('scene', '3-1', { title: 'CREST ROAD', time: 90,
  arrive: { start: [-240, 0, 24], path: [[-120, 0, 24], [0, -6, 24]], speed: 120 },
  slots: [
    { stand: { at: [56, -28, 24], look: [400, -24, 30] }, cover: { at: [60, -30, 12], look: [400, -70, 6] } },
    { stand: { at: [56, 28, 24], look: [400, 24, 30] }, cover: { at: [60, 30, 12], look: [400, 70, 6] } }],
  covers: { g1: { at: [276, -40, 70], h: 12, ledge: true, floor: 0 }, g2: { at: [476, 30, 70], h: 12, ledge: true, floor: 0 }, h1: { at: [238, -30, 0], h: 54, peek: ['left'] }, h2: { at: [322, 40, 0], h: 54, peek: ['left', 'up'] },
    b1: { at: [472, -16, 0], h: 22 }, b2: { at: [472, 16, 0], h: 22 } },
  waves: [
    { at: .5, spawn: [['drone', null, { from: [300, -40, 60], orbit: 80 }], ['drone', null, { from: [320, 40, 70], orbit: 70, delay: .3 }], ['drone', null, { from: [260, 0, 80], orbit: 90, delay: .6 }], ['drone', null, { from: [360, -20, 50], orbit: 60, delay: .9 }]], cue: 'drones' },
    { after: 'clear', spawn: [['rocketeer', 'g1'], ['rocketeer', 'g2', { delay: .8 }], ['deckhand', 'h1'], ['deckhand', 'h2']], cue: 'rockets' },
    { after: 'clear', spawn: [['quartermaster', null, { route: [[400, -58, 0], [400, 58, 0]], drop: 'gl', amount: 2 }], ['marine', 'b1'], ['shield', 'b2'], ['marine', 'h2', { delay: .5 }]], cue: 'barricade' }],
  objects: [['barricade', [460, 0, 0], { yaw: Math.PI / 2 }], ['barrel', [250, 30, 0]], ['lifering', [150, 58, 22], { yaw: Math.PI / 2 }]],
  cues: [{ at: 0, say: ['tejada', 'The gate locks are past the turbine hall. Hurry!'] }, { on: 'drones', say: ['juno', 'Drones! Use the machine gun!'] }, { on: 'rockets', say: ['juno', 'Rocket! Shoot it down!'] }, { on: 'barricade', say: ['rook', 'Grenade launcher. My kind of party.'] }]
});

def('scene', '3-2', { title: 'SLUICE LOCKS', time: 90,
  arrive: { path: [[280, 0, 24], [480, 0, 24], [600, -6, 24]], speed: 150 },
  slots: [
    { stand: { at: [626, -24, 24], look: [880, -20, 40] }, cover: { at: [630, -26, 12], look: [880, -70, 10] } },
    { stand: { at: [626, 26, 24], look: [880, 20, 40] }, cover: { at: [630, 28, 12], look: [880, 70, 10] } }],
  covers: { k1: { at: [748, -20, 0], h: 20 }, k2: { at: [824, 22, 0], h: 20, peek: ['up', 'left'] }, k3: { at: [700, -50, 0], h: 14, ledge: true, floor: -96 }, k4: { at: [700, 50, 0], h: 14, ledge: true, floor: -96 },
    u1: { at: [800, -90, 60], h: 14, ledge: true, floor: -96 }, u2: { at: [800, 90, 60], h: 14, ledge: true, floor: -96 }, r1: { at: [720, 0, 0], h: 1, noRelocate: true }, r2: { at: [790, -10, 0], h: 1, noRelocate: true } },
  waves: [
    { at: .5, spawn: [['deckhand', 'k1'], ['deckhand', 'k2', { delay: .5 }], ['marine', 'u1', { delay: 1.5 }]], say: ['tejada', 'Jam the gate locks! Four of them: the glowing clamps!'], cue: 'locks' },
    { at: 8, do: sim => spawnBoss(sim, 'seawolf'), say: ['juno', "Gunship inbound! It's the Seawolf!"] },
    { on: 'seawolf-drop', spawn: [['marine', 'r1', { entry: 'rappel', ropeH: 120 }], ['deckhand', 'r2', { entry: 'rappel', ropeH: 120, delay: .5 }]] },
    { on: 'seawolf-down', delay: 2, spawn: [['redtide', 'u2'], ['drone', null, { from: [760, 0, 60], orbit: 40 }]] }],
  objects: [['lock', [858, -40, 20], { onBreak: 'lock' }], ['lock', [858, 40, 20], { onBreak: 'lock' }], ['lock', [858, -40, 74], { onBreak: 'lock' }], ['lock', [858, 40, 74], { onBreak: 'lock' }], ['barrel', [770, -50, 0]]],
  objective: sim => sim.objects.filter(o => o.kind === 'lock' && o.scene === '3-2').every(o => !o.alive),
  cues: [{ on: 'locks', prompt: 'locks' }, { on: 'lock', repeat: true, do: sim => { const left = sim.objects.filter(o => o.kind === 'lock' && o.alive).length; sim.ev({ type: 'locks', left }); if (left === 0) sim.say('tejada', 'Gate jammed! Hurry to the tower!'); else sim.say('juno', left + ' lock' + (left > 1 ? 's' : '') + ' to go!'); } }],
  tick: (sim, dt) => { sim.waterRise = Math.min(6, (sim.waterRise || 0) + dt * .02); }
});

def('scene', '3-3', { title: 'TURBINE HALL', time: 85,
  arrive: { path: [[700, 0, 24], [900, 0, 24], [990, 0, 24]], speed: 150, walk: true },
  slots: [
    { stand: { at: [998, -28, 24], look: [1280, -20, 40] }, cover: { at: [1002, -28, 12], look: [1280, -70, 10] } },
    { stand: { at: [998, 30, 24], look: [1280, 20, 40] }, cover: { at: [1002, 30, 12], look: [1280, 70, 10] } }],
  covers: { c1: { at: [1176, 0, 0], h: 22 }, c2: { at: [1254, -26, 0], h: 20, peek: ['up', 'right'] }, w1: { at: [1150, -112, 56], h: 14, ledge: true, floor: 0 }, w2: { at: [1220, 112, 56], h: 14, ledge: true, floor: 0 }, w3: { at: [1282, 0, 56], h: 14, ledge: true, floor: 0 },
    t1: { at: [1100, -30, 0], h: 24 }, t2: { at: [1200, 30, 0], h: 24, peek: ['left', 'right'] } },
  waves: [
    { at: .5, spawn: [['marine', 'w1'], ['redtide', 'w2', { delay: .6 }], ['marine', 'c1']] },
    { after: 'clear', spawn: [['shield', null, { from: [1290, -60, 0], entry: 'run', advance: [[1200, -40, 0], [1120, -30, 0]] }], ['shield', null, { from: [1290, 60, 0], entry: 'run', advance: [[1210, 50, 0], [1130, 40, 0]], delay: .8 }], ['rusher', null, { from: [1290, 0, 0], delay: 1.5 }], ['rusher', null, { from: [1290, 30, 0], delay: 2.5 }]] },
    { after: 'clear', spawn: [['grenadier', 'w3'], ['rocketeer', 'c2', { delay: .5 }], ['deckhand', 't1', { delay: 1 }]] }],
  objects: [['tank', [1260, -110, 0]], ['tank', [1260, 110, 0]], ['tank', [1100, 110, 0]], ['intel', [1290, 90, 56], { n: 4 }], ['intel', [1040, -120, 18], { n: 5 }]],
  allies: [{ who: 'rook', at: [1010, 110, 56], facing: 0, every: 3.5 }],
  cues: [{ at: 0, say: ['rook', 'Turbine hall. Mind the fans.'] }, { at: 4, say: ['juno', 'Coolant tanks: stay clear. Unless the bad guys are closer.'] }],
  onEnter: sim => { sim.waterRise = Math.max(sim.waterRise || 0, 7.5); }
});

def('scene', '3-4', { title: 'TOWER LIFT', time: 95, carrier: 'lift', carrierHold: 270, holds: [[60, 'w0'], [120, 'w1']],
  arrive: { path: [[1120, 0, 24], [1320, 0, 24], [1420, 0, 30]], speed: 150 },
  slots: [
    { stand: { at: [-12, 8, 24], yaw: 0, pitch: 8 }, cover: { at: [-8, 8, 11], yaw: 0, pitch: 0 } },
    { stand: { at: [-12, -8, 24], yaw: 0, pitch: 8 }, cover: { at: [-8, -8, 11], yaw: 0, pitch: 0 } }],
  covers: {},
  waves: [
    { atD: 10, spawn: [['drone', null, { from: [1340, -40, 80], orbit: 50, follow: 'lift', local: [90, -40, 30] }], ['drone', null, { from: [1340, 40, 110], orbit: 50, follow: 'lift', local: [100, 40, 50], delay: .5 }], ['drone', null, { from: [1320, 0, 140], orbit: 60, follow: 'lift', local: [120, 0, 70], delay: 1 }]] },
    { atD: 70, spawn: [['deckhand', null, { entry: 'rappel', carrier: 'lift', local: [30, -12, 3], ropeH: 70 }], ['marine', null, { entry: 'rappel', carrier: 'lift', local: [30, 12, 3], ropeH: 70, delay: .8 }]] },
    { atD: 130, do: sim => spawnBoss(sim, 'seawolf2'), say: ['juno', "Seawolf's back! Hit the weapon pods!"] }],
  objects: [['lifering', [1440, 0, 230], { yaw: 0 }]],
  cues: [{ at: 0, say: ['kai', 'Going up.'] }, { on: 'seawolf2-down', say: ['rook', 'Scratch one gunship.'] }],
  onEnter: sim => { sim.waterRise = Math.max(sim.waterRise || 0, 9); },
});

def('scene', '3-B', { title: 'THE KING TIDE', time: 90, boss: 'scylla',
  arrive: { path: [[1452, 0, 300], [1420, 30, 320], [1410, 40, TW.roof + 24]], speed: 80 },
  slots: [
    { stand: { at: [1410, 34, TW.roof + 24], look: [1560, 50, TW.roof + 30] }, cover: { at: [1406, 36, TW.roof + 12], look: [1560, 20, TW.roof + 10] } },
    { stand: { at: [1410, 84, TW.roof + 24], look: [1560, 70, TW.roof + 30] }, cover: { at: [1406, 86, TW.roof + 12], look: [1560, 110, TW.roof + 10] } }],
  alt: [-88, -66, -110, -48].map((y, k) => ({ stand: { at: [1448, y, TW.roof + 24], look: [1600, [-84, -64, -96, -60][k], TW.roof + 24] }, cover: { at: [1452, y, TW.roof + 12], look: [1600, y + (k % 2 ? 18 : -22), TW.roof + 8] } })),
  covers: { d1: { at: [1590, -56, TW.roof], h: 40, peek: ['left'], noRelocate: true }, d2: { at: [1590, -104, TW.roof], h: 40, peek: ['right'], noRelocate: true }, k1: { at: [1528, -96, TW.roof], h: 16 }, k2: { at: [1564, -64, TW.roof], h: 16 } },
  waves: [],
  cues: [{ at: 0, say: ['krake', 'You climbed my tower. Admirable. Now meet my Scylla.'] }],
  onEnter: sim => { sim.waterRise = Math.max(sim.waterRise || 0, 10); }
});

// ---- 34-range.js ----
/* 34-range: TRAINING, the CREST RANGE (Juno instructs). An indoor range of concrete lanes, plywood cut-outs on hinges
 * and score lamps. Four drills: AIM & FIRE; COVER & RELOAD (a turret robot telegraphs three shots); WEAPONS (an orange
 * vest for machine-gun ammo, drone targets, a shield cut-out for the shotgun, a crate stack for the launcher); READ THE
 * CRISIS (a fast Red Tide cut-out, a grenade lob, a civilian cut-out, then eight targets against the clock). */
def('stage', 'range', {
  num: 0, name: 'CREST RANGE', place: 'CREST headquarters, sub-level 2', clock: '09:00', music: 'range', maxThreats: 1,
  env: { ambient: .5, skyK: .05, sun: { dir: [0, 0, 1], k: .25 }, fog: ['#141820', 300, 900], warm: '#ffe0b0', ambience: 'turbine', actorK: 1,
    sky: { colors: ['#1a1e26', '#1a1e26', '#1a1e26'], below: '#14181e' } },
  carriers: {},
  build(G) {
    G.box('concrete', -40, -120, -10, 420, 120, 0, { solid: true });
    G.box('concrete-dk', -40, -124, 0, 420, -120, 90); G.box('concrete-dk', -40, 120, 0, 420, 124, 90); G.box('concrete-dk', 416, -120, 0, 420, 120, 90); G.box('concrete-dk', -44, -120, 0, -40, 120, 90);
    G.box('panel-dark', -40, -124, 90, 420, 124, 94, { solid: false });
    for (const y of [-60, 0, 60]) G.box('panel-steel', 60, y - 1, 0, 300, y + 1, 26, { solid: false });   // lane dividers
    G.box('panel-steel', 26, -100, 0, 38, -62, 18, { cover: true }); G.box('panel-steel', 26, -40, 0, 38, -8, 18, { cover: true }); G.box('panel-steel', 26, 8, 0, 38, 40, 18, { cover: true }); G.box('panel-steel', 26, 62, 0, 38, 100, 18, { cover: true });
    for (let x = 60; x < 400; x += 80) { G.box('glow-white', x, -2, 89, x + 40, 2, 90, { solid: false }); G.light(x + 20, 0, 80, 160, .5); }
    G.box('hazard', 40, -120, 0, 44, 120, .3, { solid: false });
    G.box('sign', 410, -60, 30, 416, 60, 70, { solid: false });
  },
  scenes: ['R-1', 'R-2', 'R-3', 'R-4']
});
const RSLOT = [{ stand: { at: [12, -24, 24], look: [300, -20, 16] }, cover: { at: [14, -24, 11], look: [300, -60, 8] } }, { stand: { at: [12, 24, 24], look: [300, 20, 16] }, cover: { at: [14, 24, 11], look: [300, 60, 8] } }];
const rangeObjs = (sim, sc) => sim.objects.filter(o => o.scene === sc);
const raise = (ob, on = true) => { ob.raised = on; };
def('scene', 'R-1', { title: 'AIM & FIRE', time: 60, arrive: { start: [-30, 0, 24], path: [[-10, -10, 24]], speed: 80 }, slots: RSLOT, covers: {},
  objects: [['target', [150, -40, 0], { yaw: Math.PI / 2 }], ['target', [180, 30, 0], { yaw: Math.PI / 2 }], ['target', [210, -10, 0], { yaw: Math.PI / 2 }], ['target', [240, 50, 0], { yaw: Math.PI / 2 }], ['target', [200, -70, 0], { yaw: Math.PI / 2 }], ['target', [260, 0, 0], { yaw: Math.PI / 2 }]],
  cues: [{ at: 0, say: ['juno', 'Welcome to the range, agent. Aim and fire. Six targets.'], prompt: 'aim' }],
  tick(sim) { if (sim.phase !== 'action') return; const T = rangeObjs(sim, 'R-1'), up = T.filter(o => o.alive && o.raised).length; if (!up && sim.dir.t > 1) { const next = T.find(o => o.alive && !o.raised); if (next) raise(next); } },
  objective: sim => rangeObjs(sim, 'R-1').every(o => !o.alive)
});
def('boss', 'turretbot', { name: 'TRAINING TURRET', title: 'CREST range robot', card: false,
  frac: B => 1 - B.shots / 3,
  make(sim, B) { B.shots = 0; B.at = [220, 0, 0]; B.fire = 1.5; B.armor = B.part('armor', { hp: 1, armor: true, noBar: true, noMul: true }); B.armor.vol = { c: [220, 0, 14], r: 10 }; },
  step(sim, B, dt) {
    B.fire -= dt;
    if (B.shots < 3 && B.fire <= 0 && !sim.threats.some(t => !t.done)) { B.shots++; B.fire = 2.6; const th = bossThreat(sim, B, 'turret', 1.4, () => [220, 0, 26]); if (th) th.onResolve = r => { sim.ev({ type: 'eshot', from: [220, 0, 26], to: null, p: th.target, kind: 'turret' }); if (r === 'blocked') sim.say('juno', B.shots < 3 ? 'Good! Again!' : 'Perfect. Cover saves lives.'); else sim.say('juno', 'Ouch. Hold cover BEFORE the ring closes!'); }; }
    if (B.shots >= 3 && !sim.threats.some(t => !t.done) && B.fire < 1.5 && !B.dead) { B.defeat(sim); sim.say('juno', 'Now empty your magazine, then reload in cover.'); sim.ev({ type: 'prompt', id: 'reload' }); }
  },
  draw(R, B, sim) { R.meshObj('generator', [220, 0, 0], 0); R.glow([220, 0, 26], 4, [255, 60, 40], .5 + .5 * Math.sin(sim.t * 8)); }
});
def('scene', 'R-2', { title: 'COVER & RELOAD', time: 90, arrive: { path: [[11, 0, 24]], speed: 80 }, slots: RSLOT, covers: {},
  cues: [{ at: 0, say: ['juno', 'The turret telegraphs every shot that will hit. When the red ring closes, be in cover!'], prompt: 'cover', do: sim => spawnBoss(sim, 'turretbot') }],
  objective: sim => sim.boss && sim.boss.dead && sim.players.every(p => (p.stats.reloads || 0) >= 1 && p.mag === 9) && sim.players.some(p => p.stats.shots >= 9)
});
def('scene', 'R-3', { title: 'WEAPONS', time: 90, arrive: { path: [[11, 0, 24]], speed: 80 }, slots: RSLOT, covers: {},
  objects: [['qmtarget', [180, -30, 0], { yaw: Math.PI / 2 }], ['dronetarget', [200, 0, 40]], ['dronetarget', [230, -40, 46]], ['dronetarget', [210, 40, 50]], ['shieldtarget', [190, 20, 0], { yaw: Math.PI / 2 }], ['stack', [260, -20, 0]]],
  cues: [{ at: 0, say: ['juno', 'Orange vest means ammo. Drop him for the machine gun.'] }],
  tick(sim) {
    if (sim.phase !== 'action') return;
    const T = rangeObjs(sim, 'R-3'), q = T[0], drones = T.slice(1, 4), sh = T[4], st = T[5], f = sim.flags;
    if (!f.r3a) { f.r3a = true; raise(q); }
    if (!q.alive && !f.r3b) { f.r3b = true; drones.forEach((d, k) => { d.path = [d.at[0], d.at[1], d.at[2], 26 + k * 6]; }); sim.say('juno', 'Switch to the machine gun and shred those drones!'); sim.ev({ type: 'prompt', id: 'weapon' }); }
    if (f.r3b && drones.every(d => !d.alive) && !f.r3c) { f.r3c = true; raise(sh); for (const p of sim.players) givePickup(sim, p, 'sg', 8); sim.say('juno', 'Shield cut-out. The shotgun knocks it flat. Fire while in cover to switch, too!'); }
    if (f.r3c && !sh.alive && !f.r3d) { f.r3d = true; for (const p of sim.players) givePickup(sim, p, 'gl', 2); sim.say('juno', 'And the launcher: blow that crate stack apart.'); }
    for (const d of drones) if (!f.r3b) { d.box = [d.at[0] - 5, d.at[1] - 5, d.at[2] - 3, d.at[0] + 5, d.at[1] + 5, d.at[2] + 3]; d.col.box = d.box; }
  },
  objective: sim => rangeObjs(sim, 'R-3').every(o => !o.alive)
});
def('scene', 'R-4', { title: 'READ THE CRISIS', time: 60, timed: true, arrive: { path: [[11, 0, 24]], speed: 80 }, slots: RSLOT, covers: {},
  objects: [['target', [170, -20, 0], { yaw: Math.PI / 2, red: true }], ['civtarget', [200, 30, 0], { yaw: Math.PI / 2 }], ['target', [220, -50, 0], { yaw: Math.PI / 2 }]].concat([0, 1, 2, 3, 4, 5, 6, 7].map(k => ['target', [150 + (k * 37) % 130, -80 + (k * 53) % 160, 0], { yaw: Math.PI / 2, timed: true }])),
  cues: [{ at: 0, say: ['juno', 'Red Tide cut-out: fast ring. Shoot it before it closes, or duck!'] }],
  tick(sim, dt) {
    if (sim.phase !== 'action') return;
    const T = rangeObjs(sim, 'R-4'), red = T[0], civ = T[1], norm = T[2], timed = T.slice(3), f = sim.flags;
    if (!f.r4a) { f.r4a = true; raise(red); sim.timer = 60; }
    if (red.raised && red.up > .9 && !f.r4th) { f.r4th = true; const th = requestThreat(sim, 0, { always: true, tele: .55 * 1.6, kind: 'redtide', pos: () => [red.at[0], red.at[1], 22] }); if (th) th.srcAlive = () => red.alive; }
    if (!red.alive && !f.r4b) { f.r4b = true; sim.say('juno', 'Grenade! Shoot it out of the air!'); const tgt = 0, cam = sim.cameraFor(tgt), land = [cam.x + 40, cam.y, 0], from = [260, 0, 20], Tt = 1.6; const pr = sim.launch({ kind: 'grenade', pos: from, vel: [(land[0] - from[0]) / Tt, (land[1] - from[1]) / Tt, (land[2] - from[2]) / Tt + .5 * 300 * Tt], gravity: 300, life: Tt, hp: 1, target: tgt, land }); pr.th = requestThreat(sim, tgt, { always: true, tele: Tt, kind: 'grenade', src: pr.id, pos: () => pr.pos }); if (pr.th) pr.th.srcAlive = () => pr.alive; f.r4g = sim.t; }
    if (f.r4b && !f.r4c && sim.t - f.r4g > 2) { f.r4c = true; raise(civ); raise(norm); sim.say('juno', "Blue cut-out is a civilian. DON'T SHOOT!"); }
    if (f.r4c && !norm.alive && !f.r4d) { f.r4d = true; f.timed = true; raise(civ, false); sim.timer = 20; f.r4t = 0; sim.say('juno', 'Final drill: eight targets, twenty seconds. GO!'); }
    if (f.r4d) {
      const left = timed.filter(o => o.alive);
      if (!left.some(o => o.raised)) { const n = left.slice().sort((a, b) => (a.lastUp || 0) - (b.lastUp || 0))[0]; if (n) { raise(n); n.upT = sim.t; } }
      for (const o of left) if (o.raised && sim.t - o.upT > 2.2) { raise(o, false); o.lastUp = sim.t; }
      if (sim.timer < .1 && left.length) { for (const o of timed) { o.alive = true; o.col.alive = true; o.hp = 1; raise(o, false); } sim.timer = 20; sim.say('juno', 'Too slow. Again!'); }
    }
  },
  objective: sim => rangeObjs(sim, 'R-4').slice(3).every(o => !o.alive)
});

// ---- 35-kit.js ----
/* 35-kit: prefabs on the geometry builder G, so stages are written as placements: piers, quays, stalls with lantern
 * strings, crates and stacks, containers, warehouses, lamp posts, bollards, boats, bridges, canal walls, houses,
 * market halls, catwalks, railings, skylines. Each takes world positions; a few return what they place (for covers). */
const KIT = {};
TC.KIT = KIT;
/** a wooden pier deck at z on piles, from (x0, y0) to (x1, y1) */
KIT.pier = (G, x0, y0, x1, y1, z = 0, mat = 'pier') => {
  G.box(mat, x0, y0, z - 4, x1, y1, z, { bottom: 'pier-dk', side: 'pier-dk' });
  for (let x = x0 + 8; x < x1; x += 48) for (const y of [y0 + 4, y1 - 4, (y0 + y1) / 2]) G.cyl('pier-dk', x, y, z - 60, 3, 56, { seg: 6, caps: false });
  for (let x = x0; x <= x1; x += 64) for (const y of [y0 + 2, y1 - 2]) G.cyl('pier-dk', x, y, z, 2.5, 10, { seg: 6, top: 'rope' });
};
/** a stone or concrete quay block (the ground) */
KIT.ground = (G, x0, y0, x1, y1, z = 0, mat = 'concrete', side = 'stone', depth = 60) => G.box(mat, x0, y0, z - depth, x1, y1, z, { side, solid: true });
KIT.crate = (G, x, y, z = 0, s = 15, yaw = 0) => G.box('crate', x - s / 2, y - s / 2, z, x + s / 2, y + s / 2, z + s * .93, { yaw, cover: true });
/** a stack of crates w x d cells, h high (returns its top z) */
KIT.crates = (G, x, y, z = 0, nx = 2, ny = 1, nz = 2, s = 15) => {
  for (let k = 0; k < nz; k++) for (let i = 0; i < nx - (k > 0 ? 1 : 0); i++) for (let j = 0; j < ny; j++) KIT.crate(G, x + (i - (nx - 1) / 2) * s + (k > 0 ? s / 2 : 0), y + (j - (ny - 1) / 2) * s, z + k * s * .93, s);
  return z + nz * s * .93;
};
KIT.barrel = (G, x, y, z = 0, mat = 'barrel') => { G.cyl(mat, x, y, z, 6, 17, { seg: 10, top: 'oak', solid: true }); G.cyl('iron', x, y, z + 4, 6.3, 1.5, { seg: 10, caps: false }); G.cyl('iron', x, y, z + 12, 6.3, 1.5, { seg: 10, caps: false }); };
KIT.bollard = (G, x, y, z = 0) => { G.cyl('iron', x, y, z, 4, 10, { seg: 8, solid: true }); G.cyl('iron', x, y, z + 10, 5, 2, { seg: 8 }); };
KIT.lamp = (G, x, y, z = 0, color = 'glow-amber', h = 44, light = .7) => {
  G.cyl('iron', x, y, z, 2, h, { seg: 6 }); G.box('iron', x - 2, y - 2, z + h, x + 2, y + 2, z + h + 2, { solid: false });
  G.box(color, x - 3, y - 3, z + h - 6, x + 3, y + 3, z + h, { solid: false }); G.light(x, y, z + h - 3, 110, light);
};
/** a festival stall: counter (cover), posts, a striped awning, goods; facing: the side customers stand */
KIT.stall = (G, x, y, z = 0, yaw = 0, aw = 'awning-red') => {
  const c = Math.cos(yaw), s = Math.sin(yaw), P = (f, r) => [x + f * c - r * s, y + f * s + r * c];
  G.box('planks', x - 7, y - 16, z, x + 7, y + 16, z + 19, { yaw, top: 'oak', cover: true });
  for (const r of [-16, 16]) for (const f of [-8, 10]) { const p = P(f, r); G.cyl('oak', p[0], p[1], z, 1.2, 34, { seg: 5 }); }
  const a = P(-9, -19), b = P(13, -19), cc = P(13, 19), d = P(-9, 19);
  G.quad(aw, [a[0], a[1], z + 34], [d[0], d[1], z + 34], [cc[0], cc[1], z + 30], [b[0], b[1], z + 30]);
  G.quad(aw, [b[0], b[1], z + 30], [cc[0], cc[1], z + 30], [d[0], d[1], z + 34], [a[0], a[1], z + 34]);
  G.light(P(0, 0)[0], P(0, 0)[1], z + 26, 70, .45);
};
/** a string of festival lights between two points (sagging), colored bulbs */
KIT.lights = (G, a, b, n = 10, sag = 8) => {
  const cols = ['glow-red', 'glow-yellow', 'glow-cyan', 'glow-green', 'glow-magenta'];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = V3.lerp(a, b, u); p[2] -= Math.sin(u * Math.PI) * sag;
    G.box(cols[i % cols.length], p[0] - 1, p[1] - 1, p[2] - 2, p[0] + 1, p[1] + 1, p[2], { solid: false });
  }
};
/** a 98 x 39 x 42 shipping container, long axis along yaw */
KIT.container = (G, x, y, z = 0, yaw = 0, mat = 'corr-red') => G.box(mat, x - 49, y - 19.5, z, x + 49, y + 19.5, z + 42, { yaw, top: mat, cover: true });
/** a warehouse block with windows on a face, a door; returns nothing */
KIT.building = (G, x0, y0, x1, y1, h, o = {}) => {
  G.box(o.mat || 'brick', x0, y0, 0, x1, y1, h, { top: o.roof || 'slate', solid: true });
  if (o.windows) for (const w of o.windows) G.box('glass-lit', w[0], w[1], w[2], w[3], w[4], w[5], { solid: false });
};
/** a row of lit windows on a wall plane facing -x at x, from y0 to y1 */
KIT.windowsX = (G, x, y0, y1, z0, rows = 2, mat = 'glass-lit', dir = -1) => {
  for (let r = 0; r < rows; r++) for (let y = y0 + 12; y < y1 - 12; y += 30) G.box(mat, x + dir * .5 - .5, y, z0 + r * 36, x + dir * .5 + .5, y + 12, z0 + r * 36 + 16, { solid: false });
};
KIT.windowsY = (G, y, x0, x1, z0, rows = 2, mat = 'glass-lit', dir = -1) => {
  for (let r = 0; r < rows; r++) for (let x = x0 + 12; x < x1 - 12; x += 30) G.box(mat, x, y + dir * .5 - .5, z0 + r * 36, x + 12, y + dir * .5 + .5, z0 + r * 36 + 16, { solid: false });
};
/** a railing along a line (posts and a rail), h high */
KIT.rail = (G, a, b, h = 14, mat = 'iron') => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 16));
  for (let i = 0; i <= n; i++) { const p = V3.lerp(a, b, i / n); G.cyl(mat, p[0], p[1], p[2], .8, h, { seg: 4, caps: false }); }
  G.tube(mat, [a[0], a[1], a[2] + h], [b[0], b[1], b[2] + h], 1, { seg: 5 });
  G.tube(mat, [a[0], a[1], a[2] + h * .5], [b[0], b[1], b[2] + h * .5], .7, { seg: 4 });
};
/** a moored fishing boat (static): hull, cabin (its roof is a jump-off point) */
KIT.fishingBoat = (G, x, y, z, yaw = 0) => {
  const M = mat34(x, y, z, yaw), B = new Builder({ local: true });
  B.box('hull-white', -40, -14, -10, 40, 14, 6, { top: 'pier' }); B.box('hull-red', -40.5, -14.5, -10, 40.5, 14.5, -4, { skip: 'tb', solid: false });
  B.lathe('hull-white', 40, 0, -10, [[14, 0], [10, 8], [0, 16]], { seg: 4 });
  B.box('plaster', -26, -10, 6, -2, 10, 28, { top: 'hull-red' }); B.box('glass-lit', -2.6, -7, 16, -1.9, 7, 24, { solid: false });
  B.cyl('oak', 14, 0, 6, 1.2, 40, { seg: 5 });
  addMeshTo(G, B, M);
};
/** copy a local builder's triangles into G through a transform (and its colliders, as axis boxes of their corners) */
function addMeshTo(G, B, M) {
  for (const g of B.groups.values()) for (let i = 0; i < g.pos.length; i += 9) {
    const a = xform(M, [g.pos[i], g.pos[i + 1], g.pos[i + 2]]), b = xform(M, [g.pos[i + 3], g.pos[i + 4], g.pos[i + 5]]), c = xform(M, [g.pos[i + 6], g.pos[i + 7], g.pos[i + 8]]), j = i / 9 * 6;
    G.tri(g.tex, a, b, c, [g.uv[j], g.uv[j + 1]], [g.uv[j + 2], g.uv[j + 3]], [g.uv[j + 4], g.uv[j + 5]]);
  }
  for (const c of B.colliders) { const b = c.box, cs = [[b[0], b[1]], [b[3], b[1]], [b[3], b[4]], [b[0], b[4]]].map(p => xform(M, [p[0], p[1], 0])), z0 = xform(M, [0, 0, b[2]])[2], z1 = xform(M, [0, 0, b[5]])[2]; G.collider([Math.min(...cs.map(p => p[0])), Math.min(...cs.map(p => p[1])), Math.min(z0, z1), Math.max(...cs.map(p => p[0])), Math.max(...cs.map(p => p[1])), Math.max(z0, z1)], { impact: c.impact }); }
}
TC.addMeshTo = addMeshTo;
/** a far skyline of blocks (low-poly buildings with lit windows) along a line */
KIT.skyline = (G, x0, y0, x1, y1, seed = 1, h0 = 60, h1 = 160, mat = 'city-windows') => {
  const R = E.rng(seed), L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  for (let d = 0; d < L;) { const w = 40 + R() * 70, h = h0 + R() * (h1 - h0), dp = 40 + R() * 60, cx = x0 + ux * (d + w / 2), cy = y0 + uy * (d + w / 2); G.box(mat, cx - w / 2 * Math.abs(ux) - dp / 2 * Math.abs(uy), cy - w / 2 * Math.abs(uy) - dp / 2 * Math.abs(ux), -20, cx + w / 2 * Math.abs(ux) + dp / 2 * Math.abs(uy), cy + w / 2 * Math.abs(uy) + dp / 2 * Math.abs(ux), h, { top: 'slate', solid: false, maxEdge: 200 }); d += w + R() * 20; }
};
/** sea: a big water plane at z */
KIT.sea = (G, mat, x0, y0, x1, y1, z) => G.quad(mat, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], { maxEdge: 300 });
/** a timber or plaster house: walls, a pitched slate roof, door, windows (on the face toward -x by default) */
KIT.house = (G, x0, y0, x1, y1, h, o = {}) => {
  const mat = o.mat || 'plaster', roof = o.roof || 'slate';
  G.box(mat, x0, y0, 0, x1, y1, h, { top: roof, solid: true });
  if (o.timber) for (let y = y0 + 6; y < y1; y += 22) G.box('timber', x0 - .6, y, 0, x0, y + 3, h, { solid: false });
  const my = (y0 + y1) / 2, rz = h + (y1 - y0) * .35;
  G.quad(roof, [x0 - 3, y0 - 3, h], [x1 + 3, y0 - 3, h], [x1 + 3, my, rz], [x0 - 3, my, rz]);
  G.quad(roof, [x1 + 3, y1 + 3, h], [x0 - 3, y1 + 3, h], [x0 - 3, my, rz], [x1 + 3, my, rz]);
  G.tri(mat, [x0, y0, h], [x0, my, rz], [x0, y1, h], [0, 0], [1, 1], [2, 0]); G.tri(mat, [x1, y1, h], [x1, my, rz], [x1, y0, h], [0, 0], [1, 1], [2, 0]);
  if (o.door) G.box('timber', x0 - 1, o.door - 8, 0, x0 + .2, o.door + 8, 30, { solid: false });
  if (o.lit !== false) for (let y = y0 + 10; y < y1 - 14; y += 28) G.box(o.dark ? 'glass' : 'glass-lit', x0 - .7, y, h * .55, x0 + .1, y + 10, h * .55 + 14, { solid: false });
};
/** a steel catwalk deck with grating, railings on both sides */
KIT.catwalk = (G, x0, y0, x1, y1, z, rails = 'both') => {
  G.box('grate', x0, y0, z - 2, x1, y1, z, { side: 'steel-dk', solid: true });
  if (rails) { const along = (x1 - x0) > (y1 - y0); if (along) { KIT.rail(G, [x0, y0, z], [x1, y0, z]); KIT.rail(G, [x0, y1, z], [x1, y1, z]); } else { KIT.rail(G, [x0, y0, z], [x0, y1, z]); KIT.rail(G, [x1, y0, z], [x1, y1, z]); } }
};
/** sandbags: a low wall of rounded sacks (cover) */
KIT.sandbags = (G, x, y, z = 0, len = 40, yaw = 0, rows = 3) => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (let r = 0; r < rows; r++) for (let i = 0; i < Math.round(len / 10); i++) { const f = -len / 2 + 5 + i * 10 + (r % 2) * 5; if (f > len / 2 - 4) continue; G.box('burlap', x + f * c - 5, y + f * s - 5, z + r * 5, x + f * c + 5, y + f * s + 5, z + r * 5 + 5.5, { solid: false }); }
  G.collider([x - Math.abs(c) * len / 2 - Math.abs(s) * 5, y - Math.abs(s) * len / 2 - Math.abs(c) * 5, z, x + Math.abs(c) * len / 2 + Math.abs(s) * 5, y + Math.abs(s) * len / 2 + Math.abs(c) * 5, z + rows * 5.5], { impact: 'cloth' });
};
/** a bridge deck across a canal (along y), with parapets */
KIT.bridge = (G, x, y0, y1, z, w = 30, mat = 'stone') => {
  G.box(mat, x - w / 2, y0, z - 6, x + w / 2, y1, z, { solid: true }); G.box(mat, x - w / 2, y0, z, x - w / 2 + 3, y1, z + 12); G.box(mat, x + w / 2 - 3, y0, z, x + w / 2, y1, z + 12);
};

// ---- 40-story.js ----
/* 40-story: the cast (def('speaker', ...): name, color, rig, voice), the cutscene runner (camera keys, actors, lines
 * that wait for their voice or a press, hold to skip), radio lines, briefings. Cutscenes run on the Sim's clock and
 * headless (lines time out by their voice's length), so tests can play them to the end. */
const SPK = (id, s) => def('speaker', id, s);
SPK('kai', { name: 'KAI', color: '#ff6a5a', voice: { base: 150, wave: 'sawtooth', rate: 11 }, rig: { build: 'heroic', size: 1.05, weapon: 'gun', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { coat: '#2e3038', cloth: '#e8e4dc', pants: '#24262e', trim: '#c8282a', hair: '#141218', skin: '#c8906a', boot: '#141414' } } });
SPK('rook', { name: 'ROOK', color: '#5a9aff', voice: { base: 105, wave: 'sawtooth', rate: 9, fx: 'gravel' }, rig: { build: 'bulky', size: 1.1, weapon: 'shotgun', outfit: 'coat', hair: 'bald', colors: { coat: '#5a3a24', cloth: '#2e5a9a', pants: '#2e2a26', skin: '#e0b090', boot: '#2a1a10' } } });
SPK('mari', { name: 'MARI', color: '#5ad17a', voice: { base: 230, wave: 'square', rate: 12 }, rig: { build: 'heroic', size: 1, weapon: 'gun', outfit: 'coat', hair: 'ponytail', colors: { coat: '#ff7a2a', cloth: '#f4f0e8', trim: '#22a05a', pants: '#2a3446', hair: '#3a2018', skin: '#c89a74' } } });
SPK('juno', { name: 'JUNO', color: '#ffd34a', voice: { base: 200, wave: 'square', rate: 13, fx: 'radio' }, rig: { build: 'chibi', size: 1, weapon: null, hair: 'spiky', hat: { style: 'band', color: '#f5b700' }, colors: { cloth: '#3a4a6a', pants: '#2a2e3a', hair: '#2ac8b8', skin: '#e8c0a0' } } });
SPK('hale', { name: 'DIRECTOR HALE', color: '#c8d4e8', voice: { base: 175, wave: 'triangle', rate: 10, fx: 'radio' }, rig: { build: 'heroic', weapon: null, outfit: 'coat', hair: 'long', colors: { coat: '#5a6070', cloth: '#2a2e3a', hair: '#d8dce4', skin: '#d8a888' } } });
SPK('tejada', { name: 'DR. TEJADA', color: '#9ae8ff', voice: { base: 140, wave: 'triangle', rate: 9 }, rig: { build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#e8e8e0', cloth: '#6a8aaa', pants: '#4a4a52', hair: '#b8b8b8', skin: '#b8865e' } } });
SPK('krake', { name: 'ADMIRAL KRAKE', color: '#ff4a4a', voice: { base: 95, wave: 'sawtooth', rate: 8, fx: 'boom' }, rig: { build: 'heroic', size: 1.15, weapon: 'cutlass', outfit: 'coat', hair: 'long', cape: { len: 7, width: 5, seg: 2.5 }, hat: { style: 'cap', color: '#1a2240' }, colors: { coat: '#1e2a4a', cloth: '#14182a', trim: '#e8c040', cape: '#1a1e30', capeIn: '#8a1a1a', hair: '#e8e8f0', pants: '#14182a', skin: '#d0a080', metal: '#d8dce4', hilt: '#e8c040' } } });
SPK('barracuda', { name: 'BARRACUDA', color: '#3ae8d8', voice: { base: 210, wave: 'square', rate: 13 }, rig: { build: 'heroic', size: 1.05, weapon: 'harpoon', armor: true, hair: 'ponytail', colors: { cloth: '#1a6a6a', plate: '#2a3a44', pants: '#145050', hair: '#f0f0f0', skin: '#c89a74', metal: '#5a6a74' } } });
SPK('hammerhead', { name: 'HAMMERHEAD', color: '#ff9a3a', voice: { base: 80, wave: 'sawtooth', rate: 6, fx: 'gravel' }, rig: { build: 'bulky', size: 1.6, weapon: 'minigun', armor: true, hat: { style: 'helmet', color: '#4a5058' }, colors: { cloth: '#3a3e44', plate: '#5a6068', pants: '#2a2c30', skin: '#c8906a', metal: '#3a3a40' } } });
SPK('gull', { name: 'THE GULL', color: '#c8ccd8', voice: { base: 190, wave: 'triangle', rate: 10 }, rig: { build: 'heroic', weapon: 'sniper', outfit: 'coat', hood: true, colors: { coat: '#6a7078', cloth: '#4a5056', hair: '#5a6068', pants: '#34383c' } } });
SPK('worker', { name: 'DOCK WORKER', color: '#f2c12e', voice: { base: 130, wave: 'square', rate: 11 }, rig: { build: 'heroic', weapon: null, hat: { style: 'helmet', color: '#f2c12e' }, colors: { cloth: '#ff8a2a', pants: '#3a4a6a' } } });
SPK('fisher', { name: 'FISHERMAN', color: '#f2c12e', voice: { base: 160, wave: 'square', rate: 12 }, rig: { build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#f2c12e' }, colors: { coat: '#f2c12e', pants: '#2a3a5a' } } });
SPK('captor', { name: 'RED TIDE', color: '#ff4a4a', voice: { base: 120, wave: 'sawtooth', rate: 11 }, rig: { build: 'heroic', weapon: 'gun', outfit: 'coat', colors: { coat: '#b81e24' } } });
SPK('hq', { name: 'CREST HQ', color: '#8ab4ff', voice: { base: 170, wave: 'triangle', rate: 11, fx: 'radio' }, rig: { build: 'heroic', weapon: null, colors: { cloth: '#2a3454' } } });
TC.speaker = id => reg('speaker', id);

/* ---- cutscenes ---- */
const CUT = (id, steps, o = {}) => def('cutscene', id, Object.assign({ steps }, o));
TC.CUT = CUT;
/** the length of a line in seconds (the voice's syllables, or a reading time) */
function lineDur(text, who) { const sp = reg('speaker', who), rate = sp && sp.voice ? sp.voice.rate : 10, syl = Math.max(2, (text.match(/[aeiouy]+/gi) || []).length); return Math.max(1.4, syl / rate + .9 + (text.match(/[.!?,...]/g) || []).length * .15); }
TC.lineDur = lineDur;
function startCut(sim, id, onDone) {
  const C = reg('cutscene', id); if (!C) { if (onDone) onDone(); return; }
  sim.cut = { id, C, i: 0, t: 0, wait: 0, line: null, cam: null, camK: null, actors: {}, onDone, skipHold: 0, fx: [] };
  sim.ev({ type: 'cutstart', id });
  cutAdvanceSteps(sim);
}
TC.startCut = startCut;
function cutActor(sim, id, o) {
  const cut = sim.cut; let a = cut.actors[o.as || id];
  if (!a) { const sp = reg('speaker', id); a = cut.actors[o.as || id] = { id, rig: makeRig(sim, Object.assign({}, sp ? sp.rig : {}, o.rig || {})), x: 0, y: 0, z: 0, facing: 0, pose: null, expr: null, point: false }; }
  Object.assign(a, { x: o.at ? o.at[0] : a.x, y: o.at ? o.at[1] : a.y, z: o.at ? o.at[2] || 0 : a.z, facing: o.facing !== undefined ? o.facing * DEG : a.facing, pose: o.pose !== undefined ? o.pose : a.pose, expr: o.expr !== undefined ? o.expr : a.expr, point: o.point !== undefined ? o.point : a.point, hide: !!o.hide });
  if (o.to) { a.from = [a.x, a.y, a.z]; a.to = o.to; a.mt = 0; a.mdur = o.dur || 1.5; }
}
/** run steps until one blocks */
function cutAdvanceSteps(sim) {
  const cut = sim.cut;
  while (cut && cut.i < cut.C.steps.length) {
    const s = cut.C.steps[cut.i++];
    if (s.cam) { const c = s.cam; cut.camK = { from: c.from || cut.cam || c.to, to: c.to || c.from, dur: c.dur || .001, t: 0, ease: c.ease || 'inOut' }; cut.cam = Object.assign({}, cut.camK.from); }
    if (s.actor) cutActor(sim, s.actor, s);
    if (s.fx) { cut.fx.push(s.fx); sim.ev({ type: 'cutfx', fx: s.fx, at: s.at }); }
    if (s.music) sim.ev({ type: 'music', song: s.music });
    if (s.sfx) sim.ev({ type: 'sfx', name: s.sfx });
    if (s.screen !== undefined) cut.screen = s.screen;
    if (s.do) s.do(sim);
    if (s.say) { cut.line = { who: s.say[0], text: s.say[1], t: 0, dur: lineDur(s.say[1], s.say[0]) }; sim.ev({ type: 'line', who: s.say[0], text: s.say[1], cut: true }); return; }
    if (s.wait) { cut.wait = s.wait; return; }
  }
  if (cut && cut.i >= cut.C.steps.length && !cut.line && cut.wait <= 0) endCut(sim);
}
function endCut(sim) { const cut = sim.cut; if (!cut) return; sim.cut = null; sim.ev({ type: 'cutend', id: cut.id }); if (cut.onDone) cut.onDone(); }
function cutStep(sim, dt, cmds) {
  const cut = sim.cut; cut.t += dt;
  if (cut.camK) { const k = cut.camK; k.t += dt; const u = clamp(k.t / k.dur, 0, 1), e = k.ease === 'linear' ? u : smooth(u); cut.cam = { x: lerp(k.from.x, k.to.x, e), y: lerp(k.from.y, k.to.y, e), z: lerp(k.from.z, k.to.z, e), yaw: lerpAng(k.from.yaw, k.to.yaw, e), pitch: lerp(k.from.pitch || 0, k.to.pitch || 0, e), fov: k.to.fov || k.from.fov }; }
  for (const id in cut.actors) {
    const a = cut.actors[id];
    if (a.to) { a.mt += dt; const u = clamp(a.mt / a.mdur, 0, 1); a.vx = (a.to[0] - a.from[0]) / a.mdur; a.vy = (a.to[1] - a.from[1]) / a.mdur; a.x = lerp(a.from[0], a.to[0], u); a.y = lerp(a.from[1], a.to[1], u); a.z = lerp(a.from[2], a.to[2] || 0, u); if (u >= 1) { a.to = null; a.vx = a.vy = 0; } }
    a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing, pose: a.pose, expr: a.expr, point: a.point });
  }
  // presses: confirm advances a line; holding it skips the scene (the presentation passes them as fire)
  const press = cmds.some(c => c && c.firePressed), hold = cmds.some(c => c && c.fireDown);
  cut.skipHold = hold ? cut.skipHold + dt : 0;
  if (cut.skipHold > .6 || cut.skip) { skipCut(sim); return; }
  if (cut.line) { cut.line.t += dt; if (cut.line.t >= cut.line.dur || (press && cut.line.t > .25)) { cut.line = null; sim.ev({ type: 'lineend' }); cutAdvanceSteps(sim); } return; }
  if (cut.wait > 0) { cut.wait -= dt; if (cut.wait <= 0) cutAdvanceSteps(sim); return; }
  cutAdvanceSteps(sim);
}
TC.cutStep = cutStep;
/** skip to the cutscene's end state */
function skipCut(sim) {
  const cut = sim.cut; if (!cut) return;
  for (; cut.i < cut.C.steps.length; cut.i++) { const s = cut.C.steps[cut.i]; if (s.do) s.do(sim); }
  cut.line = null; sim.ev({ type: 'cutskip', id: cut.id }); endCut(sim);
}
TC.skipCut = skipCut;

// ---- 41-voice.js ----
/* 41-voice: the gibberish voice synth (Animalese / Simlish style). A line splits into syllables (consonants + a
 * vowel); each vowel drives a sawtooth or pulse source through two band-pass formant filters (a 800/1200, e 400/2000,
 * i 300/2300, o 450/800, u 325/700, y 300/1900 Hz); consonants add a short filtered noise by class (plosives click,
 * fricatives hiss, nasals hum, liquids glide). Pitch follows the speaker's base, the sentence's contour (falling at ".",
 * rising at "?", louder and higher in CAPS or with "!") and a per-letter jitter seeded by the text, so the same line
 * always sounds the same. Speaker effects: radio (a narrow band and crackle), boom (low, wide, a short echo), gravel
 * (amplitude buzz). Headless it schedules nothing and returns the line's length. */
const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 1900] };
const Voice = {
  active: 0, barks: 0,
  /** speak a line; returns its duration in seconds */
  say(text, who, o = {}) {
    const sp = reg('speaker', who) || {}, V = Object.assign({ base: 150, wave: 'sawtooth', rate: 10 }, sp.voice || {}, o);
    const syl = Voice.syllables(text), dur = syl.reduce((a, s) => a + s.d, 0);
    const A = TC.game && TC.game.audio, c = A && A.ctx, bus = A && A.bus && A.bus('sfx');
    if (!c || !bus || c.state !== 'running' || (TC.game.audio.muted)) return dur;
    if (Voice.active >= 2 && !o.bark) return dur;
    if (o.bark && Voice.barks >= 4) return dur;
    const out = c.createGain(); out.gain.value = (o.vol || .5) * (o.bark ? .7 : 1);
    let chain = out;
    if (V.fx === 'radio') { const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2800; const sh = c.createWaveShaper(); sh.curve = Voice.curve(2.2); out.connect(hp); hp.connect(lp); lp.connect(sh); chain = sh; }
    else if (V.fx === 'boom') { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; const dl = c.createDelay(); dl.delayTime.value = .11; const fb = c.createGain(); fb.gain.value = .32; out.connect(lp); lp.connect(dl); dl.connect(fb); fb.connect(dl); const mix = c.createGain(); lp.connect(mix); dl.connect(mix); chain = mix; }
    else if (V.fx === 'gravel') { const am = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 38; lg.gain.value = .35; lfo.connect(lg); lg.connect(am.gain); am.gain.value = .7; out.connect(am); lfo.start(); lfo.stop(c.currentTime + dur + .3); chain = am; }
    let panNode = null; if (c.createStereoPanner && o.pan) { panNode = c.createStereoPanner(); panNode.pan.value = clamp(o.pan, -1, 1); chain.connect(panNode); chain = panNode; }
    chain.connect(bus);
    const R = E.rng(hashStr(text + who)), caps = text === text.toUpperCase() && /[A-Z]{3}/.test(text), excl = /!/.test(text), q = /\?\s*$/.test(text);
    let t = c.currentTime + .02;
    if (V.fx === 'radio') Voice.noise(c, out, t, .06, 2400, .12);
    const n = syl.length;
    syl.forEach((s, i) => {
      if (s.pause) { t += s.d; return; }
      const u = i / Math.max(1, n - 1), contour = q ? 1 + .25 * Math.max(0, u - .6) / .4 : 1 - .18 * u, f0 = V.base * contour * (caps || excl ? 1.25 : 1) * (1 + (R() - .5) * .12);
      if (s.c) Voice.cons(c, out, t, s.c, f0);
      Voice.vowel(c, out, t + (s.c ? .015 : 0), s.d * .82, s.v, f0, V.wave, caps ? 1.3 : 1);
      t += s.d;
    });
    if (V.fx === 'radio') Voice.noise(c, out, t, .05, 2000, .1);
    if (o.bark) { Voice.barks++; setTimeout(() => Voice.barks--, dur * 1000 + 100); } else { Voice.active++; setTimeout(() => Voice.active--, dur * 1000 + 100); }
    return dur;
  },
  /** a short random shout ("Hraa!", "Ugh!") with no subtitle */
  bark(who, kind = 'hurt', o = {}) {
    const pools = { hurt: ['Ugh!', 'Gah!', 'Hnk!', 'Oof!'], die: ['Hraaa...', 'Nooo...', 'Agh...'], alert: ['Hey!', 'There!', 'Hraa!'], reload: ['Reloading!', 'Cover me!'], cheer: ['Yeah!', 'Woo!', 'Ha!'] };
    const p = pools[kind] || pools.hurt, R = TC._barkR || (TC._barkR = E.rng(99));
    return Voice.say(p[R() * p.length | 0], who, Object.assign({ bark: true, vol: .35 }, o));
  },
  syllables(text) {
    const out = [], s = text.toLowerCase();
    let i = 0, rate = 1;
    while (i < s.length) {
      const ch = s[i];
      if (/[,;:]/.test(ch)) { out.push({ pause: true, d: .12 }); i++; continue; }
      if (/[.!?]/.test(ch)) { out.push({ pause: true, d: .22 }); i++; while (/[.!?]/.test(s[i] || '')) i++; continue; }
      if (!/[a-z]/.test(ch)) { i++; continue; }
      let cons = ''; while (i < s.length && /[bcdfghjklmnpqrstvwxz]/.test(s[i])) cons += s[i++];
      let vow = ''; while (i < s.length && /[aeiouy]/.test(s[i])) vow += s[i++];
      if (!vow) { if (cons) out.push({ c: cons[0], v: 'u', d: .05 * rate }); continue; }
      out.push({ c: cons ? cons[cons.length - 1] : '', v: vow[0], d: (.055 + vow.length * .018) * rate });
    }
    return out;
  },
  vowel(c, out, t, d, v, f0, wave, loud) {
    const o = c.createOscillator(), g = c.createGain(), F = FORM[v] || FORM.a;
    o.type = wave === 'square' ? 'square' : wave === 'triangle' ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * .94, t + d);
    const mix = c.createGain(); mix.gain.value = 1;
    for (const [f, q, k] of [[F[0], 6, .9], [F[1], 8, .55]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = c.createGain(); bg.gain.value = k * 2.2; o.connect(b); b.connect(bg); bg.connect(mix); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42 * loud, t + .012); g.gain.setValueAtTime(.42 * loud, t + d * .7); g.gain.linearRampToValueAtTime(0, t + d);
    mix.connect(g); g.connect(out); o.start(t); o.stop(t + d + .02);
  },
  cons(c, out, t, ch, f0) {
    if ('ptkbdgc'.includes(ch)) Voice.noise(c, out, t, .012, 'pb'.includes(ch) ? 700 : 'td'.includes(ch) ? 2600 : 1600, .35);
    else if ('sfhzxj'.includes(ch)) Voice.noise(c, out, t, .04, ch === 's' || ch === 'z' ? 5200 : ch === 'f' ? 3600 : 2400, .22);
    else if ('mn'.includes(ch)) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f0 * .98; g.gain.setValueAtTime(.2, t); g.gain.linearRampToValueAtTime(0, t + .03); o.connect(g); g.connect(out); o.start(t); o.stop(t + .04); }
  },
  noise(c, out, t, d, f, k) {
    const A = TC.game.audio, src = c.createBufferSource(); src.buffer = A._noise; const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 1.4; const g = c.createGain();
    g.gain.setValueAtTime(k, t); g.gain.exponentialRampToValueAtTime(.001, t + d); src.connect(b); b.connect(g); g.connect(out); src.start(t, (t * 7.3) % .5); src.stop(t + d + .02);
  },
  curve(k) { const n = 256, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; a[i] = Math.tanh(x * k) / Math.tanh(k); } return a; }
};
TC.Voice = Voice;

// ---- 42-audio.js ----
/* 42-audio: every sound in code. Songs on the engine's tracker (def('song', id, ...)), named tracks so the drums and
 * the lead come in during ACTION and drop out during WAIT, stings; SFX as voice lists played through a stereo panner
 * into the engine's sfx bus (so the volume settings apply), panned by screen x and quieter with distance, at most 24
 * at once; per-stage ambience (crowd, rain, sluices) as small Web Audio graphs. Headless: nothing plays. */
const rep = (s, n) => Array(n).fill(s).join(' | ');
const SONG = (id, s) => def('song', id, s);
SONG('theme', { bpm: 140, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .13, notes: 'D5 - F5 - A5 - D6 - C6 - A5 - F5 - G5 - | A5 - - - - - G5 F5 E5 - F5 - G5 - - - | D5 - F5 - A5 - D6 - E6 - D6 - C6 - A5 - | Bb5 - A5 - G5 - E5 - F5 - - - D5 - - -' },
  { name: 'arp', wave: 'square', vol: .05, notes: rep('D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4', 1) + ' | ' + rep('Bb3 D4 F4 D4 Bb3 D4 F4 D4 A3 C#4 E4 C#4 A3 C#4 E4 C#4', 1) + ' | ' + rep('D4 F4 A4 F4 D4 F4 A4 F4 C4 E4 G4 E4 C4 E4 G4 E4', 1) + ' | ' + 'G3 Bb3 D4 Bb3 G3 Bb3 D4 Bb3 A3 C#4 E4 C#4 A3 C#4 E4 A4' },
  { name: 'bass', wave: 'saw', vol: .1, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 A1 A2 A1 A2 | D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 | G1 G2 G1 G2 G1 G2 G1 G2 A1 A2 A1 A2 A1 A2 C#2 C#3' },
  { name: 'drums', wave: 'drums', vol: .15, notes: 'k . h . s . h k k . h . s . h h' }] });
SONG('briefing', { bpm: 92, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .16, notes: 'D4 - - - - - - - F4 - - - - - - - | C4 - - - - - - - E4 - - - - - - - | Bb3 - - - - - - - D4 - - - - - - - | A3 - - - - - - - C#4 - - - - - - -' },
  { name: 'pulse', wave: 'pulse12', vol: .05, notes: 'A4 . . . A4 . . . A4 . . . A4 . A4 .' },
  { name: 'bass', wave: 'triangle', vol: .28, notes: 'D2 - . . D2 - . . C2 - . . C2 - . . | Bb1 - . . Bb1 - . . A1 - . . A1 - . .' },
  { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . . . h . k . h . . . h h' }] });
SONG('harbor', { bpm: 150, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .1, on: false, notes: 'A5 - . A5 G5 - E5 - D5 - E5 - G5 - - - | A5 - . C6 B5 - A5 - G5 - E5 - D5 - - - | E5 - . E5 G5 - A5 - C6 - B5 - A5 - G5 - | A5 - G5 - E5 - D5 - E5 - - - - - . .' },
  { name: 'comp', wave: 'pulse', vol: .06, notes: '. . A4 . . A4 . . . . G4 . . G4 . . | . . F4 . . F4 . . . . E4 . . E4 . .' },
  { name: 'bass', wave: 'triangle', vol: .32, notes: 'A2 . . A2 . . A3 . F2 . . F2 . . F3 . | G2 . . G2 . . G3 . E2 . . E2 . . E3 .' },
  { name: 'drums', wave: 'drums', vol: .15, on: false, notes: 'k . c h s . c . k c . h s . c h' },
  { name: 'shaker', wave: 'drums', vol: .07, notes: 'h h t h h h t h h h t h h h t h' }] });
SONG('storm', { bpm: 160, steps: 4, tracks: [
  { name: 'lead', wave: 'saw', vol: .08, on: false, notes: 'E5 - - - G5 - F#5 - E5 - B4 - - - - - | C5 - - - D5 - E5 - F#5 - D5 - - - - - | E5 - - - G5 - A5 - B5 - A5 - G5 - F#5 - | E5 - D#5 - E5 - F#5 - E5 - - - - - . .' },
  { name: 'bass', wave: 'square', vol: .1, notes: 'E2 E2 E3 E2 E2 E3 E2 E3 E2 E2 E3 E2 E2 E3 E2 E3 | C2 C2 C3 C2 C2 C3 C2 C3 D2 D2 D3 D2 D2 D3 D2 D3' },
  { name: 'pad', wave: 'triangle', vol: .14, notes: 'B3 - - - - - - - - - - - - - - - | G3 - - - - - - - A3 - - - - - - -' },
  { name: 'drums', wave: 'drums', vol: .16, on: false, notes: 'k . k s . k s . k . k s . k s o' }] });
SONG('tidewall', { bpm: 155, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .12, on: false, notes: 'C5 - - G4 C5 - D5 - Eb5 - - - D5 - C5 - | Bb4 - - F4 Bb4 - C5 - D5 - - - Eb5 - F5 - | G5 - - - F5 - Eb5 - D5 - Eb5 - F5 - - - | G5 - Ab5 - G5 - F5 - G5 - - - - - . .' },
  { name: 'arp', wave: 'square', vol: .05, notes: 'C4 Eb4 G4 C5 C4 Eb4 G4 C5 Bb3 D4 F4 Bb4 Bb3 D4 F4 Bb4 | Ab3 C4 Eb4 Ab4 Ab3 C4 Eb4 Ab4 G3 B3 D4 G4 G3 B3 D4 G4' },
  { name: 'bass', wave: 'saw', vol: .09, notes: 'C2 C2 C3 C2 C2 C3 C2 C3 Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2 | Ab1 Ab1 Ab2 Ab1 Ab1 Ab2 Ab1 Ab2 G1 G1 G2 G1 G1 G2 G1 G2' },
  { name: 'drums', wave: 'drums', vol: .16, on: false, notes: 'k . h k s . h . k k h . s . h s' }] });
SONG('bossfight', { bpm: 170, steps: 4, tracks: [
  { name: 'lead', wave: 'saw', vol: .09, notes: 'E5 E5 . E5 G5 - E5 . F#5 F#5 . F#5 A5 - F#5 . | G5 G5 . G5 B5 - G5 . A5 - G5 - F#5 - D#5 - | E5 E5 . E5 G5 - E5 . F#5 F#5 . F#5 A5 - B5 . | C6 - B5 - A5 - G5 - F#5 - E5 - D#5 - B4 -' },
  { name: 'bass', wave: 'square', vol: .1, notes: 'E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 | C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 D#2 D#3' },
  { name: 'stab', wave: 'pulse', vol: .06, notes: 'B4 . . B4 . . B4 . A4 . . A4 . . A4 . | G4 . . G4 . . G4 . F#4 . . F#4 . . F#4 .' },
  { name: 'drums', wave: 'drums', vol: .17, notes: 'k h s h k k s h k h s h k s s s' }] });
SONG('kingtide', { bpm: 165, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .12, notes: 'D5 - - - A5 - - - G5 - F5 - E5 - F5 - | D5 - - - Bb5 - - - A5 - G5 - F5 - E5 - | D5 - - - A5 - - - D6 - C6 - Bb5 - A5 - | G5 - A5 - Bb5 - C6 - C#6 - - - - - . .' },
  { name: 'counter', wave: 'saw', vol: .05, notes: 'A4 - - - D5 - - - C5 - - - A4 - - - | Bb4 - - - D5 - - - C5 - - - Bb4 - - -' },
  { name: 'bass', wave: 'saw', vol: .1, notes: 'D2 D3 D2 D3 D2 D3 D2 D3 F2 F3 F2 F3 C2 C3 C2 C3 | Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 A1 A2 A1 A2' },
  { name: 'drums', wave: 'drums', vol: .17, notes: 'k . s k k . s . k k s . k s s o' }] });
SONG('range', { bpm: 118, steps: 4, tracks: [
  { name: 'lead', wave: 'square', vol: .08, notes: 'E5 . G5 . A5 . . G5 E5 . D5 . E5 - - - | . . G5 . A5 . C6 . A5 . G5 . E5 - - -' },
  { name: 'bass', wave: 'triangle', vol: .3, notes: 'E2 . E3 . . E2 G2 . A2 . A3 . . A2 G2 . | C2 . C3 . . C2 D2 . E2 . E3 . D3 . B2 .' },
  { name: 'drums', wave: 'drums', vol: .14, notes: 'k . h . s . h k . k h . s . h h' }] });
SONG('results', { bpm: 120, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .1, notes: 'C5 - E5 - G5 - E5 - F5 - A5 - G5 - - - | E5 - G5 - C6 - B5 - A5 - G5 - E5 - - -' },
  { name: 'bass', wave: 'triangle', vol: .3, notes: 'C3 . G2 . C3 . G2 . F2 . C3 . G2 . D3 . | A2 . E2 . A2 . E2 . F2 . G2 . C3 . G2 .' },
  { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h . k . h . s . h .' }] });
SONG('ending', { bpm: 84, steps: 4, tracks: [
  { name: 'lead', wave: 'triangle', vol: .2, notes: 'D5 - - - F5 - - - A5 - - - D6 - - - | C6 - - - A5 - - - G5 - F5 - G5 - - - | A5 - - - - - - - G5 - F5 - E5 - - - | F5 - - - E5 - - - D5 - - - - - - -' },
  { name: 'pad', wave: 'pulse12', vol: .05, notes: 'F4 - - - - - - - E4 - - - - - - - | D4 - - - - - - - C#4 - - - - - - -' },
  { name: 'bass', wave: 'triangle', vol: .26, notes: 'D3 - - - - - - - C3 - - - - - - - | Bb2 - - - - - - - A2 - - - - - - -' }] });
SONG('continue', { bpm: 120, steps: 4, tracks: [
  { name: 'lead', wave: 'pulse', vol: .1, notes: 'A4 . A4 . A4 . A4 . G#4 . G#4 . G#4 . G#4 . | G4 . G4 . G4 . G4 . F#4 . F#4 . F4 - - -' },
  { name: 'bass', wave: 'triangle', vol: .3, notes: 'A2 - - - - - - - E2 - - - - - - -' }] });
SONG('clear', { bpm: 150, steps: 4, loop: false, tracks: [
  { wave: 'square', vol: .16, notes: 'G4 . C5 . E5 . G5 - - - E5 - G5 - - - C6 - - - - - - - . . . .' },
  { wave: 'triangle', vol: .3, notes: 'C3 . C3 . C3 . C3 - - - G2 - C3 - - - C3 - - - - - - - . . . .' },
  { wave: 'drums', vol: .14, notes: 'k . . . k . . . k . s . k . s s k . . . . . . .' }] });
SONG('gameover', { bpm: 90, steps: 4, loop: false, tracks: [
  { wave: 'triangle', vol: .2, notes: 'A4 - - - G#4 - - - G4 - - - F#4 - - - F4 - - - - - - - . .' },
  { wave: 'pulse12', vol: .06, notes: 'A3 - - - - - - - - - - - - - - - D3 - - - - - - - . .' }] });
SONG('extend', { bpm: 200, steps: 4, loop: false, tracks: [{ wave: 'pulse', vol: .12, notes: 'C5 E5 G5 C6 - - . .' }] });
SONG('bossintro', { bpm: 120, steps: 4, loop: false, tracks: [{ wave: 'saw', vol: .1, notes: 'E3 - E3 - E3 - F3 - F3 - - - E3 - - - - - . .' }, { wave: 'drums', vol: .2, notes: 'k . k . k . k . s s s s k . . . . . . .' }] });

/* ---- SFX: voice lists ---- */
const N = (freq, to, dur, vol, o = {}) => Object.assign({ wave: 'noise', freq, to, dur, vol, filter: o.filter || 'bandpass', q: o.q || 1 }, o);
const W = (wave, freq, to, dur, vol, o = {}) => Object.assign({ wave, freq, to, dur, vol }, o);
const SFX = {
  hg: [N(2200, 400, .1, .45, { filter: 'lowpass', q: .7 }), W('square', 200, 60, .07, .2), W('sine', 110, 40, .12, .45)],
  mg: [N(2600, 600, .06, .34, { filter: 'lowpass', q: .7 }), W('square', 150, 60, .045, .14), W('sine', 90, 40, .07, .3)],
  sg: [N(1400, 120, .32, .6, { filter: 'lowpass', q: .6 }), W('sine', 75, 28, .28, .6), N(4200, 900, .07, .3, { delay: .015 }), N(900, 600, .05, .2, { delay: .32 }), W('square', 300, 200, .04, .1, { delay: .34 })],
  gl: [W('sine', 170, 50, .22, .55), N(900, 200, .16, .3, { filter: 'lowpass' }), W('square', 600, 300, .05, .08)],
  empty: [W('square', 1500, 1400, .02, .16), W('square', 900, 880, .02, .12, { delay: .035 })],
  reload: [N(3000, 2000, .03, .22), W('square', 600, 300, .05, .1, { delay: .05 }), N(2000, 1500, .04, .26, { delay: .16 }), W('square', 300, 700, .04, .14, { delay: .19 })],
  switch: [W('square', 500, 900, .05, .1), N(2500, 2000, .03, .16, { delay: .04 })],
  coverin: [N(700, 220, .14, .26, { filter: 'lowpass' }), W('sine', 120, 55, .1, .28, { delay: .07 })],
  coverout: [N(700, 1700, .1, .18)],
  whizz: [N(3200, 700, .2, .22, { q: 4 })],
  ricochet: [W('square', 2600, 1200, .1, .08), W('sine', 3200, 2500, .22, .09)],
  imp_metal: [N(4200, 3000, .05, .22), W('square', 1900, 900, .05, .08)],
  imp_wood: [N(900, 500, .06, .3, { filter: 'lowpass' }), W('square', 160, 100, .04, .08)],
  imp_stone: [N(1600, 800, .05, .24)],
  imp_water: [N(600, 2200, .22, .22)],
  imp_glass: [N(6000, 3000, .14, .24), W('sine', 3300, 2000, .1, .1)],
  imp_cloth: [N(700, 400, .05, .18, { filter: 'lowpass' })],
  ehit: [W('square', 320, 140, .06, .16), N(1300, 600, .05, .2)],
  head: [W('sine', 1760, 1760, .26, .22), W('sine', 2637, 2637, .2, .12, { delay: .02 })],
  tick: [W('square', 1700, 1700, .03, .1)],
  chirp: [W('square', 2300, 3200, .07, .16), W('square', 1150, 1600, .07, .08)],
  timetick: [W('square', 1050, 1050, .03, .08)],
  timewarn: [W('pulse', 880, 880, .06, .12), W('pulse', 880, 880, .06, .12, { delay: .1 })],
  tidesin: [W('saw', 420, 90, .7, .26), N(500, 120, .9, .4, { filter: 'lowpass' })],
  pickup: [W('pulse', 880, 880, .22, .18, { arp: [0, 7, 12], step: .06 })],
  oneup: [W('pulse', 660, 660, .42, .2, { arp: [0, 4, 7, 12, 16, 19, 24], step: .05 })],
  newweapon: [W('square', 440, 440, .34, .16, { arp: [0, 5, 9, 12, 17], step: .06 })],
  boom: [N(900, 50, 1.3, .7, { filter: 'lowpass', q: .6 }), W('sine', 58, 26, 1.1, .7), N(3200, 400, .3, .3, { delay: .02 })],
  boom_s: [N(1300, 90, .55, .5, { filter: 'lowpass', q: .6 }), W('sine', 75, 34, .45, .5)],
  bounce: [W('square', 320, 280, .03, .1)],
  rocket: [N(2200, 500, .9, .26, { q: 2 })],
  twang: [W('saw', 240, 100, .3, .2), W('square', 480, 200, .1, .06)],
  hiss: [N(1500, 1100, 1.1, .18, { q: 3 })],
  pop: [W('square', 900, 300, .15, .14), N(3000, 1500, .1, .16)],
  spinup: [W('saw', 110, 950, .9, .14), N(2000, 4000, .9, .1, { q: 3 })],
  stomp: [W('sine', 62, 28, .32, .6), N(320, 100, .22, .3, { filter: 'lowpass' })],
  servo: [W('saw', 240, 420, .25, .06)],
  glass: [N(6400, 3000, .3, .3), W('sine', 3700, 3500, .15, .1), W('sine', 4900, 4700, .1, .08, { delay: .05 })],
  wood: [N(650, 300, .2, .38, { filter: 'lowpass' }), W('square', 210, 90, .1, .14)],
  ui_move: [W('square', 900, 900, .028, .08)],
  ui_ok: [W('pulse', 660, 660, .12, .14, { arp: [0, 7], step: .05 })],
  ui_back: [W('pulse', 520, 330, .1, .12)],
  stamp: [N(320, 120, .22, .5, { filter: 'lowpass' }), W('sine', 95, 45, .22, .5)],
  count: [W('square', 1400, 1400, .018, .05)],
  hurt: [W('saw', 320, 80, .28, .3), N(900, 300, .2, .3), W('sine', 70, 40, .3, .4)],
  blocked: [W('square', 2900, 2000, .06, .12), N(5200, 4000, .04, .14)],
  slash: [N(3400, 700, .16, .3, { q: 2 })],
  thunder: [N(220, 50, 2.2, .55, { filter: 'lowpass', q: .5 }), W('sine', 45, 30, 1.6, .3)],
  splash: [N(1300, 300, .45, .3)],
  action: [W('pulse', 523, 523, .32, .18, { arp: [0, 7, 12, 19], step: .07 })],
  engine: [W('saw', 60, 90, 1.2, .14), N(300, 500, 1.2, .2, { filter: 'lowpass' })],
  firework: [W('square', 300, 1400, .4, .05), N(2400, 300, .5, .3, { delay: .4 }), W('sine', 80, 40, .4, .3, { delay: .4 })],
  laser: [W('sine', 2200, 2400, .5, .05, { vib: [30, .02] })],
  zap: [W('saw', 1600, 300, .12, .14)],
  minigun: [N(2400, 800, .05, .32), W('square', 130, 70, .04, .14)],
  rotor: [N(200, 160, .3, .3, { filter: 'lowpass' })],
  lever: [W('square', 200, 120, .4, .2), N(400, 200, .4, .3, { filter: 'lowpass' })],
  gong: [W('sine', 220, 218, 1.6, .3), W('sine', 330, 328, 1.2, .14)]
};
TC.SFX = SFX;
const Audio3 = {
  live: 0,
  /** play a sound by name: o = { vol, pan (-1..1), pitch, at (world point: pan and distance from the listener) } */
  play(name, o = {}) {
    const A = TC.game && TC.game.audio; if (!A || HEADLESS) return;
    const c = A.ctx; if (!c || c.state !== 'running' || A.muted) return;
    const p = SFX[name]; if (!p) return;
    let vol = o.vol === undefined ? 1 : o.vol, pan = o.pan || 0;
    if (o.at && TC.listener) { const L = TC.listener, d = Math.hypot(o.at[0] - L.x, o.at[1] - L.y, o.at[2] - L.z); vol *= 1 / (1 + d / 240); const a = Math.atan2(o.at[1] - L.y, o.at[0] - L.x) - L.yaw; pan = clamp(Math.sin(a), -1, 1) * .8; }
    if (vol < .03) return;
    if (Audio3.live >= 24 && vol < .6) return;
    const last = Audio3._last || (Audio3._last = {}), now = c.currentTime; if (last[name] && now - last[name] < .03) return; last[name] = now;
    const bus = A.bus('sfx'); let out = bus;
    if (c.createStereoPanner && pan) { out = c.createStereoPanner(); out.pan.value = pan; out.connect(bus); }
    const mul = (o.pitch || 1) * (1 + ((now * 997) % 1 - .5) * .04);
    try { for (const v of p) A._voice(Object.assign({}, v, { vol: (v.vol === undefined ? .3 : v.vol) * vol }), out, now + .005, mul); } catch (e) { /* audio busy */ }
    Audio3.live++; setTimeout(() => Audio3.live--, 400);
  },
  /** music by id, crossfaded */
  music(id, o = {}) { const A = TC.game && TC.game.audio; if (!A) return; const s = id && reg('song', id); if (A.song && A.song.src === s) return; A.music(s || null, Object.assign({ fade: .8 }, o)); Audio3.songId = id; },
  layer(name, v, f = .6) { const A = TC.game && TC.game.audio; if (A && A.song && A.song.tracks.some(t => t.name === name)) A.layer(name, v, f); },
  sting(id) { const A = TC.game && TC.game.audio; const s = reg('song', id); if (A && s) A.sting(s, { at: 'now' }); },
  /* ---- ambience: a looping graph per stage ---- */
  amb: null,
  ambience(kind) {
    const A = TC.game && TC.game.audio, c = A && A.ctx; if (Audio3.amb) { try { Audio3.amb.stop(); } catch (e) { /* gone */ } Audio3.amb = null; }
    if (!c || HEADLESS || !kind || !A._noise) return;
    const bus = A.bus('sfx'), g = c.createGain(); g.gain.value = 0; g.connect(bus); g.gain.linearRampToValueAtTime(kind === 'storm' ? .32 : .18, c.currentTime + 1.5);
    const src = c.createBufferSource(); src.buffer = A._noise; src.loop = true; const f = c.createBiquadFilter();
    f.type = kind === 'storm' ? 'highpass' : 'lowpass'; f.frequency.value = kind === 'storm' ? 1800 : kind === 'sluice' ? 500 : 900; src.connect(f); f.connect(g); src.start();
    let hum = null; if (kind === 'sluice' || kind === 'turbine') { hum = c.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 55; const hg = c.createGain(); hg.gain.value = .05; hum.connect(hg); hg.connect(g); hum.start(); }
    Audio3.amb = { stop() { g.gain.linearRampToValueAtTime(0, c.currentTime + .5); src.stop(c.currentTime + .6); if (hum) hum.stop(c.currentTime + .6); } };
  }
};
TC.Audio3 = Audio3;

// ---- 43-cuts.js ----
/* 36-cuts: every story beat: Stage 1's briefing and objectives, and the stage intros and outros as cutscenes (camera
 * moves, actors, lines; press to advance, hold to skip). Original lines in the source's earnest B-movie style. */
const PZ = (x, y, z, yaw, pitch = 0, fov) => ({ x, y, z, yaw: yaw * DEG, pitch: pitch * DEG, fov: fov || 55 });
Object.assign(reg('stage', 1), {
  objectives: ['Land at Lantern Pier', 'Push through the fish market', 'Find Krake\'s signal', 'Stop the gunboat Stingray'],
  briefing: [['hale', 'Agents. Two hours ago the Black Current seized Port Lumen\'s harbor and the Tidewall.'], ['hale', 'Their leader is Silas Krake. A disgraced admiral with a grudge the size of an ocean.'], ['juno', "He'll open the floodgates at dawn. King tide. The whole city goes under."], ['hale', 'You have until 06:00. Land at Lantern Pier. Find his signal. End this.'], ['kai', 'Understood. CREST is on it.']]
});
CUT('c1-intro', [
  { music: 'harbor' }, { cam: { from: PZ(-760, -260, 70, 22, -6), to: PZ(-430, -40, 34, 8, -2), dur: 6 } },
  { actor: 'kai', at: [-318, -14, 0], facing: 0 }, { actor: 'rook', at: [-322, 12, 0], facing: 0, pose: 'hips' }, { actor: 'mari', at: [-306, 30, 0], facing: 340 },
  { fx: 'fireworks', at: [-260, 280, 60] },
  { say: ['mari', 'Hang on! Lumen Coast Guard express. Next stop, trouble!'] },
  { cam: { from: PZ(-262, 4, 28, 180, -4), to: PZ(-270, 2, 26, 180, -3), dur: 8 } }, { screen: true },
  { say: ['krake', 'Citizens of Port Lumen! Enjoy your lanterns. They are the last lights you will see.'] },
  { say: ['krake', 'At dawn the king tide comes, and I open every gate. The sea takes back what you stole!'] }, { screen: false },
  { say: ['rook', 'Charming guy.'] }, { actor: 'kai', expr: 'smile' }, { say: ['kai', "Let's make some waves."] }, { say: ['rook', 'Kid, you say that every mission.'] }
]);
CUT('c1-outro', [
  { cam: { from: PZ(5050, 240, 70, 205, -6), to: PZ(5120, 200, 60, 210, -4), dur: 8 } }, { fx: 'explosion', at: [5000, 120, 0] },
  { say: ['juno', "Krake's signal is coming from Lighthouse Point."] }, { say: ['mari', "Gull's Rest. They've held my father there since yesterday."] },
  { say: ['kai', "Then that's where we're going."] }, { say: ['rook', 'Into a storm. Naturally.'] }
]);
CUT('c2-intro', [
  { music: 'storm' }, { cam: { from: PZ(-320, 140, 60, -6, 14), to: PZ(-260, 90, 40, -4, 12), dur: 5 } }, { fx: 'flash' },
  { actor: 'kai', at: [-150, -16, 0], facing: 0 }, { actor: 'rook', at: [-156, 10, 0], facing: 0 }, { actor: 'mari', at: [-140, 26, 0], facing: 10 },
  { say: ['krake', 'Hammerhead. No one reaches the lamp.'] }, { say: ['hammerhead', 'NOBODY. PASSES. HAMMERHEAD.'] },
  { cam: { from: PZ(-110, 4, 26, 180, -4), to: PZ(-116, 2, 26, 180, -4), dur: 6 } },
  { say: ['rook', 'He talks in capital letters.'] }, { say: ['mari', 'Papa is up there. Let\'s move.'] }
]);
CUT('c2-outro', [
  { cam: { from: PZ(1600, 60, 570, 210, -6), to: PZ(1596, 50, 566, 214, -6), dur: 9 } },
  { actor: 'tejada', at: [1540, 8, 544], facing: 20 }, { actor: 'mari', at: [1548, 22, 544], facing: 200, pose: 'wave' }, { actor: 'kai', at: [1530, -14, 544], facing: 30 }, { actor: 'rook', at: [1522, 30, 544], facing: 0, pose: 'hips' },
  { say: ['tejada', 'The override is in the Tidewall control tower. At the peak, Krake opens every gate.'] },
  { say: ['juno', 'Forty minutes to dawn. The maintenance tram can get you there.'] }, { say: ['kai', "Then let's catch a ride."] }
]);
CUT('c3-intro', [
  { music: 'tidewall' }, { cam: { from: PZ(-420, -90, 46, 8, -4), to: PZ(-170, -40, 30, 4, -2), dur: 7 } },
  { actor: 'kai', at: [-60, -10, 0], facing: 0 }, { actor: 'rook', at: [-66, 12, 0], facing: 0 }, { screen: true },
  { say: ['krake', 'Look at the sea, CREST. It rises for me.'] }, { say: ['krake', 'At dawn, Port Lumen returns to the deep!'] }, { screen: false },
  { cam: { from: PZ(-20, 0, 26, 180, -4), to: PZ(-24, 0, 26, 180, -4), dur: 6 } },
  { say: ['kai', 'Not on our watch.'] }, { say: ['rook', 'Did you rehearse that?'] }, { say: ['kai', '...Maybe.'] }
]);
CUT('c3-outro', [
  { music: 'ending' }, { cam: { from: PZ(1420, 40, TW.roof + 40, 0, -4), to: PZ(1440, 30, TW.roof + 34, -10, -4), dur: 12 } },
  { actor: 'krake', at: [1560, -10, TW.roof], facing: 180, pose: 'kneel', expr: 'angry' }, { actor: 'mari', at: [1530, -20, TW.roof], facing: 0, point: true }, { actor: 'kai', at: [1520, 10, TW.roof], facing: 190 }, { actor: 'rook', at: [1512, 30, TW.roof], facing: 200, pose: 'hips' },
  { say: ['juno', 'All forty gates closing! You did it!'] }, { say: ['mari', "Silas Krake, you're under arrest by the Lumen Coast Guard."] },
  { say: ['krake', 'The tide will turn again.'] }, { say: ['rook', "Twice a day. It's called science."] },
  { say: ['hale', 'Outstanding work, agents. Port Lumen owes you its dawn.'] }, { actor: 'kai', expr: 'smile' },
  { say: ['kai', 'Tell the festival to save us some lanterns.'] }, { say: ['rook', 'Kid. No puns at the debriefing.'] }, { say: ['kai', 'No promises.'] }
]);

// ---- 50-hud.js ----
/* 50-hud: the canvas pixel HUD, per viewport, sized for a TV at 10 feet (key numbers at scale 2-3, nothing under
 * scale 1). TIME (a rising-tide plate) at the top, SCORE and the chain top left, LIFE badges bottom left, the weapon
 * panel bottom right, the reticle, hit markers, crisis-flash rings (shape, sound and an edge arrow, never color
 * alone), big calls (ACTION!, WAIT, TIDE'S IN!, TIME EXTEND), score popups, pickup banners, the radio box with a live
 * portrait, device-aware prompts, boss bars, the continue count. Prompts come from the player's own bindings. */
const F = E.font, px = E.px;
const txt = (g, s, x, y, c, o = {}) => F.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
TC.txt = txt;
const ICON = {
  hg: E.sprite(['..........', '.ggggggg..', '.gGGGGGGg.', '.gggg.....', '.gg.......', '.gg.......'], { g: '#8a92a0', G: '#d8dce4' }, 2),
  mg: E.sprite(['..............', 'gggggggggggg..', 'gGGGGGGGGGGGgg', 'gggg.ggg......', '.gg..gg.......', '.gg...........'], { g: '#7a828e', G: '#d8dce4' }, 2),
  sg: E.sprite(['..............', 'wwwgggggggggg.', 'wwwGGGGGGGGGGg', 'ww..gggg......', 'w.............'], { g: '#7a828e', G: '#d8dce4', w: '#8a5a32' }, 2),
  gl: E.sprite(['............', '.ggggggggg..', 'gGGGGGGGGGGg', 'gGGGGGGGGGGg', '.gggg.gg....', '..gg..gg....'], { g: '#5a6a4a', G: '#a8b88a' }, 2),
  badge: E.sprite(['.rrrrr.', 'rRRRRRr', 'rRwwwRr', 'rRRwRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#7a1a1a', R: '#e8443a', w: '#ffffff' }, 2),
  badgeOff: E.sprite(['.rrrrr.', 'r.....r', 'r.....r', 'r.....r', '.r...r.', '..r.r..', '...r...'], { r: '#4a4a5a' }, 2),
  pip: E.sprite(['yy', 'YY', 'YY', 'oo'], { y: '#fff3b0', Y: '#ffb347', o: '#a85a1a' }, 1),
  pipOff: E.sprite(['..', 'dd', 'dd', 'dd'], { d: '#3a3a4a' }, 1),
  ring: E.sprite(['.rrr.', 'rwwwr', 'rwwwr', 'rwwwr', '.rrr.'], { r: '#e8443a', w: '#ffffff' }, 2),
  bottle: E.sprite(['.g.', '.g.', 'ggg', 'gGg', 'ggg'], { g: '#2a8a4a', G: '#8affaa' }, 2)
};
TC.ICON = ICON;
/** a button glyph in a rounded frame: the label of an action on the player's device */
const PS_ICON = { '✕': 'x', '○': 'o', '□': 's', '△': 't' };
/** a PlayStation face-button symbol drawn in pixels (the font has none): 7 x 7 at (x, y), times k */
function psIcon(g, k, x, y, kk = 1) {
  const c = { x: '#7fb2ff', o: '#ff6a6a', s: '#ff8ad8', t: '#5ae0a0' }[k], P = (a, b) => px.rect(g, x + a * kk, y + b * kk, kk, kk, c);
  if (k === 'x') for (let i = 0; i < 7; i++) { P(i, i); P(6 - i, i); }
  else if (k === 'o') for (const [a, b] of [[2, 0], [3, 0], [4, 0], [1, 1], [5, 1], [0, 2], [6, 2], [0, 3], [6, 3], [0, 4], [6, 4], [1, 5], [5, 5], [2, 6], [3, 6], [4, 6]]) P(a, b);
  else if (k === 's') for (let i = 0; i < 7; i++) { P(i, 0); P(i, 6); P(0, i); P(6, i); }
  else for (const [a, b] of [[3, 0], [2, 1], [4, 1], [2, 2], [4, 2], [1, 3], [5, 3], [1, 4], [5, 4], [0, 5], [6, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]]) P(a, b);
}
TC.psIcon = psIcon;
function btn(g, label, x, y, o = {}) {
  const k = o.scale || 1, icon = PS_ICON[label], w = (icon ? 7 * k : F.width(label, { scale: k })) + 8 * k, h = (icon ? 7 : 7) * k + 4 * k, c = o.color || '#f4f7ff', bg = o.bg || '#20304e';
  px.rect(g, x + k, y, w - 2 * k, h, bg); px.rect(g, x, y + k, w, h - 2 * k, bg);
  px.rect(g, x + k, y, w - 2 * k, k, '#5a7ab0'); px.rect(g, x + k, y + h - k, w - 2 * k, k, '#0a1428');
  if (icon) psIcon(g, icon, x + 4 * k, y + 2 * k, k); else txt(g, label, x + 4 * k, y + 2 * k, c, { shadow: false, scale: k });
  return w;
}
TC.btn = btn;
/** a prompt line with [button] glyphs: parts = ['HOLD ', { a: 'cover' }, ' TO TAKE COVER'] */
function promptLine(g, input, parts, x, y, align = 'center', both, k = 1) {
  const fam = TC.promptFamily(input), dev = input.lastDevice;
  const segs = []; let w = 0;
  for (const p of parts) {
    if (typeof p === 'string') { const ww = F.width(p, { scale: k }); segs.push([p, ww]); w += ww; }
    else { const lab = TC.label(input, p.a, fam === 'pad' ? 'gamepad' : (dev === 'mouse' && p.mouse !== false ? 'mouse' : 'keyboard')); const ww = (PS_ICON[lab] ? 7 * k : F.width(lab, { scale: k })) + 8 * k; segs.push([{ lab }, ww]); w += ww + 2; }
  }
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  for (const [s, ww] of segs) { if (typeof s === 'string') { txt(g, s, cx, y + 2 * k, '#f4f7ff', { scale: k }); cx += ww; } else { btn(g, s.lab, cx, y, { scale: k }); cx += ww + 2; } }
  void both; return w;
}
TC.promptLine = promptLine;

class Hud {
  constructor(play, i) {
    this.play = play; this.i = i; this.calls = []; this.pops = []; this.banners = []; this.marks = []; this.radio = null; this.radioQ = []; this.strip = 0;
    this.hurtT = 0; this.prompt = null; this.seen = {}; this.lastTick = 99; this.ringTick = {};
  }
  call(text, o = {}) { this.calls = this.calls.filter(c => c.slot !== (o.slot || 'mid')); this.calls.push(Object.assign({ text, t: 0, life: 1.2, slot: 'mid', scale: 3, color: '#ffffff' }, o)); }
  pop(pts, at) { this.pops.push({ text: (pts > 0 ? '+' : '') + fmt(pts), at, t: 0, color: pts < 0 ? '#ff6a5a' : '#ffd36a' }); if (this.pops.length > 12) this.pops.shift(); }
  banner(text, sub) { this.banners.push({ text, sub, t: 0 }); if (this.banners.length > 3) this.banners.shift(); }
  mark(head) { this.marks.push({ t: 0, head }); }
  say(who, text) { if (this.radioQ.length > 3) this.radioQ.shift(); this.radioQ.push({ who, text }); }
  showPrompt(id) { if (this.seen[id] && id !== 'torpedo') return; this.seen[id] = true; this.prompt = { id, t: 0 }; }
  step(dt) {
    for (const c of this.calls) c.t += dt; this.calls = this.calls.filter(c => c.t < c.life);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter(p => p.t < 1);
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < 2.2);
    for (const m of this.marks) m.t += dt; this.marks = this.marks.filter(m => m.t < .18);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.prompt) { this.prompt.t += dt; if (this.prompt.t > 5) this.prompt = null; }
    if (this.radio) { this.radio.t += dt; if (this.radio.t > this.radio.dur) this.radio = null; }
    if (!this.radio && this.radioQ.length) { const r = this.radioQ.shift(); const sp = reg('speaker', r.who) || {}; this.radio = Object.assign(r, { t: 0, dur: Math.max(2.4, Math.min(4.2, lineDur(r.text, r.who) + 1)), rig: this.play.portraitRig(r.who) }); if (this.i === 0 && TC.subtitlesVoice !== false) Voice.say(r.text, r.who, { vol: .45 }); void sp; }
  }
  /** draw for this player in the viewport rect (screen pixels) */
  draw(g, rect, sim, R3) {
    const p0 = sim.players[this.i], lv = this.play.localView(this.i), p = lv ? Object.assign(Object.create(p0), { c: lv.c, aim: lv.aim }) : p0, x0 = rect.x, y0 = rect.y, W = rect.w, H = rect.h, cx = x0 + W / 2, small = W < 300;
    if (tune.view.hideHud) return;
    const cut = !!sim.cut;
    if (cut) { this.drawCut(g, rect, sim); return; }
    // cover vignette tag
    if (p.c > .5 && !p.out) { const k = TC.label(this.play.inputs[this.i] || TC.game.input, 'cover'); void k; txt(g, 'COVER', cx, y0 + H - 34, '#9fe3ff', { align: 'center' }); if (p.mag < 9 && p.weapon === 'hg') { const u = p.reloadT / tune.player.reload; px.rect(g, cx - 16, y0 + H - 25, 32, 3, '#1a2a44'); px.rect(g, cx - 16, y0 + H - 25, Math.round(32 * clamp(u, 0, 1)), 3, '#9fe3ff'); } }
    // TIME plate
    const tm = Math.max(0, sim.timer), low = tm < 10 && sim.phase === 'action', blink = tm < 5 && sim.phase === 'action' && (sim.t * 4 | 0) % 2;
    const pw = small ? 70 : 92, ph = small ? 26 : 30, plx = Math.round(cx - pw / 2), ply = y0 + 3;
    E.ui.box(g, plx, ply, pw, ph, { bg: ['#10244a', '#081428'], border: low ? '#ff3b30' : '#3aa0e8' });
    const frac = clamp(tm / Math.max(1, sim.scene.time * sim.diff.time * tune.time.sceneMul), 0, 1), wl = Math.round((ph - 4) * (1 - frac));
    if (wl > 0) { px.rect(g, plx + 2, ply + ph - 2 - wl, pw - 4, wl, low ? '#5a1a2a' : '#123a6a'); for (let xx = 0; xx < pw - 4; xx += 2) px.dot(g, plx + 2 + xx, ply + ph - 2 - wl + (Math.sin(xx * .5 + sim.t * 5) > 0 ? 0 : 1), '#3a8ad8'); }
    txt(g, 'TIME', cx, ply + 2, '#9fe3ff', { align: 'center' });
    const ts = tm.toFixed(2).padStart(5, '0');
    if (!blink) txt(g, ts, cx, ply + 10, low ? '#ff5a4a' : '#ffffff', { align: 'center', scale: 2 });
    // boss bars
    if (sim.boss && !sim.boss.dead) { const B = sim.boss, bw = Math.min(W - 40, 180), bx = Math.round(cx - bw / 2), by = ply + ph + 3, f = B.hpFrac(); E.ui.box(g, bx - 2, by, bw + 4, 15, { bg: ['#2a0a14', '#14060a'], border: '#ff3b30' }); px.rect(g, bx, by + 9, bw, 4, '#3a1018'); px.rect(g, bx, by + 9, Math.round(bw * f), 4, B.flash > 0 ? '#ffffff' : '#ff4a3a'); txt(g, B.D.name, bx + 1, by + 1, '#ffd36a'); }
    // SCORE
    txt(g, 'SCORE', x0 + 6, y0 + 4, '#9fe3ff');
    const ss = small ? 1 : 2; txt(g, small ? fmt(p.score) : fmt(p.score).padStart(7, ' '), x0 + 6, y0 + 12, '#ffffff', { scale: ss });
    if (p.conts) txt(g, 'C' + p.conts, x0 + 6 + F.width(small ? fmt(p.score) : fmt(p.score).padStart(7, ' '), { scale: ss }) + 3, y0 + 12 + 3 * ss, '#ff9a6a');
    if (p.chain >= 5) txt(g, 'CHAIN ' + p.chain + '  ×' + TC.chainMul(p).toFixed(1), x0 + 6, y0 + 29, '#ffd36a');
    // LIFE
    txt(g, 'LIFE', x0 + 6, y0 + H - 28, '#9fe3ff');
    const shown = Math.min(9, Math.max(p.lives, 0));
    for (let k = 0; k < Math.max(shown, 1); k++) E.px.sprite(g, k < p.lives ? ICON.badge : ICON.badgeOff, x0 + 6 + k * 15, y0 + H - 19);
    if (p.lives > 9) txt(g, '+' + (p.lives - 9), x0 + 6 + 9 * 15, y0 + H - 15, '#ffffff');
    // weapon panel
    const Wd = reg('weapon', p.weapon), wx = x0 + W - (small ? 92 : 110), wy = y0 + H - 34;
    E.ui.box(g, wx, wy, small ? 88 : 106, 31, { bg: ['#10244a', '#081428'], border: '#3aa0e8', alpha: .85 });
    E.px.sprite(g, ICON[p.weapon], wx + 4, wy + 4);
    txt(g, Wd.kind, wx + 34, wy + 3, '#9fe3ff');
    if (p.weapon === 'hg') { for (let k = 0; k < 9; k++) E.px.sprite(g, k < p.mag ? ICON.pip : ICON.pipOff, wx + 34 + k * 5, wy + 14); if (sim.cheat(p, 'ammo')) txt(g, 'INF', wx + 82, wy + 14, '#ffd36a'); }
    else { const n = p.ammo[p.weapon]; txt(g, String(n), wx + 34, wy + 13, n > 0 ? '#ffffff' : '#ff5a4a', { scale: 2 }); E.ui.bar(g, wx + 34, wy + 26, (small ? 48 : 66), 2, n / Wd.pool, '#ffb347'); }
    if (p.stripT > 0) { for (let k = 0; k < 4; k++) { const id = TC.WEAPONS[k], has = id === 'hg' || p.ammo[id] > 0, sx = wx - 4 + k * 26 - 104 + (small ? 16 : 0); E.ui.box(g, sx, wy + 6, 24, 18, { bg: id === p.weapon ? ['#3aa0e8', '#1a5aa0'] : ['#10244a', '#081428'], border: has ? '#9fe3ff' : '#3a3a4a' }); txt(g, String(k + 1), sx + 3, wy + 9, has ? '#ffffff' : '#5a5a6a'); } }
    // RELOAD!
    if (p.weapon === 'hg' && p.mag === 0 && !p.out && p.c < .5 && (sim.t * 3 | 0) % 2 === 0) txt(g, 'RELOAD!', wx + 34, wy - 10, '#ff5a4a', { scale: 1 });
    // threat rings
    this.drawThreats(g, rect, sim, R3, p);
    // the FINAL SHOT ring on the lever
    if (sim.boss && sim.boss.finalT > 0) { const s = R3.project(1592, -80, 335); if (s) { const u = sim.boss.finalT / 3, rr = 8 + 18 * u; for (let k = 0; k < 32; k++) { const a = k / 32 * TAU; px.rect(g, x0 + s[0] + Math.cos(a) * rr - 1, y0 + s[1] + Math.sin(a) * rr - 1, 2, 2, (sim.t * 10 | 0) % 2 ? '#ffd36a' : '#ffffff'); } txt(g, sim.boss.finalT.toFixed(1), x0 + s[0], y0 + s[1] - rr - 10, '#ffd36a', { align: 'center' }); } }
    // reticle and hit markers
    if (p.c < .5 && !p.out && (sim.phase === 'action') && !(TC.dev && TC.dev.open)) {
      const ax = cx + p.aim[0] * H / 2, ay = y0 + H / 2 - p.aim[1] * H / 2, col = p.color, sz = { S: 3, M: 5, L: 7 }[TC.reticleSize || 'M'], st = TC.reticleStyle || 'cross';
      const dark = '#000000', mg = p.weapon === 'mg' ? Math.round(p.bloom * 4) : 0, s2 = sz + mg + (p.weapon === 'sg' ? 3 : 0);
      if (st === 'cross') { for (const [dx, dy, w, h] of [[-s2 - 3, 0, 4, 1], [s2, 0, 4, 1], [0, -s2 - 3, 1, 4], [0, s2, 1, 4]]) { px.rect(g, ax + dx - 1, ay + dy - 1, w + 2, h + 2, dark); px.rect(g, ax + dx, ay + dy, w, h, col); } px.dot(g, ax, ay, '#ffffff'); }
      else if (st === 'ring') { for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; px.dot(g, ax + Math.cos(a) * (s2 + 1), ay + Math.sin(a) * (s2 + 1), dark); px.dot(g, ax + Math.cos(a) * s2, ay + Math.sin(a) * s2, col); } px.dot(g, ax, ay, '#ffffff'); }
      else { px.rect(g, ax - 2, ay - 2, 5, 5, dark); px.rect(g, ax - 1, ay - 1, 3, 3, col); }
      for (const m of this.marks) { const c = m.head ? '#ffd36a' : '#ffffff', d = 5 + m.t * 20; px.line(g, ax - d, ay - d, ax - d + 3, ay - d + 3, c); px.line(g, ax + d, ay - d, ax + d - 3, ay - d + 3, c); px.line(g, ax - d, ay + d, ax - d + 3, ay + d - 3, c); px.line(g, ax + d, ay + d, ax + d - 3, ay + d - 3, c); }
    }
    // score popups at projected points
    for (const q of this.pops) { if (!q.at) continue; const s = R3.project(q.at[0], q.at[1], q.at[2]); if (!s) continue; txt(g, q.text, x0 + s[0] - 1, y0 + s[1] - 1 - q.t * 14, q.color, { align: 'center' }); }
    // banners
    this.banners.forEach((b, k) => { const yy = y0 + H * .3 + k * 22, a = b.t < .15 ? b.t / .15 : 1; if (a < .5 && (b.t * 20 | 0) % 2) return; E.ui.box(g, cx - 80, yy, 160, b.sub ? 20 : 13, { bg: ['#3a2a08', '#1a1004'], border: '#ffd36a', alpha: .9 }); txt(g, b.text, cx, yy + 3, '#ffd36a', { align: 'center' }); if (b.sub) txt(g, b.sub, cx, yy + 11, '#ffffff', { align: 'center' }); });
    // big calls
    for (const c of this.calls) {
      const yy = c.slot === 'top' ? y0 + H * .3 : y0 + H * .42, slide = c.t < .15 ? (1 - c.t / .15) * W * .5 : 0;
      if (c.blink && (c.t * 6 | 0) % 2) continue;
      txt(g, c.text, cx + slide, yy, c.color, { align: 'center', scale: small ? Math.max(2, c.scale - 1) : c.scale, outline: '#08142a', shadow: false });
      if (c.sub) txt(g, c.sub, cx + slide, yy + (small ? 18 : 26), '#ffffff', { align: 'center' });
    }
    if (sim.phase === 'travel' && !sim.cut && (sim.t * 2.5 | 0) % 2 === 0) txt(g, 'WAIT', cx, y0 + H * .44, '#ffffff', { align: 'center', scale: small ? 2 : 3, outline: '#08142a', shadow: false });
    // the prompt bar
    if (this.prompt && sim.phase === 'action' && !this.play.o.attract) this.drawPrompt(g, cx, y0 + H - 48, this.prompt.id);
    // continue
    if (p.out) { E.ui.box(g, cx - 70, y0 + H / 2 - 30, 140, 60, { bg: ['#2a0a14', '#14060a'], border: '#ff3b30' }); txt(g, sim.mode === 'host' ? 'BACK IN' : 'CONTINUE?', cx, y0 + H / 2 - 24, '#ffffff', { align: 'center', scale: 2 }); txt(g, String(Math.max(0, Math.ceil(p.contT))), cx, y0 + H / 2 - 6, '#ffd36a', { align: 'center', scale: 3 }); if (sim.mode !== 'host') promptLine(g, this.play.inputs[this.i] || TC.game.input, ['PRESS ', { a: 'fire' }], cx, y0 + H / 2 + 16); }
    // the radio
    if (this.radio && TC.subtitles !== false) this.drawRadio(g, rect);
    // hurt edge
    if (p.hurtT > 0 || this.hurtT > 0) { const a = Math.max(p.hurtT, this.hurtT); for (let k = 0; k < 4; k++) { const c = k < 2 ? '#ff2a2a' : '#8a0a0a'; if (a * 8 > k) { px.rect(g, x0, y0 + k, W, 1, c); px.rect(g, x0, y0 + H - 1 - k, W, 1, c); px.rect(g, x0 + k, y0, 1, H, c); px.rect(g, x0 + W - 1 - k, y0, 1, H, c); } } }
  }
  drawPrompt(g, cx, y, id) {
    const I = this.play.inputs[this.i] || TC.game.input, P = {
      cover: ['HOLD ', { a: 'cover' }, ' TO TAKE COVER'], reload: ['YOU RELOAD IN COVER: HOLD ', { a: 'cover' }], weapon: [{ a: 'next' }, ' / ', { a: 'prev' }, ' OR FIRE IN COVER: SWITCH WEAPON'],
      torpedo: ['SHOOT THE TORPEDO!'], open: ['SHE\'S OPEN! FIRE!'], shield: ['SHOTGUN OR LAUNCHER: KNOCK THE SHIELD ASIDE'], aim: ['AIM AND ', { a: 'fire' }], final: ['FINAL SHOT! HIT THE LEVER!'], locks: ['SHOOT THE GLOWING GATE LOCKS!']
    }[id] || [id.toUpperCase()];
    const w = promptLine(g, I, P, cx, y + 1, 'center');
    void w;
  }
  drawThreats(g, rect, sim, R3, p) {
    const x0 = rect.x, y0 = rect.y, W = rect.w, H = rect.h, big = TC.threatSize === 'Large' ? 2 : 1;
    for (const th of sim.threats) {
      if (th.done || !th.pos) continue;
      const mine = th.target === this.i, at = th.pos(); if (!at) continue;
      const u = clamp((sim.t - th.t0) / Math.max(.05, th.T - th.t0), 0, 1), s = R3.project(at[0], at[1], at[2]);
      let sx, sy, on = !!s && s[0] >= 4 && s[0] <= W - 4 && s[1] >= 4 && s[1] <= H - 4;
      if (s) { sx = x0 + s[0]; sy = y0 + s[1]; }
      if (!on) {   // an arrow at the screen's edge toward it
        if (!mine) continue;
        const cam = sim.cameraFor(this.i), a = Math.atan2(at[1] - cam.y, at[0] - cam.x) - cam.yaw, dx = Math.sin(a), dy = -Math.cos(a) * .3 - .2;
        const k = Math.min((W / 2 - 14) / Math.max(1e-3, Math.abs(dx)), (H / 2 - 14) / Math.max(1e-3, Math.abs(dy)));
        sx = x0 + W / 2 + dx * k; sy = y0 + H / 2 + dy * k;
        const blink = (sim.t * 10 | 0) % 2; px.disc(g, sx, sy, 6, blink ? '#ff3b30' : '#ffffff'); txt(g, '!', sx, sy - 3, blink ? '#ffffff' : '#ff3b30', { align: 'center', shadow: false });
        continue;
      }
      const R = (26 - 20 * u) * big;
      if (!mine) { for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; px.dot(g, sx + Math.cos(a) * R * .6, sy + Math.sin(a) * R * .6, '#ff9a8a'); } continue; }
      const n = Math.max(16, R * 4 | 0);
      for (let k = 0; k < n; k++) { const a = k / n * TAU; px.rect(g, sx + Math.cos(a) * R - 1, sy + Math.sin(a) * R - 1, 2, 2, '#ff2a1a'); px.dot(g, sx + Math.cos(a) * (R - 1.5), sy + Math.sin(a) * (R - 1.5), '#ffffff'); }
      px.disc(g, sx, sy, 3 * big, '#ffffff'); txt(g, '!', sx + 1, sy - 13 * big, '#ffffff', { align: 'center', scale: big, outline: '#ff2a1a', shadow: false });
      const key = th.id; if (u > .66 && !this.ringTick[key]) { this.ringTick[key] = true; if (this.i === 0 || this.play.local) Audio3.play('tick', { vol: .8 }); }
    }
  }
  drawRadio(g, rect) {
    const r = this.radio, sp = reg('speaker', r.who) || { name: r.who.toUpperCase(), color: '#ffffff' }, w = Math.min(rect.w - 16, rect.w < 300 ? rect.w - 16 : 196), x = rect.w < 300 ? Math.round(rect.x + 8) : rect.x + 6, y = rect.y + (rect.w < 300 ? rect.h - 84 : 42);
    E.ui.box(g, x, y, w, 34, { bg: ['#10244a', '#081428'], border: sp.color, alpha: .88 });
    if (r.rig) try { r.rig.drawPortrait(g, x + 3, y + 3, 28, { zoom: 2.6, turn: .5, bg: '#1a2a4a', frame: false }); } catch (e) { /* portrait unavailable */ }
    txt(g, sp.name, x + 36, y + 3, sp.color);
    const shown = Math.floor(r.t * 34), lines = F.wrap(r.text, w - 42, { scale: 1 });
    let left = shown; lines.slice(0, 2).forEach((L, k) => { const s = L.slice(0, Math.max(0, left)); left -= L.length; txt(g, s, x + 36, y + 13 + k * 9, '#ffffff'); });
  }
  drawCut(g, rect, sim) {
    const W = rect.w, H = rect.h, x0 = rect.x, y0 = rect.y, cut = sim.cut;
    px.rect(g, x0, y0, W, 18, '#000000'); px.rect(g, x0, y0 + H - 18, W, 18, '#000000');
    const l = cut.line;
    if (l) {
      const sp = reg('speaker', l.who) || { name: l.who.toUpperCase(), color: '#ffffff' }, w = Math.min(W - 20, 300), x = Math.round(x0 + W / 2 - w / 2), y = y0 + H - 66;
      E.ui.box(g, x, y, w, 46, { bg: ['#10244a', '#081428'], border: sp.color, alpha: .92 });
      const rig = this.play.portraitRig(l.who); if (rig) try { rig.drawPortrait(g, x + 4, y + 4, 38, { zoom: 3, turn: .5, bg: '#1a2a4a', frame: false }); } catch (e) { /* none */ }
      txt(g, sp.name, x + 48, y + 4, sp.color);
      const shown = Math.floor(l.t * 40), lines = F.wrap(l.text, w - 54, { scale: 1 }); let left = shown;
      lines.slice(0, 3).forEach((L, k) => { const s = L.slice(0, Math.max(0, left)); left -= L.length; txt(g, s, x + 48, y + 15 + k * 9, '#ffffff'); });
    }
    const I = this.play.inputs[0] || TC.game.input;
    if ((sim.t * 2 | 0) % 2 === 0 || cut.skipHold > 0) promptLine(g, I, ['HOLD ', { a: 'fire', mouse: true }, ' TO SKIP'], x0 + W - 8, y0 + H - 14, 'right');
    if (cut.skipHold > 0) px.rect(g, x0 + W - 70, y0 + H - 3, Math.round(62 * cut.skipHold / .6), 2, '#ffd36a');
    if (cut.screen) this.drawBroadcast(g, rect, sim);
  }
  drawBroadcast(g, rect, sim) {
    const w = 96, h = 64, x = rect.x + 12, y = rect.y + 26;
    E.ui.box(g, x - 3, y - 3, w + 6, h + 14, { bg: ['#1a0a10', '#0a0408'], border: '#ff3b30' });
    const rig = this.play.portraitRig('krake'); if (rig) try { rig.drawPortrait(g, x + (w - h) / 2, y, h, { zoom: 3.4, turn: .25, bg: '#2a0a14', frame: false }); } catch (e) { /* none */ }
    txt(g, '• LIVE', x + 2, y + h + 2, (sim.t * 2 | 0) % 2 ? '#ff3b30' : '#ffffff');
  }
}
TC.Hud = Hud;

// ---- 51-screens.js ----
/* 51-screens: the 10-foot menus and screens, drawn on the canvas in our frame: a focus menu (d-pad, stick, arrows;
 * hover moves the focus, a click picks; ✕ / Enter confirm, ○ / Esc / right click back), at most seven items with a
 * line under each; the title (a flyover of the night harbor), the main menu, difficulty, stage select, co-op join,
 * briefings, results with count-ups and a rank stamp, game over with initials, records, about (Source Information and
 * the feedback), how to play, the ending's credits, and the touch-only notice. */
class UIMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.rects = []; this.t = 0; this.o = o; this.moved = 0; this._mt = TC.game && TC.game.input.mouse ? TC.game.input.mouse.t : 0; while (this.items[this.i] && this.items[this.i].disabled) this.i++; }
  update(dt, I = TC.game.input) {
    this.t += dt; const n = this.items.length; if (!n) return null;
    const step = d => { let k = this.i; for (let j = 0; j < n; j++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; Audio3.play('ui_move'); } };
    const h = this.o.horizontal;
    if (I.repeat(h ? 'left' : 'up', .35, .1)) step(-1);
    if (I.repeat(h ? 'right' : 'down', .35, .1)) step(1);
    const p = I.pointer();
    // hover moves the focus whenever the pointer moves (even right after a key press; a resting pointer does not steal it)
    const mt = I.mouse ? I.mouse.t : 0, moved = mt !== this._mt; this._mt = mt;
    if (p && moved) { if (!this.lp || Math.hypot(p[0] - this.lp[0], p[1] - this.lp[1]) > 1) { this.lp = p.slice(); const k = this.rects.findIndex(r => r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; Audio3.play('ui_move'); } } }
    const c = I.clicked();
    if (c) { const k = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(I); } }
    if (I.pressed('confirm') || I.pressed('fire') && I.lastDevice === 'gamepad' || I.pressed('start') && !I.pressed('pause')) return this.pick(I);
    if (I.pressed('cancel') || (I.pressed('cover') && I.lastDevice === 'mouse')) { Audio3.play('ui_back'); I.consumeAll(); if (this.o.back) this.o.back(); return 'back'; }
    if (this.o.adjust && (I.pressed('left') || I.pressed('right'))) this.o.adjust(this.items[this.i], I.pressed('left') ? -1 : 1);
    return null;
  }
  pick(I) { const it = this.items[this.i]; if (!it || it.disabled) return null; Audio3.play('ui_ok'); I.consumeAll(); if (it.act) it.act(it); return it; }
  /** draw a vertical list centred at x, from y; each item with its description line */
  draw(g, x, y, w, o = {}) {
    const gap = o.gap || 26; this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * gap, on = k === this.i, wave = on ? Math.sin(this.t * 6) * 1.5 : 0;
      if (on) { E.ui.box(g, x - w / 2 - 4, yy - 3, w + 8, gap - 3, { bg: ['#1e5aa0', '#0e2a5a'], border: '#ffd36a' }); px.rect(g, x - w / 2 - 10 + wave, yy + 5, 4, 4, '#ffd36a'); }
      txt(g, it.label, x, yy, it.disabled ? '#5a6a80' : on ? '#ffffff' : '#c8d4ec', { align: 'center', scale: on ? 2 : 2 });
      if (it.desc && on && o.footer) { E.ui.box(g, x - 150, o.footer - 3, 300, 14, { bg: ['#10244a', '#081428'], border: '#3aa0e8', alpha: .9 }); txt(g, it.desc, x, o.footer, '#ffd36a', { align: 'center' }); }
      else if (it.desc && (on || o.allDesc)) txt(g, it.desc, x, yy + 15, on ? '#ffd36a' : '#8aa0c8', { align: 'center' });
      this.rects[k] = [x - w / 2 - 4, yy - 3, w + 8, gap - 3];
    });
  }
}
TC.UIMenu = UIMenu;

/** the screen frame: a deep blue gradient with a rolling wave band, a title */
function frame(g, W, H, title, t = 0) {
  for (let y = 0; y < H; y += 4) { const k = y / H; px.rect(g, 0, y, W, 4, E.mix ? E.mix('#10244a', '#04060c', k) : '#081428'); }
  for (let x = 0; x < W; x += 2) { const y = H - 26 + Math.sin(x * .05 + t * 2) * 4 + Math.sin(x * .13 - t * 3) * 2; px.rect(g, x, y, 2, H - y, '#0a2a52'); px.dot(g, x, y, '#3aa0e8'); }
  if (title) { txt(g, title, W / 2, 14, '#ffd36a', { align: 'center', scale: 2, outline: '#08142a', shadow: false }); px.rect(g, W / 2 - 80, 33, 160, 1, '#3aa0e8'); }
}
TC.frame = frame;
/** the logo: TIDE CRISIS with a big 3 and a wave under it */
function logo(g, cx, y, t, k = 1) {
  F.title(g, 'TIDE CRISIS', cx - 14 * k, y, { scale: 4 * k, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 3, depthColor: '#08142a', align: 'center' });
  const w = F.width('TIDE CRISIS', { scale: 4 * k });
  F.title(g, '3', cx + w / 2 + 4 * k, y - 6 * k, { scale: 7 * k, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#08142a', depth: 3, depthColor: '#2a0808', align: 'center' });
  for (let x = -w / 2 - 20; x < w / 2 + 30; x += 1) { const yy = y + 34 * k + Math.sin(x * .12 + t * 3) * 2.5; px.dot(g, cx + x, yy, '#3aa0e8'); if (((x | 0) % 3) === 0) px.dot(g, cx + x, yy - 1, '#9fe3ff'); }
}
TC.logo = logo;

/* ---- the title's flyover camera, a slow orbit over the harbor (shared by the title and menus) ---- */
const Flyover = {
  r3: null, t: 0, fx: null,
  draw(g, W, H, dt) {
    const st = reg('stage', 1), world = WORLDS.get(1); if (!world) { frame(g, W, H, null, this.t); return; }
    this.t += dt || 1 / 60; if (!this.r3) { this.r3 = new Rail3D(); this.fx = new FX(); }
    const R3 = this.r3, t = this.t; R3.size(W, H);
    const a = Math.sin(t * .04) * 1.1, cam = { x: -420 + Math.sin(t * .03) * 60, y: Math.sin(a) * 160, z: 64 + Math.sin(t * .1) * 14, yaw: -a * .35, pitch: -.1, fov: 60 };
    R3.begin(cam, st.env, t);
    if (this.fx.r() < .03) this.fx.firework([cam.x + Math.cos(cam.yaw) * 700 + (this.fx.r() - .5) * 600, cam.y + Math.sin(cam.yaw) * 700 + (this.fx.r() - .5) * 600, 200 + this.fx.r() * 150], (this.fx.r() * 3) | 0);
    this.fx.step(1 / 60); this.fx.draw(R3);
    R3.drawWorld(world); R3.sky(); this.fx.drawAfter(R3); R3.vignette(.25);
    R3.present(g, 0, 0);
  }
};
TC.Flyover = Flyover;

/** is this a touch-only device (no fine pointer, no gamepad, no key pressed yet)? */
function touchOnly() {
  if (TC.forceTouchOnly) return true;
  if (HEADLESS || TC.forceTouchOnly === false) return false;
  if (TC._keySeen) return false;
  try { const pads = navigator.getGamepads ? Array.from(navigator.getGamepads() || []).filter(Boolean) : []; if (pads.length) return false; } catch (e) { /* none */ }
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; }
}
TC.touchOnly = touchOnly;
/** idle tracking for the attract mode: any key or button, a pointer move of more than 4 px, a stick past its dead zone */
const Idle = {
  t: 0, lp: null,
  step(dt, I = TC.game.input) {
    let any = I.anyPressed() || (I.padAim && Math.hypot(...I.padAim) > 0) || Math.hypot(I.padMove[0], I.padMove[1]) > 0 || I.held.size > 0;
    const p = I.pointer(); if (p) { if (this.lp && Math.hypot(p[0] - this.lp[0], p[1] - this.lp[1]) > 4) any = true; this.lp = p.slice(); }
    if (I.clicked()) any = true;
    this.t = any ? 0 : this.t + dt; return this.t;
  },
  reset() { this.t = 0; }
};
TC.Idle = Idle;

/* ---- results: count-ups, the bonuses, the rank stamp ---- */
class Results {
  constructor(sim, i, o) { this.sim = sim; this.i = i; this.o = o; this.t = 0; this.r = sim.stageResult(i); this.done = false; this.stamped = false; this.bonusAdded = false; }
  update(dt, I) {
    this.t += dt; const rows = 9;
    if (Math.floor(this.t / .35) !== Math.floor((this.t - dt) / .35) && this.t < rows * .35) Audio3.play('count');
    if (this.t > rows * .35 && !this.stamped) { this.stamped = true; Audio3.play('stamp'); TC.game.shake && TC.game.shake(4); if (!this.bonusAdded) { this.bonusAdded = true; const p = this.sim.players[this.i]; p.score += this.r.accBonus + this.r.noDamage; } }
    if ((I.pressed('confirm') || I.pressed('fire') || I.clicked()) && this.t > .4) { if (!this.stamped) this.t = rows * .35 + .01; else this.done = true; }
  }
  draw(g, W, H) {
    const R = this.r, st = this.sim.stage, s = R.stats, cx = W / 2, rowsY = 52;
    frame(g, W, H, 'STAGE ' + (st.num || st.id) + ' CLEAR', this.t);
    txt(g, st.name, cx, 38, '#9fe3ff', { align: 'center' });
    const rows = [['TIME', Math.floor(s.time / 60) + "'" + pad2(Math.floor(s.time % 60)) + '"'], ['ACCURACY', Math.round(R.acc * 100) + '%'], ['KILLS', String(s.kills)], ['HEADSHOTS', String(s.heads)], ['COVER SAVES', String(s.saves)], ['LIVES LOST', String(s.lost)], ['ACCURACY BONUS', '+' + fmt(R.accBonus)], ['NO-DAMAGE BONUS', R.noDamage ? '+' + fmt(R.noDamage) : '-'], ['SCORE', fmt(this.sim.players[this.i].score)]];
    rows.forEach((r, k) => { if (this.t < k * .35) return; const y = rowsY + k * 15; txt(g, r[0], cx - 110, y, '#c8d4ec', { scale: 1 }); txt(g, r[1], cx + 60, y - 2, k === 8 ? '#ffd36a' : '#ffffff', { scale: 2, align: 'right' }); });
    if (this.stamped) { const k = Math.min(1, (this.t - 9 * .35) * 6), sc = Math.round(8 - 3 * k); E.ui.box(g, cx + 76, rowsY + 18, 64, 64, { bg: ['#3a0a14', '#14060a'], border: '#ffd36a' }); F.title(g, R.rank, cx + 108, rowsY + 30, { scale: sc, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' }); txt(g, 'RANK', cx + 108, rowsY + 86, '#ffd36a', { align: 'center' }); }
    if (this.stamped && (this.t * 2 | 0) % 2) txt(g, 'PRESS ' + TC.label(TC.game.input, 'confirm') + ' TO CONTINUE', cx, H - 22, '#ffffff', { align: 'center' });
  }
}
TC.Results = Results;

// ---- 52-dev.js ----
/* 52-dev: dev mode, opened from the pause menu (not in AI Hub sessions). A canvas panel with six tabs (PLAYER, WEAPONS,
 * ENEMIES, TIME, VIEW, ACTIONS): every slider's key is a path into tune, so adding a variable takes one line; changed
 * values show in gold with the default in grey; RESET ALL TO DEFAULTS (with a confirmation) copies TUNE back; the
 * reload button resets the focused item. The Sim is frozen while the panel is open. Also: debug overlays (hit volumes,
 * colliders, rails and cover points, AI labels, threats, perf) and the free camera (Copy pose for authoring). */
const DEVTABS = [
  ['PLAYER', [['t', 'player.god', 'God mode'], ['t', 'player.infAmmo', 'Infinite ammo'], ['s', 'player.startLives', 'Start lives (0: by difficulty)', 0, 9, 1], ['s', 'player.iframes', 'Invulnerability after a hit (s)', .5, 3, .1], ['s', 'player.coverIn', 'Cover in (s)', .05, .4, .01], ['s', 'player.coverOut', 'Cover out (s)', .05, .4, .01], ['s', 'player.reload', 'Reload (s)', .1, 1, .05], ['s', 'player.padSpeed', 'Pad aim speed', .5, 3, .1], ['s', 'player.assist', 'Aim assist strength', 0, 1, .05]]],
  ['WEAPONS', [['s', 'weapons.hgDamage', 'Handgun damage', .5, 3, .1], ['s', 'weapons.mgRate', 'Machine gun rate (/s)', 4, 20, 1], ['s', 'weapons.mgDamage', 'Machine gun damage', .1, 1, .05], ['s', 'weapons.sgPellets', 'Shotgun pellets', 4, 14, 1], ['s', 'weapons.sgSpread', 'Shotgun spread (deg)', 2, 12, .5], ['s', 'weapons.glRadius', 'Grenade radius', 24, 96, 4], ['s', 'weapons.glDamage', 'Grenade damage', 2, 12, .5], ['s', 'weapons.ammoMul', 'Ammo pickups ×', .5, 3, .1]]],
  ['ENEMIES', [['s', 'enemy.hpMul', 'HP ×', .5, 3, .1], ['s', 'enemy.threatMul', 'Threat chance ×', 0, 3, .1], ['s', 'enemy.teleMul', 'Telegraph time ×', .5, 2, .05], ['s', 'enemy.fireMul', 'Fire interval ×', .5, 2, .05], ['s', 'enemy.maxThreats', 'Max threats (0: by stage)', 0, 4, 1], ['s', 'enemy.minGap', 'Minimum gap between hits (s)', .1, 1, .05], ['s', 'enemy.reactMul', 'Reaction delay ×', .5, 2, .05], ['s', 'enemy.bossHpMul', 'Boss HP ×', .25, 3, .05]]],
  ['TIME', [['t', 'time.freeze', 'Freeze timer'], ['s', 'time.sceneMul', 'Area time ×', .5, 2, .05], ['s', 'time.eliteBonus', 'Elite kill bonus (s)', 0, 5, .5], ['s', 'time.refill', 'Refill after time-up', .2, 1, .05], ['s', 'time.speed', 'Game speed', .25, 1.5, .05]]],
  ['VIEW', [['s', 'view.fov', 'Field of view', 45, 75, 1], ['t', 'view.hitVols', 'Show hit volumes'], ['t', 'view.colliders', 'Show colliders'], ['t', 'view.rails', 'Show rail and cover points'], ['t', 'view.aiLabels', 'AI state labels'], ['t', 'view.threatDebug', 'Threat debug'], ['t', 'view.perf', 'Perf overlay'], ['t', 'view.freeCam', 'Free camera (close the panel to fly)'], ['t', 'view.hideHud', 'Hide HUD']]],
  ['ACTIONS', [['a', 'restart', 'Restart area'], ['a', 'next', 'Next area'], ['a', 'prev', 'Previous area'], ['j', 'jump', 'Jump to...'], ['a', 'kill', 'Kill all'], ['e', 'spawn', 'Spawn enemy...'], ['a', 'arm', 'All weapons, full ammo'], ['a', 'life+', '+1 life'], ['a', 'life-', 'Lose a life'], ['a', 'threat', 'Trigger a threat on me'], ['a', 'clearstage', 'Clear stage'], ['a', 'over', 'Game over'], ['a', 'bot', 'Bot plays (Autopilot)'], ['a', 'p2', 'Add a P2 bot (split screen)'], ['a', 'voice', 'Voice test'], ['m', 'music', 'Music test...'], ['a', 'copy', 'Copy camera pose']]]
];
TC.DEVTABS = DEVTABS;
const Dev = {
  open: false, tab: 0, i: 0, confirmReset: false, free: null, jumpI: 0, spawnI: 0, musicI: 0, msg: '', msgT: 0, rects: [], drag: false,
  show() { if (HUB) return; this.open = true; this.confirmReset = false; this._mt = TC.game.input.mouse ? TC.game.input.mouse.t : 0; TC.game.input.consumeAll(); },
  hide() { this.open = false; },
  items() { return DEVTABS[this.tab][1].concat([['r', 'reset', 'RESET ALL TO DEFAULTS']]); },
  note(s) { this.msg = s; this.msgT = 2; },
  adjust(it, dir, fine) {
    if (it[0] === 't') { setPath(tune, it[1], !getPath(tune, it[1])); return; }
    if (it[0] === 's') { const v = getPath(tune, it[1]), st = it[5] * (fine ? 1 : 1); setPath(tune, it[1], +clamp(Math.round((v + dir * st) / it[5]) * it[5], it[3], it[4]).toFixed(4)); return; }
    if (it[0] === 'j') { const all = this.allScenes(); this.jumpI = (this.jumpI + dir + all.length) % all.length; return; }
    if (it[0] === 'e') { const ids = this.spawnTypes(); this.spawnI = (this.spawnI + dir + ids.length) % ids.length; return; }
    if (it[0] === 'm') { const ids = regAll('song').map(s => s.id); this.musicI = (this.musicI + dir + ids.length) % ids.length; }
  },
  allScenes() { const out = []; for (const st of regAll('stage')) for (const s of st.scenes) out.push([st.id, s]); return out; },
  spawnTypes() { return ['deckhand', 'marine', 'redtide', 'quartermaster', 'grenadier', 'rocketeer', 'shield', 'rusher', 'sniper', 'drone']; },
  run(it, P) {
    const sim = P.sim, p = sim.players[0];
    if (it[0] === 't' || it[0] === 's') { this.adjust(it, 1); return; }
    if (it[0] === 'r') { if (!this.confirmReset) { this.confirmReset = true; this.note('Press again to reset every value'); return; } resetTune(); this.confirmReset = false; this.note('All values reset to defaults'); return; }
    const k = it[1], idx = sim.sceneIdx, scs = sim.stage.scenes;
    if (k === 'restart') sim.restartScene();
    if (k === 'next') sim.jump(sim.stage.id, scs[Math.min(scs.length - 1, idx + 1)]);
    if (k === 'prev') sim.jump(sim.stage.id, scs[Math.max(0, idx - 1)]);
    if (k === 'jump') { const [st, sc] = this.allScenes()[this.jumpI]; sim.jump(st, sc); this.note('Jumped to ' + sc); }
    if (k === 'kill') { for (const e of sim.enemies) if (e.alive && !e.civ && !e.ally) damageEnemy(sim, e, 999, p, 'torso', {}); if (sim.boss && !sim.boss.dead) sim.boss.defeat(sim); }
    if (k === 'spawn') { const type = this.spawnTypes()[this.spawnI], free = sim.scene.coverList.find(c => !c.taken) || sim.scene.coverList[0]; if (type === 'drone' || type === 'quartermaster' || type === 'rusher' || !free) { const f = sim.focus(), cam = sim.cameraFor(0), fwd = [Math.cos(cam.yaw), Math.sin(cam.yaw)]; spawnEnemy(sim, type, null, type === 'drone' ? { from: [f[0] + fwd[0] * 200, f[1] + fwd[1] * 200, 40] } : type === 'quartermaster' ? { route: [[f[0] + fwd[0] * 220 - fwd[1] * 120, f[1] + fwd[1] * 220 + fwd[0] * 120, 0], [f[0] + fwd[0] * 220 + fwd[1] * 120, f[1] + fwd[1] * 220 - fwd[0] * 120, 0]], drop: 'mg' } : { from: [f[0] + fwd[0] * 260, f[1] + fwd[1] * 260, 0] }); } else spawnEnemy(sim, type, free.id, { entry: 'stand' }); this.note('Spawned a ' + type); }
    if (k === 'arm') for (const q of sim.players) { q.ammo.mg = 240; q.ammo.sg = 36; q.ammo.gl = 6; q.mag = 9; q.seen = { mg: 1, sg: 1, gl: 1 }; }
    if (k === 'life+') p.lives++;
    if (k === 'life-') hurtPlayer(sim, p, 'dev', true);
    if (k === 'threat') { requestThreat(sim, 0, { always: true, tele: 1.2, kind: 'dev', pos: () => { const c = sim.cameraFor(0); return [c.x + Math.cos(c.yaw) * 200, c.y + Math.sin(c.yaw) * 200, c.z]; } }); }
    if (k === 'clearstage') { sim.sceneIdx = scs.length - 1; sim.enemies = []; sim.boss = null; sim.nextScene(); }
    if (k === 'over') { for (const q of sim.players) { q.lives = 0; q.out = true; q.contT = 0; } sim.phase = 'gameover'; sim.ev({ type: 'gameover' }); }
    if (k === 'bot') { if (P.bots[0]) { delete P.bots[0]; this.note('Bot off'); } else { P.bots[0] = new Autopilot('expert'); this.note('Bot on'); } }
    if (k === 'p2') { if (sim.players.length < 2) { const np = newPlayer(sim, { name: 'BOT', agent: 'rook', color: SEAT_COLORS[1] }, 1); sim.players.push(np); P.n = 2; P.aims.push(new Aim(TC.game.input, 1)); P.huds.push(new Hud(P, 1)); P.cams.push(new CamFX()); P.bots[1] = new Autopilot('fair'); TC.game.splitScreen(2, { layout: 'columns' }); this.note('P2 bot joined'); } }
    if (k === 'voice') { const ids = ['kai', 'rook', 'mari', 'juno', 'hale', 'tejada', 'krake', 'barracuda', 'hammerhead', 'gull']; ids.forEach((id, n) => setTimeout(() => { Voice.say('This is ' + reg('speaker', id).name + '. Testing, one, two!', id); P.huds[0].say(id, 'This is ' + reg('speaker', id).name + '. Testing, one, two!'); }, n * 1600)); }
    if (k === 'music') { const id = regAll('song')[this.musicI].id; Audio3.music(id); this.note('Playing ' + id); }
    if (k === 'copy') { const c = sim.cameraFor(0), s = JSON.stringify([+c.x.toFixed(1), +c.y.toFixed(1), +c.z.toFixed(1), +(c.yaw / DEG).toFixed(1), +(c.pitch / DEG).toFixed(1)]); console.log('pose', s); try { navigator.clipboard.writeText(s); } catch (e) { /* no clipboard */ } this.note('Pose ' + s); }
  },
  update(dt, P) {
    const I = TC.game.input, its = this.items();
    this.msgT = Math.max(0, this.msgT - dt);
    if (I.pressed('cancel') || I.pressed('pause')) { I.consumeAll(); this.hide(); if (tune.view.freeCam && !this.free) this.free = Object.assign({}, P.sim.cameraFor(0)); return; }
    const mouse = I.lastDevice === 'mouse';
    if ((I.pressed('next') && !mouse) || I.pressed('w2') && false) { this.tab = (this.tab + 1) % DEVTABS.length; this.i = 0; Audio3.play('ui_move'); }
    if (I.pressed('prev') && !mouse) { this.tab = (this.tab + DEVTABS.length - 1) % DEVTABS.length; this.i = 0; Audio3.play('ui_move'); }
    if (I.repeat('up', .3, .07)) { this.i = (this.i + its.length - 1) % its.length; this.confirmReset = false; }
    if (I.repeat('down', .3, .07)) { this.i = (this.i + 1) % its.length; this.confirmReset = false; }
    const it = its[this.i];
    if (I.repeat('left', .3, .05)) this.adjust(it, -1);
    if (I.repeat('right', .3, .05)) this.adjust(it, 1);
    if (mouse && (I.pressed('next') || I.pressed('prev'))) this.adjust(it, I.pressed('next') ? -1 : 1);
    if (I.pressed('reload') && (it[0] === 's' || it[0] === 't')) setPath(tune, it[1], getPath(TUNE, it[1]));
    // the mouse: hover focuses, a click on a tab switches, a click runs or toggles, dragging moves a slider's knob
    const p = I.pointer(), mt = I.mouse ? I.mouse.t : 0, moved = mt !== this._mt; this._mt = mt;
    if (p && (mouse || moved)) {
      if (moved) for (const r of this.rects) if (p[0] >= r.x && p[0] < r.x + r.w && p[1] >= r.y && p[1] < r.y + r.h) { if (r.row !== undefined && r.row !== this.i) this.i = r.row; }
      const held = I.down('fire');
      const sl = this.rects.find(r => r.slider && r.row === this.i);
      if (held && sl && p[0] >= sl.x - 4 && p[0] <= sl.x + sl.w + 4 && Math.abs(p[1] - (sl.y + 2)) < 8) { const it2 = its[this.i], u = clamp((p[0] - sl.x) / sl.w, 0, 1); setPath(tune, it2[1], +(Math.round((it2[3] + u * (it2[4] - it2[3])) / it2[5]) * it2[5]).toFixed(4)); this.drag = true; }
    }
    const c = I.clicked();
    if (c) { const r = this.rects.find(r => c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h); if (r && r.tab !== undefined) { this.tab = r.tab; this.i = 0; } else if (r && r.row !== undefined && !this.drag) { this.i = r.row; this.run(its[this.i], P); } this.drag = false; }
    else if (I.pressed('confirm')) this.run(it, P);
  },
  draw(g, P) {
    const G = TC.game, W = G.screen.W, H = G.screen.H, x0 = 10, y0 = 10, w = Math.min(W - 20, 320), h = H - 20, its = this.items();
    E.ui.box(g, x0, y0, w, h, { bg: ['#10244a', '#081428'], border: '#ffd36a', alpha: .94 });
    this.rects = [];
    txt(g, 'DEV MODE', x0 + 6, y0 + 4, '#ffd36a'); txt(g, 'sim frozen  •  ' + TC.label(G.input, 'cancel') + ' close', x0 + w - 6, y0 + 4, '#8aa0c8', { align: 'right' });
    let tx = x0 + 6;
    DEVTABS.forEach(([name], k) => { const tw = F.width(name, {}) + 8, on = k === this.tab; if (on) E.ui.box(g, tx - 2, y0 + 14, tw, 12, { bg: ['#3aa0e8', '#1a5aa0'], border: '#ffffff' }); txt(g, name, tx + 2, y0 + 16, on ? '#ffffff' : '#9fe3ff'); this.rects.push({ x: tx - 2, y: y0 + 14, w: tw, h: 12, tab: k }); tx += tw + 2; });
    const rowH = 13, maxRows = Math.floor((h - 52) / rowH), first = clamp(this.i - maxRows + 2, 0, Math.max(0, its.length - maxRows));
    for (let k = first; k < Math.min(its.length, first + maxRows); k++) {
      const it = its[k], y = y0 + 32 + (k - first) * rowH, on = k === this.i;
      if (on) px.rect(g, x0 + 3, y - 2, w - 6, rowH, '#1e5aa0');
      this.rects.push({ x: x0 + 3, y: y - 2, w: w - 6, h: rowH, row: k });
      const lab = it[0] === 'j' ? it[2] + ' ' + this.allScenes()[this.jumpI][1] : it[0] === 'e' ? it[2] + ' ' + this.spawnTypes()[this.spawnI] : it[0] === 'm' ? it[2] + ' ' + regAll('song')[this.musicI].id : it[2];
      txt(g, lab, x0 + 8, y, it[0] === 'r' ? (this.confirmReset ? '#ff5a4a' : '#ff9a6a') : '#ffffff');
      if (it[0] === 't' || it[0] === 's') {
        const v = getPath(tune, it[1]), d = getPath(TUNE, it[1]), changed = v !== d, vx = x0 + w - 8;
        if (it[0] === 't') txt(g, v ? 'ON' : 'OFF', vx, y, changed ? '#ffd36a' : '#c8d4ec', { align: 'right' });
        else { const sw = 60, sx = vx - 100; px.rect(g, sx, y + 3, sw, 2, '#3a4a6a'); px.rect(g, sx + Math.round(sw * (v - it[3]) / (it[4] - it[3])) - 1, y, 3, 8, changed ? '#ffd36a' : '#9fe3ff'); this.rects.push({ x: sx, y: y + 1, w: sw, h: 6, slider: true, row: k }); txt(g, String(+v.toFixed(2)), vx, y, changed ? '#ffd36a' : '#c8d4ec', { align: 'right' }); if (changed) txt(g, '(' + d + ')', sx - 4, y, '#6a7a90', { align: 'right' }); }
      }
    }
    promptLine(g, G.input, [{ a: 'prev' }, '/', { a: 'next' }, ' TAB  ', { a: 'confirm' }, ' RUN  ', { a: 'reload' }, ' RESET ITEM'], x0 + w / 2, y0 + h - 14);
    if (this.msgT > 0) txt(g, this.msg, x0 + w / 2, y0 + h - 26, '#ffd36a', { align: 'center' });
  },
  /** the free camera: fly with the moves (or the left stick), look with the right stick or arrow keys, Q/E down/up */
  flyStep(dt, P) {
    const I = TC.game.input, f = this.free || (this.free = Object.assign({}, P.sim.cameraFor(0))), sp = (I.down('cover') ? 400 : 150) * dt;
    const mv = I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0 ? I.padMove : [(I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), (I.down('down') ? 1 : 0) - (I.down('up') ? 1 : 0)];
    const fx = Math.cos(f.yaw), fy = Math.sin(f.yaw);
    f.x += (fx * -mv[1] - fy * mv[0]) * sp; f.y += (fy * -mv[1] + fx * mv[0]) * sp;
    if (I.down('prev')) f.z -= sp; if (I.down('next')) f.z += sp;
    if (I.padAim) { f.yaw += I.padAim[0] * dt * 1.8; f.pitch = clamp(f.pitch - I.padAim[1] * dt * 1.2, -1.4, 1.4); }
    const p = I.pointer(); if (p && I.lastDevice === 'mouse' && I.down('fire')) { if (this.lastP) { f.yaw += (p[0] - this.lastP[0]) * .01; f.pitch = clamp(f.pitch - (p[1] - this.lastP[1]) * .01, -1.4, 1.4); } this.lastP = p.slice(); } else this.lastP = null;
    if (I.pressed('confirm')) this.run(['a', 'copy'], P);
  }
};
TC.dev = Dev;
/** debug overlays in screen space for player i's viewport */
TC.devOverlays = (g, P, R3, rect, i) => {
  const sim = P.sim, V = tune.view, pr = p => { const s = R3.project(p[0], p[1], p[2]); return s ? [rect.x + s[0], rect.y + s[1], s[2]] : null; };
  if (V.hitVols) for (const e of sim.enemies) if (e.vols) for (const k in e.vols) { const v = e.vols[k]; if (!v || k === 'hidden') continue; const pts = v.c ? [v.c] : [v.a, V3.lerp(v.a, v.b, .5), v.b]; for (const c of pts) { const s = pr(c); if (!s) continue; const rr = v.r * R3.B.F / s[2]; for (let a = 0; a < 16; a++) px.dot(g, s[0] + Math.cos(a / 16 * TAU) * rr, s[1] + Math.sin(a / 16 * TAU) * rr, k === 'head' ? '#ff5a5a' : k === 'shield' ? '#5ad1ff' : '#ffd36a'); } }
  if (V.hitVols && sim.boss) for (const part of Object.values(sim.boss.parts)) if (part.vol && part.alive) { const c = part.vol.c || V3.lerp(part.vol.a, part.vol.b, .5), s = pr(c); if (s) { const rr = part.vol.r * R3.B.F / s[2]; for (let a = 0; a < 20; a++) px.dot(g, s[0] + Math.cos(a / 20 * TAU) * rr, s[1] + Math.sin(a / 20 * TAU) * rr, part.open ? '#5aff8a' : '#8a8a8a'); txt(g, part.id + ' ' + part.hp.toFixed(1), s[0], s[1] - rr - 8, '#ffffff', { align: 'center' }); } }
  if (V.colliders) for (const c of sim.world.colliders.concat(sim.objects.filter(o => o.alive).map(o => o.col))) { const b = c.box; if (c.yaw) continue; const cs = [[b[0], b[1], b[2]], [b[3], b[1], b[2]], [b[3], b[4], b[2]], [b[0], b[4], b[2]], [b[0], b[1], b[5]], [b[3], b[1], b[5]], [b[3], b[4], b[5]], [b[0], b[4], b[5]]].map(pr); for (const [a, bb] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) if (cs[a] && cs[bb] && cs[a][2] < 900) px.line(g, cs[a][0], cs[a][1], cs[bb][0], cs[bb][1], c.obj ? '#ffd36a' : '#5ad1ff'); }
  if (V.rails) { if (sim.rail) for (let d = 0; d < sim.travelL; d += 12) { const q = sim.rail.at(d), s = pr([q.x, q.y, q.z - 20]); if (s) px.dot(g, s[0], s[1], '#8aff8a'); } for (const cv of sim.scene.coverList) { const s = pr(cv.at); if (s) { px.rect(g, s[0] - 2, s[1] - 2, 5, 5, cv.taken ? '#ff5a5a' : '#8aff8a'); txt(g, cv.id, s[0], s[1] + 4, '#ffffff', { align: 'center' }); } } }
  if (V.aiLabels) for (const e of sim.enemies) { const s = pr([e.x, e.y, e.z + 34]); if (s) txt(g, e.type + ':' + e.state + (e.alive ? '' : ' +'), s[0], s[1], e.exposed ? '#ff9a6a' : '#9fe3ff', { align: 'center' }); }
  if (V.threatDebug) { let y = rect.y + 60; for (const th of sim.threats) if (!th.done) { txt(g, th.kind + ' → P' + (th.target + 1) + ' in ' + (th.T - sim.t).toFixed(2) + 's', rect.x + rect.w - 6, y, '#ff9a8a', { align: 'right' }); y += 9; } txt(g, 'cap ' + maxThreats(sim) + ' gap ' + tune.enemy.minGap, rect.x + rect.w - 6, y, '#ffd36a', { align: 'right' }); }
  void i;
};

// ---- 53-attract.js ----
/* 53-attract: the Autopilot (it produces the same commands a player does: the tests' 'fair' bot, the attract mode's
 * 'showoff', the dev P2 bot) and the attract mode: after 10 s idle on the title or the menu, a looping demo of
 * highlights (cheats on: god mode, infinite ammo), the high scores, the title; any input goes back to the title. */
const SKILL = { fair: { react: .25, speed: 3.5, head: .3, jitter: .015 }, expert: { react: .18, speed: 3.5, head: .6, jitter: .01 }, showoff: { react: .16, speed: 3.6, head: .55, jitter: .01, show: true } };
class Autopilot {
  constructor(style = 'fair') { this.style = style; this.S = SKILL[style] || SKILL.fair; this.ax = 0; this.ay = 0; this.vx = 0; this.vy = 0; this.lock = null; this.lockT = 0; this.holdCover = 0; this.t = 0; this.fireGap = 0; this.wsel = 0; this.cycle = 0; this.R = E.rng(style.length * 7919 + 1); }
  /** candidate targets: [{ p: world point, r (world radius), pri, kind, ref }] */
  targets(sim, i) {
    const out = [], p = sim.players[i];
    for (const th of sim.threats) if (!th.done && th.target === i && th.kind !== 'grenade' && th.kind !== 'rocket' && th.kind !== 'torpedo' && th.kind !== 'harpoon') { const e = sim.enemyById(th.src); if (e && e.alive && e.vols) out.push({ e, pri: 100 - (th.T - sim.t) * 10, kind: 'threat' }); }
    for (const pr of sim.projectiles) if (pr.alive && pr.owner < 0) out.push({ p: pr.pos.slice(), r: pr.r * 1.5, pri: pr.kind === 'torpedo' ? 120 : 90, kind: 'proj', ref: { id: 'proj:' + pr.id } });
    for (const e of sim.enemies) {
      if (!e.alive || e.civ || e.ally || !e.vols || e.vols.hidden && !e.lean) continue;
      const pri = e.elite ? 60 : e.type === 'rusher' ? 55 : e.type === 'quartermaster' ? 58 : e.type === 'shield' ? 40 : e.type === 'drone' ? 45 : 30;
      out.push({ e, pri: pri + (e.exposed ? 10 : 0) + (e.th ? 20 : 0), kind: 'enemy' });
    }
    const B = sim.boss;
    if (B && !B.dead) {
      for (const part of Object.values(B.parts)) if (part.alive && part.vol && part.open && !part.armor && !part.vol.box) out.push({ p: part.vol.c ? part.vol.c.slice() : V3.lerp(part.vol.a, part.vol.b, .5), r: part.vol.r, pri: part.weak ? 50 : 35, kind: 'boss', ref: { id: 'part:' + part.id } });
      const shielded = Object.values(B.parts).some(q => q.armor && q.alive && q.vol);
      for (const r of B.rigs) if (r.hit && r.hit.open && r.hit.alive && r.vols) out.push({ p: shielded ? V3.lerp(r.vols.legs.a, r.vols.legs.b, .85) : r.vols.torso ? V3.lerp(r.vols.torso.a, r.vols.torso.b, .6) : r.vols.head.c, r: shielded ? 2 : 3, pri: 48, kind: 'boss', ref: { id: 'rig:' + r.hit.id } });
      for (const q of Object.values(B.parts)) if (q.armor && q.alive && q.vol && q.onArmor) { const pl = sim.players[i]; if (pl.ammo.sg > 0 || pl.ammo.gl > 0) out.push({ p: q.vol.c || (q.vol.a ? V3.lerp(q.vol.a, q.vol.b, .5) : [q.vol.cx, q.vol.cy, (q.vol.box[2] + q.vol.box[5]) / 2]), r: 6, pri: 49, kind: 'boss', knock: true, ref: { id: 'armor:' + q.id } }); }
    }
    for (const ob of sim.objects) {
      if (!ob.alive || (ob.K.popup && (!ob.raised || ob.up < .8)) || ob.K.civ) continue;
      const c = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, (ob.box[2] + ob.box[5]) / 2 + (ob.K.popup ? 6 : 0)], cam = sim.cameraFor(i);
      if (Math.hypot(c[0] - cam.x, c[1] - cam.y) > 700) continue;
      if (ob.K.objective || ob.K.popup || ob.K.fly) out.push({ p: c, r: 4, pri: ob.K.objective ? 52 : 38, kind: 'obj', ref: ob });
      else if (ob.K.needs && ob.K.needs.some(w => sim.players[i].ammo[w] > 0)) out.push({ p: c, r: 6, pri: 36, kind: 'obj', ref: ob });
      else if (ob.K.bonus && (this.S.show || this.style === 'fair')) out.push({ p: c, r: 3, pri: 8, kind: 'bonus', ref: ob });
      else if (ob.K.explode && sim.enemies.some(e => e.alive && !e.civ && Math.hypot(e.x - c[0], e.y - c[1]) < ob.K.explode * .8)) out.push({ p: c, r: 5, pri: 33, kind: 'barrel', ref: ob });
    }
    void p; return out;
  }
  pointOf(sim, t) {
    if (t.p) return { p: t.p, r: t.r };
    const V = t.e.vols, head = (this.R() < this.S.head || t.e.type === 'captor') && V.head;
    if (V.body) return { p: V.body.c, r: V.body.r * .7 };
    if (V.shield && t.e.shieldOn) {
      if (t.e.state === 'over' || t.e.state === 'fire') return { p: [V.head.c[0], V.head.c[1], V.head.c[2] + V.head.r * .45], r: V.head.r * .5 };
      const p = sim.players[this.i || 0]; if (p && (p.ammo.sg > 0 || p.ammo.gl > 0)) return { p: V3.lerp(V.shield.a, V.shield.b, .5), r: 5, knock: true };
      return null;
    }
    if (head || !V.torso) return { p: V.head.c, r: V.head.r * .8 };
    return { p: V3.lerp(V.torso.a, V.torso.b, .55), r: V.torso.r * .8 };
  }
  command(sim, i, dt) {
    this.t += dt; const p = sim.players[i], cmd = { aim: [this.ax, this.ay], fireDown: false, firePressed: false, coverDown: false, coverPressed: false, next: false, prev: false, select: 0, reload: false };
    if (sim.cut) { cmd.fireDown = this.style === 'showoff' || this.skipCuts; cmd.firePressed = this.t % .5 < dt; return cmd; }
    if (p.out || sim.phase === 'continue') { cmd.firePressed = this.t % .3 < dt; return cmd; }
    if (sim.phase !== 'action') { this.lock = null; this.ax *= .95; this.ay *= .95; cmd.aim = [this.ax, this.ay]; return cmd; }
    const cam = sim.cameraFor(i), mine = sim.threats.filter(t => !t.done && t.target === i), soon = mine.reduce((m, t) => Math.min(m, t.T - sim.t), 9);
    const unblockable = mine.some(t => t.unblockable && t.T - sim.t < .5);
    // cover: duck when a threat is about to land; reload when empty
    const empty = p.weapon === 'hg' && p.mag === 0, low = p.weapon === 'hg' && p.mag <= 2 && !mine.length;
    // duck for a threat about to land, unless its source is in the sights and should drop first
    const next = mine.slice().sort((a, b) => a.T - b.T)[0], src = next && sim.enemyById(next.src);
    const killable = src && src.alive && this.lock && this.lockKey === 'e' + src.id && Math.hypot(this.lock.a[0] - this.ax, this.lock.a[1] - this.ay) < .05 && src.hp <= reg('weapon', p.weapon).dmg() * 2 && next.T - sim.t > .16;
    if (!unblockable && !killable && (soon < .28 || (p.c > .5 && soon < .45))) this.holdCover = Math.max(this.holdCover, .2);
    if (empty || (low && this.R() < dt * 2)) this.holdCover = Math.max(this.holdCover, tune.player.reload + tune.player.coverIn + .08);
    this.holdCover -= dt;
    cmd.coverDown = this.holdCover > 0;
    // pick a target
    const keyOf = t => t.e ? 'e' + t.e.id : t.ref ? 'r' + t.ref.id : t.kind + Math.round(t.p[0] / 8) + ':' + Math.round(t.p[1] / 8) + ':' + Math.round(t.p[2] / 8);
    const o = [cam.x, cam.y, cam.z];
    this.i = i;
    const ts = this.targets(sim, i).map(t => { const q = this.pointOf(sim, t); return q ? Object.assign(t, q) : null; }).filter(Boolean).filter(t => {
      const a = worldToAim(cam, t.p); if (!a) return false; t.a = a; if (!(Math.abs(a[0]) < 1.75 && Math.abs(a[1]) < .98)) return false;
      if (t.kind === 'proj' || t.kind === 'boss') return true;
      const vis = q => { const d = V3.sub(q, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L, t.kind !== 'obj' && t.kind !== 'bonus' && t.kind !== 'barrel'); return !w || w.t > L - (t.r || 3) - 2; };
      if (vis(t.p)) return true;
      // the torso is hidden (a railing, a low wall): try the head
      if (t.e && t.e.vols && t.e.vols.head && t.p !== t.e.vols.head.c && vis(t.e.vols.head.c)) { t.p = t.e.vols.head.c; t.r = t.e.vols.head.r * .8; const a2 = worldToAim(cam, t.p); if (a2) t.a = a2; return true; }
      return false;
    });
    let best = null, bs = -1e9;
    for (const t of ts) { const d = Math.hypot(t.a[0] - this.ax, t.a[1] - this.ay), s = t.pri - d * 12 + (this.lockKey === keyOf(t) ? 40 : 0); if (s > bs) { bs = s; best = t; } }
    const bk = best ? keyOf(best) : null;
    if (bk !== this.lockKey) { const near = best && Math.hypot(best.a[0] - this.ax, best.a[1] - this.ay) < .15; this.lockKey = bk; this.lockT = near ? Math.min(this.lockT, this.S.react) : 0; }
    this.lock = best; this.lockT += dt;
    // weapons
    if (best && !this.S.noSwitch) {
      let want = 'hg';
      const needs = best.ref && best.ref.K && best.ref.K.needs;
      if (needs) want = needs.find(w => p.ammo[w] > 0) || 'hg';
      else if (best.knock) want = p.ammo.sg > 0 ? 'sg' : p.ammo.gl > 0 ? 'gl' : 'hg';
      else if (best.e && best.e.type === 'rusher' && p.ammo.sg > 0) want = 'sg';
      else if ((best.e && best.e.type === 'drone' || ts.filter(t => t.e).length >= 4) && p.ammo.mg > 0) want = 'mg';
      else if (best.kind === 'boss' && p.ammo.gl > 0 && this.style !== 'fair' && best.a[2] < 200) want = 'gl';
      else if (this.S.show && p.ammo.mg > 0 && (this.cycle++ % 600) < 200) want = 'mg';
      if (want !== p.weapon && p.switchT <= 0 && (want === 'hg' || p.ammo[want] > 0)) cmd.select = TC.WEAPONS.indexOf(want) + 1;
    }
    // aim: a damped spring toward the target, capped by the skill's speed, after the reaction delay
    let tx = this.ax, ty = this.ay;
    if (best && p.weapon === 'gl') { const tt = best.a[2] / 640, drop = Math.max(0, .5 * 240 * tt * tt - 40 * tt), a2 = worldToAim(cam, [best.p[0], best.p[1], best.p[2] + drop]); if (a2) { best.a = a2; } }
    if (best && this.lockT > this.S.react * tune.enemy.reactMul * .5) { tx = best.a[0] + (this.R() - .5) * this.S.jitter; ty = best.a[1] + (this.R() - .5) * this.S.jitter; }
    const k = 18, dmp = 2 * Math.sqrt(k);
    this.vx += ((tx - this.ax) * k * k / 18 - this.vx * dmp) * dt; this.vy += ((ty - this.ay) * k * k / 18 - this.vy * dmp) * dt;
    const sp = Math.hypot(this.vx, this.vy), mx = this.S.speed; if (sp > mx) { this.vx *= mx / sp; this.vy *= mx / sp; }
    this.ax += this.vx * dt; this.ay += this.vy * dt; cmd.aim = [this.ax, this.ay];
    // fire when the reticle is on it
    this.fireGap -= dt;
    if (best && p.c < .2) {
      const rr = Math.max(.012, best.r / best.a[2] / Math.tan(cam.fov * DEG / 2)), on = Math.hypot(best.a[0] - this.ax, best.a[1] - this.ay) < rr;
      if (on) { if (p.weapon === 'mg') cmd.fireDown = true; else if (this.fireGap <= 0) { cmd.firePressed = true; cmd.fireDown = true; this.fireGap = p.weapon === 'hg' ? .17 : .4; } }
    }
    return cmd;
  }
}
TC.Autopilot = Autopilot;

/* ---- the attract playlist ---- */
for (const [id, stage, scene] of [['h1', 1, '1-1'], ['h2', 1, '1-4'], ['h3', 1, '1-B'], ['h4', 2, '2-1'], ['h5', 2, '2-3'], ['h6', 2, '2-B'], ['h7', 3, '3-2'], ['h8', 3, '3-3'], ['h9', 3, '3-B']]) def('highlight', id, { stage, scene, t: 28 });
const Attract = {
  i: 0, state: 'demo', t: 0,
  enter() {
    this.state = 'demo'; this.t = 0; this.prog = 0; this.lastProg = 0;
    this.start();
  },
  start() {
    const H = regAll('highlight'), h = H[this.i % H.length];
    this.h = h; this.t = 0; this.prog = 0; this.watch = 0;
    const sim = new Sim({ mode: 'attract', stage: h.stage, scene: h.scene, difficulty: 'normal', seed: 1000 + this.i, cheats: { god: true, ammo: true }, players: [{ name: 'DEMO', agent: 'kai' }] });
    for (const p of sim.players) { p.ammo.mg = 240; p.ammo.sg = 36; p.ammo.gl = 6; p.seen = { mg: 1, sg: 1, gl: 1 }; }
    this.play = new Play({ sim, inputs: [], bots: { 0: new Autopilot('showoff') }, attract: true });
    this.lastKills = 0;
  },
  update(dt) {
    const I = TC.game.input;
    if (this.t > .3 && (Idle.step(dt) === 0)) { I.consumeAll(); TC.game.go('title'); return; }
    this.t += dt;
    if (this.state === 'demo') {
      this.play.update(dt);
      const s = this.play.sim, kills = s.players[0].stats.kills + (s.boss ? Math.round((1 - s.boss.hpFrac()) * 20) : 0) + s.sceneIdx * 100;
      if (kills !== this.lastKills || s.phase === 'travel') { this.lastKills = kills; this.watch = 0; } else this.watch += dt;
      if (this.t > this.h.t || this.watch > 8 || s.phase === 'done' || s.phase === 'gameover') { this.i++; this.state = this.i % 2 ? 'scores' : 'title'; this.t = 0; }
    } else if (this.state === 'scores' && this.t > 6) { this.state = 'demo'; this.start(); }
    else if (this.state === 'title' && this.t > 8) { this.state = 'demo'; this.start(); }
  },
  draw(r) {
    if (this.state === 'demo') { this.play.draw(r); r.overlay(g => { const W = r.W, H = r.H; logo(g, W - 80, H - 54, this.t, .35); txt(g, 'DEMO PLAY', W - 80, H - 70, '#ffd36a', { align: 'center', outline: '#08142a' });   // (clear of the HUD's score and TIME)
      if (TC.touchOnly()) txt(g, 'Controller or keyboard required', W / 2, H - 58, '#ff9a8a', { align: 'center', outline: '#08142a' });
      else if ((this.t * 2 | 0) % 2) txt(g, TC.game.input.lastDevice === 'gamepad' ? 'PRESS ' + TC.game.input.codeLabel('Pad9') : 'PRESS ANY KEY', W / 2, H - 62, '#ffffff', { align: 'center', scale: 2, outline: '#08142a', shadow: false }); }); return; }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.state === 'scores') { frame(g, W, H, null, this.t); TC.arcade.drawTable({ overlay: f => f(g), W, H, text: (s, x, y, c, o) => txt(g, s, x, y, c, o) }, 'arcade', 30, 'HIGH SCORES'); }
      else { Flyover.draw(g, W, H, 1 / 60); logo(g, W / 2, H * .3, this.t); if ((this.t * 2 | 0) % 2) txt(g, 'PRESS START', W / 2, H * .66, '#ffffff', { align: 'center', scale: 2, outline: '#08142a', shadow: false }); }
    });
  }
};
TC.Attract = Attract; TC.attract = Attract;

// ---- 60-sim.js ----
/* 60-sim: Sim, the authoritative, deterministic game state, stepped from player commands with seeded RNG streams.
 * The presentation (renderer, HUD, audio, FX) only reads it and drains sim.events. The headless tests, the bot, the
 * attract mode and the AI Hub host all drive it the same way.
 *   const sim = new Sim({ mode: 'arcade' | 'stage' | 'coop' | 'range' | 'attract' | 'host', stage: 1, scene: '1-1',
 *     difficulty: 'normal', seed, cheats: { god, ammo }, players: [{ name, color, agent }] });
 *   sim.step(dt, commands); sim.cameraFor(i); sim.jump(stage, sceneId); sim.hash()
 * Phases: cut (a cutscene) -> travel (WAIT) -> arrive -> action (TIME runs) -> clear -> travel ... -> outro (cut) ->
 * done; continue and gameover when lives run out. */
const WORLDS = new Map();
function worldOf(stage) {
  let W = WORLDS.get(stage.id); if (W) return W;
  const G = new Builder({ maxEdge: 48 }), S = { carriers: {}, statics: [] };
  stage.build(G, S);
  const env = stage.env;
  W = bakeWorld(G, env); W.extra = S; env._lights = W.lights;
  WORLDS.set(stage.id, W); return W;
}
TC.worldOf = worldOf;

class Sim {
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'arcade'; this.seed = (o.seed === undefined ? 12345 : o.seed) >>> 0; this._rng = {};
    this.diffId = o.difficulty || 'normal'; this.diff = DIFF[this.diffId] || DIFF.normal;
    this.cheats = Object.assign({ god: false, ammo: false }, o.cheats || {});
    this.t = 0; this.events = []; this._id = 1; this.flags = {}; this.say_q = [];
    this.players = (o.players && o.players.length ? o.players : [{}]).map((p, i) => newPlayer(this, p, i));
    this.enemies = []; this.projectiles = []; this.objects = []; this.threats = []; this.boss = null; this.carriers = {};
    this.runStats = { stages: [] }; this.contUsed = 0; this.stageQueue = o.stages || null;
    this.loadStage(o.stage || 1, o.scene, o.skipIntro || this.mode === 'host' || this.mode === 'attract' || this.mode === 'range' || !!o.scene);
  }
  /* ---- plumbing ---- */
  nid() { return this._id++; }
  rng(stream) { let f = this._rng[stream]; if (!f) f = this._rng[stream] = E.rng((this.seed ^ hashStr(stream)) >>> 0); return f(); }
  ev(e) { e.t = this.t; this.events.push(e); if (this.events.length > 600) this.events.splice(0, 200); }
  drain() { const e = this.events; this.events = []; return e; }
  cheat(p, k) { return !!(this.cheats[k] || (k === 'god' && tune.player.god) || (k === 'ammo' && tune.player.infAmmo)); }
  flag(k) { const v = this.flags[k]; this.flags[k] = true; return v; }
  enemyById(id) { for (const e of this.enemies) if (e.id === id) return e; return null; }
  say(who, text) { this.ev({ type: 'say', who, text }); }
  cue(name, data) { if (this.dir) this.dir.cue(name, data); this.ev({ type: 'cue', name }); }
  launch(o) { return launch(this, o); }
  explode(at, r, dmg, owner, air, kind) { explode(this, at, r, dmg, owner, air, kind); }
  threatsPopOut(p) { threatsPopOut(this, p); }
  waterZ() { const w = this.stage.env.water; return w ? w.z + (this.waterRise || 0) : -1e4; }
  groundBelow(e) { return this.stage.env.water ? Math.max(this.waterZ(), (e.cover && e.cover.floor) || -999) : 0; }
  timeExtend(s) { if (s > 0 && (this.phase === 'action')) { this.timer += s; this.ev({ type: 'extend', s }); } }

  /* ---- stages and scenes ---- */
  loadStage(id, sceneId, skipIntro) {
    this.stage = reg('stage', id); if (!this.stage) throw new Error('unknown stage ' + id);
    this.stageNum = typeof id === 'number' ? id : (this.stage.num || 1);
    this.world = worldOf(this.stage);
    this.enemies = []; this.projectiles = []; this.threats = []; this.objects = []; this.boss = null; this.waterRise = 0;
    this.carriers = {};
    for (const [cid, C] of Object.entries(this.stage.carriers || {})) this.carriers[cid] = { id: cid, C, path: new E.Path(C.path, { smooth: 'catmull' }), d: 0, M: null, yaw: 0, pos: [0, 0, 0] };
    for (const cid in this.carriers) this.poseCarrier(this.carriers[cid]);
    for (const sid of this.stage.scenes) { const sc = reg('scene', sid); for (const ob of sc.objects || []) addObject(this, ob[0], ob[1], Object.assign({ scene: sid }, ob[2] || {})); }
    if (this.stage.setup) this.stage.setup(this);
    this.stageStart = { score: this.players.map(p => p.score), stats: this.players.map(p => Object.assign({}, p.stats)), t: this.t };
    this.contAtStage = this.contUsed;
    const idx = sceneId ? this.stage.scenes.indexOf(sceneId) : 0;
    this.sceneIdx = Math.max(0, idx);
    this.startScene(this.sceneIdx, true);
    if (!skipIntro && this.stage.intro) this.playCut(this.stage.intro, () => this.setPhase('travel'));
    else if (sceneId) this.arriveNow();
    this.ev({ type: 'stage', stage: this.stage.id });
  }
  startScene(i, first) {
    // where the players stand now (the scene they are leaving), read before the scene changes: the ride starts there
    this.prevSlots = first || !this.scene ? null : this.slotWorld();
    this.sceneIdx = i; this.scene = prepScene(reg('scene', this.stage.scenes[i]));
    for (const e of this.enemies) if (e.th) { e.th.done = true; }
    this.enemies = []; this.projectiles = []; for (const t of this.threats) t.done = true; this.threats = []; this.boss = null;
    this.dir = new Director(this, this.scene);
    this.timer = this.scene.time * this.diff.time * tune.time.sceneMul;
    this.travelD = 0; this.travelL = 0; this.rail = null; this.phase = 'travel'; this.phaseT = 0; this.slotsAlt = null; this.slotBlend = null;
    if (this.scene.carrier) { const C = this.carriers[this.scene.carrier]; C.d = this.scene.carrierFrom || 0; this.poseCarrier(C); }
    this.buildRail(first);
    if (this.scene.onEnter) this.scene.onEnter(this);
    this.ev({ type: 'scene', id: this.scene.id, title: this.scene.title, n: i });
  }
  /** the current slots in world space [{ stand: pose, cover: pose }] */
  slotWorld() { return this.scene.slots.map((s, i) => ({ stand: this.slotPose(i, 0), cover: this.slotPose(i, 1) })); }
  buildRail(first) {
    const sc = this.scene, end = this.slotPose(0, 0), pts = [];
    const from = this.prevSlots ? this.prevSlots[0].stand : this.startPose || (sc.arrive.start ? { x: sc.arrive.start[0], y: sc.arrive.start[1], z: sc.arrive.start[2] } : null);
    if (from) pts.push([from.x, from.y, from.z]);
    for (const p of (typeof sc.arrive.path === 'function' ? sc.arrive.path(from) : sc.arrive.path)) pts.push(p.slice());
    pts.push([end.x, end.y, end.z]);
    if (first && !from) pts.shift();
    this.rail = new E.Path(pts, { smooth: 'catmull' }); this.travelL = this.rail.length; this.travelD = 0;
    this.railFromYaw = this.prevSlots ? this.prevSlots[0].stand.yaw : null;
  }
  /** jump straight to the current scene's action (dev, attract, tests, stage select) */
  arriveNow() { this.travelD = this.travelL; this.setPhase('arrive'); this.phaseT = .35; }
  jump(stageId, sceneId, o = {}) {
    if (stageId !== this.stage.id) this.loadStage(stageId, sceneId, true);
    else {
      for (const e of this.enemies) if (e.th) e.th.done = true;
      this.enemies = []; this.projectiles = []; this.threats = []; this.boss = null;
      this.startScene(Math.max(0, this.stage.scenes.indexOf(sceneId)), true);
      this.arriveNow();
    }
    this.cut = null;
    if (o.phase === 'travel') { this.setPhase('travel'); this.travelD = 0; }
    this.ev({ type: 'jump', scene: sceneId });
  }
  restartScene() { this.jump(this.stage.id, this.scene.id); }
  setPhase(ph) {
    this.phase = ph; this.phaseT = 0; this.ev({ type: 'phase', phase: ph, scene: this.scene && this.scene.id });
    if (ph === 'action') {
      this.dir.start();
      if (this.scene.boss) { this.boss = makeBoss(this, this.scene.boss); }
      this.ev({ type: 'action', scene: this.scene.id, boss: this.scene.boss || null });
    }
  }
  carrierD() { const C = this.scene.carrier && this.carriers[this.scene.carrier]; return C ? C.d : 0; }
  poseCarrier(C) {
    const L = C.path.length, d = clamp(C.d, 0, L - .01), p = C.path.at(d), z = (C.C.z !== undefined ? C.C.z : p.z);
    const yaw = C.C.fixedYaw !== undefined ? C.C.fixedYaw * DEG : p.angle;
    C.pos = [p.x, p.y, z]; C.yaw = yaw; C.M = mat34(p.x, p.y, z, yaw, 0, 0, 1);
  }
  /** player i's slot pose: k = 0 stand, 1 cover -> { x, y, z, yaw, pitch } */
  slotPose(i, k) {
    const sc = this.scene, slots = this.slotsAlt || sc.slots, slot = slots[Math.min(i, slots.length - 1)], s = k ? slot.cover : slot.stand;
    if (sc.carrier) {
      const C = this.carriers[sc.carrier], w = xform(C.M, s.at);
      return { x: w[0], y: w[1], z: w[2], yaw: C.yaw + (s.yaw || 0) * DEG, pitch: (s.pitch || 0) * DEG };
    }
    const look = s.look || [s.at[0] + 100, s.at[1], s.at[2]], [yaw, pitch] = lookAngles(s.at, look);
    return { x: s.at[0], y: s.at[1], z: s.at[2], yaw, pitch };
  }
  slotGround(i) { const p = this.slotPose(i, 0); return [p.x, p.y, p.z - EYE]; }
  focus() { const p = this.slotPose(0, 0); return [p.x, p.y, p.z]; }
  /** player i's logical camera pose (the origin of every ray; no shake) */
  cameraFor(i) {
    const fov = tune.view.fov;
    if (this.cut && this.cut.cam) return Object.assign({ fov }, this.cut.cam);
    const ph = this.phase;
    if (ph === 'travel' && this.rail) {
      const L = this.travelL, u = L > 0 ? clamp(this.travelD / L, 0, 1) : 1, us = smooth(u), d = us * L, p = this.rail.at(Math.min(L - .01, d));
      const ahead = this.rail.at(Math.min(L - .01, d + 50)), end = this.slotPose(0, 0);
      let yaw = Math.atan2(ahead.y - p.y, ahead.x - p.x), pitch = Math.atan2(ahead.z - p.z, Math.hypot(ahead.x - p.x, ahead.y - p.y)) * .5;
      if (L - d < 52 || !(Math.hypot(ahead.x - p.x, ahead.y - p.y) > 1)) { yaw = end.yaw; pitch = end.pitch; }
      if (this.railFromYaw !== null && u < .2) yaw = lerpAng(this.railFromYaw, yaw, smooth(u / .2));
      const lk = clamp((u - .7) / .3, 0, 1); yaw = lerpAng(yaw, end.yaw, smooth(lk)); pitch = lerp(pitch, end.pitch, smooth(lk));
      let x = p.x, y = p.y, z = p.z;
      if (i > 0) { const cur = this.slotPose(i, 0), off1 = [cur.x - end.x, cur.y - end.y, cur.z - end.z], prev = this.prevSlots ? this.prevSlots[Math.min(i, this.prevSlots.length - 1)].stand : null, prev0 = this.prevSlots ? this.prevSlots[0].stand : null, off0 = prev ? [prev.x - prev0.x, prev.y - prev0.y, prev.z - prev0.z] : off1; x += lerp(off0[0], off1[0], us); y += lerp(off0[1], off1[1], us); z += lerp(off0[2], off1[2], us); }
      const bob = this.scene.arrive.walk ? Math.sin(this.t * 12.6) * 1.2 * (1 - lk) : 0;
      return { x, y, z: z + bob, yaw, pitch, fov };
    }
    const p = this.players[i] || this.players[0], c = smooth(p.c), a = this.slotPose(i, 0), b = this.slotPose(i, 1);
    let yaw = lerpAng(a.yaw, b.yaw, c), pitch = lerp(a.pitch, b.pitch, c);
    if (ph === 'arrive' && this.railEnd) { const k = smooth(clamp(this.phaseT / .35, 0, 1)); yaw = lerpAng(this.railEnd.yaw, yaw, k); pitch = lerp(this.railEnd.pitch, pitch, k); }
    const out = { x: lerp(a.x, b.x, c), y: lerp(a.y, b.y, c), z: lerp(a.z, b.z, c), yaw, pitch, fov };
    if (this.slotBlend && this.slotBlend.path) {   // climbing: along the path, looking where it goes, then at the new slot
      const B = this.slotBlend, u = clamp((this.t - B.t) / B.dur, 0, 1), us = smooth(u), d = us * B.L, q = B.path.at(Math.min(B.L - .01, d)), ah = B.path.at(Math.min(B.L - .01, d + 40));
      let yw = Math.hypot(ah.x - q.x, ah.y - q.y) > 1 ? Math.atan2(ah.y - q.y, ah.x - q.x) : out.yaw, pt = Math.atan2(ah.z - q.z, Math.max(1, Math.hypot(ah.x - q.x, ah.y - q.y))) * .5;
      if (u < .15) { const f = B.from[0]; yw = lerpAng(f.yaw, yw, smooth(u / .15)); pt = lerp(f.pitch, pt, smooth(u / .15)); }
      const lk = smooth(clamp((u - .8) / .2, 0, 1)); yw = lerpAng(yw, out.yaw, lk); pt = lerp(pt, out.pitch, lk);
      const f0 = B.from[0], fi = B.from[i] || f0, a0 = this.slotPose(0, 0), off0 = [fi.x - f0.x, fi.y - f0.y, fi.z - f0.z], off1 = [a.x - a0.x, a.y - a0.y, a.z - a0.z];
      return { x: q.x + lerp(off0[0], off1[0], us), y: q.y + lerp(off0[1], off1[1], us), z: q.z + lerp(off0[2], off1[2], us) + Math.sin(this.t * 12.6) * 1.1 * (1 - lk), yaw: yw, pitch: pt, fov };
    }
    if (this.slotBlend && this.slotBlend.from[i]) { const k = smooth(clamp((this.t - this.slotBlend.t) / .6, 0, 1)), f = this.slotBlend.from[i]; if (k >= 1 && i === 0) this.slotBlend = null; else { out.x = lerp(f.x, out.x, k); out.y = lerp(f.y, out.y, k); out.z = lerp(f.z, out.z, k) + Math.sin(k * Math.PI) * 6; out.yaw = lerpAng(f.yaw, out.yaw, k); out.pitch = lerp(f.pitch, out.pitch, k); } }
    return out;
  }
  /** move every player to new slots mid-scene along a path (up a stair): the clock stops until they arrive, then cue */
  climb(slots, path, speed, cue) {
    const from = this.players.map((p, i) => this.cameraFor(i)), pts = [[from[0].x, from[0].y, from[0].z]].concat(path.map(p => p.slice()));
    this.slotsAlt = prepScene({ slots: slots.map(s => ({ stand: s.stand, cover: s.cover })), covers: {} }).slots;
    const end = this.slotPose(0, 0); pts.push([end.x, end.y, end.z]);
    const P = new E.Path(pts, { smooth: 'catmull' }); this.slotBlend = { from, t: this.t, path: P, L: P.length, dur: P.length / speed, cue };
    for (const p of this.players) p.c = 0;
    this.ev({ type: 'climb' });
  }
  climbing() { return !!(this.slotBlend && this.slotBlend.path); }
  /** move every player to new slots mid-scene (a cover swap), the camera diving across */
  swapSlots(alt) { const from = this.players.map((p, i) => this.cameraFor(i)); this.slotsAlt = prepScene({ slots: alt.map(s => ({ stand: s.stand, cover: s.cover })), covers: {}, carrier: this.scene.carrier }).slots; this.slotBlend = { from, t: this.t }; this.ev({ type: 'swap' }); }

  /* ---- the step ---- */
  step(dt, cmds = []) {
    const ph = this.phase;
    if (ph === 'gameover' || ph === 'done') { this.phaseT += dt; return; }
    if (ph === 'continue') { this.continueStep(dt, cmds); return; }
    this.t += dt; this.phaseT += dt;
    if (this.cut) { cutStep(this, dt, cmds); if (this.cut) return; }
    // the rail and the phases
    if (ph === 'travel') {
      const sp = (this.scene.arrive.speed || 140) * (this.mode === 'attract' ? 1.5 : 1);
      this.travelD = Math.min(this.travelL, this.travelD + sp * dt * (this.travelL > 0 ? 1 : 0));
      if (this.travelL <= 0 || this.travelD >= this.travelL) { this.railEnd = this.cameraFor(0); this.setPhase('arrive'); }
    } else if (ph === 'arrive') {
      if (this.phaseT >= .35) this.setPhase('action');
    } else if (ph === 'clear') {
      if (this.phaseT >= 1.4) this.nextScene();
    }
    const live = this.phase === 'action';
    // carriers move during action
    if (this.scene.carrier && (this.phase === 'action' || this.phase === 'clear')) {
      const C = this.carriers[this.scene.carrier], L = C.path.length;
      let hold = this.scene.carrierHold && !this.dir.clear() ? this.scene.carrierHold : L;
      for (const [hd, wid] of this.scene.holds || []) { if (C.d > hd + 1) continue; const W = this.dir.waves.find(w => w.id === wid); if (W && (!W.started || !this.dir.waveDone(W))) { hold = Math.min(hold, hd); break; } }
      if (C.d < Math.min(L - 1, hold)) C.d = Math.min(L - 1, hold, C.d + (this.scene.carrierSpeed || C.C.speed || 80) * dt);
      this.poseCarrier(C);
      // whoever the carrier leaves behind is gone
      const fx = Math.cos(C.yaw), fy = Math.sin(C.yaw), cam = this.cameraFor(0);
      if (!C.C.fixedYaw) for (const e of this.enemies) if (e.alive && e.carrier !== this.scene.carrier && !e.ally && (e.x - cam.x) * fx + (e.y - cam.y) * fy < -50) { e.gone = true; e.alive = false; if (e.cover && e.cover.taken === e.id) e.cover.taken = 0; for (const t of this.threats) if (t.src === e.id && !t.done) { t.done = true; t.cancelled = true; } }
    }
    // players
    for (const p of this.players) {
      const cmd = cmds[p.id] || NOCMD;
      if (!p.present) { p.c = 1; continue; }
      if (p.out) { this.outStep(p, dt, cmd); continue; }
      if (live) { playerStep(this, p, cmd, dt); weaponStep(this, p, cmd, dt); p.stats.time += dt; }
      else { p.c = Math.max(0, p.c - dt / tune.player.coverOut); p.heldT = 0; p.recoil = Math.max(0, p.recoil - dt * 6); if (p.mag < 9 && this.phase === 'travel') p.mag = 9; }
    }
    if (this.phase === 'action') this.dir.step(dt);
    enemiesStep(this, dt);
    threatsStep(this);
    projectilesStep(this, dt);
    objectsStep(this, dt);
    if (this.boss) bossStep(this, this.boss, dt);
    if (this.scene.tick) this.scene.tick(this, dt);
    // TIME
    if (this.phase === 'action') {
      if (this.climbing() && this.t - this.slotBlend.t >= this.slotBlend.dur) { const cue = this.slotBlend.cue; this.slotBlend = null; if (cue) this.cue(cue); }
      if (!tune.time.freeze && !this.cheats.freeze && this.mode !== 'attract' && !this.climbing() && (this.mode !== 'range' || this.scene.timed && this.flags.timed)) this.timer -= dt;
      if (this.timer <= 0) this.timeUp();
      if (this.dir.clear()) this.sceneClear();
    }
    // continues
    if (this.mode !== 'coop' && this.mode !== 'host' && this.players.every(p => p.out || !p.present) && this.phase !== 'gameover') {
      if (this.mode === 'attract') { for (const p of this.players) { p.out = false; p.lives = 9; } }
      else { this.resumePhase = this.phase; this.phase = 'continue'; this.ev({ type: 'continue', t: 10 }); }
    }
    if ((this.mode === 'coop') && this.players.every(p => p.out && p.contT <= 0)) { this.phase = 'gameover'; this.ev({ type: 'gameover' }); }
  }
  outStep(p, dt, cmd) {
    p.c = 1; p.contT -= dt;
    if (this.mode === 'host') { if (p.contT <= 0) { p.out = false; p.lives = Math.max(1, Math.ceil(this.diff.lives / 2)); p.score = Math.max(0, p.score - 5000); p.inv = 2; this.ev({ type: 'return', p: p.id }); } return; }
    if (this.mode === 'coop' && cmd.firePressed && p.contT > 0) this.continueRun(p.id);
  }
  continueStep(dt, cmds) {
    for (const p of this.players) { p.contT -= dt; if (cmds[p.id] && cmds[p.id].firePressed && p.contT < 9.6) { this.continueRun(p.id); break; } }
    if (this.phase === 'continue' && this.players.every(p => p.contT <= 0)) { this.phase = 'gameover'; this.ev({ type: 'gameover' }); }
  }
  /** a continue: lives restored, the score back to 0 (a continue mark is shown), the scene's waves restart */
  continueRun(i) {
    const p = this.players[i]; if (!p || !p.out) return false;
    p.out = false; p.lives = tune.player.startLives || this.diff.lives; p.score = 0; p.conts++; p.chain = 0; p.inv = 2; this.contUsed++;
    this.ev({ type: 'continued', p: i });
    if (this.phase === 'continue') {
      this.phase = this.resumePhase || 'action';
      if (this.mode !== 'coop') { const keepD = this.carrierD(); this.enemies = this.enemies.filter(e => e.ally); this.projectiles = []; for (const t of this.threats) t.done = true; this.threats = []; this.dir = new Director(this, this.scene); this.timer = this.scene.time * this.diff.time * tune.time.sceneMul; if (this.boss) { this.boss = makeBoss(this, this.scene.boss, this.boss); } if (this.phase === 'action') this.dir.start(); if (this.scene.carrier) { this.carriers[this.scene.carrier].d = keepD; } }
    }
    return true;
  }
  timeUp() {
    this.ev({ type: 'timeup' });
    for (const p of this.players) if (!p.out && p.present) hurtPlayer(this, p, 'time', true);
    this.timer = this.scene.time * this.diff.time * tune.time.sceneMul * tune.time.refill;
  }
  sceneClear() {
    const bonus = Math.max(0, Math.floor(this.timer)) * 100;
    for (const p of this.players) if (!p.out && p.present) addScore(this, p, bonus, null, true);
    this.ev({ type: 'clear', scene: this.scene.id, bonus, time: this.timer });
    this.cue('clear');
    for (const t of this.threats) if (!t.done) { t.done = true; t.cancelled = true; }
    this.projectiles = [];
    this.setPhase('clear');
  }
  nextScene() {
    const i = this.sceneIdx + 1;
    if (i < this.stage.scenes.length) { this.startScene(i, false); this.setPhase('travel'); return; }
    // the stage is over: its outro, then done
    const finish = () => { this.phase = 'done'; this.phaseT = 0; this.ev({ type: 'stageclear', stage: this.stage.id }); };
    if (this.stage.outro && this.mode !== 'host' && this.mode !== 'attract' && this.mode !== 'range') this.playCut(this.stage.outro, finish); else finish();
  }
  /** the next stage of a run (arcade): keeps players, score, ammo and lives */
  nextStage(id) { this.loadStage(id, null, this.mode === 'host'); }
  playCut(id, onDone) { startCut(this, id, onDone); }

  /* ---- rays ---- */
  /** the nearest world collider (static and objects) along a ray within maxT -> { t, col } */
  rayWorld(ray, maxT = 4000, objs = true) {
    let best = null, bt = maxT;
    for (const c of this.world.colliders) { if (!c.alive) continue; const t = rayCollider(ray.o, ray.d, c); if (t >= 0 && t < bt) { bt = t; best = c; } }
    if (objs) for (const ob of this.objects) { if (!ob.alive || (ob.K.popup && ob.up < .6)) continue; const t = rayBox(ray.o, ray.d, ob.box); if (t >= 0 && t < bt) { bt = t; best = ob.col; } }
    if (this.boss && this.boss.colliders) for (const c of this.boss.colliders()) { const t = rayCollider(ray.o, ray.d, c); if (t >= 0 && t < bt) { bt = t; best = c; } }
    const wz = this.waterZ(); if (ray.d[2] < 0 && wz > -1e3) { const t = (wz - ray.o[2]) / ray.d[2]; if (t >= 0 && t < bt) { bt = t; best = { impact: 'water', water: true }; } }
    if (ray.d[2] < 0 && !this.stage.env.water) { const t = (0 - ray.o[2]) / ray.d[2]; if (t >= 0 && t < bt) { bt = t; best = { impact: 'stone', ground: true }; } }
    return best ? { t: bt, col: best } : null;
  }
  /** the nearest enemy volume along a ray -> { t, e, part } */
  rayEnemies(ray, maxT = 4000, withAllies = false) {
    let best = null, bt = maxT;
    for (const e of this.enemies) {
      const V = e.vols; if (!V || (!e.alive && !e.civ)) continue;
      if (e.ally && !withAllies) continue;
      for (const part in V) {
        const v = V[part]; if (part === 'hidden') continue;
        const t = v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r);
        if (t >= 0 && t < bt) { bt = t; best = { t, e, part }; }
      }
      if (e.hvols && e.alive) for (const part in e.hvols) { const v = e.hvols[part], t = v.c ? raySphere(ray.o, ray.d, v.c, v.r) : rayCapsule(ray.o, ray.d, v.a, v.b, v.r); if (t >= 0 && t < bt) { bt = t; best = { t, e, part: 'hostage' }; } }
    }
    return best;
  }
  /** a player's shot: the nearest of enemies, projectiles, the boss, objects and the world; applies it -> { at, kind, scoring } */
  resolveRay(ray, p, W, primary) {
    const hits = [], push = (t, k, d) => hits.push({ t, k, d });
    const w = this.rayWorld(ray, 4000); if (w) push(w.t, w.col.obj ? 'obj' : 'world', w.col);
    const en = this.rayEnemies(ray, w ? w.t : 4000, true); if (en) push(en.t, 'enemy', en);
    for (const pr of this.projectiles) { if (!pr.alive || pr.owner >= 0) continue; const t = raySphere(ray.o, ray.d, pr.pos, pr.r * 1.7); if (t >= 0) push(t, 'proj', pr); }
    if (this.boss && this.boss.rayTest) { const b = this.boss.rayTest(this, ray); if (b) push(b.t, 'boss', b); }
    hits.sort((a, b) => a.t - b.t);
    const dmg = W.dmg();
    for (const h of hits) {
      const at = V3.add(ray.o, V3.mul(ray.d, h.t));
      if (h.k === 'enemy') {
        const { e, part } = h.d;
        if (e.ally) { if (!this.allyBarkT || this.t > this.allyBarkT) { this.allyBarkT = this.t + 5; this.ev({ type: 'allyhit', e: e.id }); } continue; }
        if (part === 'shield') { this.ev({ type: 'impact', at, mat: 'metal', shield: true }); if (W.knock || p.weapon === 'gl') damageEnemy(this, e, 0, p, 'torso', { weapon: p.weapon }); return { at, kind: 'shield', scoring: false }; }
        if (part === 'hostage') { if (e.alive) civHit(this, { civHitT: 0, flash: 0, x: e.x, y: e.y, z: e.z, id: e.id }, p); return { at, kind: 'civ', scoring: false }; }
        if (e.civ) { civHit(this, e, p); return { at, kind: 'civ', scoring: false }; }
        if (!e.alive) continue;
        damageEnemy(this, e, dmg, p, part, { weapon: p.weapon });
        this.ev({ type: 'hitmark', p: p.id, head: part === 'head', at });
        return { at, kind: part === 'head' ? 'head' : 'enemy', scoring: true };
      }
      if (h.k === 'proj') { shootProjectile(this, h.d, p, dmg); this.ev({ type: 'hitmark', p: p.id, at }); return { at, kind: 'proj', scoring: true }; }
      if (h.k === 'boss') { const r = this.boss.hit(this, h.d, p, dmg, p.weapon, at); if (r === false) continue; this.ev({ type: 'hitmark', p: p.id, at, boss: true }); return { at, kind: 'boss', scoring: !!r }; }
      if (h.k === 'obj') { const r = hitObject(this, h.d.obj, p, dmg, p.weapon); this.ev({ type: 'impact', at, mat: h.d.impact }); if (r.scoring) { p.stats.hits++; addHitChain(p); } return { at, kind: 'obj', scoring: r.scoring }; }
      this.ev({ type: 'impact', at, mat: h.d.impact || 'stone', water: !!h.d.water });
      return { at, kind: 'world', scoring: false };
    }
    return { at: V3.add(ray.o, V3.mul(ray.d, 1200)), kind: 'none', scoring: false };
  }

  /* ---- results and checks ---- */
  stageResult(i) {
    const p = this.players[i], s0 = this.stageStart.stats[i] || {}, st = {}; for (const k in p.stats) st[k] = p.stats[k] - (s0[k] || 0);
    const conts = this.contUsed - this.contAtStage, acc = st.shots ? st.hits / st.shots : 0;
    return { stats: st, acc, rank: rankOf(p, st, conts), score: p.score, conts, accBonus: Math.round(acc * 100) * 300, noDamage: st.lost === 0 ? 20000 : 0 };
  }
  hash() {
    let h = 2166136261; const mix = v => { h ^= (Math.round(v * 100) | 0); h = Math.imul(h, 16777619); };
    mix(this.t); mix(this.sceneIdx); mix(this.timer);
    for (const p of this.players) { mix(p.score); mix(p.lives); mix(p.c); mix(p.mag); mix(p.ammo.mg); }
    for (const e of this.enemies) { mix(e.x); mix(e.y); mix(e.z); mix(e.hp); }
    return (h >>> 0).toString(16);
  }
  snapshot() {
    return { phase: this.phase, stage: this.stage.id, scene: this.scene.id, timer: +this.timer.toFixed(2), t: +this.t.toFixed(2),
      players: this.players.map(p => ({ score: p.score, lives: p.lives, c: +p.c.toFixed(2), weapon: p.weapon, mag: p.mag, ammo: Object.assign({}, p.ammo), out: p.out, chain: p.chain })),
      enemies: this.enemies.filter(e => e.alive && !e.ally).map(e => ({ id: e.id, type: e.type, state: e.state, hp: +e.hp.toFixed(2) })),
      threats: this.threats.filter(t => !t.done).map(t => ({ kind: t.kind, target: t.target, left: +(t.T - this.t).toFixed(2) })),
      boss: this.boss ? { id: this.boss.id, phase: this.boss.phaseName, hp: this.boss.hpFrac ? +this.boss.hpFrac().toFixed(3) : null } : null };
  }
}
TC.Sim = Sim;

// ---- 61-local.js ----
/* 61-local: Play, the presentation of one Sim on this machine: it turns each player's device (or the Autopilot, or the
 * network) into commands, steps the Sim, drains its events into effects, sounds, rumble and the HUD, and draws each
 * player's viewport (split screen for local co-op). Reads everything; owns no game rules. */
class Play {
  constructor(o) {
    this.o = o; this.sim = o.sim || new Sim(o);
    this.n = this.sim.players.length;
    this.inputs = o.inputs || [TC.game.input];
    this.aims = this.sim.players.map((p, i) => new Aim(this.inputs[i] || this.inputs[0], i));
    this.huds = this.sim.players.map((p, i) => new Hud(this, i));
    this.cams = this.sim.players.map(() => new CamFX());
    this.fx = new FX(); this.r3 = new Rail3D(); this.bots = o.bots || {}; this.t = 0; this.portraits = {}; this.slow = 0; this.doneT = 0;
    this.local = !o.net; this.net = o.net || null; this.view = o.view || null; this.props = {};
    this.lastScene = null; this.cardT = 0;
    TC.play = this;
  }
  portraitRig(who) {
    let r = this.portraits[who]; if (r !== undefined) return r;
    const sp = reg('speaker', who); r = sp ? new E.Humanoid(Object.assign({}, sp.rig)) : null; if (r) r.update(.016, { x: 0, y: 0, facing: Math.PI / 2 }); this.portraits[who] = r; return r;
  }
  /* ---- one update step ---- */
  update(dt) {
    const sim = this.sim, G = TC.game;
    this.t += dt;
    if (TC.dev && TC.dev.open) { TC.dev.update(dt, this); return; }
    if (tune.view.freeCam && TC.dev) TC.dev.flyStep(dt, this); else if (TC.dev) TC.dev.free = null;
    // commands (a session's Net steps the Sim itself: the host from everyone's commands, a replica from the host's frames)
    if (this.net) this.net.update(dt, this);
    else {
      const cmds = [];
      for (let i = 0; i < this.n; i++) cmds[i] = this.bots[i] ? this.bots[i].command(sim, i, dt) : this.localCmd(i, dt);
      sim.step(dt, cmds);
    }
    for (const ev of sim.drain()) this.onEvent(ev);
    this.fx.step(dt, sim);
    for (const c of this.cams) c.step(dt);
    for (const h of this.huds) h.step(dt);
    for (const id in this.props) this.props[id].step && this.props[id].step(dt);
    if (this.net) { this.slow = 0; G.timeScale = 1; }
    if (this.slow > 0) { this.slow -= dt / Math.max(.05, G.timeScale); G.timeScale = this.slow > 0 ? .35 : (tune.time.speed || 1); }
    else if (G.timeScale !== (tune.time.speed || 1) && !this.o.attract) G.timeScale = tune.time.speed || 1;
    // ambient effects
    const env = sim.stage.env;
    if (env.fireworks && this.fx.r() < dt * .45) { const f = sim.focus(); this.fx.firework([f[0] + 300 + this.fx.r() * 900, f[1] + (this.fx.r() - .5) * 1400, 160 + this.fx.r() * 200], (this.fx.r() * 3) | 0); if (this.local) Audio3.play('firework', { vol: .25 }); }
    if (env.storm) { this.fx.nextBolt -= dt; if (this.fx.nextBolt <= 0) { this.fx.nextBolt = 9 + this.fx.r() * 6; this.bolt = .25; if (TC.game.settings.flashes !== false) TC.game.flash('#ffffff', .12, .25); setTimeout && !HEADLESS && setTimeout(() => Audio3.play('thunder', { vol: .8 }), 500 + this.fx.r() * 900); } }
    this.bolt = Math.max(0, (this.bolt || 0) - dt);
    this.smokeT = Math.max(0, (this.smokeT || 0) - dt); this.smoke = Math.min(1, this.smokeT) * .65;
    // the music's layers follow the phase
    const ph = sim.phase;
    if (ph !== this.lastPhase) { this.lastPhase = ph; if (ph === 'action') { Audio3.layer('drums', 1); Audio3.layer('lead', 1); } else if (ph === 'travel') { Audio3.layer('drums', 0); Audio3.layer('lead', 0); } }
    if (ph === 'action' && sim.timer < 10 && !this.hurry) { this.hurry = true; const A = G.audio; if (A.song) A.tempo((A.song.bpm || 150) + 8); }
    if (ph !== 'action' && this.hurry) { this.hurry = false; const s = reg('song', Audio3.songId); if (s && G.audio.song) G.audio.tempo(s.bpm); }
    if (ph === 'action') { const s = Math.ceil(sim.timer); if (s !== this.lastSec) { this.lastSec = s; if (s <= 5 && s > 0) Audio3.play('timewarn', { vol: .7 }); else if (s <= 10 && s > 0) Audio3.play('timetick', { vol: .5 }); } }
  }
  /** a local player's command this step, from their device */
  localCmd(i, dt) {
    const sim = this.sim, I = this.inputs[this.net ? 0 : i] || this.inputs[0], A = this.aims[i], rect = this.rectFor(this.net ? 0 : i);
    if (!I || (tune.view.freeCam && i === 0)) return NOCMD;
    A.update(dt, rect, this.assistTargets(i, rect), sim.players[i].c > .5);
    const c = commandFrom(I, A);
    if (sim.cut || sim.phase === 'continue' || sim.players[i].out) { c.firePressed = c.firePressed || I.pressed('confirm') || I.pressed('start'); c.fireDown = c.fireDown || I.down('confirm'); }
    return c;
  }
  /** the local view of player i: the predicted cover and the local aim on a replica */
  localView(i) { const n = this.net; return n && !n.isHost && i === n.me ? { c: n.localC, aim: [this.aims[i].ax, this.aims[i].ay] } : null; }
  rectFor(i) { const G = TC.game, vps = G.viewports; if (vps && vps.length > 1 && vps[i]) { const v = vps[i]; return { x: v.x, y: v.y, w: v.w, h: v.h }; } return { x: 0, y: 0, w: G.screen.W, h: G.screen.H }; }
  /** aim-assist targets in view units for player i */
  assistTargets(i, rect) {
    const sim = this.sim, cam = sim.cameraFor(i), out = [];
    for (const e of sim.enemies) { if (!e.alive || e.civ || e.ally || !e.vols) continue; const c = e.vols.head ? e.vols.head.c : e.vols.body ? e.vols.body.c : null; if (!c) continue; const a = worldToAim(cam, [c[0], c[1], c[2] - 6]); if (a) out.push([a[0], a[1], 6 / a[2] / Math.tan(cam.fov * DEG / 2)]); }
    for (const pr of sim.projectiles) { if (pr.owner >= 0) continue; const a = worldToAim(cam, pr.pos); if (a) out.push([a[0], a[1], pr.r * 1.7 / a[2] / Math.tan(cam.fov * DEG / 2)]); }
    void rect; return out;
  }
  /* ---- events into effects ---- */
  onEvent(ev) {
    const sim = this.sim, fx = this.fx, hud = i => this.huds[i] || this.huds[0], all = f => this.huds.forEach(f), loc = this.local;
    const gunAt = i => { const c = sim.cameraFor(i), B = camBasis(c, 2, 2, {}); return [c.x + B.fx * 14 + B.rx * 7 - B.ux * 6, c.y + B.fy * 14 + B.ry * 7 - B.uy * 6, c.z + B.fz * 14 + B.rz * 7 - B.uz * 6]; };
    switch (ev.type) {
      case 'shot': {
        const W = reg('weapon', ev.w), g0 = gunAt(ev.p); fx.muzzle(g0, ev.w === 'sg' || ev.w === 'gl' ? 1.6 : ev.w === 'mg' ? .9 : 1);
        // tracers for the hitscan guns (ev.to: one end per ray); the launcher's round is drawn as itself (ev.to: one point)
        if (ev.w !== 'gl' && Array.isArray(ev.to)) ev.to.forEach((t, k) => { if (Array.isArray(t) && (ev.w !== 'hg' || k === 0)) fx.tracer(g0, t, ev.w === 'sg' ? [255, 210, 150] : [255, 235, 170], ev.w === 'hg' ? .04 : .06); });
        this.cams[ev.p] && this.cams[ev.p].recoil(W.recoil); if (ev.w === 'sg' || ev.w === 'gl') this.cams[ev.p].kick(.12);
        Audio3.play(W.sfx, { vol: ev.p === this.me() ? 1 : .5 });
        this.rumble(ev.p, ev.w === 'sg' ? .45 : ev.w === 'gl' ? .5 : .18, ev.w === 'sg' ? .12 : .06);
        break;
      }
      case 'impact': if (ev.at) { fx.impact(ev.at, ev.mat); Audio3.play('imp_' + (ev.mat || 'stone'), { at: ev.at, vol: .7 }); if (ev.mat === 'metal' && fx.r() < .3) Audio3.play('ricochet', { at: ev.at, vol: .5 }); } break;
      case 'ehit': { fx.burst(ev.at, 5, { speed: 40, g: 160, life: .35, size: 1.6, mode: 2, color: [90, 30, 40] }); fx.spark(ev.at, 2, [255, 255, 255]); Audio3.play('ehit', { at: ev.at }); const e = sim.enemyById(ev.e); if (e && e.rig && fx.r() < .4) Voice.bark('captor', 'hurt', { vol: .25 }); break; }
      case 'hitmark': hud(ev.p).mark(ev.head); break;
      case 'headshot': Audio3.play('head', { vol: .8 }); hud(ev.p).call('HEADSHOT', { scale: 1, life: .6, slot: 'top', color: '#ffd36a' }); break;
      case 'quick': hud(ev.p).call('QUICK KILL', { scale: 1, life: .6, slot: 'top', color: '#9fe3ff' }); break;
      case 'kill': { if (ev.kind !== 'drone' && ev.kind !== 'jetski') Voice.bark('captor', 'die', { vol: .3 }); if (ev.kind === 'drone') { fx.spark(ev.at, 16); fx.smoke(ev.at, 3); } break; }
      case 'score': if (ev.at) hud(ev.p).pop(ev.pts, ev.at); break;
      case 'eshot': {
        const e = sim.enemyById(ev.e), from = ev.from;
        fx.muzzle(from, ev.kind === 'gunner' || ev.kind === 'turret' ? 1.2 : .8, ev.ally ? [200, 230, 255] : [255, 200, 120]);
        if (ev.ally) { fx.tracer(from, ev.to, [180, 220, 255], .08); Audio3.play('hg', { at: from, vol: .4 }); break; }
        if (ev.miss && ev.to) { fx.tracer(from, ev.to, [255, 160, 90], .07); Audio3.play('whizz', { at: ev.to, vol: .6 }); if (fx.r() < .5) fx.impact(V3.add(ev.to, V3.mul(V3.norm(V3.sub(ev.to, from)), 30)), 'stone'); }
        else if (ev.p >= 0) { const c = sim.cameraFor(ev.p); fx.tracer(from, [c.x, c.y, c.z - 8], [255, 120, 80], .06); }
        Audio3.play(ev.kind === 'drone' ? 'zap' : ev.kind === 'gunner' || ev.kind === 'turret' ? 'minigun' : 'hg', { at: from, vol: .55, pitch: .8 });
        void e; break;
      }
      case 'threat': { if (ev.p === this.me() || this.local) { const at = null; void at; } if (ev.kind === 'redtide' || ev.kind === 'sniper') Audio3.play(ev.kind === 'sniper' ? 'laser' : 'chirp', { vol: .4 }); break; }
      case 'blocked': { const c = sim.cameraFor(ev.p), at = [c.x + Math.cos(c.yaw) * 16, c.y + Math.sin(c.yaw) * 16, c.z + 3]; fx.spark(at, 10); fx.impact(at, ev.kind === 'slash' ? 'metal' : 'wood'); Audio3.play('blocked'); Audio3.play('ricochet', { vol: .6 }); this.cams[ev.p] && this.cams[ev.p].kick(.12); hud(ev.p).call('SAFE', { scale: 1, life: .4, slot: 'top', color: '#9fe3ff' }); break; }
      case 'hurt': { hud(ev.p).hurtT = .5; this.cams[ev.p] && this.cams[ev.p].hit(); Audio3.play('hurt'); Voice.bark(sim.players[ev.p].agent, 'hurt', { vol: .5 }); this.rumble(ev.p, .6, .25); if (ev.why === 'time') break; hud(ev.p).call(ev.why === 'civilian' ? 'HOLD YOUR FIRE!' : 'HIT!', { scale: 2, life: .7, slot: 'top', color: '#ff5a4a' }); break; }
      case 'explode': { if (ev.arrival) { const c = sim.cameraFor(this.me() < 0 ? 0 : this.me()), d = Math.hypot(ev.at[0] - c.x, ev.at[1] - c.y); if (d < 50) { const k = (50 - d) / Math.max(1, d); ev.at = [ev.at[0] + (ev.at[0] - c.x) * k, ev.at[1] + (ev.at[1] - c.y) * k, ev.at[2]]; } } fx.explosion(ev.at, ev.r || 40); Audio3.play(ev.big ? 'boom' : 'boom_s', { at: ev.at }); for (let i = 0; i < this.n; i++) { const c = sim.cameraFor(i), d = Math.hypot(c.x - ev.at[0], c.y - ev.at[1]); this.cams[i].kick(clamp(1 - d / 600, 0, 1) * (ev.big ? .8 : .4)); if (d < 300) this.rumble(i, .5, .3); } if (ev.big && TC.game.settings.flashes !== false) TC.game.flash('#ffd890', .08, .3); break; }
      case 'launch': Audio3.play({ rocket: 'rocket', missile: 'rocket', grenade: 'bounce', harpoon: 'twang', torpedo: 'hiss', flare: 'pop', pgl: 'gl' }[ev.kind] || 'pop', { at: ev.at, vol: .6 }); break;
      case 'shotdown': all(h => h.call('SHOT DOWN!', { scale: 1, life: .7, slot: 'top', color: '#ffd36a' })); break;
      case 'pickup': { const W = reg('weapon', ev.w); hud(ev.p).banner(ev.first ? 'NEW WEAPON: ' + W.kind : W.kind + ' +' + ev.n, ev.first ? W.name + '  •  ' + 'SWITCH: ' + TC.label(this.inputs[ev.p] || TC.game.input, 'next') : null); Audio3.play(ev.first ? 'newweapon' : 'pickup'); if (ev.first) hud(ev.p).showPrompt('weapon'); break; }
      case '1up': hud(ev.p).call('1UP!', { scale: 3, life: 1, color: '#5ad17a' }); Audio3.play('oneup'); break;
      case 'extend': all(h => h.call('TIME EXTEND +' + ev.s, { scale: 2, life: 1, slot: 'top', color: '#9fe3ff' })); Audio3.play('pickup'); break;
      case 'timeup': all(h => h.call("TIDE'S IN!", { scale: 3, life: 1.6, color: '#5ab4ff', sub: 'TIME UP  •  LIFE LOST' })); Audio3.play('tidesin'); break;
      case 'action': all(h => h.call('ACTION!', { scale: 4, life: .9, color: '#ffd36a' })); Audio3.play('action'); if (ev.boss) Audio3.music(ev.boss === 'krake' || ev.boss === 'scylla' ? 'kingtide' : 'bossfight'); break;
      case 'scene': { const n = ev.n + 1; all(h => h.call('AREA ' + n, { scale: 2, life: 1.8, slot: 'top', color: '#9fe3ff', sub: ev.title })); break; }
      case 'clear': all(h => h.call('CLEAR!', { scale: 3, life: 1.3, color: '#ffffff', sub: 'TIME BONUS +' + fmt(ev.bonus) })); Audio3.play('pickup'); break;
      case 'say': all(h => h.say(ev.who, ev.text)); break;
      case 'line': Voice.say(ev.text, ev.who); break;
      case 'prompt': all(h => h.showPrompt(ev.id)); break;
      case 'bosscard': this.card = { name: ev.name, title: ev.title, who: ev.who, t: 0 }; Audio3.sting('bossintro'); break;
      case 'bossdown': this.slow = .6; all(h => h.call(ev.mini ? ev.name + ' DOWN!' : ev.name + ' DEFEATED!', { scale: 2, life: 2, color: '#ffd36a' })); break;
      case 'partdown': fx.explosion(ev.at, 34); Audio3.play('boom_s', { at: ev.at }); break;
      case 'spinup': Audio3.play('spinup', { at: ev.at }); break;
      case 'slash': Audio3.play('slash'); break;
      case 'civhit': hud(ev.p).call('HOLD YOUR FIRE!', { scale: 2, life: 1, slot: 'top', color: '#ff5a4a', sub: ev.range ? '-2,000' : '-5,000  •  LIFE LOST' }); break;
      case 'break': { const d = ev.debris; if (d === 'glass') { fx.impact(ev.at, 'glass'); fx.impact(ev.at, 'glass'); Audio3.play('glass', { at: ev.at }); } else if (d === 'fire') { fx.fire(ev.at, 6); Audio3.play('pop', { at: ev.at }); } else if (d === 'wood') { fx.burst(ev.at, 14, { speed: 90, g: 300, life: .9, size: 2.2, colors: [[150, 100, 60], [200, 150, 90], [110, 70, 40]] }); Audio3.play('wood', { at: ev.at }); } else { fx.spark(ev.at, 10); } if (ev.vapor) for (let k = 0; k < 6; k++) fx.smoke(ev.at, 2, [230, 240, 245], 8); break; }
      case 'intel': { hud(ev.p).banner('INTEL FOUND', '"' + INTEL[ev.n % INTEL.length] + '"'); Audio3.play('newweapon'); const got = E.store.get('tc3:intel', []); if (!got.includes(ev.n)) { got.push(ev.n); E.store.set('tc3:intel', got); } break; }
      case 'splash': fx.impact(ev.at, 'water'); fx.burst(ev.at, 14, { speed: 40, up: 90, g: 260, life: .9, size: 2.4, mode: 2, color: [210, 235, 255] }); Audio3.play('splash', { at: ev.at }); break;
      case 'thud': fx.burst(ev.at, 6, { speed: 30, g: 100, life: .5, size: 3, mode: 2, grow: 4, color: [150, 140, 130] }); break;
      case 'collapse': for (let k = 0; k < 4; k++) fx.explosion([ev.at[0], ev.at[1] - 100 + k * 60, ev.at[2]], 30); fx.burst(ev.at, 40, { speed: 120, g: 300, life: 1.4, size: 3, colors: [[150, 100, 60], [110, 70, 40]] }); Audio3.play('wood'); Audio3.play('boom'); break;
      case 'cutfx': if (ev.fx === 'fireworks') { const f = ev.at || sim.focus(); for (let k = 0; k < 5; k++) fx.firework([f[0] + (fx.r() - .5) * 200, f[1] + (fx.r() - .5) * 200, f[2] + 120 + fx.r() * 80], k % 3); Audio3.play('firework'); } else if (ev.fx === 'explosion') { fx.explosion(ev.at || sim.focus(), 80); Audio3.play('boom'); } else if (ev.fx === 'flash' && TC.game.settings.flashes !== false) TC.game.flash('#ffffff', .2, .6); break;
      case 'music': Audio3.music(ev.song); break;
      case 'sfx': Audio3.play(ev.name); break;
      case 'shake': for (const c of this.cams) c.kick(ev.k || .4); break;
      case 'continue': Audio3.music('continue'); break;
      case 'continued': Audio3.music(sim.stage.music); Audio3.play('oneup'); break;
      case 'gameover': break;
      case 'empty': Audio3.play('empty'); if (ev.p === 0 || this.local) hud(ev.p).showPrompt('reload'); break;
      case 'reload': Audio3.play('reload', { vol: .7 }); break;
      case 'switch': Audio3.play('switch', { vol: .7 }); break;
      case 'cover': Audio3.play(ev.on ? 'coverin' : 'coverout', { vol: .6 }); break;
      case 'shieldoff': Audio3.play('imp_metal'); all(h => h.call('SHIELD DOWN!', { scale: 1, life: .6, slot: 'top', color: '#ffd36a' })); break;
      case 'allyhit': { const e = sim.enemyById(ev.e); if (e) all(h => h.say(e.o.who || 'rook', 'Hey! Watch it!')); break; }
      case 'multikill': hud(ev.p).call(ev.n + ' IN ONE BLAST!', { scale: 1, life: .8, slot: 'top', color: '#ffb347' }); break;
      case 'stage': { Audio3.music(sim.stage.music); Audio3.ambience(sim.stage.env.ambience || (sim.stage.env.storm ? 'storm' : 'festival')); break; }
      case 'cutstart': this.cutCam = null; break;
      case 'lineend': break;
      case 'rocketfire': Audio3.play('rocket', { at: ev.at }); break;
      case 'return': hud(ev.p).call('BACK IN THE FIGHT', { scale: 2, life: 1.2, color: '#5ad17a' }); break;
      case 'final': all(h => { h.call('FINAL SHOT!', { scale: 4, life: 3, color: '#ff5a4a' }); h.prompt = null; h.seen.final = false; h.showPrompt('final'); }); this.slow = 3; Audio3.play('gong'); break;
      case 'slowmo': this.slow = Math.max(this.slow, ev.s || .6); break;
      case 'smoke': this.smokeT = ev.s || 3; for (let k = 0; k < 10; k++) fx.smoke([1560 + fx.r() * 40, -80 + (fx.r() - .5) * 60, 300], 3, [150, 150, 160], 14); break;
      case 'surge': for (const c of this.cams) c.kick(.6); all(h => h.call('TIDE RISING!', { scale: 3, life: 1.6, color: '#5ab4ff' })); Audio3.play('tidesin'); break;
      case 'coverhit': { const c = sim.cameraFor(0); fx.burst([c.x + Math.cos(c.yaw) * 14, c.y + Math.sin(c.yaw) * 14, c.z - 8], 20, { speed: 90, g: 300, life: .9, size: 2.4, colors: [[150, 100, 60], [200, 150, 90]] }); Audio3.play('wood'); all(h => h.call(ev.hp > 1 ? 'COVER CRACKED!' : ev.hp === 1 ? 'COVER BREAKING!' : 'COVER GONE!', { scale: 2, life: 1, slot: 'top', color: '#ff9a6a' })); break; }
      case 'swap': Audio3.play('coverout'); break;
      case 'locks': all(h => h.banner('GATE LOCKS', ev.left ? ev.left + ' LEFT' : 'ALL JAMMED!')); break;
      case 'bossstate': break;
    }
  }
  me() { return this.net ? this.net.me : 0; }
  rumble(i, k, s) { const I = this.inputs[i]; if (I && I.lastDevice === 'gamepad' && I.rumble && !this.bots[i]) I.rumble(k, s); }

  /* ---- drawing ---- */
  camFor(i) {
    const sim = this.sim, lv = this.localView(i); let cam;
    if (lv) { const p = sim.players[i], keep = p.c; p.c = lv.c; cam = sim.cameraFor(i); p.c = keep; } else cam = sim.cameraFor(i);
    if (tune.view.freeCam && TC.dev && TC.dev.free) cam = Object.assign({}, TC.dev.free, { fov: tune.view.fov });
    const sway = sim.scene && sim.scene.carrier && !sim.cut ? (sim.stage.env.swayK || 1.4) : 0;
    return this.cams[i] ? this.cams[i].apply(cam, sway) : cam;
  }
  draw(r) {
    const vp = r.viewport, i = vp ? vp.i : (this.view !== null ? this.view : 0), rect = vp ? { x: vp.x, y: vp.y, w: vp.w, h: vp.h } : { x: 0, y: 0, w: r.W, h: r.H };
    r.overlay(g => this.drawView(g, i, rect));
  }
  drawView(g, i, rect) {
    const sim = this.sim, R3 = this.r3, env = sim.stage.env, p = sim.players[i] || sim.players[0];
    R3.size(rect.w, rect.h); R3.wobble = !!TC.wobble;
    const cam = this.camFor(i); TC.listener = cam;
    R3.begin(cam, env, this.t); R3.flash = this.bolt > 0 ? this.bolt * 2 : 0;
    this.fx.draw(R3);
    if (sim.stage.lights) sim.stage.lights(R3, sim, this.t);
    for (const pr of sim.projectiles) if (pr.kind === 'flare' || pr.kind === 'rocket' || pr.kind === 'missile') R3.addLight(pr.pos[0], pr.pos[1], pr.pos[2], 90, .6);
    R3.drawWorld(sim.world);
    const R = this.helper(R3);
    // carriers
    for (const cid in sim.carriers) { const C = sim.carriers[cid], def0 = C.C; if (!def0.mesh || !C.M) continue; const M = this.swayM(C, cid); R3.drawMesh(meshOf(cid === sim.scene.carrier && MESHDEF[def0.mesh + '-open'] ? def0.mesh + '-open' : def0.mesh), M, {}); /* the car they ride: its open variant */ if (def0.mesh === 'speedboat') { const w = xform(M, [-36, 0, 0]); this.helm = this.helm || makeRig({ rng: () => .5 }, reg('speaker', 'mari').rig); this.helm.update(.016, { x: w[0], y: w[1], z: w[2], facing: C.yaw, pose: null }); if (sim.scene.carrier === cid || sim.cut) R3.drawRig(this.helm, w[0], w[1], w[2]); } }
    // the stage's moving props
    if (sim.stage.draw) sim.stage.draw(R, sim, this.t);
    // objects
    for (const ob of sim.objects) {
      if (!ob.alive && !(ob.K.hang && ob.fall !== undefined && ob.fall < 2)) continue;
      const c = [(ob.box[0] + ob.box[3]) / 2, (ob.box[1] + ob.box[4]) / 2, ob.at[2]];
      if (!R3.sees(c[0], c[1], c[2] + 8, 30)) continue;
      let M = mat34(ob.at[0], ob.at[1], ob.at[2], ob.yaw);
      if (ob.K.popup) M = mat34(ob.at[0], ob.at[1], ob.at[2], ob.yaw, 0, -(1 - ob.up) * Math.PI / 2 * .98);
      if (ob.K.hang) M = mat34(ob.at[0], ob.at[1], ob.at[2], ob.yaw + this.t * .3, 0, Math.sin(this.t * 1.7 + ob.id) * .12);
      R3.drawMesh(objMesh(ob.kind), M, { flash: ob.flash * .6, glow: ob.K.bonus ? .2 + .2 * Math.sin(this.t * 6) : 0 });
      if (ob.K.hang && ob.alive) R3.line([ob.at[0], ob.at[1], ob.at[2]], [ob.at[0], ob.at[1], ob.at[2] + 12], [60, 50, 40]);
      if (ob.K.hang && !ob.alive) this.fx.fire([ob.at[0], ob.at[1], ob.at[2]], 1, .5);
      if (ob.K.objective && ob.alive) R3.glow(c[0], c[1], c[2], 10, [255, 170, 60], .5 + .3 * Math.sin(this.t * 6));
    }
    // the boss
    if (sim.boss && sim.boss.D.draw) sim.boss.D.draw(R, sim.boss, sim);
    // enemies, civilians, allies
    for (const e of sim.enemies) {
      if (e.mesh) { if (e.D.ai === 'drone') { R3.drawMesh(meshOf('drone'), mat34(e.x, e.y, e.z, e.facing, e.alive ? 0 : e.deathT * 3, e.alive ? Math.sin(this.t * 3 + e.id) * .15 : e.deathT * 5), { flash: e.flash }); if (e.alive) R3.glow(e.x + Math.cos(e.facing) * 5, e.y + Math.sin(e.facing) * 5, e.z, 3, [255, 60, 60], .8); if (!e.alive) this.fx.smoke([e.x, e.y, e.z], 1, [50, 50, 56], 4); } continue; }
      if (!e.rig) continue;
      if (e.D.ai === 'jetski' && e.ski) { R3.drawMesh(meshOf('jetski'), mat34(e.ski.x, e.ski.y, e.ski.z + Math.sin(this.t * 9 + e.id) * 1, e.ski.yaw, Math.sin(this.t * 7 + e.id) * .06), { flash: e.flash }); if (this.fx.r() < .5) this.fx.add({ pos: [e.ski.x - Math.cos(e.ski.yaw) * 12, e.ski.y - Math.sin(e.ski.yaw) * 12, e.ski.z], vel: [(this.fx.r() - .5) * 30, (this.fx.r() - .5) * 30, 30], g: 200, life: .5, size: 2.5, mode: 2, color: [220, 240, 255] }); }
      if (e.z > -20 && !e.ski) R3.shadow(e.x, e.y, e.cover ? e.cover.at[2] : e.z);
      if (e.rope) R3.line(e.rope, [e.x, e.y, e.z + 26], [180, 160, 120]);
      R3.drawRig(e.rig, e.rig.x, e.rig.y, e.rig.z, { flash: e.flash * .8, alpha: e.alpha, light: e.civ || e.ally ? undefined : undefined });
      if (e.hostage) R3.drawRig(e.hostage, e.hostage.x, e.hostage.y, e.hostage.z, {});
      if (e.D.ai === 'shield') { const k = e.shieldOn ? 0 : 1, a = e.facing + k * 1.3, M = mat34(e.x + Math.cos(a) * 7, e.y + Math.sin(a) * 7, e.z + 1, a); R3.drawMesh(meshOf('riotshield'), M, { flash: e.flash * .5 }); }
      if (e.laser > 0 && e.alive) { const m = muzzle(e), c = sim.cameraFor(e.target >= 0 ? e.target : 0), spread = (1 - e.laser) * 60, to = [c.x + Math.cos(c.yaw) * 30 + Math.sin(this.t * 7) * spread, c.y + Math.sin(c.yaw) * 30 + Math.cos(this.t * 5) * spread, c.z - 4 + Math.sin(this.t * 9) * spread * .5]; R3.line(m, to, [255, 40, 40], 1); R3.glow(m[0], m[1], m[2], 3, [255, 60, 60], 1); }
      if (e.glint > 0 && e.alive) { const m = muzzle(e); R3.glow(m[0], m[1], m[2], 2 + e.glint * 4, [255, 255, 220], e.glint); }
    }
    // cutscene actors
    if (sim.cut) for (const id in sim.cut.actors) { const a = sim.cut.actors[id]; if (!a.hide) { R3.shadow(a.x, a.y, a.z); R3.drawRig(a.rig, a.x, a.y, a.z, {}); } }
    // projectiles
    for (const pr of sim.projectiles) {
      const P = PROJ[pr.kind] || {}, c = hexRGB(P.color || '#ffffff');
      if (pr.kind === 'flare') { R3.glow(pr.pos[0], pr.pos[1], pr.pos[2], 10, [255, 120, 40], 1); R3.splat(pr.pos[0], pr.pos[1], pr.pos[2], 4, [255, 230, 180], 1); this.fx.add({ pos: pr.pos.slice(), life: .3, size: 3, mode: 1, color: [255, 120, 40] }); continue; }
      if (pr.kind === 'torpedo') { R3.splat(pr.pos[0], pr.pos[1], pr.pos[2] + 2, 8, c, 0); this.fx.add({ pos: pr.pos.slice(), vel: [(this.fx.r() - .5) * 20, (this.fx.r() - .5) * 20, 20], g: 100, life: .8, size: 3, mode: 2, color: [230, 245, 255] }); continue; }
      R3.splat(pr.pos[0], pr.pos[1], pr.pos[2], pr.r * 1.2, c, 0);
      if (P.trail && this.fx.r() < .5) this.fx.smoke(pr.pos, 1, [180, 180, 186], 2, 2);
      if (pr.kind === 'grenade' || pr.kind === 'pgl') R3.glow(pr.pos[0], pr.pos[1], pr.pos[2], 3, [255, 80, 60], .4 + .4 * Math.sin(this.t * 20));
      if (pr.rope) R3.line(pr.rope, pr.pos, [200, 190, 170]);
    }
    R3.sky();
    this.fx.drawAfter(R3);
    if (env.rain) this.drawRain(R3, cam);
    const pc = this.localView(i) ? this.localView(i).c : p ? p.c : 0;
    if (p && pc > .3 && !sim.cut) R3.vignette(clamp((pc - .3) * .6, 0, .45));
    if (this.smoke > 0) R3.vignette(this.smoke * .6, [120, 120, 130], false);
    R3.present(g, rect.x, rect.y);
    if (this.huds[i]) this.huds[i].draw(g, rect, sim, R3);
    if (this.card && i === 0) this.drawCard(g, rect);
    if (TC.dev && TC.dev.open) TC.dev.draw(g, this);
    if (tune.view.perf && i === 0) txt(g, 'tris ' + R3.stats.tris + '  px ' + R3.stats.px + '  actors ' + R3.stats.actors + '  lights ' + R3.dyn.length + '  shadows ' + R3.stats.shadows, rect.x + 4, rect.y + rect.h - 58, '#8affaa');   // (above the cover prompt)
    if (TC.devOverlays) TC.devOverlays(g, this, R3, rect, i);
  }
  swayM(C, cid) { if (!C.M) return C.M; const t = this.t, k = cid === 'stingray' ? 0 : (this.sim.stage.env.swayK || 1.4); if (!k) return C.M; return mulMat34(C.M, mat34(0, 0, Math.sin(t * 1.3) * .8, 0, Math.sin(t * .7 + 1) * k * .6 * DEG, Math.sin(t * .9) * k * DEG)); }
  drawRain(R3, cam) {
    const col = R3.col, W = R3.W, H = R3.H, t = this.t;
    for (let k = 0; k < 160; k++) { const x = ((k * 97 + Math.floor(t * 300) * 13 + k * k) % W + W) % W, y0 = ((k * 61 + t * 420 * (1 + (k % 3) * .3)) % (H + 20)) - 20; for (let j = 0; j < 6; j++) { const y = Math.round(y0 + j), xx = Math.round(x - j * .4); if (y >= 0 && y < H && xx >= 0 && xx < W) { const i2 = y * W + xx, o = col[i2]; col[i2] = (255 << 24 | Math.min(255, ((o >> 16) & 255) + 50) << 16 | Math.min(255, ((o >> 8) & 255) + 50) << 8 | Math.min(255, (o & 255) + 46)) >>> 0; } } }
    void cam;
  }
  drawCard(g, rect) {
    const c = this.card; c.t += 1 / 60; if (c.t > 2.6) { this.card = null; return; }
    const W = rect.w, a = c.t < .25 ? c.t / .25 : c.t > 2.2 ? (2.6 - c.t) / .4 : 1, y = rect.y + rect.h * .58, x = rect.x + W * (1 - a) * .3;
    E.ui.box(g, x - 4, y, W * .7, 40, { bg: ['#3a0a14', '#14060a'], border: '#ff3b30', alpha: .9 });
    const rig = c.who && this.portraitRig(c.who); if (rig) try { rig.drawPortrait(g, x + 2, y + 3, 34, { zoom: 2.8, turn: .4, bg: '#2a0a14', frame: false }); } catch (e) { /* none */ }
    txt(g, c.name, x + 42, y + 5, '#ffd36a', { scale: 2 }); txt(g, c.title, x + 42, y + 24, '#ffffff');
  }
  /** a small drawing helper for stages and bosses */
  helper(R3) {
    const self = this;
    return {
      R3, t: this.t,
      mesh(id, M, o = {}) { R3.drawMesh(meshOf(id), M, o); },
      meshObj(kind, at, flash) { R3.drawMesh(objMesh(kind), mat34(at[0], at[1], at[2], 0), { flash: flash || 0 }); },
      rig(rig, x, y, z, o = {}) { R3.shadow(x, y, z); R3.drawRig(rig, x, y, z, { flash: o.flash || 0 }); },
      fire(at, k = 1) { if (self.fx.r() < .6) self.fx.fire(at, 1, k); if (self.fx.r() < .2) self.fx.smoke([at[0], at[1], at[2] + 10], 1, [40, 38, 42], 8); R3.addLight(at[0], at[1], at[2], 90, .5); },
      line(a, b, c) { R3.line(a, b, c); },
      glow(at, r, c, k) { R3.glow(at[0], at[1], at[2], r, c, k); },
      light(at, r, k) { R3.addLight(at[0], at[1], at[2], r, k); },
      fx: self.fx
    };
  }
}
TC.Play = Play;
const INTEL = [
  'Note to self: never trust a fish that winks. -J.',
  "Krake's coffee order: black, like the Current. Two sugars.",
  'Hammerhead keeps a photo of his mother in his helmet. She is also in a helmet.',
  'The Gull has never missed. The Gull has also never been to a party.',
  'Tidewall rule 12: do not feed the turbines. Rule 13: see rule 12.',
  'Black Current dental plan: none. Explains a lot.'
];
TC.INTEL = INTEL;

// ---- 62-net.js ----
/* 62-net: AI Hub Session Protocol v1, shared-world co-op for 1-4 players (lib/hub/README.md).
 * The host runs the authoritative Sim. Each client sends its player's input ('in', unreliable, 15/s: aim, held
 * buttons, cumulative press counters, its own cover with the hub time). The host streams every step's commands
 * ('f', reliable, 10/s, compact: a step with nothing new is a 0), so every copy runs the same deterministic Sim from
 * the same seed and sees the same enemies, bosses and score. Threats on a remote player resolve 0.2 s late, against the
 * cover that player reported for the impact time (the host decides; the outcome rides in the frame stream). A state
 * check ('h', 1/s) carries the host's scores and lives, which replicas adopt. The local camera and reticle are
 * predicted from local input at once. No title, menus or pause in a session; names only ever drawn on the canvas. */
const NET_STEP = 1 / 120;
const enc = c => (c.fireDown ? 1 : 0) | (c.firePressed ? 2 : 0) | (c.coverDown ? 4 : 0) | (c.coverPressed ? 8 : 0) | (c.next ? 16 : 0) | (c.prev ? 32 : 0) | (c.reload ? 64 : 0) | ((c.select || 0) << 7);
const dec = (n, aim) => ({ aim: aim || [0, 0], fireDown: !!(n & 1), firePressed: !!(n & 2), coverDown: !!(n & 4), coverPressed: !!(n & 8), next: !!(n & 16), prev: !!(n & 32), reload: !!(n & 64), select: (n >> 7) & 7 });
TC.netEnc = enc; TC.netDec = dec;

class Net {
  constructor(hub, info) {
    this.hub = hub; this.info = info; this.isHost = !!info.isHost; this.server = !!info.server;
    this.ids = info.players.map(p => p.id); this.me = this.server ? -1 : this.ids.indexOf(info.me);
    this.k = 0; this.frames = []; this.out = []; this.sendT = 0; this.inT = 0; this.hT = 0; this.remote = {}; this.counters = { f: 0, c: 0, n: 0, p: 0, r: 0 }; this.lastIn = {};
    this.buf = new Map(); this.next = 0; this.ended = false; this.finished = false; this.tl = []; this.leaves = []; this.pendingLeave = []; this.lastAim = [0, 0]; this.bucket = 18; this.bucketT = 0;
    this.localC = 0;
    this.off = [hub.on('message', (d, from) => this.onMessage(d, from)), hub.on('leave', e => this.onLeave(e)), hub.on('time-up', e => this.onTimeUp(e)), hub.on('end', e => this.onEnd(e))];
  }
  /** a slot in the rate limiter (18 a second, the protocol allows 20) */
  canSend(n = 1) { return this.bucket >= n; }
  send(d, rel = true) { if (this.ended || !this.canSend()) return false; this.bucket--; try { return this.hub.send(d, { reliable: rel }); } catch (e) { return false; } }
  idxOf(hubId) { return this.ids.indexOf(hubId); }
  onMessage(d, from) {
    if (!d || this.ended) return;
    const i = this.idxOf(from);
    if (d.t === 'in' && this.isHost && i >= 0) this.remote[i] = d;
    if (d.t === 'f' && !this.isHost) { for (let j = 0; j < d.s.length; j++) this.buf.set(d.k + j, d.s[j]); }
    if (d.t === 'h' && !this.isHost) this.check = d;
  }
  onLeave(e) {
    const i = this.idxOf(e.id); if (i < 0) return;
    if (this.isHost) this.pendingLeave.push(i);
    if (e.id === this.info.host && !this.isHost) this.hostGone = true;
  }
  onTimeUp() { if (this.isHost && !this.finished) this.finish('time-up'); }
  onEnd(e) {
    this.ended = true; this.endReason = e.reason;
    try { TC.game.input.clear(); TC.game.audio.stopMusic(); TC.game.audio.mute(true); Audio3.ambience(null); } catch (err) { /* no audio */ }
  }
  /** the host's command for remote player i this step: held states from its last input, presses from its counters */
  remoteCmd(i) {
    const d = this.remote[i]; if (!d) return NOCMD;
    const L = this.lastIn[i] || (this.lastIn[i] = { f: d.fp || 0, c: d.cp || 0, n: d.nx || 0, p: d.pv || 0, r: d.rl || 0 });
    const c = { aim: [d.a[0] / 1000, d.a[1] / 1000], fireDown: !!d.fd, coverDown: !!d.cd, firePressed: false, coverPressed: false, next: false, prev: false, reload: false, select: d.w || 0 };
    if ((d.fp || 0) > L.f) { c.firePressed = true; c.fireDown = true; L.f++; }
    if ((d.cp || 0) > L.c) { c.coverPressed = true; L.c++; }
    if ((d.nx || 0) > L.n) { c.next = true; L.n++; }
    if ((d.pv || 0) > L.p) { c.prev = true; L.p++; }
    if ((d.rl || 0) > L.r) { c.reload = true; L.r++; }
    if (d.w === L.w) c.select = 0; L.w = d.w;
    return c;
  }
  /** the host decides a remote player's threat from the cover it reported for the impact's hub time */
  resolver(sim, th, p) {
    const d = this.tlFor(p.id), at = this.hubAt(th.T);
    if (!d || !d.length) return null;
    let c = null; for (const s of d) { if (s[0] <= at) c = s[1]; else break; }
    if (c === null) c = d[0][1];
    return c >= .5 ? 'blocked' : 'hit';
  }
  tlFor(i) { return this.remote[i] && this.remote[i].tl; }
  hubAt(simT) { const T = this.tl; if (!T.length) return simT * 1000; let a = T[0], b = T[T.length - 1]; for (let j = 1; j < T.length; j++) if (T[j][0] >= simT) { a = T[j - 1]; b = T[j]; break; } const u = b[0] === a[0] ? 0 : (simT - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * u; }
  /** one presentation update: steps the Sim (host: from commands; replica: from the host's frames) */
  update(dt, P) {
    const sim = P.sim, hub = this.hub, now = hub.time ? hub.time() : 0;
    this.bucketT += dt; if (this.bucketT >= 1 / 18) { this.bucket = Math.min(18, this.bucket + Math.floor(this.bucketT * 18)); this.bucketT = 0; }
    if (this.ended || now < 0) return;
    const local = this.me >= 0 ? P.localCmd(this.me, dt) : null;
    // the local player's input, to the host (aim, held buttons, cumulative presses, its cover timeline)
    if (local) {
      const C = this.counters; if (local.firePressed) C.f++; if (local.coverPressed) C.c++; if (local.next) C.n++; if (local.prev) C.p++; if (local.reload) C.r++;
      const want = (TC.coverToggle ? this.togOn : local.coverDown); if (TC.coverToggle && local.coverPressed) this.togOn = !this.togOn;
      this.localC = want ? Math.min(1, this.localC + dt / tune.player.coverIn) : Math.max(0, this.localC - dt / tune.player.coverOut);
      (this.myTl || (this.myTl = [])).push([Math.round(now), +this.localC.toFixed(2)]); while (this.myTl.length > 24) this.myTl.shift();
      if (local.select) this.lastSel = local.select;
      this.inT += dt;
      if (!this.isHost && this.inT >= 1 / 15) { this.inT = 0; this.send({ t: 'in', a: [Math.round(local.aim[0] * 1000), Math.round(local.aim[1] * 1000)], fd: local.fireDown ? 1 : 0, cd: local.coverDown ? 1 : 0, fp: C.f, cp: C.c, nx: C.n, pv: C.p, rl: C.r, w: this.lastSel || 0, tl: this.myTl.slice(-12) }, false); }
    }
    if (this.isHost) {
      const n = Math.round(dt / NET_STEP) || 1;
      for (let s = 0; s < n; s++) {
        const cmds = [], frame = { c: [], a: {}, o: {}, l: [] };
        for (let i = 0; i < sim.players.length; i++) cmds[i] = i === this.me ? (s === 0 ? local : Object.assign({}, local, { firePressed: false, coverPressed: false, next: false, prev: false, reload: false, select: 0 })) : this.remoteCmd(i);
        for (const i of this.pendingLeave.splice(0)) { sim.players[i].present = false; sim.players[i].left = true; frame.l.push(i); }
        sim.resolver = (th, p) => this.resolver(sim, th, p); sim.onResolved = (th, r) => { frame.o[th.id] = r === 'hit' ? 1 : 0; };
        sim.step(NET_STEP, cmds);
        this.tl.push([sim.t, now]); if (this.tl.length > 400) this.tl.splice(0, 100);
        let any = frame.l.length || Object.keys(frame.o).length;
        cmds.forEach((c, i) => { const e = enc(c || NOCMD); frame.c[i] = e; if (e) any = true; if (c && (c.fireDown || c.firePressed)) { frame.a[i] = [Math.round(c.aim[0] * 1000), Math.round(c.aim[1] * 1000)]; any = true; } });
        this.out.push(any ? frame : 0); this.k++;
      }
      this.sendT += dt; this.hT += dt;
      if (this.sendT >= .1 && this.out.length) { this.sendT = 0; if (this.send({ t: 'f', k: this.k - this.out.length, s: this.out })) this.out = []; }
      if (this.hT >= 1) { this.hT = 0; this.send({ t: 'h', k: this.k, sc: sim.players.map(p => p.score), lv: sim.players.map(p => p.lives), h: sim.hash() }); }
      if (!this.finished && (sim.phase === 'done' || sim.phase === 'gameover' || sim.players.every(p => p.left))) this.finish(sim.phase === 'done' ? 'won' : 'over');
    } else {
      // play the host's frames as they come, a few steps behind; catch up when far behind
      let steps = 0;
      const ahead = () => { let n = 0; while (this.buf.has(this.next + n)) n++; return n; };
      let budget = ahead() > 30 ? 4 : ahead() > 8 ? 2 : 1;
      while (budget-- > 0 && this.buf.has(this.next)) {
        const f = this.buf.get(this.next); this.buf.delete(this.next); this.next++;
        const cmds = sim.players.map((p, i) => f && f.c ? dec(f.c[i] || 0, f.a && f.a[i] ? [f.a[i][0] / 1000, f.a[i][1] / 1000] : (p.aim || [0, 0])) : NOCMD);
        if (f && f.l) for (const i of f.l) { sim.players[i].present = false; sim.players[i].left = true; }
        sim.forced = f && f.o ? f.o : null;
        sim.step(NET_STEP, cmds); steps++;
      }
      if (this.check && this.check.k <= this.next) { this.check.sc.forEach((v, i) => { if (sim.players[i]) sim.players[i].score = v; }); this.check.lv.forEach((v, i) => { if (sim.players[i]) sim.players[i].lives = v; }); this.check = null; }
      void steps;
    }
  }
  finish(why) {
    if (this.finished) return; this.finished = true;
    const sim = TC.play.sim, ps = sim.players.map((p, i) => ({ i, id: this.ids[i], p }));
    const order = ps.filter(q => !q.p.left).sort((a, b) => b.p.score - a.p.score), standings = [];
    for (const q of order) { const last = standings[standings.length - 1]; if (last && sim.players[this.idxOf(last[0])].score === q.p.score) last.push(q.id); else standings.push([q.id]); }
    const scores = {}, stats = {}; for (const q of ps) { scores[q.id] = q.p.score; const s = q.p.stats; stats[q.id] = { Kills: s.kills, Accuracy: (s.shots ? Math.round(s.hits / s.shots * 100) : 0) + '%', Headshots: s.heads, 'Cover saves': s.saves, 'Lives lost': s.lost }; }
    const best = f => { let b = null; for (const q of ps) if (!b || f(q.p) > f(b.p)) b = q; return b; };
    const acc = p => p.stats.shots ? p.stats.hits / p.stats.shots : 0, awards = [];
    const a1 = best(acc), a2 = best(p => p.stats.kills), a3 = best(p => p.stats.saves);
    if (a1) awards.push({ id: a1.id, title: 'Sharpshooter', detail: Math.round(acc(a1.p) * 100) + '% accuracy' });
    if (a2) awards.push({ id: a2.id, title: 'Pointman', detail: a2.p.stats.kills + ' kills' });
    if (a3) awards.push({ id: a3.id, title: 'Iron Wall', detail: a3.p.stats.saves + ' cover saves' });
    try { this.hub.finish({ standings, scores, won: why === 'won', stats, awards }); } catch (e) { /* the hub is gone */ }
  }
  dispose() { for (const f of this.off) try { f && f(); } catch (e) { /* none */ } }
}
TC.Net = Net;

/** the session scene: connect, our own card, the countdown, the round, the end */
function sessionScene() {
  return {
    camera: { zoom: false }, touch: [], pausable: false,
    enter() {
      this.state = 'connect'; this.t = 0; this.card = null; this.info = null;
      const hub = window.AIHub;
      hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
        if (!info) { TC.HUBOFF = true; TC.game.go('title'); return; }
        this.info = info; const stage = ((((info.round || 1) - 1) % 3) + 3) % 3 + 1; this.stage = stage;
        const players = info.players.map((p, i) => ({ name: p.name, color: p.color || SEAT_COLORS[i % 4], agent: AGENTS[i % 4] }));
        const sim = new Sim({ mode: 'host', stage, difficulty: 'normal', seed: (info.seed >>> 0) || 1, players, skipIntro: true });
        info.players.forEach((p, i) => { sim.players[i].remote = !(p.id === info.host && !info.server); sim.players[i].hubId = p.id; });
        this.net = new Net(hub, info);
        this.play = new Play({ sim, inputs: [TC.game.input], net: this.net, view: Math.max(0, this.net.me) });
        TC.run = { mode: 'hub', sim, players };
        hub.on('card', c => { this.card = c; });
        hub.on('start', () => { this.state = 'count'; });
        this.state = 'card'; Audio3.music('briefing');
        hub.ready();
      }).catch(() => { TC.game.go('title'); });
    },
    update(dt) {
      this.t += dt; const I = TC.game.input, hub = window.AIHub;
      if (this.net && this.net.ended) { this.state = 'end'; return; }
      if (this.state === 'card') {
        if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { try { hub.answer('ready'); } catch (e) { /* not yet */ } }
        if (I.pressed('more')) { try { hub.answer('more'); } catch (e) { /* not yet */ } }
        return;
      }
      if (this.state === 'count') { if (hub.time() >= 0) { this.state = 'play'; Audio3.music(this.play.sim.stage.music); } return; }
      if (this.state === 'play') { this.play.update(dt); }
    },
    draw(r) {
      const W = r.W, H = r.H;
      if (this.state === 'play' && this.play && !(this.net && this.net.server)) { this.play.draw(r); this.drawStrip(r); return; }
      r.overlay(g => {
        Flyover.draw(g, W, H, 1 / 60); E.px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#04060c'));
        if (this.state === 'connect') { logo(g, W / 2, H * .3, this.t); txt(g, 'CONNECTING TO THE HUB...', W / 2, H * .6, '#ffffff', { align: 'center', scale: 2 }); return; }
        if (this.state === 'end') { const rs = this.net.endReason; F.title(g, rs === 'host-left' ? 'HOST LEFT' : rs === 'sat-out' ? 'SAT OUT' : 'ROUND OVER', W / 2, H * .36, { scale: 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', align: 'center' }); txt(g, rs === 'host-left' ? 'ROUND VOID' : rs === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'WELL FOUGHT, AGENTS', W / 2, H * .58, '#ffd36a', { align: 'center', scale: 2 }); return; }
        if (this.net && this.net.server && this.state === 'play') { const s = this.play.sim; txt(g, 'HOSTING  •  ' + s.players.filter(p => p.present).length + ' AGENTS  •  AREA ' + s.stage.id + '-' + (s.sceneIdx + 1), W / 2, H / 2, '#ffffff', { align: 'center', scale: 2 }); return; }
        // our own card: the stage, the players with their ready ticks, the goal, this device's controls, the countdown
        const st = reg('stage', this.stage || 1), info = this.info, c = this.card || {};
        logo(g, W / 2, 16, this.t, .5);
        txt(g, 'STAGE ' + st.num + '  •  ' + st.name, W / 2, 56, '#ffd36a', { align: 'center', scale: 2 }); txt(g, st.place + '  •  ' + st.clock, W / 2, 74, '#9fe3ff', { align: 'center' });
        (info ? info.players : []).forEach((p, k) => { const x = W / 2 - 150 + k * 76, ready = (c.ready || []).includes(p.id); E.ui.box(g, x, 88, 70, 46, { bg: ['#10244a', '#081428'], border: p.color || SEAT_COLORS[k] }); txt(g, String(p.name).slice(0, 10), x + 35, 92, p.color || SEAT_COLORS[k], { align: 'center' }); txt(g, reg('speaker', AGENTS[k % 4]).name, x + 35, 104, '#ffffff', { align: 'center' }); txt(g, ready ? 'READY!' : '...', x + 35, 118, ready ? '#5ad17a' : '#8aa0c8', { align: 'center' }); });
        txt(g, 'GOAL: ' + TC.ABOUT.hub.goal, W / 2, 144, '#ffffff', { align: 'center' });
        promptLine(g, TC.game.input, ['AIM: MOUSE OR STICK   ', { a: 'fire' }, ' FIRE   HOLD ', { a: 'cover' }, ' COVER + RELOAD'], W / 2, 158);
        const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
        txt(g, c.starting ? 'STARTING...' : c.paused ? 'PAUSED: MORE TIME ASKED (' + (c.asking || 0) + ')' : left !== null ? 'STARTS IN ' + left : '', W / 2, 176, '#ffd36a', { align: 'center', scale: 2 });
        promptLine(g, TC.game.input, [{ a: 'confirm' }, ' READY   ', { a: 'more' }, c.asked ? ' TAKE BACK MORE TIME' : ' MORE TIME'], W / 2, H - 24);
        if (this.state === 'count') { const s = Math.ceil(-window.AIHub.time() / 1000); F.title(g, String(Math.max(1, s)), W / 2, H / 2 - 20, { scale: 6, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' }); }
      });
    },
    /** teammates at the top right: name in the seat color, lives, a dot when in cover */
    drawStrip(r) {
      const sim = this.play.sim; r.overlay(g => { let y = 4; sim.players.forEach((p, i) => { if (i === this.net.me) return; const x = r.W - 92; E.ui.box(g, x, y, 88, 12, { bg: ['#10244a', '#081428'], border: p.color, alpha: .8 }); txt(g, String(p.name).slice(0, 8), x + 3, y + 2, p.color); txt(g, (p.left ? 'LEFT' : '♥' + p.lives) + (p.c > .5 ? ' •' : ''), x + 85, y + 2, '#ffffff', { align: 'right' }); y += 14; }); });
    }
  };
}
TC.sessionScene = sessionScene;

// ---- 90-main.js ----
/* 90-main: new E.Game, the settings and pause items we add to the engine's standard ones, the boot steps, every
 * engine scene (title, menu, difficulty, select, coop, briefing, play, results, gameover, records, about, howto,
 * ending, attract, session, server) and game.debug for the tests and tools. */
const HUB = typeof AIHub !== 'undefined' && !!AIHub.active;
TC.HUB = HUB;
const SETTINGS = [
  { key: 'difficulty', group: 'Game', label: 'Difficulty (new runs)', type: 'select', value: 'normal', options: [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']], help: 'Lives, time and how hard the Black Current shoots' },
  { key: 'aimAssist', group: 'Game', label: 'Aim assist (controller)', type: 'select', value: 'medium', options: [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], apply: (g, v) => { TC.assistLevel = { off: 0, low: .35, medium: .6, high: .85 }[v]; } },
  { key: 'padSpeed', group: 'Game', label: 'Aim speed (controller)', type: 'slider', value: 1, min: .5, max: 2, step: .05, unit: '×', apply: (g, v) => { TC.settingsPadSpeed = v; } },
  { key: 'coverMode', group: 'Game', label: 'Cover control', type: 'select', value: 'hold', options: [['hold', 'Hold'], ['toggle', 'Toggle']], apply: (g, v) => { TC.coverToggle = v === 'toggle'; } },
  { key: 'autoFire', group: 'Game', label: 'Hold fire to repeat (handgun)', type: 'toggle', value: true, apply: (g, v) => { TC.autoFire = !!v; } },
  { key: 'reticle', group: 'Game', label: 'Reticle', type: 'select', value: 'cross', options: [['cross', 'Cross'], ['ring', 'Ring'], ['dot', 'Dot']], apply: (g, v) => { TC.reticleStyle = v; } },
  { key: 'reticleSize', group: 'Game', label: 'Reticle size', type: 'select', value: 'M', options: [['S', 'Small'], ['M', 'Medium'], ['L', 'Large']], apply: (g, v) => { TC.reticleSize = v; } },
  { key: 'threatSize', group: 'Game', label: 'Crisis rings', type: 'select', value: 'Normal', options: [['Normal', 'Normal'], ['Large', 'Large']], apply: (g, v) => { TC.threatSize = v; } },
  { key: 'subtitles', group: 'Game', label: 'Subtitles', type: 'toggle', value: true, apply: (g, v) => { TC.subtitles = !!v; } },
  { key: 'wobble', group: 'Game', label: 'Retro texture wobble', type: 'toggle', value: false, apply: (g, v) => { TC.wobble = !!v; } }
];
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, input: PRESET, id: 'tide-crisis-3', bg: '#04060c',
  autoPause: !HUB, corner: !HUB, fullscreen: HUB ? false : undefined, backGesture: !HUB,
  menu: HUB ? false : {
    items: [['Restart area', () => { game.resume(); if (TC.play) TC.play.sim.restartScene(); }], ['Restart stage', () => { game.resume(); if (TC.play) { const s = TC.play.sim; s.jump(s.stage.id, s.stage.scenes[0]); } }], ['How to play', () => { game.resume(); game.go('howto', { back: 'play' }); }], ['Dev mode', () => { if (game.shell) game.shell.hide(); game.resume(); TC.dev.show(); }]],
    settings: SETTINGS, controls: ACTION_NAMES, quit: 'title'
  }
});
TC.game = game;
for (const s of SETTINGS) if (s.apply) s.apply(game, game.settings[s.key]);
const arcade = new E.Arcade(game, { id: 'tide-crisis-3', lives: 5, hud: false });
TC.arcade = arcade;
if (!HEADLESS) addEventListener('keydown', () => { TC._keySeen = true; }, { capture: true });

/* ---- run state across scenes: the Sim of an ARCADE or STAGE run ---- */
TC.run = null;
function newRun(o) {
  const diff = o.difficulty || game.settings.difficulty || 'normal';
  const players = o.coop ? [{ name: 'P1', agent: 'kai', color: SEAT_COLORS[0] }, { name: 'P2', agent: 'rook', color: SEAT_COLORS[1] }] : [{ name: 'P1', agent: 'kai', color: SEAT_COLORS[0] }];
  TC.run = { mode: o.mode, stage: o.stage || 1, difficulty: diff, coop: !!o.coop, table: o.mode === 'arcade' ? (o.coop ? 'coop' : 'arcade') : 'stage' + (o.stage || 1), sim: null, players };
  return TC.run;
}
TC.newRun = newRun;
function startPlay(stage) {
  const run = TC.run;
  if (!run.sim) run.sim = new Sim({ mode: run.coop ? 'coop' : run.mode === 'range' ? 'range' : 'stage', stage, difficulty: run.difficulty, seed: (Date.now() & 0xffffff) ^ 0x51, players: run.players });
  else if (run.sim.stage.id !== stage) run.sim.nextStage(stage);
  game.go('play', {});
}
TC.startPlay = startPlay;

/* ---- the scenes ---- */
const scenes = {};
scenes.title = {
  camera: { zoom: false }, touch: [],
  enter() { Idle.reset(); Audio3.music('theme'); Audio3.ambience(null); game.timeScale = 1; game.allowJoin(false); this.t = 0; },
  update(dt) {
    this.t += dt;
    const I = game.input, idle = Idle.step(dt);
    if (touchOnly()) { const c = I.clicked(); if (c && this.gear && c[0] >= this.gear[0] && c[0] < this.gear[0] + this.gear[2] && c[1] >= this.gear[1] && c[1] < this.gear[1] + this.gear[3]) game.menu('settings'); if (idle > 10) game.go('attract'); return; }
    if (idle > 10) { game.go('attract'); return; }
    if (this.t > .5 && (I.anyPressed() || I.clicked())) { I.consumeAll(); Audio3.play('ui_ok'); game.go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; Flyover.draw(g, W, H, 1 / 60);
      logo(g, W / 2, H * .22, Flyover.t);
      txt(g, 'A CREST OPERATION  •  PORT LUMEN, 23:40', W / 2, H * .22 + 46, '#9fe3ff', { align: 'center' });
      if (touchOnly()) {
        E.ui.box(g, W / 2 - 110, H * .56, 220, 34, { bg: ['#3a0a14', '#14060a'], border: '#ff3b30' });
        txt(g, 'Controller or keyboard required', W / 2, H * .56 + 6, '#ffffff', { align: 'center' }); txt(g, 'Connect one, or press any key', W / 2, H * .56 + 18, '#ffd36a', { align: 'center' });
        const gx = W / 2 - 40, gy = H * .74; this.gear = [gx, gy, 80, 26]; E.ui.box(g, gx, gy, 80, 26, { bg: ['#1e5aa0', '#0e2a5a'], border: '#ffd36a' }); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; px.rect(g, gx + 13 + Math.cos(a) * 6 - 1, gy + 13 + Math.sin(a) * 6 - 1, 3, 3, '#ffffff'); } px.disc(g, gx + 13, gy + 13, 4, '#ffffff'); px.disc(g, gx + 13, gy + 13, 2, '#0e2a5a'); txt(g, 'SETTINGS', gx + 24, gy + 9, '#ffffff');
      } else if ((this.t * 2 | 0) % 2 === 0) {
        const I = game.input, pad = I.lastDevice === 'gamepad', fresh = !I.mouse.active && I.lastDevice === 'keyboard' && !TC._keySeen;
        if (pad || fresh) { const lab = I.label('confirm', 'gamepad'), tail = fresh ? '  OR ENTER / CLICK' : '', w1 = F.width('PRESS ', { scale: 2 }), w2 = (PS_ICON[lab] ? 14 : F.width(lab, { scale: 2 })) + 16, w3 = F.width(tail, { scale: 2 }), x = W / 2 - (w1 + w2 + w3) / 2, y = H * .66; txt(g, 'PRESS ', x, y + 4, '#ffffff', { scale: 2 }); btn(g, lab, x + w1, y, { scale: 2 }); txt(g, tail, x + w1 + w2 + 2, y + 4, '#ffffff', { scale: 2 }); }
        else txt(g, 'PRESS ENTER OR CLICK', W / 2, H * .66, '#ffffff', { align: 'center', scale: 2, outline: '#08142a', shadow: false });
      }
      txt(g, '© 2026 CREST ARCADE  •  ' + E.versionLabel().replace(/[^\x20-\x7e]/g, '•'), W / 2, H - 12, '#5a7ab0', { align: 'center' });
    });
  }
};
scenes.menu = {
  camera: { zoom: false }, touch: [],
  enter() {
    Idle.reset(); Audio3.music('theme'); game.allowJoin(false);
    this.m = new UIMenu([
      { label: 'ARCADE', desc: 'Stages 1 to 3, the full mission, one agent', act: () => { if (!E.store.get('tc3:seenTraining', false) && !TC._seenTraining) { game.go('offer'); return; } newRun({ mode: 'arcade' }); game.go('difficulty', { next: () => game.go('briefing', { stage: 1 }) }); } },
      { label: 'CO-OP', desc: 'Two agents, split screen: a second controller joins', act: () => game.go('coop') },
      { label: 'STAGE SELECT', desc: 'Any stage, any difficulty, a table each', act: () => game.go('select') },
      { label: 'TRAINING', desc: 'The CREST range: four drills, every mechanic', act: () => { newRun({ mode: 'range', stage: 'range' }); TC.run.sim = null; startPlay('range'); } },
      { label: 'RECORDS', desc: 'High scores, the range record, intel found', act: () => game.go('records') },
      { label: 'SETTINGS', desc: 'Sound, display, comfort, controls', act: () => game.menu('settings') },
      { label: 'ABOUT', desc: 'How to play, credits, source and feedback', act: () => game.go('about') }
    ], { back: () => game.go('title') });
  },
  update(dt) { if (Idle.step(dt) > 10) { game.go('attract'); return; } if (game.paused) return; this.m.update(dt); },
  draw(r) { r.overlay(g => { Flyover.draw(g, r.W, r.H, 1 / 60); E.px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#04060c')); logo(g, r.W / 2, 14, Flyover.t, .55); this.m.draw(g, r.W / 2, 52, 200, { gap: Math.min(24, (r.H - 86) / 7), footer: r.H - 22 }); }); }
};
/** the first ARCADE start offers Training once (seenTraining remembers the answer) */
scenes.offer = {
  camera: { zoom: false }, touch: [],
  enter() { this.t = 0; const seen = () => { TC._seenTraining = true; E.store.set('tc3:seenTraining', true); }; this.m = new UIMenu([{ label: 'TRAINING FIRST', desc: 'Juno runs you through cover, weapons and the crisis rings', act: () => { seen(); newRun({ mode: 'range', stage: 'range' }); TC.run.sim = null; startPlay('range'); } }, { label: 'STRAIGHT TO THE MISSION', desc: 'Port Lumen is waiting. You can train any time from the menu', act: () => { seen(); newRun({ mode: 'arcade' }); game.go('difficulty', { next: () => game.go('briefing', { stage: 1 }) }); } }], { back: () => game.go('menu') }); },
  update(dt) { this.t += dt; if (game.paused) return; this.m.update(dt); },
  draw(r) { r.overlay(g => { frame(g, r.W, r.H, 'FIRST MISSION?', this.t); const rig = this.rig || (this.rig = new E.Humanoid(reg('speaker', 'juno').rig)); rig.update(1 / 60, { x: 0, y: 0, facing: Math.PI / 2 }); E.ui.box(g, r.W / 2 - 150, 44, 300, 46, { bg: ['#10244a', '#081428'], border: '#ffd34a' }); try { rig.drawPortrait(g, r.W / 2 - 146, 48, 38, { zoom: 3, turn: .5, bg: '#1a2a4a' }); } catch (e) { /* none */ } txt(g, 'JUNO', r.W / 2 - 102, 50, '#ffd34a'); F.wrap('First time out, agent? The CREST range takes three minutes.', 240, {}).slice(0, 3).forEach((L, k) => txt(g, L, r.W / 2 - 102, 62 + k * 9, '#ffffff')); this.m.draw(g, r.W / 2, 104, 230, { gap: 30, footer: r.H - 22 }); }); }
};
scenes.difficulty = {
  camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; const pick = id => { if (TC.run) TC.run.difficulty = id; game.settings.set('difficulty', id); this.d.next && this.d.next(id); }; this.m = new UIMenu([{ label: 'EASY', desc: '7 lives, more time, fewer crisis shots', act: () => pick('easy') }, { label: 'NORMAL', desc: '5 lives: the arcade as it was meant', act: () => pick('normal') }, { label: 'HARD', desc: '3 lives, less time, Red Tide everywhere', act: () => pick('hard') }], { back: () => game.go('menu'), i: ['easy', 'normal', 'hard'].indexOf(game.settings.difficulty || 'normal') }); },
  update(dt) { if (game.paused) return; this.m.update(dt); },
  draw(r) { r.overlay(g => { frame(g, r.W, r.H, 'DIFFICULTY', Flyover.t += 1 / 60); this.m.draw(g, r.W / 2, 60, 200, { gap: 34 }); }); }
};
scenes.select = {
  camera: { zoom: false }, touch: [],
  enter() {
    const go = n => { newRun({ mode: 'stage', stage: n }); game.go('difficulty', { next: () => game.go('briefing', { stage: n }) }); };
    this.m = new UIMenu([1, 2, 3].map(n => { const st = reg('stage', n); return { label: 'STAGE ' + n, desc: st.name + '  •  ' + st.place, act: () => go(n), n }; }), { back: () => game.go('menu'), horizontal: true });
  },
  update(dt) { if (game.paused) return; this.m.update(dt); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, 'STAGE SELECT', Flyover.t += 1 / 60); this.m.rects = [];
      const cw = Math.min(120, (W - 40) / 3), gap = 8, x0 = W / 2 - (cw * 3 + gap * 2) / 2;
      this.m.items.forEach((it, k) => {
        const st = reg('stage', it.n), x = x0 + k * (cw + gap), y = 52, on = k === this.m.i, h = H - 100;
        E.ui.box(g, x, y, cw, h, { bg: on ? ['#1e5aa0', '#0e2a5a'] : ['#10244a', '#081428'], border: on ? '#ffd36a' : '#3aa0e8' });
        F.title(g, String(it.n), x + cw / 2, y + 8, { scale: 5, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' });
        txt(g, st.name, x + cw / 2, y + 52, '#ffffff', { align: 'center' }); txt(g, st.place, x + cw / 2, y + 64, '#9fe3ff', { align: 'center' }); txt(g, st.clock, x + cw / 2, y + 76, '#ffd36a', { align: 'center' });
        const best = (arcade.table('stage' + it.n)[0] || { score: 0 }).score; txt(g, 'BEST ' + fmt(best), x + cw / 2, y + h - 16, '#c8d4ec', { align: 'center' });
        this.m.rects[k] = [x, y, cw, h];
      });
      const I = game.input; promptLine(g, I, [{ a: 'left' }, ' ', { a: 'right' }, ' CHOOSE   ', { a: 'confirm' }, ' START'], W / 2, H - 40);
    });
  }
};
scenes.coop = {
  camera: { zoom: false }, touch: [],
  enter() { this.t = 0; this.joined = game.players.length > 1; game.allowJoin({ max: 2, keys: false, onJoin: () => { this.joined = true; Audio3.play('oneup'); } }); },
  update(dt) {
    this.t += dt; const I = game.input;
    if (game.paused) return;
    if (I.pressed('cancel')) { game.allowJoin(false); for (const p of game.players.slice(1)) game.removePlayer(p); game.go('menu'); return; }
    if (this.joined && (I.pressed('confirm') || I.clicked() || (game.players[1] && game.players[1].pressed('confirm')))) { game.allowJoin(false); newRun({ mode: 'arcade', coop: true }); game.go('difficulty', { next: () => game.go('briefing', { stage: 1 }) }); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, 'CO-OP', this.t);
      for (let k = 0; k < 2; k++) {
        const x = W / 2 - 150 + k * 156, on = k === 0 || this.joined, sp = reg('speaker', k ? 'rook' : 'kai');
        E.ui.box(g, x, 52, 144, H - 110, { bg: on ? ['#1e5aa0', '#0e2a5a'] : ['#10244a', '#081428'], border: on ? SEAT_COLORS[k] : '#3a4a6a' });
        txt(g, 'PLAYER ' + (k + 1), x + 72, 58, SEAT_COLORS[k], { align: 'center', scale: 2 });
        if (on) { const rig = TC.Flyover.rig || (TC.Flyover.rig = {}); const rr = rig[k] || (rig[k] = new E.Humanoid(sp.rig)); rr.update(1 / 60, { x: 0, y: 0, facing: Math.PI / 2, pose: 'hips' }); rr.drawPortrait(g, x + 42, 80, 60, { zoom: 3, turn: .4, bg: '#1a2a4a' }); txt(g, sp.name, x + 72, 146, '#ffffff', { align: 'center' }); txt(g, k ? 'CONTROLLER' : 'KEYBOARD, MOUSE OR CONTROLLER', x + 72, 158, '#9fe3ff', { align: 'center' }); }
        else if ((this.t * 2 | 0) % 2) { txt(g, 'PRESS START', x + 72, 100, '#ffffff', { align: 'center', scale: 2 }); txt(g, 'ON A SECOND CONTROLLER', x + 72, 120, '#9fe3ff', { align: 'center' }); }
      }
      promptLine(g, game.input, this.joined ? [{ a: 'confirm' }, ' BEGIN   ', { a: 'cancel' }, ' BACK'] : [{ a: 'cancel' }, ' BACK'], W / 2, H - 38);
    });
  }
};
scenes.briefing = {
  camera: { zoom: false }, touch: [],
  enter(d) {
    this.stage = reg('stage', d.stage); this.n = d.stage; this.i = 0; this.t = 0; this.lt = 0; Audio3.music('briefing');
    this.pages = this.stage.briefing || []; this.portraits = {};
    if (this.pages.length) Voice.say(this.pages[0][1], this.pages[0][0]);
  },
  update(dt) {
    this.t += dt; this.lt += dt; const I = game.input;
    if (game.paused) return;
    if ((I.pressed('cancel') || (I.pressed('cover') && I.lastDevice === 'mouse')) && this.t > .3) { I.consumeAll(); startPlay(this.n); return; }
    if ((I.pressed('confirm') || I.pressed('fire') || I.clicked()) && this.lt > .25) {
      I.consumeAll(); this.i++; this.lt = 0;
      if (this.i >= this.pages.length) { startPlay(this.n); return; }
      Voice.say(this.pages[this.i][1], this.pages[this.i][0]); Audio3.play('ui_move');
    }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, st = this.stage; frame(g, W, H, 'BRIEFING  •  STAGE ' + this.n, this.t);
      // the map of the Lumen Isles
      const mx = 16, my = 44, mw = Math.min(W * .48, 210), mh = H - 120;
      E.ui.box(g, mx, my, mw, mh, { bg: ['#0e2a4a', '#081a30'], border: '#3aa0e8' });
      for (let y = 0; y < mh - 4; y += 3) for (let x = 0; x < mw - 4; x += 3) { const n = E.noise2(x * .03 + 3, y * .03 + 7) + .3 * Math.sin(x * .05); if (n > .58) px.rect(g, mx + 2 + x, my + 2 + y, 3, 3, n > .7 ? '#5a7a4a' : '#3a5a3a'); }
      const pts = [[.25, .62, 'PORT LUMEN'], [.62, .3, "GULL'S REST"], [.82, .72, 'TIDEWALL']];
      pts.forEach(([u, v, name], k) => { const x = mx + u * mw, y = my + v * mh, on = k + 1 === this.n; px.disc(g, x, y, on ? 5 + Math.sin(this.t * 6) : 3, on ? '#ff3b30' : '#ffd36a'); txt(g, name, x, y + 7, on ? '#ffffff' : '#9fe3ff', { align: 'center' }); });
      for (let k = 0; k + 1 < pts.length; k++) { const a = pts[k], b = pts[k + 1]; for (let s = 0; s < 1; s += .04) px.dot(g, mx + lerp(a[0], b[0], s) * mw, my + lerp(a[1], b[1], s) * mh, '#ffffff'); }
      // objectives and the clock
      const ox = mx + mw + 12, ow = W - ox - 14;
      txt(g, st.name, ox, my, '#ffd36a', { scale: 2 }); txt(g, st.place + '  •  ' + st.clock, ox, my + 18, '#9fe3ff');
      (st.objectives || []).forEach((o, k) => { txt(g, '▸ ' + o, ox, my + 34 + k * 11, '#ffffff'); });
      // the speaker's page
      const pg = this.pages[Math.min(this.i, this.pages.length - 1)];
      if (pg) {
        const sp = reg('speaker', pg[0]), by = H - 70, rig = this.portraits[pg[0]] || (this.portraits[pg[0]] = new E.Humanoid(sp.rig));
        rig.update(1 / 60, { x: 0, y: 0, facing: Math.PI / 2 }); rig._talk = true;
        E.ui.box(g, 12, by, W - 24, 46, { bg: ['#10244a', '#081428'], border: sp.color });
        try { rig.drawPortrait(g, 16, by + 4, 38, { zoom: 3, turn: .5, bg: '#1a2a4a' }); } catch (e) { /* none */ }
        txt(g, sp.name, 60, by + 4, sp.color); const shown = Math.floor(this.lt * 40); let left = shown;
        F.wrap(pg[1], W - 84, {}).slice(0, 3).forEach((L, k) => { txt(g, L.slice(0, Math.max(0, left)), 60, by + 15 + k * 9, '#ffffff'); left -= L.length; });
      }
      promptLine(g, game.input, [{ a: 'confirm' }, ' NEXT   ', { a: 'cancel' }, ' SKIP'], W - 16, H - 18, 'right');
    });
  }
};
scenes.play = {
  // (not pausable while the dev panel is open: Escape / Options close the panel instead of opening the pause menu over it)
  get pausable() { return !HUB && !(TC.dev && TC.dev.open); }, camera: { zoom: false }, touch: [],
  enter(d = {}) {
    const run = TC.run;
    if (d.attract) return;
    const inputs = game.players.slice(0, run.sim.players.length);
    this.play = new Play({ sim: run.sim, inputs, bots: d.bots || {} });
    if (run.coop && inputs.length > 1) game.splitScreen(2, { layout: 'columns' }); else game.splitScreen(0);
    Audio3.music(run.sim.stage.music); Audio3.ambience(run.sim.stage.env.ambience || (run.sim.stage.env.storm ? 'storm' : 'festival'));
    this.endT = 0;
  },
  exit() { game.splitScreen(0); game.timeScale = 1; if (TC.dev) TC.dev.hide(); Audio3.ambience(null); },
  update(dt) {
    const P = this.play; if (!P) return;
    // a second pad's Start drops P2 in during ARCADE (split screen)
    P.update(dt);
    const sim = P.sim;
    if (sim.phase === 'done') { this.endT += dt; if (this.endT > 1.2) { Audio3.sting('clear'); game.go('results', {}); } }
    if (sim.phase === 'gameover') { this.endT += dt; if (this.endT > 1.5) game.go('gameover', { score: Math.max(...sim.players.map(p => p.score)), over: true }); }
  },
  draw(r) { if (this.play) this.play.draw(r); },
  hud() {}
};
scenes.results = {
  camera: { zoom: false }, touch: [],
  enter() { const run = TC.run; this.res = new Results(run.sim, 0, {}); Audio3.music('results'); },
  update(dt) {
    if (game.paused) return;
    this.res.update(dt, game.input);
    if (!this.res.done) return;
    const run = TC.run, sim = run.sim, n = sim.stage.id;
    if (run.mode === 'range') { const best = E.store.get('tc3:range', 0), t = sim.players[0].stats.time; if (!best || t < best) E.store.set('tc3:range', t); E.store.set('tc3:seenTraining', true); TC._seenTraining = true; game.go('menu'); return; }
    if (run.mode === 'arcade' && n < 3) { game.go('briefing', { stage: n + 1 }); return; }
    if (run.mode === 'arcade') { game.go('ending', {}); return; }
    game.go('gameover', { score: sim.players[0].score, won: true });
  },
  draw(r) { r.overlay(g => this.res.draw(g, r.W, r.H)); }
};
scenes.gameover = {
  camera: { zoom: false }, touch: [],
  enter(d) {
    this.d = d; this.t = 0; this.phase = 'over'; const run = TC.run; this.table = run ? run.table : 'arcade';
    Audio3.music(null); Audio3.sting(d.won ? 'clear' : 'gameover');
    this.score = d.score || 0;
  },
  update(dt) {
    this.t += dt; const I = game.input; arcade.update(dt);
    if (this.phase === 'over' && this.t > 2.4) { if (arcade.qualifies(this.score, this.table)) { this.phase = 'entry'; arcade.enter(this.score, this.table, () => { this.phase = 'table'; this.t = 0; }); } else { this.phase = 'table'; this.t = 0; } }
    if (this.phase === 'table' && this.t > .6 && (I.pressed('confirm') || I.clicked() || this.t > 12)) { I.consumeAll(); TC.run = null; game.go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, null, this.t);
      if (this.phase === 'over') { F.title(g, this.d.won ? 'MISSION COMPLETE' : 'GAME OVER', W / 2, H * .35, { scale: 3, colors: this.d.won ? ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'] : ['#ffffff', '#ff9a8a', '#ff3b30', '#6a0a0a'], outline: '#08142a', depth: 3, align: 'center' }); txt(g, 'SCORE ' + fmt(this.score), W / 2, H * .55, '#ffffff', { align: 'center', scale: 2 }); }
      if (this.phase === 'entry') { txt(g, 'NEW HIGH SCORE!', W / 2, 30, '#ffd36a', { align: 'center', scale: 2 }); txt(g, fmt(this.score), W / 2, 50, '#ffffff', { align: 'center', scale: 2 }); }
      if (this.phase === 'table') arcade.drawTable({ overlay: f => f(g), W, H, text: (s, x, y, c, o) => txt(g, s, x, y, c, o) }, this.table, 30, 'HIGH SCORES  •  ' + this.table.toUpperCase());
    });
    if (this.phase === 'entry') arcade.draw(r);
  }
};
scenes.records = {
  camera: { zoom: false }, touch: [],
  enter() { this.pages = ['arcade', 'coop', 'stage1', 'stage2', 'stage3', 'range', 'intel']; this.i = 0; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input; if (game.paused) return;
    if (I.pressed('cancel') || I.pressed('confirm') && this.t > .3 || (I.pressed('cover') && I.lastDevice === 'mouse')) { I.consumeAll(); game.go('menu'); return; }
    if (I.pressed('right') || I.pressed('next')) { this.i = (this.i + 1) % this.pages.length; Audio3.play('ui_move'); }
    if (I.pressed('left') || I.pressed('prev')) { this.i = (this.i + this.pages.length - 1) % this.pages.length; Audio3.play('ui_move'); }
    const c = I.clicked(); if (c) { this.i = (this.i + (c[0] > TC.game.screen.W / 2 ? 1 : this.pages.length - 1)) % this.pages.length; Audio3.play('ui_move'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, pg = this.pages[this.i]; frame(g, W, H, 'RECORDS', this.t);
      txt(g, '← ' + (this.i + 1) + ' / ' + this.pages.length + ' ▸', W / 2, 38, '#9fe3ff', { align: 'center' });
      if (pg === 'range') { const b = E.store.get('tc3:range', 0); txt(g, 'CREST RANGE  •  BEST TIME', W / 2, 70, '#ffd36a', { align: 'center', scale: 2 }); txt(g, b ? b.toFixed(2) + ' s' : '--', W / 2, 100, '#ffffff', { align: 'center', scale: 3 }); }
      else if (pg === 'intel') { const got = E.store.get('tc3:intel', []); txt(g, 'INTEL  •  ' + got.length + ' / ' + INTEL.length + ' BOTTLES', W / 2, 52, '#ffd36a', { align: 'center', scale: 2 }); INTEL.forEach((s, k) => { const y = 74 + k * 22, on = got.includes(k); E.px.sprite(g, ICON.bottle, 20, y - 2); F.wrap(on ? s : '??? (a green bottle somewhere in stage ' + (Math.floor(k / 2) + 1) + ')', W - 50, {}).slice(0, 2).forEach((L, j) => txt(g, L, 36, y + j * 9, on ? '#ffffff' : '#5a6a80')); }); }
      else arcade.drawTable({ overlay: f => f(g), W, H, text: (s, x, y, c, o) => txt(g, s, x, y, c, o) }, pg, 52, pg.toUpperCase().replace('STAGE', 'STAGE '));
      promptLine(g, game.input, [{ a: 'prev' }, ' / ', { a: 'next' }, ' PAGE   ', { a: 'cancel' }, ' BACK'], W / 2, H - 20);
    });
  }
};
scenes.about = {
  camera: { zoom: false }, touch: [],
  enter() { this.i = 0; this.t = 0; },
  update(dt) {
    this.t += dt; const I = game.input, n = aboutFlow(game.screen.W, game.screen.H).length; if (game.paused) return;
    if (I.pressed('cancel') || (I.pressed('cover') && I.lastDevice === 'mouse')) { I.consumeAll(); game.go('menu'); return; }
    if (I.pressed('right') || I.pressed('next') || I.pressed('confirm')) { this.i = (this.i + 1) % n; Audio3.play('ui_move'); }
    if (I.pressed('left') || I.pressed('prev')) { this.i = (this.i + n - 1) % n; Audio3.play('ui_move'); }
    const c = I.clicked(); if (c) { this.i = (this.i + (c[0] > TC.game.screen.W / 2 ? 1 : n - 1)) % n; Audio3.play('ui_move'); }
  },
  draw(r) { r.overlay(g => drawAboutPage(g, r.W, r.H, this.i, this.t)); }
};
/** the About pages flowed to the screen: a long section continues on the next page, nothing is cut */
function aboutFlow(W, H) {
  const key = W + 'x' + H; if (TC._flow && TC._flow.key === key) return TC._flow.pages;
  const lh = 9, top = 52, maxY = H - 34, out = [];
  for (const pg of TC.ABOUT.pages) {
    let cur = { title: pg.title, lines: [] }, y = top; out.push(cur);
    const add = (text, color, x) => { if (y + lh > maxY) { cur = { title: pg.title + ' (cont.)', lines: [] }; out.push(cur); y = top; } cur.lines.push({ text, color, x, y }); y += lh; };
    for (const [k, v] of pg.rows) {
      if (k) { if (y + 2 * lh > maxY) y = maxY; add(k, '#ffd36a', 14); }
      for (const L of F.wrap(String(v), W - 34, {})) add(L, '#ffffff', k ? 22 : 14);
      y += 3;
    }
  }
  TC._flow = { key, pages: out }; return out;
}
TC.aboutFlow = aboutFlow;
function drawAboutPage(g, W, H, i, t) {
  const pages = aboutFlow(W, H), pg = pages[((i % pages.length) + pages.length) % pages.length]; frame(g, W, H, pg.title, t);
  txt(g, '← ' + (pages.indexOf(pg) + 1) + ' / ' + pages.length + ' →', W / 2, 38, '#9fe3ff', { align: 'center' });
  for (const L of pg.lines) txt(g, L.text, L.x, L.y, L.color);
  promptLine(g, game.input, [{ a: 'prev' }, ' / ', { a: 'next' }, ' PAGE   ', { a: 'cancel' }, ' BACK'], W / 2, H - 20);
}
TC.drawAboutPage = drawAboutPage;
scenes.howto = {
  camera: { zoom: false }, touch: [],
  enter(d) { this.d = d || {}; this.t = 0; },
  update(dt) { this.t += dt; const I = game.input; if (this.t > .3 && (I.pressed('cancel') || I.pressed('confirm') || I.clicked())) { I.consumeAll(); if (this.d.back === 'play' && TC.play) { game.go('play', { resume: true }); } else game.go('menu'); } },
  draw(r) { r.overlay(g => drawHowTo(g, r.W, r.H, this.t)); }
};
function drawHowTo(g, W, H, t) {
  frame(g, W, H, 'HOW TO PLAY', t); const I = game.input;
  const rows = [[['AIM: '], 'mouse or right stick (keys: arrows)'], [['FIRE: ', { a: 'fire' }], 'shoot what pops out'], [['HOLD ', { a: 'cover' }], 'duck behind cover: safe, and you reload there'], [[{ a: 'next' }, ' / ', { a: 'prev' }], 'switch weapons (or fire while in cover)'], [[{ a: 'reload' }], 'quick reload (ducks for a moment)'], [['RED RINGS '], 'a shot that WILL hit you: duck before it closes'], [['ORANGE VESTS '], 'carry ammo: drop them for the special weapons'], [['TIME '], 'beat the clock in every area or the tide takes a life']];
  rows.forEach((rw, k) => { const y = 48 + k * 21; promptLine(g, I, rw[0], 20, y, 'left'); txt(g, rw[1], 132, y + 2, '#c8d4ec'); });
  txt(g, 'PRESS ' + TC.label(I, 'confirm') + ' TO GO BACK', W / 2, H - 20, '#ffd36a', { align: 'center' });
}
TC.drawHowTo = drawHowTo;
scenes.ending = {
  camera: { zoom: false }, touch: [],
  enter() { this.t = 0; Audio3.music('ending'); this.lines = TC.ABOUT.credits; this.rigs = ['kai', 'rook', 'mari', 'juno', 'hale', 'tejada', 'krake', 'barracuda', 'hammerhead', 'gull'].map(id => ({ id, rig: new E.Humanoid(reg('speaker', id).rig) })); },
  update(dt) { this.t += dt; const I = game.input; for (const r of this.rigs) r.rig.update(dt, { x: 0, y: 0, facing: Math.PI / 2, pose: 'cheer' }); if (this.t > 2 && (I.pressed('confirm') || I.pressed('start') || I.clicked()) || this.t > 60) { I.consumeAll(); game.go('gameover', { score: TC.run ? Math.max(...TC.run.sim.players.map(p => p.score)) : 0, won: true }); } },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; frame(g, W, H, null, this.t); const y0 = H - this.t * 18;
      let y = y0; logo(g, W / 2, y, this.t, .6); y += 60;
      for (const L of this.lines) { if (y > -10 && y < H + 10) txt(g, L[1], W / 2, y, L[0] === 'h' ? '#ffd36a' : L[0] === 's' ? '#9fe3ff' : '#ffffff', { align: 'center', scale: L[0] === 'h' ? 2 : 1 }); y += L[0] === 'h' ? 22 : 12; }
      this.rigs.forEach((R, k) => { const yy = y + 20 + k * 56; if (yy > -60 && yy < H + 10) { R.rig.drawPortrait(g, W / 2 - 24, yy, 48, { zoom: 3, turn: .4, bg: '#1a2a4a' }); txt(g, reg('speaker', R.id).name, W / 2, yy + 50, reg('speaker', R.id).color, { align: 'center' }); } });
      if (y + 20 + 10 * 56 < 0) { F.title(g, 'THE END', W / 2, H / 2 - 10, { scale: 4, colors: ['#fff3b0', '#ffd36a', '#ff8a2a', '#a81e1e'], outline: '#08142a', align: 'center' }); }
    });
  }
};
scenes.session = sessionScene();
scenes.attract = { camera: { zoom: false }, touch: [], enter() { Idle.reset(); Attract.enter(); }, exit() { TC.game.timeScale = 1; }, update(dt) { Attract.update(dt); }, draw(r) { Attract.draw(r); } };
TC.scenes = scenes;

/* ---- boot ---- */
const boot = { title: 'TIDE CRISIS 3', version: E.version, messages: ['Raising the harbor', 'Hanging the lanterns', 'Winding the lighthouse', 'Filling the sluices', 'Briefing the agents', 'Tuning the radios'], steps: [
  ['Building Port Lumen', () => worldOf(reg('stage', 1))],
  ["Building Gull's Rest", () => reg('stage', 2) && worldOf(reg('stage', 2))],
  ['Building the Tidewall', () => reg('stage', 3) && worldOf(reg('stage', 3))],
  ['Building the CREST range', () => reg('stage', 'range') && worldOf(reg('stage', 'range'))],
  ['Painting the textures', () => { if (!HEADLESS) { for (const m of regAll('material')) texOf(m.id); refreshCanvasMaterials(); } }]
] };
game.debug = {
  snapshot() { const P = TC.play; return { scene: game.sceneName, run: TC.run ? TC.run.mode : null, sim: P && game.sceneName === 'play' ? P.sim.snapshot() : null, attract: TC.attract ? TC.attract.state : null, errors: game.errors.length }; },
  get sim() { return TC.play && TC.play.sim; },
  get tune() { return tune; },
  jump(stage, scene) { const s = TC.play.sim; s.jump(stage, scene); },
  cheat(k, v = true) { TC.play.sim.cheats[k] = v; },
  bot(on = true, style = 'fair', i = 0) { if (on) TC.play.bots[i] = new Autopilot(style); else delete TC.play.bots[i]; },
  start(o = {}) { newRun(Object.assign({ mode: 'stage', stage: 1 }, o)); TC.run.sim = new Sim({ mode: o.coop ? 'coop' : o.mode === 'range' ? 'range' : 'stage', stage: o.stage || 1, scene: o.scene, difficulty: o.difficulty || 'normal', seed: o.seed || 7, players: TC.run.players, cheats: o.cheats }); game.go('play', {}); }
};
TC.debug = game.debug;
TC.boot = () => game.start({ scene: HUB ? 'session' : 'title', scenes, boot });

// ---- 99-about.js ----
/* 99-about: the About and credits data. The in-game About pages, the ending's credits, the AI Hub tags and
 * exit-interview.json (written by tools/build.mjs) all come from here, so they agree. */
const SOURCE = {
  date: '2026-11-03 18:31:53',
  source: 'Time Crisis 3 (Namco and Nextech; arcade 2003 on Namco System 246, PlayStation 2 2003)',
  plan: 'PLAN.md',
  genre: 'On-rails arcade light-gun shooter with a cover system',
  perspective: 'First-person rail camera (duck behind cover, pop out to shoot); third-person cutscene cameras',
  tech: 'my-3D2dge handoff v0.85.2 full engine (patched: long guns, PlayStation glyphs, wheel codes, audio buses), our own perspective software renderer module (Rail3D) drawing into the engine\'s pixel buffer, AI Hub session client 1.4.0 (protocol 1); plain JavaScript, no other libraries; Node 24 and Playwright 1.63.0 for testing',
  artDirection: 'The engine\'s native PS1-era pixel style in perspective 3D: its banded light and material patterns as textures, Bayer dithering, fog, its Humanoid rigs as billboards, plus new materials and models (containers, stalls, boats, a lighthouse, a tidal barrier, a crab walker)',
  animation: 'The engine\'s procedural Humanoid rigs (poses, moves, rolls, climbing, deaths) with new long guns and a cutlass, plus code-driven machines (turrets, rotors, a six-legged gait, swinging, sinking)',
  audio: 'All in code: tracker songs on the engine\'s chip synth (title theme, three stage themes in layers, boss, final boss, briefing, range, results, ending), synthesized SFX panned by position, per-stage ambience graphs, and an Animalese-style gibberish voice synth with formant vowels for every speaker',
  online: 'AI Hub Session Protocol v1, shared-world co-op for 1-4 players: the host runs the world; each client sends its player\'s input; the host streams every step\'s commands so every copy runs the same deterministic world from the same seed, with a score and lives check each second; threats on remote players resolve against the cover they reported. Local split-screen co-op for 2',
  testing: 'Allowed: headless tools as much as liked (game.advance and game.debug), screenshots only for what a script cannot check, one command that prints only failures and a count, no subagents or workflows to review. Used: node tests/run.mjs, 28 suites: 24 headless (core, gameplay, content, the lighthouse climb and the tower roof, UI, dev, attract, co-op and a FakeHub net suite with latency, jitter and loss) plus --playthrough (the expert bot clears every stage, the fair bot clears every stage on Normal without a continue, the showoff bot plays the whole ARCADE with its cutscenes, Training completes, and the whole game is played through its screens from the title to the high-score table), --browser (the bundle at four window sizes, then an end-to-end run with real key presses, mouse, touch and a stubbed DualSense: the attract mode, every About page, prompts following the device, dev mode from the pause menu, detail per stage, a touch-only phone) and --hub (the four AI Hub harness scenarios in headless Chromium); tests/ISSUES.md logs what they caught',
  research: 'The engine handoff docs (API.md, AI_GUIDE.md, docs/ASSETS.md, API-INDEX.md), the AI Hub README; the source facts come from the plan, which cites Wikipedia\'s Time Crisis 3 article (fetched 2026-11-03); no new web research during the build',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort xhigh',
  usage: 'Measured from the session\'s own record of per-request usage, up to the final build at 22:38: 414 requests to claude-opus-5-5, 204.7 M tokens (846 uncached input, 867.4 K output, 1.46 M cache writes at the 1-hour TTL, 202.4 M cache reads), API cost about $69.50 at Claude Opus 5.5 list prices per million tokens ($4 input, $20 output, $8 cache writes at the 1-hour TTL, $0.20 cache reads); session time 4 h 6 min, from 18:31:53 to 22:38:34. The final test run and the closing reply come after this file is written: estimated from the same steps last time (4 requests, 1.7 M tokens, $0.52, 11 min), the whole session comes to about 418 requests, 206.5 M tokens, $70.02 and 4 h 17 min'
};
const FEEDBACK = {
  testing: [
    '68, itemised in tests/ISSUES.md: 60 in the game (23 caught by the bot playthroughs and boss runs, 10 cover points caught by the content validator, 2 caught by the lighthouse and tower-roof checks, 1 caught by the UI suite, 4 caught by the browser end-to-end suite, 20 caught by screenshots) and 8 in the bot used for testing.',
    '13 were critical: an area, a boss or a mode could not be finished. The Bulldog fuel tank inside its collider (1-3); canal enemies left behind the boat (1-4); Barracuda boarding outside the view (1-B); a shield trooper with no hide state (3-1) and one stuck in his crouch; funicular terraces misplaced and hidden by parapets (2-3); rappellers stuck on the lift ropes (3-4); a lighthouse collider hiding an enemy (2-4); Hammerhead shielded down to his shins and his rig turned to NaN (2-B); the Seawolf hovering out of view (3-2); Training able to reach CONTINUE.',
    'The bot playthroughs: the Autopilot playing every stage headless through game.advance (expert in god mode for completion, fair on Normal for balance, showoff for the whole ARCADE with its cutscenes). They caught every critical issue and gave the clear times the area timers are set from.',
    'The 3D math and rasterizer unit tests (math3d, raster): they guard projection, rays and depth but caught nothing; every renderer problem was caught by screenshots instead.'
  ],
  engine: [
    'The deterministic fixed-step loop with headless game.advance, and the Humanoid rigs: they update the same in Node and in the browser, so hit volumes from real joints, the bots and the AI Hub replicas all agree, and the same rigs draw from any bearing as billboards.',
    'Yes. The handoff has no 3D engine, so a first-person light-gun game needed its own renderer. E.View cannot look up (pitch is clamped), so billboards fake the angle. A rig update with vx but no vy put NaN into the rig\'s walk phase for good, which made a boss unhittable until a test found it. The Humanoid constructor draws from Math.random, so the game reseeds each rig\'s clock for determinism. And I guessed wrong about the menus twice: the scenes checked a game.menuOpen property the engine does not have (a menu pauses the game instead), and the engine toggles pause on Escape before the scene runs, so the dev panel opened the pause menu over itself; the browser end-to-end test found both.',
    'Rail3D: a z-buffered, perspective-correct software rasterizer that samples E.materialTile textures in the engine\'s five light bands with Bayer dithering and fog, draws E.shapeMesh objects, and composites engine rigs as depth-tested billboards drawn by the engine from the bearing they are seen at.',
    'Fitting a first-person 3D shooter into a 2D engine built around ground views: the camera, culling, lighting, fog, rays and colliders had to be built beside it, while the menus, settings, rebinding, input, audio, boot screen and tables came for free and worked first time.',
    'Four patches, logged in engine/PATCHES.md: long guns (rifle, SMG, shotgun, launcher, sniper rifle, minigun, harpoon, flare pistol) and a cutlass on Humanoid with a fore-grip hand; PlayStation button glyphs by default with an Xbox option; mouse-wheel codes that can be bound; access to the sfx and music buses for the voice synth.',
    'A small perspective camera module beside Mode 7: E.shapeMesh and E.materialTile already exist for a 3D renderer, so a reference rasterizer using them would make light-gun, rail and FPS games first-class in the 2D package (and rig.update could reject NaN input).'
  ],
  prompt: [
    'It defines done completely: the controller-first 10-foot UI, prompts that follow the device, the attract mode, live dev sliders, couch and online play, the About screen and the exit interview, so the scope never had to be guessed.',
    'The plan was written for another run, so its file names and timestamps differ from TASK.md\'s (TASK.md wins), and the handoff it names has no 3D engine for a source that is first-person 3D.',
    'The volume: three stages, eight bosses and mini-bosses, a software renderer, split screen and AI Hub co-op, all art and sound in code, and then balancing it with bots so every area can be finished in its time.',
    'Say whether the repository\'s 3D engine may be used, and give a time or token budget so scope can be planned against it; ask for the feedback numbers to come from a log the tests keep.'
  ]
};
const HUBINFO = { goal: 'Clear the stage together; most points wins', howto: 'Aim mouse/stick - Fire click/R2 - Hold right-click/L2: cover+reload', minutes: 7 };
TC.ABOUT = {
  source: SOURCE, feedback: FEEDBACK, hub: HUBINFO,
  pages: [
    { title: 'TIDE CRISIS 3', rows: [['', 'An original arcade light-gun shooter on rails. Two agents of C.R.E.S.T. take Port Lumen\'s tidal barrier back from Admiral Silas Krake before the dawn king tide drowns the city.'], ['HOW IT PLAYS', 'Hold cover to dodge and reload; let go to pop out and shoot. Red rings mark the shots that will hit you. Orange vests carry ammo for the machine gun, shotgun and grenade launcher. Beat the clock in every area.'], ['MODES', 'Arcade (stages 1-3), Co-op (split screen), Stage select, Training, and AI Hub co-op for 1-4.'], ['MADE WITH', 'my-3D2dge (engine), Rail3D (our renderer), and code for every sound.']] },
    { title: 'SOURCE INFORMATION', rows: [['DATE', SOURCE.date], ['SOURCE', SOURCE.source], ['PLAN', SOURCE.plan], ['GENRE AND PERSPECTIVE', SOURCE.genre + '. ' + SOURCE.perspective], ['TECH', SOURCE.tech]] },
    { title: 'SOURCE INFORMATION (2)', rows: [['ART DIRECTION', SOURCE.artDirection], ['ANIMATION', SOURCE.animation], ['AUDIO', SOURCE.audio]] },
    { title: 'SOURCE INFORMATION (3)', rows: [['ONLINE', SOURCE.online], ['TESTING', SOURCE.testing], ['RESEARCH', SOURCE.research], ['ENVIRONMENT', SOURCE.environment], ['MODEL', SOURCE.model], ['USAGE', SOURCE.usage]] },
    { title: 'TESTING FEEDBACK', rows: [['ISSUES CAUGHT', FEEDBACK.testing[0]], ['CRITICAL', FEEDBACK.testing[1]], ['MOST HELPFUL TEST', FEEDBACK.testing[2]], ['LEAST HELPFUL TEST', FEEDBACK.testing[3]]] },
    { title: 'ENGINE FEEDBACK', rows: [['LIKED MOST', FEEDBACK.engine[0]], ['STUCK OR WRONG', FEEDBACK.engine[1]], ['BUILT OURSELVES', FEEDBACK.engine[2]]] },
    { title: 'ENGINE FEEDBACK (2)', rows: [['HARDEST PART', FEEDBACK.engine[3]], ['CHANGED IN THE ENGINE', FEEDBACK.engine[4]], ['ONE CHANGE', FEEDBACK.engine[5]]] },
    { title: 'PROMPT FEEDBACK', rows: [['LIKED MOST', FEEDBACK.prompt[0]], ['CONFUSING', FEEDBACK.prompt[1]], ['HARDEST', FEEDBACK.prompt[2]], ['WOULD CHANGE', FEEDBACK.prompt[3]]] },
    { title: 'THANKS AND LICENSES', rows: [['', 'Inspired by the Time Crisis series (Namco). Tide Crisis 3 is an original work: its world, cast, stages, music and art are new; the title is a pun.'], ['ENGINE', 'my-3D2dge, MIT license. AI Hub session client, its own license terms.'], ['THANKS', 'To every arcade that kept a pedal cabinet running.']] }
  ],
  credits: [['h', 'TIDE CRISIS 3'], ['s', 'A CREST ARCADE production'], ['n', ''], ['h', 'DIRECTED, WRITTEN AND BUILT BY'], ['n', 'Claude (Anthropic, claude-opus-5-5)'], ['n', 'from a plan by claude-opus-5-5'], ['h', 'ENGINE'], ['n', 'my-3D2dge v0.85.2 (patched)'], ['n', 'Rail3D perspective renderer'], ['h', 'MUSIC AND SOUND'], ['n', 'Chip tracker, synth SFX, gibberish voices'], ['n', 'all written in code'], ['h', 'CAST'], ['n', 'Kai Navarro - Rook Halvorsen'], ['n', 'Mari Tejada - Juno Achterberg'], ['n', 'Director Ines Hale - Dr. Tomas Tejada'], ['n', 'Admiral Silas Krake'], ['n', 'Barracuda - Hammerhead - The Gull'], ['h', 'SPECIAL THANKS'], ['n', 'Port Lumen, for its lanterns'], ['n', ''], ['s', 'Made with my-3D2dge']],
  exitInterview: {
    sourceInformation: SOURCE,
    testingFeedback: FEEDBACK.testing,
    engineFeedback: FEEDBACK.engine,
    promptFeedback: FEEDBACK.prompt,
    aiHub: {
      name: 'Tide Crisis 3', tagline: 'Duck. Pop. Shoot. Beat the tide.',
      description: 'An original arcade light-gun rail shooter in PS1-style pixel 3D: duck behind cover, switch between four weapons and race each area\'s clock to retake an island\'s tidal barrier before the dawn king tide. Play solo, couch co-op or AI Hub co-op for up to four.',
      type: 'Game', genre: 'Shooter', source: 'Time Crisis 3', series: 'Time Crisis', players: '1–4',
      controls: 'Mouse or stick aims - left click/R2 fires - hold right click/L2 for cover and reload - wheel/R1 switches weapons',
      tags: ['first-person', 'arcade', 'co-op', 'boss fights', 'pixel art', 'retro']
    }
  }
};

// ---- 999-start.js ----
/* 999-start: start the game once every fragment has registered (not when tools/build.mjs runs it headless) */
if (!(typeof window !== 'undefined' && window.TC_NO_BOOT) && !globalThis.TC_BUILD) TC.boot();

})();
