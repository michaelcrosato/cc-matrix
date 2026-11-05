/* Tide Crisis 3 (c) 2026: an original arcade light-gun rail shooter on my-3D2dge */
(() => {
'use strict';
const E = My3D2dge;
// ===== 00-core.js
// 00-core: the TC namespace, units, registries (def), the event bus, tuning values (TUNE frozen defaults, tune live),
// difficulty tables, and the 3D math used by the Sim and the renderer. Reads: E (the engine).
//
// THE CORE LOOP: the camera rides the rail to the next area (WAIT) -> ACTION! starts the clock -> pop out and shoot ->
// duck when a crisis flash says a shot will hit -> reload in cover -> clear the area before TIME runs out -> ride on ->
// beat the boss -> STAGE CLEAR.

const U = 16;                                   // world units per metre
const DEG = Math.PI / 180;
const TC = (E.TC = E.TC || {});
TC.version = '1.0.0';
TC.title = 'TIDE CRISIS 3';

// ---------------------------------------------------------------- registries
const REG = {};
function def(kind, id, spec) { (REG[kind] || (REG[kind] = {}))[id] = Object.assign({ id }, spec); return REG[kind][id]; }
function get(kind, id) { const r = REG[kind] && REG[kind][id]; if (!r) throw new Error('unknown ' + kind + ' "' + id + '"'); return r; }
function has(kind, id) { return !!(REG[kind] && REG[kind][id]); }
function all(kind) { return Object.values(REG[kind] || {}); }
TC.def = def; TC.get = get; TC.REG = REG;

// ---------------------------------------------------------------- tuning (dev sliders write into tune)
const TUNE = {
  player: { god: false, infAmmo: false, lives: 5, iframes: 1.5, coverIn: .12, coverOut: .15, reload: .30, padSpeed: 1.6, assist: .6 },
  weapon: { hgDamage: 1, mgRate: 12, mgDamage: .45, sgPellets: 8, sgSpread: 5.5, glRadius: 48, glDamage: 6, ammoMul: 1 },
  enemy: { hpMul: 1, threatMul: 1, teleMul: 1, fireMul: 1, maxThreats: 0, minGap: .35, reactMul: 1, bossHpMul: 1 },
  time: { freeze: false, sceneMul: 1, eliteBonus: 2, refill: .6, speed: 1 },
  view: { fov: 55, hitVolumes: false, colliders: false, railPoints: false, aiLabels: false, threatDebug: false, perf: false, freeCam: false, hideHud: false }
};
const deepCopy = o => JSON.parse(JSON.stringify(o));
const deepFreeze = o => { Object.values(o).forEach(v => typeof v === 'object' && v && deepFreeze(v)); return Object.freeze(o); };
deepFreeze(TUNE);
let tune = deepCopy(TUNE);
TC.TUNE = TUNE;
TC.tune = () => tune;
TC.resetTune = () => { tune = deepCopy(TUNE); return tune; };
const tget = path => path.split('.').reduce((o, k) => o[k], tune);
const tset = (path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], tune)[last] = v; };
TC.tget = tget; TC.tset = tset;

const DIFF = {
  easy: { lives: 7, timeMul: 1.25, threatMul: .75, maxThreatAdd: -1, teleMul: 1.15, label: 'EASY' },
  normal: { lives: 5, timeMul: 1, threatMul: 1, maxThreatAdd: 0, teleMul: 1, label: 'NORMAL' },
  hard: { lives: 3, timeMul: .85, threatMul: 1.3, maxThreatAdd: 1, teleMul: .85, label: 'HARD' }
};
TC.DIFF = DIFF;

// ---------------------------------------------------------------- seeded randomness (only these in Sim code)
function mkRng(seed) {
  let a = (seed >>> 0) || 1;
  const f = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + f() * (hi - lo);
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.chance = p => f() < p;
  return f;
}
const hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
TC.mkRng = mkRng; TC.hashStr = hashStr;
const fxRand = mkRng(9157);              // cosmetic-only stream (presentation)

// ---------------------------------------------------------------- small math
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const lerpAng = (a, b, t) => a + angDiff(a, b) * t;
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlen = a => Math.hypot(a[0], a[1], a[2]);
const vnorm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlerp = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const vdist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hexRGB = h => { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r, g, b) => '#' + ((1 << 24) | (clamp(r | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(b | 0, 0, 255)).toString(16).slice(1);
const mixHex = (a, b, t) => { const A = hexRGB(a), B = hexRGB(b); return rgbHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); };
const pack = (r, g, b) => (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255);   // little-endian RGBA in a Uint32
TC.math = { clamp, lerp, smooth, angDiff, lerpAng, vadd, vsub, vmul, vdot, vlen, vnorm, vcross, vlerp, vdist, hexRGB, rgbHex, mixHex, pack };

// ---------------------------------------------------------------- the camera basis and projection
// yaw 0 looks east (+x), +PI/2 looks south (+y); pitch positive up. f = forward, r = right, u = up.
function basis(yaw, pitch, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = [cp * cy, cp * sy, sp], r0 = [-sy, cy, 0], u0 = [-sp * cy, -sp * sy, cp];
  if (!roll) return { f, r: r0, u: u0 };
  const cr = Math.cos(roll), sr = Math.sin(roll);
  return { f, r: vadd(vmul(r0, cr), vmul(u0, -sr)), u: vadd(vmul(r0, sr), vmul(u0, cr)) };
}
// a camera: { x, y, z, yaw, pitch, roll, fov (degrees, vertical) } -> derived { pos, f, r, u, t (tan half fov) }
function camSetup(cam) {
  const b = basis(cam.yaw, cam.pitch, cam.roll || 0);
  return { pos: [cam.x, cam.y, cam.z], f: b.f, r: b.r, u: b.u, t: Math.tan((cam.fov || 55) * DEG / 2), aspect: cam.aspect || 16 / 9 };
}
// world point -> view-unit coordinates [ax, ay, z] (ax in [-aspect, aspect], ay in [-1, 1] at the screen edges), null behind
function projectVU(cs, p) {
  const d = vsub(p, cs.pos), z = vdot(d, cs.f);
  if (z < 1) return null;
  return [vdot(d, cs.r) / (z * cs.t), vdot(d, cs.u) / (z * cs.t), z];
}
// aim in view units -> world ray direction
function aimRay(cs, ax, ay) { return vnorm(vadd(cs.f, vadd(vmul(cs.r, ax * cs.t), vmul(cs.u, ay * cs.t)))); }
TC.basis = basis; TC.camSetup = camSetup; TC.projectVU = projectVU; TC.aimRay = aimRay;

// ---------------------------------------------------------------- ray tests
// returns the distance t >= 0 along the (unit) direction d, or Infinity
function rayAABB(o, d, b) {   // b: [x0, y0, z0, x1, y1, z1]
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const inv = 1 / (d[i] || 1e-12); let ta = (b[i] - o[i]) * inv, tb = (b[i + 3] - o[i]) * inv;
    if (ta > tb) { const s = ta; ta = tb; tb = s; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t1 < t0) return Infinity;
  }
  return t0;
}
function raySphere(o, d, c, r) {
  const L = vsub(c, o), tc = vdot(L, d), d2 = vdot(L, L) - tc * tc, r2 = r * r;
  if (d2 > r2) return Infinity; const th = Math.sqrt(r2 - d2), t = tc - th;
  return t >= 0 ? t : tc + th >= 0 ? 0 : Infinity;
}
function rayCapsule(o, d, a, b, r) {
  // closest approach between the ray and the segment ab, sampled by solving the 2-line problem
  const u = d, v = vsub(b, a), w = vsub(o, a), A = 1, B = vdot(u, v), C = vdot(v, v), D = vdot(u, w), Ee = vdot(v, w);
  const den = A * C - B * B; let s, t;
  if (den < 1e-9) { s = 0; t = C > 0 ? clamp(Ee / C, 0, 1) : 0; } else { s = (B * Ee - C * D) / den; t = clamp((A * Ee - B * D) / den, 0, 1); }
  const q = vadd(a, vmul(v, t)); return raySphere(o, d, q, r) < Infinity ? Math.max(0, s - r * .5) : Infinity;
}
TC.rayAABB = rayAABB; TC.raySphere = raySphere; TC.rayCapsule = rayCapsule;

// ---------------------------------------------------------------- an event bus (presentation listens to the Sim's events)
const bus = { h: {}, on(t, f) { (this.h[t] || (this.h[t] = [])).push(f); return () => { this.h[t] = this.h[t].filter(x => x !== f); }; }, emit(t, e) { for (const f of this.h[t] || []) f(e); for (const f of this.h['*'] || []) f(t, e); } };
TC.bus = bus;

// ---------------------------------------------------------------- coroutines (the Sim's own runner, same yield rules as game.script)
class Runner {
  constructor() { this.list = []; }
  run(gen, owner) { const c = { gen, wait: 0, until: null, sub: null, done: false, owner }; this.list.push(c); this._step(c, 0); return c; }
  _step(c, dt) {
    for (let guard = 0; guard < 64; guard++) {
      if (c.done) return;
      if (c.sub) { this._step(c.sub, dt); if (!c.sub.done) return; c.sub = null; dt = 0; }
      if (c.wait > 0) { c.wait -= dt; if (c.wait > 0) return; dt = 0; }
      if (c.until) { if (!c.until()) return; c.until = null; }
      const r = c.gen.next(); if (r.done) { c.done = true; return; }
      const v = r.value;
      if (typeof v === 'number') { c.wait = v; return; }
      if (typeof v === 'function') { c.until = v; if (!v()) return; c.until = null; continue; }
      if (v && typeof v.next === 'function') { c.sub = { gen: v, wait: 0, until: null, sub: null, done: false }; this._step(c.sub, 0); if (!c.sub.done) return; c.sub = null; continue; }
      return;   // a bare yield: one step
    }
  }
  update(dt) { for (const c of this.list.slice()) this._step(c, dt); this.list = this.list.filter(c => !c.done); }
  cancel(owner) { for (const c of this.list) if (!owner || c.owner === owner) c.done = true; this.list = this.list.filter(c => !c.done); }
}
TC.Runner = Runner;

// ===== 02-materials.js
// 02-materials: the texture bank. Every material is 5 light bands of a 32x32 tile (Uint32 RGBA, top row first, v up),
// taken from the engine's own materials (E.materialTile) or made here for the new ones (corrugated steel, concrete,
// hazard stripes, awnings, lanterns, lit windows, water, nets...). Lazily built, headless-safe (no canvas needed).
// Material flags: glow (emissive), water, double (both sides), alpha (alpha-tested), scroll.
// Reads: E.materialTile, E.MATERIALS.

const TEX = 32;
const BAND_K = [.40, .58, .76, .93, 1.1];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
TC.BAYER4 = BAYER4;
const MATS = {};      // id -> { id, bands: [Uint32Array x5], lid: bands for faces looking up/down, glow, water, double, alpha, avg }
TC.MATS = MATS;

function noise2(x, y, s = 0) { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); }
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = noise2(xi, yi, s), b = noise2(xi + 1, yi, s), c = noise2(xi, yi + 1, s), d = noise2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
TC.noise2 = noise2; TC.vnoise = vnoise;

// bands from a base-color function fn(x, y) -> [r, g, b, a?]
function bandsFrom(fn, o = {}) {
  const base = [], out = [];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) base.push(fn(x, y));
  for (let k = 0; k < 5; k++) {
    const arr = new Uint32Array(TEX * TEX), m = o.glow ? 1 : BAND_K[k], cool = o.glow ? 0 : (2 - k) * .05;
    for (let i = 0; i < base.length; i++) {
      const c = base[i], a = c[3] === undefined ? 255 : c[3];
      const r = c[0] * m * (1 - cool), g = c[1] * m, b = c[2] * m * (1 + cool * 1.4) + (k === 0 && !o.glow ? 6 : 0);
      arr[i] = a < 128 ? 0 : pack(r, g, b);
    }
    out.push(arr);
  }
  return out;
}
function bandsFromEngine(id, lid) {
  const out = [];
  for (let k = 0; k < 5; k++) {
    const t = E.materialTile(id, { size: TEX, px: 1, band: k, lid });
    if (!t) return null;
    const arr = new Uint32Array(TEX * TEX);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const sx = Math.floor(x * t.w / TEX), sy = Math.floor(y * t.h / TEX), j = (sy * t.w + sx) * 4;
      arr[y * TEX + x] = t.rgba[j + 3] < 128 ? 0 : pack(t.rgba[j], t.rgba[j + 1], t.rgba[j + 2]);
    }
    out.push(arr);
  }
  return out;
}
function avgOf(bands) { const a = bands[3]; let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < a.length; i += 7) { const c = a[i]; if (!c) continue; r += c & 255; g += (c >> 8) & 255; b += (c >> 16) & 255; n++; } n = n || 1; return [r / n, g / n, b / n]; }

const MATDEF = {};    // id -> () => { fn | engine, flags }
function defMat(id, spec) { MATDEF[id] = spec; }
TC.defMat = defMat;
function mat(id) {
  let m = MATS[id];
  if (m) return m;
  let spec = MATDEF[id];
  if (!spec && id.startsWith('#')) {          // a solid color, lightly speckled
    const c = hexRGB(id); spec = { fn: (x, y) => { const n = (noise2(x, y, 3) - .5) * 14; return [c[0] + n, c[1] + n, c[2] + n]; } };
  }
  if (!spec && id.startsWith('glow#')) { const c = hexRGB(id.slice(4)); spec = { glow: true, fn: () => c }; }
  if (!spec && E.MATERIALS[id]) spec = { engine: id };
  if (!spec) spec = { fn: () => [255, 0, 255] };
  const bands = spec.engine ? bandsFromEngine(spec.engine, false) : bandsFrom(spec.fn, spec);
  const lid = spec.engine ? (bandsFromEngine(spec.engine, true) || bands) : spec.lidFn ? bandsFrom(spec.lidFn, spec) : bands;
  m = MATS[id] = { id, bands, lid, glow: !!spec.glow, water: !!spec.water, double: !!spec.double, alpha: !!spec.alpha, scroll: spec.scroll || null, avg: null, scale: spec.scale || 1 };
  m.avg = avgOf(bands);
  return m;
}
TC.mat = mat;

// ---- the new materials
const C3 = h => hexRGB(h);
defMat('concrete', { fn: (x, y) => { const n = vnoise(x / 5, y / 5, 1) * 26 + noise2(x, y, 2) * 14 - (((x % 32) === 0 || (y % 16) === 0) ? 22 : 0); return [128 + n, 126 + n, 120 + n]; } });
defMat('concrete-dark', { fn: (x, y) => { const n = vnoise(x / 4, y / 4, 4) * 22 + noise2(x, y, 5) * 12 - ((y % 16) === 0 ? 18 : 0); return [86 + n, 88 + n, 92 + n]; } });
defMat('asphalt', { fn: (x, y) => { const n = noise2(x, y, 7) * 26; return [52 + n, 52 + n, 58 + n]; } });
defMat('hazard', { fn: (x, y) => ((x + y) & 15) < 8 ? [242, 193, 46] : [30, 30, 30] });
defMat('grate', { alpha: true, double: true, fn: (x, y) => (x % 4 === 0 || y % 4 === 0) ? [120, 124, 128] : [0, 0, 0, 0] });
defMat('net', { alpha: true, double: true, fn: (x, y) => ((x + y) % 6 === 0 || (x - y + 64) % 6 === 0) ? [150, 140, 100] : [0, 0, 0, 0] });
defMat('rope', { fn: (x, y) => { const s = ((x + y * 2) % 6) < 3; return s ? [168, 140, 92] : [130, 104, 66]; } });
defMat('tarp', { fn: (x, y) => { const n = vnoise(x / 6, y / 3, 9) * 30; return [40 + n * .3, 80 + n, 70 + n * .6]; } });
defMat('rubber', { fn: (x, y) => { const n = noise2(x, y, 11) * 10; return [34 + n, 34 + n, 38 + n]; } });
defMat('hull', { fn: (x, y) => { const n = noise2(x, y, 12) * 10, stripe = (y % 32) > 26; return stripe ? [200, 60, 50] : [214 + n, 218 + n, 222 + n]; } });
defMat('hull-dark', { fn: (x, y) => { const n = noise2(x, y, 13) * 12, stripe = (y % 32) > 27; return stripe ? [40, 150, 140] : [44 + n, 52 + n, 60 + n]; } });
defMat('camo', { fn: (x, y) => { const v = vnoise(x / 7, y / 7, 14); return v > .6 ? [70, 80, 50] : v > .35 ? [100, 104, 70] : [52, 58, 40]; } });
defMat('steel-paint', { fn: (x, y) => { const n = vnoise(x / 8, y / 8, 15) * 18 + noise2(x, y, 16) * 8 - ((x % 16) === 0 ? 20 : 0); return [92 + n, 100 + n, 110 + n]; } });
defMat('gunmetal', { fn: (x, y) => { const n = noise2(x, y, 17) * 10 + ((y % 8) === 0 ? 16 : 0); return [58 + n, 62 + n, 70 + n]; } });
defMat('teal-paint', { fn: (x, y) => { const n = vnoise(x / 6, y / 6, 18) * 20; return [30 + n * .5, 110 + n, 112 + n]; } });
for (const [id, col] of [['container-red', '#a8322a'], ['container-blue', '#2a5aa0'], ['container-ochre', '#c08a2a'], ['container-green', '#3a7a4a'], ['container-grey', '#7a7f86']]) {
  const c = C3(col);
  defMat(id, { fn: (x, y) => { const r = (x % 4), k = r === 0 ? .7 : r === 1 ? 1.12 : 1, n = noise2(x, y, 19) * 12 - (vnoise(x / 3, y / 9, 20) > .78 ? 30 : 0); return [c[0] * k + n, c[1] * k + n, c[2] * k + n]; } });
}
for (const [id, a, b] of [['awning-red', '#d8332a', '#f2ece0'], ['awning-blue', '#2a64c8', '#f2ece0'], ['awning-green', '#2f9a52', '#f6e9c8']]) {
  const A = C3(a), B = C3(b); defMat(id, { double: true, fn: (x) => (x % 16) < 8 ? A : B });
}
defMat('lantern', { glow: true, fn: (x, y) => { const v = Math.abs(y - 16) / 16, k = 1 - v * .5, rib = (y % 8) === 0; return rib ? [150, 60, 30] : [255 * k, 170 * k + 40, 60 * k]; } });
defMat('lantern-red', { glow: true, fn: (x, y) => { const v = Math.abs(y - 16) / 16, k = 1 - v * .5, rib = (y % 8) === 0; return rib ? [120, 30, 30] : [255 * k, 70 * k + 20, 60 * k]; } });
defMat('glasslit', { glow: true, fn: (x, y) => { const f = (x % 16) < 2 || (y % 16) < 2; const n = noise2(Math.floor(x / 16), Math.floor(y / 16), 21); return f ? [40, 34, 30] : n > .4 ? [255, 210, 120] : [150, 120, 80]; } });
defMat('window-dark', { fn: (x, y) => { const f = (x % 16) < 2 || (y % 16) < 2; return f ? [70, 60, 50] : [30, 40, 60]; } });
defMat('screen-teal', { glow: true, fn: (x, y) => { const l = (y % 4) === 0; const bar = (y > 8 && y < 24 && x > 4 && x < 4 + ((Math.floor(y / 4) * 7) % 24)); return l ? [10, 60, 50] : bar ? [120, 255, 220] : [30, 160, 130]; } });
defMat('lamp', { glow: true, fn: () => [255, 220, 150] });
defMat('lamp-sodium', { glow: true, fn: () => [255, 176, 74] });
defMat('red-lamp', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 16); return d < 10 ? [255, 70, 50] : [140, 20, 20]; } });
defMat('gold-glow', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 16); return [255, 200 - d * 3, 60]; } });
defMat('weak', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 16); return d < 9 ? [255, 236, 140] : [255, 150, 40]; } });
defMat('lens', { glow: true, fn: (x, y) => { const r = (x + y) % 8 < 2; return r ? [220, 230, 255] : [255, 250, 210]; } });
defMat('glass', { fn: (x, y) => { const s = ((x + 32 - y) % 32) < 4; return s ? [170, 200, 220] : [70, 100, 130]; } });
defMat('signboard', { fn: (x, y) => { const edge = y < 3 || y > 28; return edge ? [80, 50, 30] : [40, 46, 70]; } });
defMat('poster', { glow: true, fn: (x, y) => { const d = Math.hypot(x - 16, y - 13); return d < 7 ? [255, 210, 80] : y > 24 ? [240, 60, 60] : [30, 40, 90]; } });
defMat('fireworks', { fn: (x, y) => (x % 8) < 4 ? [200, 40, 40] : [230, 200, 60] });
defMat('lifering', { fn: (x) => (x % 16) < 8 ? [230, 40, 40] : [245, 245, 245] });
defMat('bottle', { glow: true, fn: (x, y) => [60, 200 - y * 2, 90] });
defMat('barrel-red', { fn: (x, y) => { const band = (y % 16) < 3; const lab = y > 12 && y < 20 && x > 8 && x < 24; return band ? [80, 30, 28] : lab ? (((x + y) & 3) < 2 ? [240, 200, 40] : [30, 30, 30]) : [190, 42, 36]; } });
defMat('tank-white', { fn: (x, y) => { const band = (y % 16) < 2; return band ? [120, 130, 140] : [220, 226, 232]; } });
defMat('ammo-crate', { fn: (x, y) => { const edge = x < 3 || x > 28 || y < 3 || y > 28; return edge ? [120, 60, 20] : [236, 120, 30]; } });
defMat('sandbag', { fn: (x, y) => { const row = Math.floor(y / 8), off = row % 2 ? 8 : 0, seam = ((x + off) % 16) < 1 || (y % 8) < 1; const n = noise2(x, y, 23) * 16; return seam ? [100, 84, 60] : [170 + n, 150 + n, 110 + n]; } });
defMat('foam', { glow: false, fn: (x, y) => { const n = noise2(x, y, 24) * 30; return [210 + n, 230 + n, 235 + n]; } });
defMat('dock-wood', { engine: 'planks' });
defMat('sea-night', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 25); return [18 + n * 20, 34 + n * 30, 70 + n * 40]; } });
defMat('sea-storm', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 26); return [34 + n * 24, 52 + n * 30, 56 + n * 30]; } });
defMat('sea-dawn', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 27); return [30 + n * 30, 90 + n * 40, 104 + n * 40]; } });
defMat('canal', { water: true, fn: (x, y) => { const n = vnoise(x / 6, y / 4, 28); return [20 + n * 20, 40 + n * 30, 56 + n * 30]; } });
defMat('rangewall', { fn: (x, y) => { const n = noise2(x, y, 29) * 10, line = (y % 32) < 2; return line ? [200, 180, 40] : [96 + n, 98 + n, 104 + n]; } });
defMat('plywood', { fn: (x, y) => { const n = vnoise(x / 9, y / 2, 30) * 30; return [190 + n, 150 + n, 100 + n * .7]; } });
defMat('cutout', { double: true, fn: (x, y) => { const n = vnoise(x / 9, y / 2, 31) * 20; return [60 + n, 70 + n, 110 + n]; } });
defMat('mud-path', { fn: (x, y) => { const n = vnoise(x / 5, y / 5, 32) * 30 + noise2(x, y, 33) * 10; return [80 + n, 70 + n, 56 + n]; } });
defMat('cliff', { engine: 'rock' });
defMat('roof-slate', { engine: 'slate' });
defMat('wet-cobble', { engine: 'cobble' });

// ===== 03-geometry.js
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

// ===== 04-rail3d.js
// 04-rail3d: the renderer. A z-buffered, perspective-correct, banded-light, dithered-fog triangle rasterizer running
// in JS into the game's low-resolution buffer, with a procedural sky, engine Humanoid rigs composited as depth-tested
// billboards, depth-tested particles (additive and dithered), lines, screen-space rings, and present() through one
// r.overlay. Canvas work happens only in draw: scratch canvases are made lazily, so Node never needs one.
// Reads: TC.camSetup (00), TC.mat (02), batches and meshes (03).

class Rail3D {
  constructor() { this.W = 0; this.H = 0; this.stats = { tris: 0, px: 0, actors: 0, ms: 0 }; this._views = new Map(); this.wobble = false; this.dyn = []; }
  resize(W, H) {
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.depth = new Float32Array(W * H);
    this.cv = E.mkCanvas(W, H); this.cg = this.cv.getContext('2d'); this.img = this.cg.createImageData(W, H); this.col = new Uint32Array(this.img.data.buffer);
  }
  // cam: { x, y, z, yaw, pitch, roll, fov }; env: the stage's look (fog, sky, ambient, sun)
  begin(cam, W, H, env, time) {
    this.resize(W, H);
    const cs = this.cs = camSetup(Object.assign({}, cam, { aspect: W / H }));
    this.F = (H / 2) / cs.t; this.cx = W / 2; this.cy = H / 2; this.env = env; this.time = time || 0;
    this.depth.fill(1e9); this.stats.tris = 0; this.stats.px = 0; this.stats.actors = 0;
    const fog = env.fog || ['#000000', 400, 2000]; this.fogC = hexRGB(fog[0]); this.fogN = fog[1]; this.fogF = fog[2];
    this.dyn.length = 0;
    this.fogK = 8 / (this.fogF - this.fogN);
    this.flash = env.flashNow || 0;
  }
  addLight(x, y, z, r, k, color = '#ffd090') { if (this.dyn.length < 12) this.dyn.push({ p: [x, y, z], r, k, c: hexRGB(color) }); }
  // view-space transform of a world point
  toView(p) { const cs = this.cs, dx = p[0] - cs.pos[0], dy = p[1] - cs.pos[1], dz = p[2] - cs.pos[2]; return [dx * cs.r[0] + dy * cs.r[1] + dz * cs.r[2], dx * cs.u[0] + dy * cs.u[1] + dz * cs.u[2], dx * cs.f[0] + dy * cs.f[1] + dz * cs.f[2]]; }
  // world point -> [sx, sy, z] in this viewport's pixels, or null behind the camera
  project(p) { const v = this.toView(p); if (v[2] < 2) return null; return [this.cx + v[0] * this.F / v[2], this.cy - v[1] * this.F / v[2], v[2]]; }
  sphereVisible(s) {
    const v = this.toView(s), r = s[3];
    if (v[2] < -r || v[2] - r > this.fogF + 60) return false;
    const kx = this.W / 2 / this.F, ky = this.H / 2 / this.F, z = v[2] + r;
    return Math.abs(v[0]) - r * 1.5 <= z * kx && Math.abs(v[1]) - r * 1.5 <= z * ky;
  }
  // ------------------------------------------------------------ triangles
  drawBatch(b) {
    if (!this.sphereVisible(b.sphere)) return;
    const cs = this.cs, n = b.n, pos = b.pos, uv = b.uv, L = b.L, nrm = b.nrm, M = b.mat, dl = this._dynFor(b.sphere);
    const px = cs.pos[0], py = cs.pos[1], pz = cs.pos[2];
    for (let t = 0; t < n; t++) {
      const o = t * 9;
      if (!M.double) { const nx = nrm[t * 3], ny = nrm[t * 3 + 1], nz = nrm[t * 3 + 2]; if ((pos[o] - px) * nx + (pos[o + 1] - py) * ny + (pos[o + 2] - pz) * nz >= 0) continue; }
      let l0 = L[t * 3], l1 = L[t * 3 + 1], l2 = L[t * 3 + 2];
      if (dl) { l0 += this._dynAt(dl, pos, o); l1 += this._dynAt(dl, pos, o + 3); l2 += this._dynAt(dl, pos, o + 6); }
      this._tri(pos[o], pos[o + 1], pos[o + 2], pos[o + 3], pos[o + 4], pos[o + 5], pos[o + 6], pos[o + 7], pos[o + 8], uv[t * 6], uv[t * 6 + 1], uv[t * 6 + 2], uv[t * 6 + 3], uv[t * 6 + 4], uv[t * 6 + 5], l0, l1, l2, M, b.tint[t]);
    }
  }
  _dynFor(s) { if (!this.dyn.length) return null; let out = null; for (const d of this.dyn) if (Math.hypot(d.p[0] - s[0], d.p[1] - s[1], d.p[2] - s[2]) < d.r + s[3]) (out || (out = [])).push(d); return out; }
  _dynAt(dl, pos, o) { let a = 0; for (const d of dl) { const dx = d.p[0] - pos[o], dy = d.p[1] - pos[o + 1], dz = d.p[2] - pos[o + 2], q = Math.sqrt(dx * dx + dy * dy + dz * dz); if (q < d.r) { const f = 1 - q / d.r; a += f * f * d.k; } } return a; }
  // a dynamic mesh: inst { mesh, x, y, z, yaw, pitch, roll, s, flash, tint }
  drawMesh(inst) {
    const m = inst.mesh, s = inst.s || 1, sph = [inst.x, inst.y, inst.z, m.r * s];
    if (!this.sphereVisible(sph)) return;
    const cy = Math.cos(inst.yaw || 0), sy = Math.sin(inst.yaw || 0), cp = Math.cos(inst.pitch || 0), sp = Math.sin(inst.pitch || 0), cr = Math.cos(inst.roll || 0), sr = Math.sin(inst.roll || 0);
    // R = Rz(yaw) * Ry(pitch) * Rx(roll)
    const R = [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr, sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr, -sp, cp * sr, cp * cr];
    const env = this.env, amb = env.ambient === undefined ? .4 : env.ambient, sun = env.sun || { dir: [-.3, .4, .85], k: .5 }, sd = vnorm(sun.dir), dl = this._dynFor(sph);
    const T = this._T || (this._T = new Float32Array(9)), cs = this.cs, flash = inst.flash || 0;
    for (const g of m.groups) {
      const M = g.mat;
      for (let t = 0; t < g.n; t++) {
        const o = t * 9;
        for (let v = 0; v < 3; v++) { const a = g.pos[o + v * 3] * s, b = g.pos[o + v * 3 + 1] * s, c = g.pos[o + v * 3 + 2] * s; T[v * 3] = inst.x + R[0] * a + R[1] * b + R[2] * c; T[v * 3 + 1] = inst.y + R[3] * a + R[4] * b + R[5] * c; T[v * 3 + 2] = inst.z + R[6] * a + R[7] * b + R[8] * c; }
        const ln = [g.nrm[t * 3], g.nrm[t * 3 + 1], g.nrm[t * 3 + 2]], N = [R[0] * ln[0] + R[1] * ln[1] + R[2] * ln[2], R[3] * ln[0] + R[4] * ln[1] + R[5] * ln[2], R[6] * ln[0] + R[7] * ln[1] + R[8] * ln[2]];
        if (!M.double && (T[0] - cs.pos[0]) * N[0] + (T[1] - cs.pos[1]) * N[1] + (T[2] - cs.pos[2]) * N[2] >= 0) continue;
        let l = amb + Math.max(0, vdot(N, sd)) * sun.k + flash; if (M.glow) l = 1.2;
        const l0 = l + (dl ? this._dynAt(dl, T, 0) : 0), l1 = l + (dl ? this._dynAt(dl, T, 3) : 0), l2 = l + (dl ? this._dynAt(dl, T, 6) : 0);
        this._tri(T[0], T[1], T[2], T[3], T[4], T[5], T[6], T[7], T[8], g.uv[t * 6], g.uv[t * 6 + 1], g.uv[t * 6 + 2], g.uv[t * 6 + 3], g.uv[t * 6 + 4], g.uv[t * 6 + 5], l0, l1, l2, M, inst.tint || 0);
      }
    }
  }
  // one world triangle: view transform, near clip, project, raster
  _tri(x0, y0, z0, x1, y1, z1, x2, y2, z2, u0, v0, u1, v1, u2, v2, l0, l1, l2, M, tint) {
    const cs = this.cs, R = cs.r, Uu = cs.u, Ff = cs.f, ox = cs.pos[0], oy = cs.pos[1], oz = cs.pos[2];
    const vx = (x, y, z) => (x - ox) * R[0] + (y - oy) * R[1] + (z - oz) * R[2];
    const vy = (x, y, z) => (x - ox) * Uu[0] + (y - oy) * Uu[1] + (z - oz) * Uu[2];
    const vz = (x, y, z) => (x - ox) * Ff[0] + (y - oy) * Ff[1] + (z - oz) * Ff[2];
    const A = [vx(x0, y0, z0), vy(x0, y0, z0), vz(x0, y0, z0), u0, v0, l0], B = [vx(x1, y1, z1), vy(x1, y1, z1), vz(x1, y1, z1), u1, v1, l1], C = [vx(x2, y2, z2), vy(x2, y2, z2), vz(x2, y2, z2), u2, v2, l2];
    const NEAR = 2, far = this.fogF + 40;
    if (A[2] > far && B[2] > far && C[2] > far) return;
    if (A[2] < NEAR && B[2] < NEAR && C[2] < NEAR) return;
    // frustum side rejection (all three outside one side)
    const kx = this.W / 2 / this.F, ky = this.H / 2 / this.F;
    if (A[0] > A[2] * kx && B[0] > B[2] * kx && C[0] > C[2] * kx) return;
    if (-A[0] > A[2] * kx && -B[0] > B[2] * kx && -C[0] > C[2] * kx) return;
    if (A[1] > A[2] * ky && B[1] > B[2] * ky && C[1] > C[2] * ky) return;
    if (-A[1] > A[2] * ky && -B[1] > B[2] * ky && -C[1] > C[2] * ky) return;
    if (A[2] >= NEAR && B[2] >= NEAR && C[2] >= NEAR) { this._raster(this._proj(A), this._proj(B), this._proj(C), M, tint); return; }
    // Sutherland-Hodgman against z = NEAR
    const inp = [A, B, C], out = [];
    for (let i = 0; i < 3; i++) {
      const P = inp[i], Q = inp[(i + 1) % 3], pin = P[2] >= NEAR, qin = Q[2] >= NEAR;
      if (pin) out.push(P);
      if (pin !== qin) { const t = (NEAR - P[2]) / (Q[2] - P[2]); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, NEAR, P[3] + (Q[3] - P[3]) * t, P[4] + (Q[4] - P[4]) * t, P[5] + (Q[5] - P[5]) * t]); }
    }
    if (out.length < 3) return;
    const pr = out.map(p => this._proj(p));
    for (let i = 1; i < pr.length - 1; i++) this._raster(pr[0], pr[i], pr[i + 1], M, tint);
  }
  _proj(p) {
    const iz = 1 / p[2], F = this.F; let sx = this.cx + p[0] * F * iz, sy = this.cy - p[1] * F * iz;
    if (this.wobble) { sx = Math.round(sx); sy = Math.round(sy); return [sx, sy, iz, p[3], p[4], p[5], 1]; }
    return [sx, sy, iz, p[3] * iz, p[4] * iz, p[5] * iz, 0];
  }
  // scanline raster of a projected triangle; each vertex [sx, sy, 1/z, u/z, v/z, L/z, affine]
  _raster(a, b, c, M, tint) {
    this.stats.tris++;
    const area = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
    if (Math.abs(area) < 1e-6) return;
    const W = this.W, H = this.H, col = this.col, dep = this.depth, ia = 1 / area;
    const g = q => [((b[q] - a[q]) * (c[1] - a[1]) - (c[q] - a[q]) * (b[1] - a[1])) * ia, ((c[q] - a[q]) * (b[0] - a[0]) - (b[q] - a[q]) * (c[0] - a[0])) * ia];
    const [dzx, dzy] = g(2), [dux, duy] = g(3), [dvx, dvy] = g(4), [dlx, dly] = g(5);
    // sort by y
    let p0 = a, p1 = b, p2 = c, t;
    if (p1[1] < p0[1]) { t = p0; p0 = p1; p1 = t; } if (p2[1] < p0[1]) { t = p0; p0 = p2; p2 = t; } if (p2[1] < p1[1]) { t = p1; p1 = p2; p2 = t; }
    const yStart = Math.max(0, Math.ceil(p0[1] - .5)), yEnd = Math.min(H, Math.ceil(p2[1] - .5));
    if (yStart >= yEnd) return;
    const bands = M.bands, glow = M.glow, water = M.water, alpha = M.alpha, sc = M.scale, affine = a[6] === 1;
    const fogC = this.fogC, fogN = this.fogN, fogK = this.fogK * (glow ? .5 : 1), fr = fogC[0], fgc = fogC[1], fb = fogC[2];
    const tr = tint ? tint & 255 : 128, tg = tint ? (tint >> 8) & 255 : 128, tb = tint ? (tint >> 16) & 255 : 128, tinted = tint && !(tr === 128 && tg === 128 && tb === 128);
    const time = this.time, bay = BAYER4, flash = this.flash;
    const ax = a[0], ay = a[1], az = a[2], au = a[3], av = a[4], al = a[5];
    for (let y = yStart; y < yEnd; y++) {
      const yc = y + .5;
      // long edge p0->p2, short edge p0->p1 or p1->p2
      const xl0 = p0[0] + (p2[0] - p0[0]) * (yc - p0[1]) / ((p2[1] - p0[1]) || 1e-9);
      let xs;
      if (yc < p1[1]) xs = p0[0] + (p1[0] - p0[0]) * (yc - p0[1]) / ((p1[1] - p0[1]) || 1e-9);
      else xs = p1[0] + (p2[0] - p1[0]) * (yc - p1[1]) / ((p2[1] - p1[1]) || 1e-9);
      let xa = xl0 < xs ? xl0 : xs, xb = xl0 < xs ? xs : xl0;
      let x0 = Math.max(0, Math.ceil(xa - .5)), x1 = Math.min(W, Math.ceil(xb - .5));
      if (x0 >= x1) continue;
      const dx0 = x0 + .5 - ax, dy0 = yc - ay;
      let iz = az + dzx * dx0 + dzy * dy0, uz = au + dux * dx0 + duy * dy0, vz = av + dvx * dx0 + dvy * dy0, lz = al + dlx * dx0 + dly * dy0;
      let idx = y * W + x0;
      const brow = (y & 3) * 4;
      for (let x = x0; x < x1; x++, idx++, iz += dzx, uz += dux, vz += dvx, lz += dlx) {
        if (iz <= 0) continue;
        const z = affine ? 1 / iz : 1 / iz;
        if (z >= dep[idx]) continue;
        let u, v, l;
        if (affine) { u = uz; v = vz; l = lz; } else { u = uz * z; v = vz * z; l = lz * z; }
        const th = bay[brow + (x & 3)];
        if (water) { l = l * .85 + .25 * Math.sin(u * .11 + time * 1.3) * Math.sin(v * .07 - time) + .1; }
        let band = (l * 4 + th) | 0; if (band > 4) band = 4; else if (band < 0) band = 0;
        if (glow) band = 4;
        const tu = ((u * sc) | 0) & 31, tv = 31 - (((v * sc) | 0) & 31);
        let cc = bands[band][(tv << 5) | tu];
        if (alpha && cc === 0) continue;
        let r = cc & 255, gg = (cc >> 8) & 255, bb = (cc >> 16) & 255;
        if (water && TC.vnoise((u + time * 8) * .25, v * .25, 40) > .8) { r = 200; gg = 220; bb = 255; }
        if (tinted) { r = (r * tr) >> 7; gg = (gg * tg) >> 7; bb = (bb * tb) >> 7; if (r > 255) r = 255; if (gg > 255) gg = 255; if (bb > 255) bb = 255; }
        if (flash) { r += (255 - r) * flash; gg += (255 - gg) * flash; bb += (255 - bb) * flash; }
        let f = (z - fogN) * fogK; if (f > 0) { f = (f + th) | 0; if (f > 8) f = 8; if (f > 0) { const k = 8 - f; r = (r * k + fr * f) >> 3; gg = (gg * k + fgc * f) >> 3; bb = (bb * k + fb * f) >> 3; } }
        col[idx] = 0xff000000 | (bb << 16) | (gg << 8) | r; dep[idx] = z;
      }
      this.stats.px += x1 - x0;
    }
  }
  // ------------------------------------------------------------ sky (pixels the world did not cover)
  sky(spec) {
    const W = this.W, H = this.H, col = this.col, dep = this.depth, cs = this.cs, F = this.F, cx = this.cx, cy = this.cy, t = this.time;
    const st = spec.stops.map(hexRGB), stars = spec.stars, moon = spec.moon, clouds = spec.clouds, sil = spec.sil || [], flash = (spec.flash || 0) + this.flash;
    const md = moon ? vnorm([Math.cos(moon.az) * Math.cos(moon.el), Math.sin(moon.az) * Math.cos(moon.el), Math.sin(moon.el)]) : null, mc = moon ? hexRGB(moon.color) : null;
    const cc = clouds ? hexRGB(clouds.color) : null, sl = sil.map(s => ({ c: hexRGB(s.color), h: s.h, lit: s.lit ? hexRGB(s.lit) : null }));
    const glow = spec.glow ? { c: hexRGB(spec.glow.color), az: spec.glow.az, w: spec.glow.w || .8, k: spec.glow.k || .5 } : null;
    for (let y = 0; y < H; y++) {
      const dyc = -(y + .5 - cy) / F;
      for (let x = 0; x < W; x++) {
        const idx = y * W + x; if (dep[idx] < 1e9) continue;
        const dxc = (x + .5 - cx) / F;
        const dX = cs.f[0] + cs.r[0] * dxc + cs.u[0] * dyc, dY = cs.f[1] + cs.r[1] * dxc + cs.u[1] * dyc, dZ = cs.f[2] + cs.r[2] * dxc + cs.u[2] * dyc;
        const il = 1 / Math.sqrt(dX * dX + dY * dY + dZ * dZ), ez = dZ * il, el = Math.asin(ez), az = Math.atan2(dY, dX);
        // gradient: bottom (horizon) -> mid -> top
        let k = clamp(el / .9, 0, 1), r, g, b;
        if (k < .25) { const q = k / .25; r = lerp(st[2][0], st[1][0], q); g = lerp(st[2][1], st[1][1], q); b = lerp(st[2][2], st[1][2], q); }
        else { const q = (k - .25) / .75; r = lerp(st[1][0], st[0][0], q); g = lerp(st[1][1], st[0][1], q); b = lerp(st[1][2], st[0][2], q); }
        if (el < 0) { const q = clamp(-el * 4, 0, 1); r = lerp(st[2][0], this.fogC[0], q); g = lerp(st[2][1], this.fogC[1], q); b = lerp(st[2][2], this.fogC[2], q); }
        if (glow) { const da = Math.abs(angDiff(az, glow.az)), q = Math.max(0, 1 - da / glow.w) * Math.max(0, 1 - el * 3) * glow.k; r += (glow.c[0] - r) * q; g += (glow.c[1] - g) * q; b += (glow.c[2] - b) * q; }
        const th = BAYER4[(y & 3) * 4 + (x & 3)];
        if (stars && el > .06) { const qx = Math.floor(az * 260), qy = Math.floor(el * 260), h = TC.noise2(qx, qy, 77); if (h > .993) { const tw = .6 + .4 * Math.sin(t * 3 + h * 900); r = g = b = 200 * tw + 40; } }
        if (clouds && el > .02) { const n = TC.vnoise(az * 3 + t * .01, el * 9, 5) * TC.vnoise(az * 7 - t * .02, el * 15, 6); const q = clamp((n - clouds.cover) * 4, 0, 1) * clouds.k; if (q > th * .9) { r = lerp(r, cc[0], q); g = lerp(g, cc[1], q); b = lerp(b, cc[2], q); } }
        if (md) { const dd = (dX * md[0] + dY * md[1] + dZ * md[2]) * il; if (dd > .99975) { r = mc[0]; g = mc[1]; b = mc[2]; } else if (dd > .9988) { const q = (dd - .9988) / .00095 * .5; r += (mc[0] - r) * q; g += (mc[1] - g) * q; b += (mc[2] - b) * q; } }
        for (let s = 0; s < sl.length; s++) { const L = sl[s], hh = L.h(az); if (el < hh && el > -.3) { r = L.c[0]; g = L.c[1]; b = L.c[2]; if (L.lit && TC.noise2(Math.floor(az * 300), Math.floor(el * 300), 9 + s) > .965) { r = L.lit[0]; g = L.lit[1]; b = L.lit[2]; } } }
        if (flash) { r += (235 - r) * flash; g += (240 - g) * flash; b += (255 - b) * flash; }
        col[idx] = 0xff000000 | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255);
      }
    }
  }
  // ------------------------------------------------------------ actors as billboards
  // a: { x, y, z (feet), chest (height of the depth point), h (world height), draw(g, ox, oy, view), light: [r, g, b] (1 = white), flash, alpha, clipZ }
  billboard(a) {
    const chest = [a.x, a.y, a.z + (a.chest || 16)], v = this.toView(chest);
    if (v[2] < 8 || v[2] > this.fogF + 40) return;
    const k = this.F / v[2], feet = this.project([a.x, a.y, a.z]); if (!feet) return;
    const hpx = (a.h || 30) * k; if (hpx < 3) return;
    const cs = this.cs, b = Math.atan2(a.y - cs.pos[1], a.x - cs.pos[0]), hd = Math.hypot(a.x - cs.pos[0], a.y - cs.pos[1]);
    const yawDeg = Math.round((-b * 180 / Math.PI - 90) / 2) * 2, pitchDeg = Math.max(3, Math.round(Math.atan2(cs.pos[2] - chest[2], hd) * 180 / Math.PI / 2) * 2), q = Math.max(1 / 16, Math.round(k * 16) / 16);
    const key = yawDeg + ':' + pitchDeg + ':' + q;
    let view = this._views.get(key); if (!view) { if (this._views.size > 600) this._views.clear(); view = new E.View('r3', 'Rail3D', yawDeg, pitchDeg, q, 1); this._views.set(key, view); }
    const S = Math.min(512, Math.ceil(hpx * 1.7 + 12)), fy = Math.round(S * .78);
    if (!this._bb || this._bb.width < S || this._bb.height < S) { this._bb = E.mkCanvas(Math.max(S, 128), Math.max(S, 128)); this._bbg = this._bb.getContext('2d', { willReadFrequently: true }); }
    const g = this._bbg; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); E.px.reset && E.px.reset(g);
    try { a.draw(g, Math.round(S / 2), fy, view); } catch (e) { return; }
    const img = g.getImageData(0, 0, S, S).data, W = this.W, H = this.H, col = this.col, dep = this.depth;
    const zc = v[2] - (a.bias === undefined ? 4 : a.bias), lr = a.light ? a.light[0] : 1, lg = a.light ? a.light[1] : 1, lb = a.light ? a.light[2] : 1, fl = a.flash || 0;
    const X0 = Math.round(feet[0] - S / 2), Y0 = Math.round(feet[1] - fy);
    const fogN = this.fogN, fogK = this.fogK, fc = this.fogC; let f = (zc - fogN) * fogK; f = f < 0 ? 0 : f > 8 ? 8 : f;
    const clipY = a.clipZ !== undefined ? (this.project([a.x, a.y, a.clipZ]) || [0, -1e9])[1] : 1e9;
    for (let j = 0; j < S; j++) {
      const Y = Y0 + j; if (Y < 0 || Y >= H || Y > clipY) continue;
      for (let i = 0; i < S; i++) {
        const s = (j * S + i) * 4; if (img[s + 3] < 128) continue;
        const X = X0 + i; if (X < 0 || X >= W) continue;
        const idx = Y * W + X; if (zc >= dep[idx]) continue;
        if (a.alpha !== undefined && a.alpha < 1 && BAYER4[(Y & 3) * 4 + (X & 3)] > a.alpha) continue;
        let r = img[s] * lr, gg = img[s + 1] * lg, bb = img[s + 2] * lb;
        if (fl) { r += (255 - r) * fl; gg += (255 - gg) * fl; bb += (255 - bb) * fl; }
        const ff = (f + BAYER4[(Y & 3) * 4 + (X & 3)]) | 0; if (ff > 0) { const kk = 8 - Math.min(8, ff); r = (r * kk + fc[0] * (8 - kk)) / 8; gg = (gg * kk + fc[1] * (8 - kk)) / 8; bb = (bb * kk + fc[2] * (8 - kk)) / 8; }
        col[idx] = 0xff000000 | (clamp(bb, 0, 255) << 16) | (clamp(gg, 0, 255) << 8) | clamp(r, 0, 255); dep[idx] = zc;
      }
    }
    this.stats.actors++;
  }
  // ------------------------------------------------------------ particles, lines
  // a round splat of world size s at p: mode 'add' (glows, sparks), 'alpha' (dithered: smoke, spray), 'solid'
  splat(p, s, rgb, mode = 'add', alpha = 1) {
    const v = this.toView(p); if (v[2] < 3) return;
    const k = this.F / v[2], R = s * k, sx = this.cx + v[0] * k, sy = this.cy - v[1] * k, z = v[2];
    if (sx + R < 0 || sx - R > this.W || sy + R < 0 || sy - R > this.H) return;
    const W = this.W, col = this.col, dep = this.depth, r2 = Math.max(.3, R * R);
    const x0 = Math.max(0, Math.floor(sx - R)), x1 = Math.min(W - 1, Math.ceil(sx + R)), y0 = Math.max(0, Math.floor(sy - R)), y1 = Math.min(this.H - 1, Math.ceil(sy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + .5 - sx, dy = y + .5 - sy, d2 = dx * dx + dy * dy; if (d2 > r2 && !(R < .8 && x === (sx | 0) && y === (sy | 0))) continue;
      const idx = y * W + x; if (z >= dep[idx]) continue;
      const th = BAYER4[(y & 3) * 4 + (x & 3)];
      if (mode === 'add') { const fall = R < 1.5 ? 1 : 1 - d2 / r2 * .6, c = col[idx], k2 = alpha * fall; col[idx] = 0xff000000 | (Math.min(255, ((c >> 16) & 255) + rgb[2] * k2) << 16) | (Math.min(255, ((c >> 8) & 255) + rgb[1] * k2) << 8) | Math.min(255, (c & 255) + rgb[0] * k2); }
      else if (mode === 'alpha') { if (th > alpha * (1 - d2 / r2 * .5)) continue; col[idx] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; }
      else { col[idx] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; dep[idx] = z; }
    }
  }
  line(a, b, rgb, mode = 'add', alpha = 1) {
    let A = this.toView(a), B = this.toView(b); const NEAR = 3;
    if (A[2] < NEAR && B[2] < NEAR) return;
    if (A[2] < NEAR) { const t = (NEAR - A[2]) / (B[2] - A[2]); A = [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, NEAR]; }
    if (B[2] < NEAR) { const t = (NEAR - B[2]) / (A[2] - B[2]); B = [B[0] + (A[0] - B[0]) * t, B[1] + (A[1] - B[1]) * t, NEAR]; }
    const F = this.F, ax = this.cx + A[0] * F / A[2], ay = this.cy - A[1] * F / A[2], bx = this.cx + B[0] * F / B[2], by = this.cy - B[1] * F / B[2];
    const n = Math.min(2000, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1), W = this.W, H = this.H, col = this.col, dep = this.depth;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = Math.round(ax + (bx - ax) * t), y = Math.round(ay + (by - ay) * t); if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const z = 1 / lerp(1 / A[2], 1 / B[2], t), idx = y * W + x; if (z >= dep[idx]) continue;
      if (mode === 'add') { const c = col[idx]; col[idx] = 0xff000000 | (Math.min(255, ((c >> 16) & 255) + rgb[2] * alpha) << 16) | (Math.min(255, ((c >> 8) & 255) + rgb[1] * alpha) << 8) | Math.min(255, (c & 255) + rgb[0] * alpha); }
      else col[idx] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0];
    }
  }
  // screen-space darkening / tint over the whole frame (cover vignette, smoke)
  vignette(k, rgb = [0, 0, 0]) {
    const W = this.W, H = this.H, col = this.col;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2), d = dx * dx * .7 + dy * dy, q = clamp((d - .35) * k, 0, .85);
      if (q <= BAYER4[(y & 3) * 4 + (x & 3)] * .9) continue;
      const i = y * W + x, c = col[i], m = 1 - q * .6; col[i] = 0xff000000 | (((((c >> 16) & 255) * m + rgb[2] * q * .6) & 255) << 16) | (((((c >> 8) & 255) * m + rgb[1] * q * .6) & 255) << 8) | (((c & 255) * m + rgb[0] * q * .6) & 255);
    }
  }
  haze(k, rgb) {
    const col = this.col, n = col.length, W = this.W;
    for (let i = 0; i < n; i++) { const x = i % W, y = (i / W) | 0; if (BAYER4[(y & 3) * 4 + (x & 3)] > k) continue; col[i] = 0xff000000 | (rgb[2] << 16) | (rgb[1] << 8) | rgb[0]; }
  }
  present(g, x, y) {
    this.cg.putImageData(this.img, 0, 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.drawImage(this.cv, x, y); g.restore();
  }
}
TC.Rail3D = Rail3D;

// ===== 20-sim.js
// 20-sim: the Sim, the whole game state stepped from player commands with seeded RNG. Players (cover, lives, i-frames,
// score, chain, stats, continues), weapons (registry, firing, ammo, switching), hitscan shots, TIME, the Director
// (travel -> action -> clear -> ... -> boss -> outro), cutscenes as data, and each player's logical camera.
// The presentation only reads it. Reads: registries (00), Builder (03), enemies (21), combat (22), bosses (25).

// rig heights (heroic, size 1) measured from the engine's Humanoid: standing and crouching
const RIGH = { head: 28.7, headCrouch: 23.6, sh: 24.1, shCrouch: 19.2, hip: 14.5, hipCrouch: 9.8, top: 32 };
TC.RIGH = RIGH;
const EYE_STAND = 24, EYE_COVER = 12;

// ---------------------------------------------------------------- weapons
def('weapon', 'hg', { slot: 1, name: 'P9 MARLIN', short: 'HANDGUN', mag: 9, rate: 6, auto: 3.5, dmg: () => tune.weapon.hgDamage, spread: 0, switch: .2, recoil: .6, sfx: 'hg' });
def('weapon', 'mg', { slot: 2, name: 'RIPTIDE', short: 'MACHINE GUN', pool: 240, pick: 60, rate: () => tune.weapon.mgRate, full: true, dmg: () => tune.weapon.mgDamage, spread: .6, bloom: 3, switch: .25, recoil: .25, sfx: 'mg' });
def('weapon', 'sg', { slot: 3, name: 'BREAKWATER', short: 'SHOTGUN', pool: 36, pick: 8, rate: 1.5, dmg: () => .45, pellets: () => tune.weapon.sgPellets, spread: () => tune.weapon.sgSpread, switch: .3, recoil: 2.2, sfx: 'sg', stagger: true });
def('weapon', 'gl', { slot: 4, name: 'SQUALL', short: 'GRENADE L.', pool: 6, pick: 2, rate: 1, dmg: () => tune.weapon.glDamage, proj: true, switch: .35, recoil: 1.5, sfx: 'gl' });
const WEAPONS = ['hg', 'mg', 'sg', 'gl'];
TC.WEAPONS = WEAPONS;
const wv = (w, k) => typeof w[k] === 'function' ? w[k]() : w[k];

// ---------------------------------------------------------------- speakers' agents (players)
const AGENTS = ['kai', 'rook', 'mari', 'juno'];
TC.AGENTS = AGENTS;

class Sim {
  constructor(o = {}) {
    this.o = o; this.mode = o.mode || 'arcade'; this.diffId = o.difficulty || 'normal'; this.diff = DIFF[this.diffId];
    this.seed = o.seed === undefined ? 1 : o.seed; this.rngs = {};
    this.cheats = Object.assign({ god: false, ammo: false, freeze: false, oneHit: false }, o.cheats || {});
    this.t = 0; this.events = []; this.runner = new Runner(); this.nextId = 1;
    this.players = (o.players || [{ id: 0, name: 'P1', color: '#e8443a' }]).map((p, i) => this._newPlayer(p, i));
    this.enemies = []; this.projectiles = []; this.objects = []; this.civilians = []; this.allies = []; this.threats = []; this.boss = null; this.fxq = [];
    this.stageList = o.stages || (this.mode === 'arcade' || this.mode === 'coop' ? [1, 2, 3] : [o.stage || 1]);
    this.stageIdx = 0; this.phase = 'boot'; this.timer = 0; this.scene = null; this.sceneIdx = -1; this.cut = null; this.done = null;
    this.travelD = 0; this.actionT = 0; this.clearT = 0; this.waves = []; this.spawnedBy = {}; this.cueFired = {}; this.timeUp = 0; this.slow = 0;
    this.radio = [];   // { speaker, text, t } queued radio lines (presentation shows them)
    this.water = 0;   // stage 3's rising water
    this.hostage = null;
    this.flags = {};
    if (o.noStart) return;
    this.loadStage(this.stageList[0], o.scene ? { scene: o.scene } : {});
  }
  rng(stream) { return this.rngs[stream] || (this.rngs[stream] = mkRng(hashStr(stream) ^ (this.seed * 2654435761))); }
  emit(type, e = {}) { e.type = type; e.t = this.t; this.events.push(e); return e; }
  _newPlayer(p, i) {
    const lives = this.o.lives || (tune.player.lives !== TUNE.player.lives ? tune.player.lives : this.diff.lives);
    return { id: p.id === undefined ? i : p.id, i, name: p.name || 'P' + (i + 1), color: p.color || ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i % 4], agent: p.agent || AGENTS[i % 4], aspect: p.aspect || 16 / 9,
      slot: i, c: 0, coverHeld: false, lives, iframes: 0, score: 0, chain: 0, bestChain: 0, w: 'hg', mag: 9, ammo: { mg: 0, sg: 0, gl: 0 }, owned: { hg: true, mg: false, sg: false, gl: false },
      cool: 0, switchT: 0, reloadT: 0, bloom: 0, aim: [0, 0], cont: 0, contMark: 0, out: false, left: false, exposedFor: 0, hitT: 0, recoil: 0, lastFire: -9, firedAny: false, autoT: 0,
      stats: { shots: 0, hits: 0, heads: 0, kills: 0, quick: 0, saves: 0, livesLost: 0, civ: 0, time: 0 }, stageStats: null, nextExtra: 150000, bonusWave: 0 };
  }
  get stage() { return this._stage; }
  // ---------------------------------------------------------------- stage and scene flow
  loadStage(id, o = {}) {
    const st = get('stage', id); this._stage = st; this.stageId = id;
    this.builder = new Builder(st.env); this.builder.sim = this;
    st.build(this.builder, this);
    this.colliders = this.builder.colliders; this.covers = {};
    this.water = st.env.water ? st.env.water.z : -1e9;
    this.enemies = []; this.projectiles = []; this.objects = []; this.civilians = []; this.allies = []; this.threats = []; this.boss = null;
    for (const p of this.players) { p.stageStats = Object.assign({}, p.stats); p.stageLives = p.livesLostStage = 0; p.stageCont = false; p.stageScore = p.score; }
    this.stageT = 0; this.emit('stage', { id });
    const first = o.scene ? st.scenes.indexOf(o.scene) : 0;
    if (o.scene) { this.startScene(Math.max(0, first)); return; }
    if (st.intro && !this.o.skipCuts) this.startCut(st.intro, () => this.startScene(0)); else this.startScene(0);
  }
  startCut(id, then) {
    const c = get('cutscene', id);
    this.phase = 'cut'; this.cut = { id, steps: c.steps, i: -1, t: 0, line: null, then, cam: null, actors: c.actors || [], lineT: 0, total: 0 };
    this.emit('cut', { id });
    this._nextCutStep();
  }
  _nextCutStep() {
    const C = this.cut;
    for (;;) {
      C.i++; if (C.i >= C.steps.length) { this._endCut(); return; }
      const s = C.steps[C.i];
      if (s.cam) { C.cam = { keys: s.cam, t0: C.total }; continue; }
      if (s.fx) { this.emit('fx', s.fx); continue; }
      if (s.music) { this.emit('music', { song: s.music }); continue; }
      if (s.actor) { const a = C.actors.find(x => x.id === s.actor); if (a) Object.assign(a, s.set); continue; }
      if (s.say) { C.line = { speaker: s.say[0], text: s.say[1], screen: s.screen }; C.lineT = 0; this.emit('say', { speaker: s.say[0], text: s.say[1], modal: true }); return; }
      if (s.wait) { C.line = null; C.wait = s.wait; C.lineT = 0; return; }
    }
  }
  _endCut() { const C = this.cut; this.cut = null; this.emit('cutend', { id: C.id }); if (C.then) C.then(); }
  skipCut() { if (!this.cut) return; const C = this.cut; for (const s of C.steps.slice(C.i + 1)) if (s.fx && s.fx.keep) this.emit('fx', s.fx); this._endCut(); }
  startScene(idx) {
    const st = this._stage, id = st.scenes[idx]; this.sceneIdx = idx; const sc = this.scene = get('scene', id); this.sceneId = id;
    this.phase = 'travel'; this.travelD = 0; this.actionT = 0; this.waves = (sc.waves || []).map((w, i) => Object.assign({ i, fired: false, id: w.id || 'w' + i }, w)); this.spawnedBy = {}; this.cueFired = {};
    this.covers = {}; for (const k in sc.covers || {}) this.covers[k] = Object.assign({ id: k, busy: 0, h: 16, peek: ['up'] }, sc.covers[k]);
    this.arrive = sc.arrive ? new E.Path(sc.arrive.path, { smooth: 'catmull' }) : null;
    this.carrier = sc.carrier ? { path: new E.Path(sc.carrier.path, { smooth: 'catmull' }), d: 0, speed: sc.carrier.speed, pos: null, yaw: 0, mesh: sc.carrier.mesh, stopped: false } : null;
    if (this.carrier) this._carrierUpdate(0);
    const T = (sc.time || 60) * this.diff.timeMul * tune.time.sceneMul; this.timeMax = T; this.timer = T;
    this.emit('scene', { id, title: sc.title, idx });
    if (sc.enter) sc.enter(this);
    for (const o of sc.objects || []) this.spawnObject(o[0], o[1], o[2] || {});
    for (const a of sc.allies || []) if (this.players.length === 1 && this.mode !== 'host' && this.mode !== 'replica') this.allies.push({ id: this.nextId++, agent: a.agent, at: a.at, facing: a.facing || 0, fireT: 3, pose: a.pose });
    if (!this.arrive) this._beginAction();
  }
  _beginAction() {
    this.phase = 'action'; this.actionT = 0; this.emit('action', { id: this.sceneId });
    const sc = this.scene; if (sc.boss) this.startBoss(sc.boss);
    for (const p of this.players) { p.c = 0; }
  }
  _sceneClear() {
    this.phase = 'clear'; this.clearT = 0;
    const bonus = Math.floor(Math.max(0, this.timer)) * 100;
    for (const p of this.players) if (!p.out && !p.left) this.addScore(p, bonus, null, 'time');
    this.emit('clear', { id: this.sceneId, bonus, time: this.timer });
    this._cue('clear');
  }
  _nextScene() {
    const st = this._stage; this.threats = []; this.projectiles = this.projectiles.filter(p => p.team === 'fx');
    this.enemies = []; this.objects = this.objects.filter(o => o.keep); this.civilians = []; this.allies = []; this.hostage = null;
    if (this.sceneIdx + 1 < st.scenes.length) { this.startScene(this.sceneIdx + 1); return; }
    const fin = () => { this.phase = 'results'; this.emit('stageclear', { id: this.stageId }); };
    if (st.outro && !this.o.skipCuts) this.startCut(st.outro, fin); else fin();
  }
  // after the results screen (presentation calls it): the next stage, or the end
  nextStage() {
    this.stageIdx++;
    if (this.stageIdx < this.stageList.length) { this.loadStage(this.stageList[this.stageIdx]); return true; }
    const ending = this._stage.ending;
    if (ending && !this.o.skipCuts) this.startCut(ending, () => { this.phase = 'done'; this.done = { won: true }; this.emit('done', { won: true }); });
    else { this.phase = 'done'; this.done = { won: true }; this.emit('done', { won: true }); }
    return false;
  }
  jump(stageId, sceneId) { this.stageIdx = Math.max(0, this.stageList.indexOf(stageId)); if (this.stageIdx < 0) this.stageIdx = 0; this.loadStage(stageId, { scene: sceneId }); }
  // ---------------------------------------------------------------- the step
  step(dt, cmds = []) {
    this.events = [];
    this.t += dt; this.stageT += dt;
    if (this.phase === 'done' || this.phase === 'results' || this.phase === 'gameover') { this._players(dt, cmds, true); return this.events; }
    const allOut = this.players.length && this.players.every(p => p.out || p.left);
    const contFreeze = this.players.length === 1 && this.players[0].out && this.mode !== 'host';
    if (this.phase === 'cut') { this._cutStep(dt, cmds); this.runner.update(dt); return this.events; }
    this._players(dt, cmds, false);
    if (contFreeze) return this.events;
    if (allOut && this.mode !== 'host' && this.mode !== 'attract') { this.phase = 'gameover'; this.emit('gameover', {}); return this.events; }
    if (this.phase === 'travel') this._travel(dt);
    else if (this.phase === 'action') {
      this.actionT += dt;
      if (!tune.time.freeze && !this.cheats.freeze && !(this.boss && this.boss.intro > 0)) this.timer -= dt;
      if (this.timer <= 0) this._timeUp();
      this._waves(dt);
      this._cues();
      if (this.carrier) this._carrierStep(dt);
      if (this.scene.step) this.scene.step(this, dt);
    } else if (this.phase === 'clear') { this.clearT += dt; if (this.clearT > 1.4) this._nextScene(); }
    this.runner.update(dt);
    TC.stepEnemies(this, dt);
    TC.stepThreats(this, dt);
    TC.stepProjectiles(this, dt);
    TC.stepObjects(this, dt);
    if (this.boss) TC.stepBoss(this, dt);
    if (this.phase === 'action' && this._isClear()) this._sceneClear();
    return this.events;
  }
  _cutStep(dt, cmds) {
    const C = this.cut; C.t += dt; C.total += dt; C.lineT += dt;
    const adv = cmds.some(c => c && c.advance), skip = cmds.some(c => c && c.skip);
    if (skip) { this.skipCut(); return; }
    if (C.wait !== undefined && C.line === null) { if (C.lineT >= C.wait) { C.wait = undefined; this._nextCutStep(); } return; }
    if (C.line) {
      const need = Math.max(1.2, C.line.text.length * .045 + .6);
      if ((adv && C.lineT > .25) || C.lineT > need + (this.mode === 'attract' ? .4 : 3.5)) this._nextCutStep();
    }
  }
  _travel(dt) {
    const sc = this.scene, speed = (sc.arrive.speed || 110) * (this.mode === 'attract' ? 1.5 : 1);
    this.travelD += dt * speed;
    if (this.travelD >= this.arrive.length + speed * .3) this._beginAction();
  }
  _timeUp() {
    this.emit('timeup', {}); this._cue('timeup');
    for (const p of this.players) if (!p.out && !p.left) this.hurt(p, { ignoreI: true, reason: 'time' });
    this.timer = this.timeMax * tune.time.refill;
  }
  _waves(dt) {
    for (const w of this.waves) {
      if (w.fired) continue;
      let go = false;
      if (w.at !== undefined && this.actionT >= w.at) go = true;
      if (w.atD !== undefined && this.carrier && this.carrier.d >= w.atD) go = true;
      if (w.after === 'clear') { const prev = this.waves.filter(x => x.i < w.i); go = prev.every(x => x.fired && x.clear !== false) && this._waveAlive(prev) === 0 && this.actionT > .3; if (go) { w.delay = w.delay || 0; w._d = (w._d || 0) + dt; go = w._d >= (w.delay || .6); } }
      if (w.after && w.after.startsWith && w.after.startsWith('kills:')) go = this.killsInScene >= +w.after.slice(6);
      if (w.after && w.after !== 'clear' && !w.after.startsWith('kills:')) { const ref = this.waves.find(x => x.id === w.after); go = ref && ref.fired && this._waveAlive([ref]) === 0; }
      if (go) this._fireWave(w);
    }
  }
  _waveAlive(ws) { let n = 0; for (const w of ws) n += this.enemies.filter(e => e.wave === w.id && !e.dead && !e.civil && !e.noClear).length; return n; }
  _fireWave(w) {
    w.fired = true; this.emit('wave', { id: w.id });
    for (const s of w.spawn || []) this.spawnEnemy(s[0], s[1], Object.assign({ wave: w.id }, s[2] || {}));
    for (const c of w.civilians || []) TC.spawnCivilian(this, c);
    if (w.say) this.say(w.say[0], w.say[1]);
    if (w.fx) this.emit('fx', w.fx);
  }
  _cues() {
    const sc = this.scene;
    for (let i = 0; i < (sc.cues || []).length; i++) {
      const c = sc.cues[i]; if (this.cueFired[i]) continue;
      if (c.at !== undefined && this.actionT >= c.at) { this.cueFired[i] = true; this._doCue(c); }
    }
  }
  _cue(evt) { const sc = this.scene; if (!sc) return; (sc.cues || []).forEach((c, i) => { if (!this.cueFired[i] && c.on === evt) { this.cueFired[i] = true; this._doCue(c); } }); }
  _doCue(c) {
    if (c.say) this.say(c.say[0], c.say[1]);
    if (c.prompt) this.emit('prompt', { id: c.prompt });
    if (c.fx) this.emit('fx', c.fx);
    if (c.fn) c.fn(this);
  }
  say(speaker, text) { this.radio.push({ speaker, text, t: this.t }); this.emit('say', { speaker, text }); }
  _isClear() {
    if (this.waves.some(w => !w.fired)) return false;
    if (this.enemies.some(e => !e.dead && !e.civil && !e.noClear)) return false;
    if (this.boss && !(this.boss.defeated && this.boss.outT > 2.4)) return false;
    if (this.scene.objective && !this.scene.objective(this)) return false;
    if (this.carrier && !this.carrier.arrived) return false;
    return this.actionT > .5;
  }
  // ---------------------------------------------------------------- carriers (moving scenes)
  _carrierUpdate(dt) {
    const C = this.carrier, d = Math.min(C.d, C.path.length - .01), a = C.path.at(d), b = C.path.at(Math.min(C.path.length, d + 8));
    C.pos = [a.x, a.y, a.z]; C.yaw = Math.atan2(b.y - a.y, b.x - a.x); C.pitch = this.scene.carrier.pitch ? Math.atan2(b.z - a.z, Math.hypot(b.x - a.x, b.y - a.y)) : 0;
  }
  _carrierStep(dt) {
    const C = this.carrier, alive = this.enemies.some(e => !e.dead && !e.civil);
    let maxD = C.path.length - 1;
    for (const w of this.waves) if (w.hold !== undefined && w.fired && this.enemies.some(e => e.wave === w.id && !e.dead)) maxD = Math.min(maxD, w.hold);
    if (C.d < maxD) { C.d = Math.min(maxD, C.d + C.speed * dt); }
    // enemies the carrier has left behind drop out of the fight
    const fx = Math.cos(C.yaw), fy = Math.sin(C.yaw);
    for (const e of this.enemies) if (!e.dead && !e.ride && (e.x - C.pos[0]) * fx + (e.y - C.pos[1]) * fy < -30) { e.gone = true; if (e.cover) e.cover.busy = Math.max(0, e.cover.busy - 1); }
    else { C.arrived = this.waves.every(w => w.fired) ? true : C.arrived; if (!alive) C.arrived = true; }
    if (this.waves.every(w => w.fired) && C.d >= C.path.length - 1) C.arrived = true;
    this._carrierUpdate(dt);
  }
  // carrier-local -> world
  cw(p) { const C = this.carrier; if (!C) return p; let x = p[0], z = p[2]; if (C.pitch) { const cp = Math.cos(C.pitch), sp = Math.sin(C.pitch); x = p[0] * cp - p[2] * sp; z = p[0] * sp + p[2] * cp; } const c = Math.cos(C.yaw), s = Math.sin(C.yaw); return [C.pos[0] + x * c - p[1] * s, C.pos[1] + x * s + p[1] * c, C.pos[2] + z]; }
  // ---------------------------------------------------------------- cameras
  slotOf(i) {
    const sc = this.scene, sl = sc.slots, n = sl.length;
    if (i < n) return sl[i];
    // auto slots 3-4: slot 1 / 2 moved 28 u further out to the side
    const base = sl[i % 2] || sl[0], side = i % 2 === 0 ? -1 : 1, off = this._sideVec(base.stand, 28 * side);
    return { stand: { at: vadd(base.stand.at, off), look: vadd(base.stand.look, off) }, cover: { at: vadd(base.cover.at, off), look: vadd(base.cover.look, off) }, auto: true };
  }
  _sideVec(pose, k) { const f = vnorm([pose.look[0] - pose.at[0], pose.look[1] - pose.at[1], 0]); return [-f[1] * k, f[0] * k, 0]; }
  poseOf(i, which) {
    const s = this.slotOf(i)[which]; let at = s.at, look = s.look;
    if (this.carrier) { at = this.cw(at); look = this.cw(look); }
    const d = vsub(look, at); return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.atan2(d[2], Math.hypot(d[0], d[1])) };
  }
  cameraFor(i) {
    const fov = tune.view.fov;
    if (this.phase === 'cut' && this.cut && this.cut.cam) return Object.assign(this._cutCam(), { fov });
    if (!this.scene) return { x: 0, y: 0, z: 24, yaw: 0, pitch: 0, roll: 0, fov };
    const p = this.players[i] || this.players[0];
    if (this.phase === 'travel' && this.arrive) {
      const L = this.arrive.length, d = Math.min(this.travelD, L), q = this.arrive.at(Math.max(0, Math.min(L - .01, d))), q2 = this.arrive.at(Math.min(L, d + 24));
      const stand = this.poseOf(i, 'stand'), end = this.arrive.at(L - .01);
      const k = smooth(clamp((d - (L - 90)) / 90, 0, 1)) * (L > 0 ? 1 : 0), k2 = clamp((this.travelD - L) / (((this.scene.arrive.speed || 110)) * .3), 0, 1);
      const offx = (stand.x - end.x) * k, offy = (stand.y - end.y) * k;
      let yaw = Math.atan2(q2.y - q.y, q2.x - q.x), pitch = 0;
      const lk = this.scene.arrive.look; if (lk && lk !== 'path') { yaw = lerpAng(yaw, Math.atan2(lk[1] - q.y, lk[0] - q.x), smooth(clamp(d / L, 0, 1))); pitch = lerp(0, Math.atan2(lk[2] - q.z, Math.hypot(lk[0] - q.x, lk[1] - q.y)), clamp(d / L, 0, 1)); }
      const bob = Math.sin(this.travelD / 14) * 1.2 * (this.scene.arrive.speed > 80 && !this.scene.arrive.vehicle ? 1 : 0);
      const pos = { x: q.x + offx, y: q.y + offy, z: q.z + bob, yaw, pitch, roll: 0, fov };
      if (k2 > 0) { const s = smooth(k2); return { x: lerp(pos.x, stand.x, s), y: lerp(pos.y, stand.y, s), z: lerp(pos.z, stand.z, s), yaw: lerpAng(yaw, stand.yaw, s), pitch: lerp(pitch, stand.pitch, s), roll: 0, fov }; }
      return pos;
    }
    const a = this.poseOf(i, 'stand'), b = this.poseOf(i, 'cover'), c = smooth(clamp(p.c, 0, 1));
    return { x: lerp(a.x, b.x, c), y: lerp(a.y, b.y, c), z: lerp(a.z, b.z, c), yaw: lerpAng(a.yaw, b.yaw, c), pitch: lerp(a.pitch, b.pitch, c), roll: Math.sin(Math.PI * c) * 2 * DEG, fov };
  }
  _cutCam() {
    const C = this.cut.cam, keys = C.keys, t = this.cut.total - C.t0;
    let k0 = keys[0], k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i].t && t <= keys[i + 1].t) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    if (t > keys[keys.length - 1].t) k0 = k1 = keys[keys.length - 1];
    const s = k1 === k0 ? 1 : smooth(clamp((t - k0.t) / (k1.t - k0.t), 0, 1)), at = vlerp(k0.at, k1.at, s), look = vlerp(k0.look, k1.look, s), d = vsub(look, at);
    return { x: at[0], y: at[1], z: at[2], yaw: Math.atan2(d[1], d[0]), pitch: Math.atan2(d[2], Math.hypot(d[0], d[1])), roll: 0 };
  }
  camSetupFor(i) { const cam = this.cameraFor(i), p = this.players[i]; return camSetup(Object.assign({}, cam, { aspect: p ? p.aspect : 16 / 9 })); }
  // ---------------------------------------------------------------- players
  exposed(p) { return p.c < .5; }
  _players(dt, cmds, frozen) {
    for (const p of this.players) {
      const cmd = cmds[p.i] || {};
      if (p.left) continue;
      if (p.out) {
        if (this.mode === 'host' || this.mode === 'replica') { p.cont -= dt; if (p.cont <= 0) this.continuePlayer(p, true); continue; }
        p.cont -= dt; if (cmd.advance || cmd.fireP) { if (p.cont < 9.7) this.continuePlayer(p); }
        if (p.cont <= 0) { p.cont = 0; p.left = this.players.length > 1; if (this.players.length === 1) { this.phase = 'gameover'; this.emit('gameover', {}); } }
        continue;
      }
      if (frozen) continue;
      p.aim = cmd.aim ? [clamp(cmd.aim[0], -p.aspect, p.aspect), clamp(cmd.aim[1], -1, 1)] : p.aim;
      p.iframes = Math.max(0, p.iframes - dt); p.cool = Math.max(0, p.cool - dt); p.switchT = Math.max(0, p.switchT - dt); p.hitT = Math.max(0, p.hitT - dt);
      p.bloom = Math.max(0, p.bloom - 6 * dt); p.recoil = Math.max(0, p.recoil - dt * 8);
      const fighting = this.phase === 'action';
      // cover
      const want = fighting ? !!cmd.cover || p.reloadT > 0 : false;
      const was = p.c >= .5;
      p.c = approach(p.c, want ? 1 : 0, dt / (want ? tune.player.coverIn : tune.player.coverOut));
      if (p.c >= .5 && !was) this.emit('cover', { p: p.i, on: true }); if (p.c < .5 && was) this.emit('cover', { p: p.i, on: false });
      p.stats.time += fighting ? dt : 0;
      if (!fighting) { p.c = 0; continue; }
      p.exposedFor = this.exposed(p) ? p.exposedFor + dt : 0;
      // reload in cover (handgun magazine)
      if (p.c >= .99 && p.mag < 9) { p.reloadT += dt; if (p.reloadT >= tune.player.reload) { p.mag = 9; p.reloadT = 0; this.emit('reload', { p: p.i }); } }
      else if (cmd.reload && p.mag < 9 && p.c < .99) { p.reloadT = Math.max(p.reloadT, .0001); }
      else if (p.c < .99 && p.reloadT > 0 && !cmd.reload && p.c < .5) p.reloadT = 0;
      // weapon select
      if (cmd.sel) this.selectWeapon(p, WEAPONS[cmd.sel - 1]);
      if (cmd.next) this.cycleWeapon(p, 1); if (cmd.prev) this.cycleWeapon(p, -1);
      // fire
      const w = get('weapon', p.w);
      if (cmd.fireP && p.c >= .5) { this.cycleWeapon(p, 1); continue; }   // fire while hidden cycles weapons
      if (p.c > .2 || p.switchT > 0) continue;
      const rate = wv(w, 'rate'), auto = w.full || (cmd.fireDown && cmd.autoFire !== false && w.auto);
      if (cmd.fireP || (cmd.fireDown && auto)) {
        const interval = cmd.fireP && !w.full ? 1 / rate : 1 / (w.full ? rate : (w.auto || rate));
        if (p.cool <= 0) { this.fire(p, w); p.cool = interval; }
      }
    }
  }
  selectWeapon(p, id) { if (!id || p.w === id) return; if (id !== 'hg' && !(p.ammo[id] > 0 || this.cheats.ammo || tune.player.infAmmo)) return; p.w = id; p.switchT = get('weapon', id).switch; this.emit('switch', { p: p.i, w: id }); }
  cycleWeapon(p, dir) {
    const have = WEAPONS.filter(id => id === 'hg' || p.ammo[id] > 0 || ((this.cheats.ammo || tune.player.infAmmo) && p.owned[id]));
    if (have.length < 2) { this.emit('switch', { p: p.i, w: p.w, none: true }); return; }
    const i = have.indexOf(p.w); this.selectWeapon(p, have[(i + dir + have.length) % have.length]);
  }
  giveAmmo(p, id, n) { const w = get('weapon', id); const was = p.owned[id]; p.owned[id] = true; p.ammo[id] = Math.min(w.pool, p.ammo[id] + Math.round(n * tune.weapon.ammoMul)); this.emit('pickup', { p: p.i, w: id, n, first: !was }); }
  fire(p, w) {
    const inf = this.cheats.ammo || tune.player.infAmmo;
    if (w.id === 'hg') { if (p.mag <= 0) { this.emit('empty', { p: p.i }); p.cool = .25; return; } if (!inf) p.mag--; }
    else { if (p.ammo[w.id] <= 0 && !inf) { this.selectWeapon(p, 'hg'); return; } if (!inf) p.ammo[w.id]--; if (p.ammo[w.id] <= 0 && !inf) { p.w = 'hg'; p.switchT = .2; this.emit('switch', { p: p.i, w: 'hg', auto: true }); } }
    p.stats.shots++; p.recoil = 1; p.lastFire = this.t; p.firedAny = true;
    const cs = this.camSetupFor(p.i), pellets = w.pellets ? wv(w, 'pellets') : 1, spread = (wv(w, 'spread') || 0) + (w.bloom ? p.bloom : 0);
    if (w.bloom) p.bloom = Math.min(w.bloom, p.bloom + .35);
    this.emit('shot', { p: p.i, w: w.id, aim: p.aim.slice() });
    if (w.proj) { const dir = aimRay(cs, p.aim[0], p.aim[1]); TC.spawnProjectile(this, 'pgl', vadd(cs.pos, vmul(dir, 10)), vmul(dir, 640), { team: 'player', owner: p.i, gravity: 240 }); return; }
    let anyHit = false;
    const R = this.rng('spread' + p.i);
    for (let k = 0; k < pellets; k++) {
      let ax = p.aim[0], ay = p.aim[1];
      if (spread) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * Math.tan(spread * DEG) / cs.t; ax += Math.cos(a) * r; ay += Math.sin(a) * r; }
      const res = this.shoot(cs.pos, aimRay(cs, ax, ay), p, w, k === 0);
      if (res && res.scoring) anyHit = true;
    }
    if (anyHit) { p.stats.hits++; } else { p.chain = 0; this.emit('miss', { p: p.i }); }
  }
  // a ray through the world from a player: hits the nearest of enemies' volumes, boss parts, projectiles, objects,
  // civilians and colliders. Returns { kind, ... , scoring }.
  raycast(o, d, opt = {}) {
    let best = { t: Infinity };
    for (const c of this.colliders) { if (!c.on) continue; const t = rayAABB(o, d, c.b); if (t < best.t) best = { t, kind: 'wall', col: c }; }
    if (this.carrier && this.scene.carrier.cover) for (const cb of this.scene.carrier.cover) { const a = this.cw(cb[0]), b = this.cw(cb[1]); const bb = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]; const t = rayAABB(o, d, bb); if (t < best.t && t > 6) best = { t, kind: 'wall', col: { surf: 'metal' } }; }
    for (const e of this.enemies) {
      if (e.dead || !e.vols) continue;
      for (const v of e.vols) { const t = v.cap ? rayCapsule(o, d, v.a, v.b, v.r) : raySphere(o, d, v.c, v.r); if (t < best.t) best = { t, kind: v.shield ? 'shield' : 'enemy', e, part: v.part }; }
    }
    if (this.boss) for (const part of this.boss.parts) { if (!part.alive || !part.pos || part.hidden) continue; const t = raySphere(o, d, part.pos, part.r); if (t < best.t) best = { t, kind: 'boss', part }; }
    for (const pr of this.projectiles) { if (pr.team === 'player' || !pr.shootable) continue; const t = raySphere(o, d, pr.pos, pr.r + (opt.assist || 0)); if (t < best.t) best = { t, kind: 'proj', pr }; }
    for (const ob of this.objects) { if (ob.dead || !ob.r) continue; const t = ob.box ? rayAABB(o, d, ob.box) : raySphere(o, d, ob.pos, ob.r); if (t < best.t) best = { t, kind: 'object', ob }; }
    for (const c of this.civilians) { if (c.dead || !c.vols) continue; for (const v of c.vols) { const t = v.cap ? rayCapsule(o, d, v.a, v.b, v.r) : raySphere(o, d, v.c, v.r); if (t < best.t) best = { t, kind: 'civ', c }; } }
    if (this.water > -1e8 && d[2] < 0) { const t = (this.water - o[2]) / d[2]; if (t > 0 && t < best.t) best = { t, kind: 'water' }; }
    if (best.t === Infinity) return null;
    best.at = vadd(o, vmul(d, best.t)); return best;
  }
  shoot(o, d, p, w, first) {
    const hit = this.raycast(o, d);
    if (!hit) return null;
    const dmg = (wv(w, 'dmg') || 1) * (this.cheats.oneHit ? 99 : 1);
    hit.scoring = false;
    if (hit.kind === 'enemy') {
      const mul = hit.part === 'head' ? 2 : hit.part === 'legs' ? .75 : 1;
      TC.damageEnemy(this, hit.e, dmg * mul, { p, w: w.id, part: hit.part, at: hit.at, dir: d });
      hit.scoring = true;
    } else if (hit.kind === 'shield') { TC.shieldHit(this, hit.e, { p, w: w.id, at: hit.at }); this.emit('impact', { at: hit.at, surf: 'shield' }); hit.scoring = true; }
    else if (hit.kind === 'boss') { TC.damageBoss(this, hit.part, dmg, { p, w: w.id, at: hit.at }); hit.scoring = true; }
    else if (hit.kind === 'proj') { TC.damageProjectile(this, hit.pr, dmg, { p, at: hit.at }); hit.scoring = true; }
    else if (hit.kind === 'object') { hit.scoring = TC.damageObject(this, hit.ob, dmg, { p, at: hit.at, w: w.id }); }
    else if (hit.kind === 'civ') { TC.hitCivilian(this, hit.c, p, hit.at); }
    else this.emit('impact', { at: hit.at, surf: hit.kind === 'water' ? 'water' : hit.col.surf, n: vmul(d, -1) });
    return hit;
  }
  addScore(p, pts, at, why) {
    if (!p || p.left) return 0;
    const mul = why === 'time' || why === 'bonus' || pts < 0 ? 1 : 1 + Math.min(10, Math.floor(p.chain / 5)) * .1;
    const v = Math.round(pts * mul); p.score = Math.max(0, p.score + v);
    if (at) this.emit('points', { p: p.i, v, at, why });
    while (p.score >= p.nextExtra) { p.lives++; this.emit('extra', { p: p.i }); p.nextExtra = p.nextExtra === 150000 ? 400000 : p.nextExtra + 400000; }
    return v;
  }
  chainUp(p) { p.chain++; p.bestChain = Math.max(p.bestChain, p.chain); }
  hurt(p, o = {}) {
    if (p.out || p.left) return false;
    if (!o.ignoreI && p.iframes > 0) return false;
    if (this.cheats.god || tune.player.god) { this.emit('godhit', { p: p.i }); return false; }
    p.lives--; p.iframes = tune.player.iframes; p.chain = 0; p.hitT = .5; p.stats.livesLost++; p.livesLostStage = (p.livesLostStage || 0) + 1;
    this.emit('hurt', { p: p.i, reason: o.reason || 'shot', lives: p.lives });
    if (p.lives <= 0) { p.out = true; p.cont = 10; this.emit('out', { p: p.i }); if (this.mode === 'host' || this.mode === 'replica') p.cont = 6; }
    return true;
  }
  continuePlayer(p, auto) {
    p.out = false; p.lives = this.players.length === 1 || !auto ? (this.diff.lives) : 3; p.iframes = 2; p.contMark++; p.stageCont = true;
    if (auto) { p.score = Math.max(0, p.score - 5000); } else { p.score = 0; p.nextExtra = 150000; }
    this.emit('continue', { p: p.i });
    if (this.players.length === 1 && !auto) this._restartWaves();
  }
  _restartWaves() {
    if (this.phase !== 'action' || this.boss) return;
    this.enemies = []; this.threats = []; this.projectiles = []; this.timer = this.timeMax;
    for (const w of this.waves) { w.fired = false; w._d = 0; } this.actionT = 0;
  }
  // ---------------------------------------------------------------- spawning
  spawnEnemy(type, coverId, o = {}) { return TC.makeEnemy(this, type, coverId, o); }
  spawnObject(kind, at, o = {}) { return TC.makeObject(this, kind, at, o); }
  startBoss(id) { TC.makeBoss(this, id); }
  // a compact hash of the state (determinism tests)
  hash() {
    let s = this.phase + '|' + this.sceneId + '|' + this.timer.toFixed(3);
    for (const p of this.players) s += '|' + p.score + ',' + p.lives + ',' + p.c.toFixed(3) + ',' + p.mag + ',' + p.w;
    for (const e of this.enemies) s += '|' + e.id + e.state + e.x.toFixed(2) + e.y.toFixed(2) + e.hp.toFixed(2);
    for (const t of this.threats) s += '|t' + t.target + t.left.toFixed(3);
    if (this.boss) s += '|b' + this.boss.parts.map(p => p.hp.toFixed(2)).join(',');
    return hashStr(s).toString(16);
  }
}
TC.Sim = Sim;
TC.EYE = { stand: EYE_STAND, cover: EYE_COVER };

// ===== 21-enemies.js
// 21-enemies: the enemy archetype registry and their behavior state machines. Entries (stand, run, jump, rappel,
// door, vault, roll), peeks (up, side), fire plans that ask the ThreatDirector, relocation, the quartermaster's run,
// rushers, shields, snipers, drones, jet skis, mounted gunners and captors. Hit volumes are rebuilt each step from the
// pose (the same heights the engine's rig is drawn at). Reactions and deaths. Reads: Sim (20), threats (22).

// look: Humanoid options for the presentation; ai: the behavior
def('enemy', 'deckhand', { name: 'Deckhand', ai: 'soldier', hp: 1, score: 1000, expose: [1.4, 2.2], hide: [1.0, 1.9], burst: 3, gap: .12, threat: [.25, .32, .4], tele: 1.1, aim: [.35, .6],
  looks: [{ build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#26324a', pants: '#2b2b33', hat: '#1b2236', skin: '#e0b48a', boot: '#1a1a1a', metal: '#3a3f48', belt: '#3a2a1a' } },
          { build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#2a3550', pants: '#30303a', hat: '#1b2236', skin: '#8d5a3a', boot: '#1a1a1a', metal: '#3a3f48' } },
          { build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#1f2c44', pants: '#2b2b33', hat: '#242a40', skin: '#c68a5e', boot: '#1a1a1a', metal: '#3a3f48' } },
          { build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'cap', hair: 'short', colors: { cloth: '#2c3448', pants: '#2b2b33', hat: '#1b2236', skin: '#5e3a26', boot: '#1a1a1a', metal: '#3a3f48' } }] });
def('enemy', 'marine', { name: 'Marine', ai: 'soldier', hp: 2, score: 1500, expose: [1.6, 2.4], hide: [1.0, 1.7], burst: 4, gap: .1, threat: [.35, .35, .38], tele: .95, aim: [.3, .5],
  looks: [{ build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'helmet', armor: true, colors: { cloth: '#4a5a32', pants: '#3a4228', hat: '#3a4a2a', plate: '#5a6a3a', skin: '#d8a880', boot: '#2a2418', metal: '#30343a' } }] });
def('enemy', 'redtide', { name: 'Red Tide', ai: 'soldier', elite: true, hp: 2, score: 3000, expose: [.9, 1.3], hide: [.8, 1.3], burst: 2, gap: .09, threat: [1, 1, 1], tele: .55, aim: [.2, .3], always: true,
  looks: [{ build: 'heroic', weapon: 'gun', outfit: 'coat', sleeves: 'long', hat: { style: 'band', color: '#b0141e' }, hair: 'short', colors: { cloth: '#a81e22', coat: '#b4161e', pants: '#2a1012', trim: '#1a0a0a', skin: '#2a1a1a', boot: '#140808', metal: '#1a1a1e', belt: '#140808' } }] });
def('enemy', 'quartermaster', { name: 'Quartermaster', ai: 'runner', hp: 1, score: 2000, threat: [.1, .1, .1], tele: 1.2, burst: 1, gap: .2, aim: [.4, .5],
  looks: [{ build: 'heroic', weapon: null, outfit: 'shirt', sleeves: 'short', hat: 'cap', armor: true, colors: { cloth: '#ff7a1a', plate: '#ff8a20', pants: '#2a2a33', hat: '#ff6a10', skin: '#d8a880', boot: '#1a1a1a' } }] });
def('enemy', 'grenadier', { name: 'Grenadier', ai: 'soldier', fireKind: 'grenade', hp: 2, score: 2000, expose: [1.2, 1.4], hide: [1.4, 2.2], burst: 1, gap: .3, threat: [1, 1, 1], tele: 1.3, aim: [.45, .55],
  looks: [{ build: 'bulky', weapon: null, outfit: 'shirt', sleeves: 'none', hat: 'cap', armor: true, colors: { cloth: '#3a3a2a', plate: '#5a4a2a', pants: '#2a2a22', hat: '#2a2a1a', skin: '#c89070', boot: '#1a1a1a' } }] });
def('enemy', 'rocketeer', { name: 'Rocketeer', ai: 'soldier', fireKind: 'rocket', hp: 2, score: 2500, expose: [2.0, 2.4], hide: [1.6, 2.4], burst: 1, gap: .3, threat: [1, 1, 1], tele: .8, aim: [.8, .9],
  looks: [{ build: 'heroic', weapon: 'rifle', gunLen: 13, outfit: 'shirt', sleeves: 'long', hat: 'helmet', colors: { cloth: '#3a4250', pants: '#2a2e36', hat: '#4a5260', skin: '#d0a080', boot: '#1a1a1a', metal: '#4a5a3a' } }] });
def('enemy', 'shield', { name: 'Shield trooper', ai: 'shield', hp: 3, score: 3000, burst: 3, gap: .12, threat: [.4, .4, .45], tele: .9, aim: [.4, .5], expose: [1.2, 1.6], hide: [1.2, 1.8],
  looks: [{ build: 'bulky', weapon: 'gun', outfit: 'shirt', sleeves: 'long', hat: 'helmet', armor: true, shield: true, colors: { cloth: '#2a2e3a', plate: '#3a404c', pants: '#22252e', hat: '#30343e', skin: '#d0a080', boot: '#111', metal: '#222' } }] });
def('enemy', 'rusher', { name: 'Rusher', ai: 'rusher', hp: 1.5, score: 2000, threat: [1, 1, 1], tele: .45,
  looks: [{ build: 'heroic', weapon: 'sword', bladeLen: 13, outfit: 'shirt', sleeves: 'none', hat: { style: 'band', color: '#c02020' }, hair: 'spiky', colors: { cloth: '#d8d4c8', pants: '#3a3428', skin: '#b07850', hair: '#1a1a1a', boot: '#2a1a10', metal: '#d8dde8', hilt: '#3a2a1a' } }] });
def('enemy', 'sniper', { name: 'Sniper', ai: 'soldier', fireKind: 'laser', elite: true, hp: 1, score: 3000, expose: [2.0, 2.2], hide: [1.5, 2.2], burst: 1, gap: .2, threat: [1, 1, 1], tele: 1.4, aim: [.2, .2],
  looks: [{ build: 'heroic', weapon: 'rifle', gunLen: 14, outfit: 'coat', sleeves: 'long', hood: true, colors: { cloth: '#5a5e66', coat: '#6a6e76', hair: '#4a4e56', pants: '#3a3e46', skin: '#c8a080', boot: '#1a1a1a', metal: '#1a1a1e' } }] });
def('enemy', 'drone', { name: 'Drone', ai: 'drone', hp: 2, score: 1500, threat: [.3, .3, .35], tele: .9, burst: 1, gap: .2, aim: [.5, .7], fly: true });
def('enemy', 'jetski', { name: 'Jet ski', ai: 'jetski', hp: 1, score: 1500, threat: [.3, .3, .35], tele: 1.0, burst: 2, gap: .15, aim: [.4, .6],
  looks: [{ build: 'heroic', weapon: 'gun', outfit: 'shirt', sleeves: 'none', hat: { style: 'band', color: '#1a1a1a' }, colors: { cloth: '#1a6a7a', pants: '#1a1a22', skin: '#d0a080', boot: '#111' } }] });
def('enemy', 'gunner', { name: 'Mounted gunner', ai: 'gunner', hp: 3, score: 2500, threat: [.5, .5, .55], tele: 1.0, burst: 6, gap: .08, aim: [.4, .6], expose: [2.2, 2.8], hide: [1.0, 1.4],
  looks: [{ build: 'heroic', weapon: 'rifle', outfit: 'shirt', sleeves: 'long', hat: 'helmet', colors: { cloth: '#26324a', pants: '#2b2b33', hat: '#2a3040', skin: '#d0a080', boot: '#111', metal: '#30343a' } }] });
def('enemy', 'captor', { name: 'Captor', ai: 'captor', elite: true, hp: 1, score: 5000, threat: [1, 1, 1], tele: .8, burst: 1, gap: .2, aim: [.3, .3], expose: [.7, .7], hide: [1.0, 1.5],
  looks: [{ build: 'heroic', weapon: 'gun', outfit: 'coat', sleeves: 'long', hat: { style: 'band', color: '#b0141e' }, colors: { cloth: '#a81e22', coat: '#b4161e', pants: '#2a1012', skin: '#2a1a1a', boot: '#140808', metal: '#1a1a1e' } }] });
// cut-outs and the range's robot (Training)
def('enemy', 'cutout', { name: 'Target', ai: 'cutout', hp: 1, score: 500, threat: [0, 0, 0], tele: 1, burst: 0, aim: [1, 1], expose: [2.5, 3.5], hide: [.6, 1.2], board: true });
def('enemy', 'turret', { name: 'Training turret', ai: 'turret', hp: 99, score: 0, threat: [1, 1, 1], tele: 1.1, burst: 1, gap: .2, aim: [.3, .3], noClear: true });

const ACT = { soldier: soldierAI, runner: runnerAI, rusher: rusherAI, shield: shieldAI, drone: droneAI, jetski: jetskiAI, gunner: soldierAI, captor: captorAI, cutout: cutoutAI, turret: turretAI };

function makeEnemy(sim, type, coverId, o = {}) {
  const A = get('enemy', type), R = sim.rng('enemy');
  const cov = coverId ? sim.covers[coverId] : null;
  const at = o.at ? (sim.carrier && o.local ? sim.cw(o.at) : o.at.slice()) : cov ? cov.at.slice() : [0, 0, 0];
  const e = { id: sim.nextId++, type, A, x: at[0], y: at[1], z: at[2], facing: 0, cover: cov, state: 'enter', t: 0, up: 0, hp: (o.hp || A.hp) * tune.enemy.hpMul, wave: o.wave, o,
    look: A.looks ? (o.look !== undefined ? A.looks[o.look] : R.pick(A.looks)) : null, lookI: 0, size: o.size || (A.ai === 'shield' ? 1.05 : 1), dead: false, deadT: 0, cycles: 0, exposedT: 0, flashT: 0, hurtT: 0,
    stag: 0, target: o.target !== undefined ? o.target : sim.rng('target')() * sim.players.length | 0, shots: 0, threat: null, sinkNow: 0, vol: null, air: false, climb: false, flip: 0, run: 0, point: false, side: 0, vel: [0, 0, 0],
    drop: o.drop, noClear: !!(o.noClear || A.noClear), shieldDown: 0, laser: 0, entry: o.entry || (cov ? 'stand' : 'run'), from: null, to: null, enterT: 0, enterDur: 0, ski: null, mount: o.mount || null };
  e.lookI = A.looks ? A.looks.indexOf(e.look) : 0;
  if (e.target >= sim.players.length) e.target = 0;
  if (A.ai === 'drone') { e.center = at.slice(); e.phase = R() * 6.28; e.entry = 'fly'; e.z = at[2]; e.from = o.from || [at[0] + 160, at[1] - 120, at[2] + 60]; }
  if (A.ai === 'jetski') { e.path = new E.Path(o.path, { smooth: 'catmull' }); e.pd = 0; e.speed = o.speed || 170; e.skiHp = 3; e.entry = 'ride'; }
  if (A.ai === 'runner') { e.route = (o.route || [[at[0] - 100, at[1], at[2]], [at[0] + 100, at[1], at[2]]]).map(p => p.slice()); e.x = e.route[0][0]; e.y = e.route[0][1]; e.z = e.route[0][2]; e.entry = 'route'; e.ri = 1; }
  if (A.ai === 'rusher') { e.entry = 'sprint'; if (o.from) { e.x = o.from[0]; e.y = o.from[1]; e.z = o.from[2]; } }
  if (A.ai === 'shield') { e.route = (o.route || [at]).map(p => p.slice()); e.ri = 0; e.entry = 'walk'; e.x = e.route[0][0]; e.y = e.route[0][1]; e.z = e.route[0][2]; }
  if (A.ai === 'captor') { e.hostage = TC.spawnCivilian(sim, { kind: 'hostage', at: [at[0] + 2, at[1], at[2]], hostage: true, captor: e.id }); sim.hostage = e.hostage; }
  if (cov) cov.busy++;
  // entries that start elsewhere
  const face = cov ? coverFace(sim, cov) : 0, fx = Math.cos(face), fy = Math.sin(face);
  if (['run', 'door', 'jump', 'rappel', 'vault', 'roll'].includes(e.entry)) {
    let from = o.from ? (sim.carrier && o.local ? sim.cw(o.from) : o.from.slice()) : null;
    if (!from) {
      if (e.entry === 'rappel') from = [at[0], at[1], at[2] + 90];
      else if (e.entry === 'jump') from = [at[0] - fx * 30, at[1] - fy * 30, at[2] + 44];
      else if (e.entry === 'vault') from = [at[0] + fx * 30, at[1] + fy * 30, at[2]];
      else { const sd = (R() < .5 ? -1 : 1) * 90; from = [at[0] - fy * sd - fx * 20, at[1] + fx * sd - fy * 20, at[2]]; }
    }
    e.from = from; e.to = at.slice(); e.x = from[0]; e.y = from[1]; e.z = from[2];
    const dist = vdist(from, at);
    e.enterDur = e.entry === 'rappel' ? Math.max(.6, (from[2] - at[2]) / 70) : e.entry === 'jump' ? .75 : e.entry === 'vault' ? .6 : e.entry === 'roll' ? Math.max(.5, dist / 120) : Math.max(.3, dist / 115);
    e.up = 1;
    if (e.entry === 'door') sim.emit('door', { at: from });
  } else if (e.entry === 'stand') { e.state = 'hide'; e.t = R.range(.2, .9); }
  e.facing = faceTarget(sim, e);
  sim.enemies.push(e); sim.spawnedBy[type] = (sim.spawnedBy[type] || 0) + 1;
  sim.emit('spawn', { id: e.id, kind: type }); sim._cue('spawn:' + type);
  updateVols(sim, e);
  return e;
}
TC.makeEnemy = makeEnemy;

function coverFace(sim, cov) {
  if (cov.face !== undefined) return cov.face;
  const st = sim.poseOf(0, 'stand'); return Math.atan2(st.y - cov.at[1], st.x - cov.at[0]);
}
function targetPos(sim, e) { const c = sim.cameraFor(e.target); return [c.x, c.y, c.z]; }
function faceTarget(sim, e) { const t = targetPos(sim, e); return Math.atan2(t[1] - e.y, t[0] - e.x); }
function tall(e) { return e.cover && e.cover.h >= 30; }
function sinkFor(e) { if (!e.cover || tall(e) || e.A.fly) return 0; return Math.max(0, (RIGH.headCrouch + 4.5) * e.size - e.cover.h + 1.5); }
TC.sinkFor = sinkFor;

// the stage's difficulty index into an archetype's threat chances
function threatChance(sim, e) { const a = e.A.threat; return a[Math.min(a.length - 1, (sim.stageId || 1) - 1)] || a[0]; }

// ---------------------------------------------------------------- hit volumes
function updateVols(sim, e) {
  if (e.dead) { e.vols = null; return; }
  const s = e.size, k = e.up, zb = e.z - e.sinkNow, A = e.A;
  if (A.ai === 'drone') { e.vols = [{ part: 'body', c: [e.x, e.y, e.z], r: 7 }]; return; }
  if (A.board) { e.vols = k > .5 ? [{ part: 'head', c: [e.x, e.y, zb + 27 * s], r: 4.2 }, { part: 'body', cap: true, a: [e.x, e.y, zb + 4], b: [e.x, e.y, zb + 22], r: 6 }] : null; return; }
  if (A.ai === 'turret') { e.vols = [{ part: 'body', c: [e.x, e.y, e.z + 10], r: 9 }]; return; }
  const crouch = e.state === 'hide' && !tall(e) ? 1 - k : 0;
  const hz = zb + lerp(RIGH.head, RIGH.headCrouch, crouch) * s, sh = zb + lerp(RIGH.sh, RIGH.shCrouch, crouch) * s, hp = zb + lerp(RIGH.hip, RIGH.hipCrouch, crouch) * s;
  const fx = Math.cos(e.facing), fy = Math.sin(e.facing), lean = e.flip > 0 ? 0 : 0;
  const v = [{ part: 'head', c: [e.x + fx * (1 + lean), e.y + fy * (1 + lean), hz], r: 3.9 * s }, { part: 'body', cap: true, a: [e.x, e.y, hp], b: [e.x + fx * .5, e.y + fy * .5, sh], r: 5.2 * s }, { part: 'legs', cap: true, a: [e.x, e.y, zb + 1], b: [e.x, e.y, hp], r: 3.6 * s }];
  if (A.ai === 'shield' && e.shieldDown <= 0) {
    const d = 9 * s; v.push({ part: 'shield', shield: true, cap: true, a: [e.x + fx * d - fy * 7, e.y + fy * d + fx * 7, zb + 2], b: [e.x + fx * d + fy * 7, e.y + fy * d - fx * 7, zb + (e.state === 'fire' || e.state === 'aim' ? 19 : 27) * s], r: 6 });
    v.push({ part: 'shield', shield: true, cap: true, a: [e.x + fx * d, e.y + fy * d, zb + 2], b: [e.x + fx * d, e.y + fy * d, zb + (e.state === 'fire' || e.state === 'aim' ? 19 : 27) * s], r: 7 });
  }
  if (A.ai === 'gunner' && e.mount) { v.splice(2, 1); }
  if (A.ai === 'captor') { v.length = 0; if (k > .5) v.push({ part: 'head', c: [e.x - fy * 8 * e.side, e.y + fx * 8 * e.side, hz], r: 3.9 * s }); }
  if (A.ai === 'jetski' && e.ski && e.skiHp > 0) v.push({ part: 'ski', c: [e.x, e.y, e.z + 3], r: 8 });
  e.vols = v;
}
TC.updateVols = updateVols;

// ---------------------------------------------------------------- stepping
TC.stepEnemies = (sim, dt) => {
  const fighting = sim.phase === 'action' || sim.phase === 'clear';
  for (const e of sim.enemies) {
    e.flashT = Math.max(0, e.flashT - dt); e.hurtT = Math.max(0, e.hurtT - dt); e.shieldDown = Math.max(0, e.shieldDown - dt); e.laser = Math.max(0, e.laser - dt);
    if (e.dead) { e.deadT += dt; deathStep(sim, e, dt); continue; }
    if (e.stag > 0) { e.stag -= dt; e.x += e.vel[0] * dt; e.y += e.vel[1] * dt; e.vel[0] *= .9; e.vel[1] *= .9; }
    if (fighting || e.state === 'enter') {
      if (e.state === 'enter' && e.from && e.to) enterStep(sim, e, dt);
      else (ACT[e.A.ai] || soldierAI)(sim, e, dt);
    }
    if (e.up > .9 && e.state !== 'hide') e.exposedT += dt; else if (e.state === 'hide') e.exposedT = 0;
    const want = sinkFor(e) * (1 - e.up); e.sinkNow = approach(e.sinkNow, want, dt * 90);
    updateVols(sim, e);
  }
  sim.enemies = sim.enemies.filter(e => !(e.dead && e.deadT > 3.2) && !e.gone);
  // allies fire at cues: every few seconds at the nearest exposed enemy
  for (const a of sim.allies) {
    a.fireT -= dt; if (a.fireT > 0 || sim.phase !== 'action') continue;
    a.fireT = 4 + sim.rng('ally')() * 3;
    const tgt = sim.enemies.filter(e => !e.dead && e.up > .9 && e.state !== 'enter' && !e.A.elite && e.A.ai === 'soldier').sort((p, q) => vdist(a.at, [p.x, p.y, p.z]) - vdist(a.at, [q.x, q.y, q.z]))[0];
    if (tgt) { sim.emit('allyshot', { from: [a.at[0], a.at[1], a.at[2] + 22], to: [tgt.x, tgt.y, tgt.z + 20], agent: a.agent }); a.aimAt = [tgt.x, tgt.y]; damageEnemy(sim, tgt, 1, { ally: true, at: [tgt.x, tgt.y, tgt.z + 20] }); }
  }
};

function enterStep(sim, e, dt) {
  e.enterT += dt; const u = clamp(e.enterT / e.enterDur, 0, 1), F = e.from, T = e.to;
  e.x = lerp(F[0], T[0], u); e.y = lerp(F[1], T[1], u);
  if (e.entry === 'jump' || e.entry === 'vault') { e.z = lerp(F[2], T[2], u) + Math.sin(u * Math.PI) * (e.entry === 'jump' ? 16 : 10); e.air = u < .95; }
  else if (e.entry === 'rappel') { e.z = lerp(F[2], T[2], u); e.climb = u < 1; }
  else { e.z = lerp(F[2], T[2], u); e.run = 1; }
  if (e.entry === 'roll') e.flip = u < 1 ? u : 0;
  const mv = Math.atan2(T[1] - F[1], T[0] - F[0]); e.facing = e.entry === 'rappel' ? faceTarget(sim, e) : mv;
  e.vel = [(T[0] - F[0]) / e.enterDur, (T[1] - F[1]) / e.enterDur, 0];
  if (u >= 1) {
    e.air = false; e.climb = false; e.run = 0; e.flip = 0; e.vel = [0, 0, 0];
    if (e.entry === 'jump') sim.emit('land', { id: e.id, at: [e.x, e.y, e.z] });
    e.state = e.A.ai === 'soldier' || e.A.ai === 'gunner' ? 'peek' : e.A.ai === 'captor' ? 'hide' : 'peek'; e.t = 0; e.from = null; e.up = 1; e.facing = faceTarget(sim, e);
  }
}

// ---- soldiers: HIDE <-> PEEK -> AIM (maybe a threat) -> FIRE -> HIDE ... RELOCATE after a few cycles
function soldierAI(sim, e, dt) {
  const A = e.A, R = sim.rng('ai'), react = tune.enemy.reactMul;
  e.t -= dt; e.run = 0;
  const T = e.target;
  if (sim.players[T] && (sim.players[T].left || sim.players[T].out)) e.target = sim.players.findIndex(p => !p.left && !p.out); if (e.target < 0) e.target = 0;
  switch (e.state) {
    case 'hide':
      e.up = approach(e.up, tall(e) ? 1 : 0, dt / .22); e.point = false;
      if (tall(e)) e.side = approach(e.side, 0, dt / .2);
      if (e.t <= 0) { e.state = 'peek'; e.t = .25 * react; e.peekDir = pickPeek(sim, e); }
      break;
    case 'peek':
      e.up = approach(e.up, 1, dt / .2); e.facing = faceTarget(sim, e); e.point = true;
      if (e.peekDir === 'side' || tall(e)) { const s = e.peekSide || (e.peekSide = (e.cover && e.cover.peek.includes('left')) ? -1 : 1); e.side = approach(e.side, s, dt / .2); }
      if (e.t <= 0) { e.state = 'aim'; e.t = R.range(A.aim[0], A.aim[1]) * tune.enemy.fireMul; e.shots = A.burst; e.threat = null; e.exposeLeft = R.range(...(A.expose || [1.4, 2])); e.decided = false; }
      break;
    case 'aim':
      e.facing = faceTarget(sim, e); e.point = true; e.up = 1; e.exposeLeft -= dt;
      if (!e.decided) { e.decided = true; decideFire(sim, e); }
      if (e.threat) { if (e.threat.done) { e.state = 'fire'; e.t = 0; e.shots = A.burst; } }
      else if (e.t <= 0) { e.state = 'fire'; e.t = 0; e.shots = A.burst; }
      break;
    case 'fire':
      e.facing = faceTarget(sim, e); e.point = true; e.exposeLeft -= dt;
      if (e.t <= 0 && e.shots > 0) { fireShot(sim, e); e.shots--; e.t = A.gap || .12; }
      if (e.shots <= 0 && e.t <= 0) {
        e.cycles++;
        if (e.exposeLeft > .4 && A.ai !== 'gunner' && A.fireKind !== 'grenade' && A.fireKind !== 'rocket' && A.fireKind !== 'laser') { e.state = 'aim'; e.t = R.range(A.aim[0], A.aim[1]) * tune.enemy.fireMul; e.decided = false; e.threat = null; }
        else { e.state = 'hide'; e.t = R.range(...(A.hide || [1, 1.8])) * tune.enemy.fireMul; e.side = e.side; if (e.cycles >= 3 && !e.mount && R() < .5) relocate(sim, e); }
      }
      break;
    case 'move': {
      const T2 = e.to, d = vsub(T2, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = 105 * dt;
      e.run = 1; e.up = 1; e.point = false; e.facing = Math.atan2(d[1], d[0]);
      if (L <= sp) { e.x = T2[0]; e.y = T2[1]; e.state = 'hide'; e.t = .3; e.run = 0; e.facing = faceTarget(sim, e); }
      else { e.x += d[0] / L * sp; e.y += d[1] / L * sp; }
      break;
    }
    default: e.state = 'hide'; e.t = .5;
  }
}
function pickPeek(sim, e) { const p = e.cover ? e.cover.peek : ['up']; return tall(e) ? 'side' : sim.rng('ai').pick(p) === 'up' ? 'up' : 'side'; }
function relocate(sim, e) {
  if (e.cover && e.cover.ledge) return;
  const free = Object.values(sim.covers).filter(c => c.busy === 0 && c !== e.cover && !c.noMove && !c.ledge && Math.abs(c.at[2] - e.z) < 4);
  if (!free.length) return;
  const c = sim.rng('ai').pick(free); if (vdist(c.at, e.cover ? e.cover.at : [e.x, e.y, e.z]) > 260) return;
  if (e.cover) e.cover.busy--; c.busy++; e.cover = c; e.to = c.at.slice(); e.state = 'move'; e.side = 0; e.up = 1;
}
function muzzle(e) {
  const f = e.facing, s = e.size, zb = e.z - e.sinkNow, sd = e.side * 14;
  if (e.A.ai === 'drone') return [e.x, e.y, e.z - 3];
  return [e.x + Math.cos(f) * 16 * s - Math.sin(f) * (sd + 2), e.y + Math.sin(f) * 16 * s + Math.cos(f) * (sd + 2), zb + 23 * s * (e.up > .5 ? 1 : .8)];
}
TC.muzzle = muzzle;
// decide this exposure's fire: a threat (crisis flash) or misses
function decideFire(sim, e) {
  if (e.o.noFire) { e.t = .6; return; }
  const A = e.A, chance = threatChance(sim, e) * tune.enemy.threatMul * sim.diff.threatMul;
  const tele = A.tele * tune.enemy.teleMul * sim.diff.teleMul;
  if (A.fireKind === 'grenade') { e.t = A.aim[0]; e.lob = true; return; }
  if (A.fireKind === 'rocket') { e.t = tele; e.glint = tele; return; }
  if (A.fireKind === 'laser') { e.laser = tele + .2; const th = TC.requestThreat(sim, { src: e.id, target: e.target, dur: tele, kind: 'sniper', at: muzzle(e), always: true }); e.threat = th; return; }
  if (A.always || sim.rng('threat')() < chance) e.threat = TC.requestThreat(sim, { src: e.id, target: e.target, dur: tele, kind: A.elite ? 'elite' : 'shot', at: muzzle(e), always: !!A.always });
}
function fireShot(sim, e) {
  const A = e.A, at = muzzle(e);
  if (e.o.noFire) return;
  if (A.fireKind === 'grenade') { sim.emit('throw', { id: e.id }); TC.lobGrenade(sim, e, at); return; }
  if (A.fireKind === 'rocket') { TC.fireRocket(sim, e, at, 'rocket'); return; }
  sim.emit('eshot', { id: e.id, at, kind: A.fireKind || 'rifle', target: e.target, threat: !!(e.threat && e.threat.hit !== undefined && e.shots === A.burst), hitP: e.threat ? e.threat.result : null });
}

// ---- the quartermaster: runs a route across, flees off the end
function runnerAI(sim, e, dt) {
  e.run = 1; e.up = 1; e.point = false; e.state = 'run';
  const T = e.route[e.ri]; if (!T) { e.gone = true; sim.emit('fled', { id: e.id }); return; }
  const d = vsub(T, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = (e.o.speed || 70) * dt;
  e.facing = Math.atan2(d[1], d[0]);
  if (L <= sp) { e.x = T[0]; e.y = T[1]; e.z = T[2]; e.ri++; } else { e.x += d[0] / L * sp; e.y += d[1] / L * sp; e.z += (T[2] - e.z) * Math.min(1, sp / L); }
}

// ---- rushers: sprint in zigzag, slash at 2 m, blocked by cover, stagger back, again
function rusherAI(sim, e, dt) {
  const c = sim.poseOf(e.target, 'stand'), tgt = [c.x + Math.cos(c.yaw) * 38, c.y + Math.sin(c.yaw) * 38, (e.o.ground !== undefined ? e.o.ground : c.z - EYE_STAND)];
  e.up = 1;
  if (e.state === 'enter' || e.state === 'sprint' || e.state === 'peek' || e.state === 'hide') {
    e.state = 'sprint';
    const d = vsub(tgt, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = 130 * dt, zig = Math.sin(sim.t * 5 + e.id) * 40 * dt;
    e.run = 1; e.facing = Math.atan2(d[1], d[0]); e.point = false;
    if (L < 6) { e.state = 'wind'; e.t = 0; e.threat = TC.requestThreat(sim, { src: e.id, target: e.target, dur: e.A.tele * tune.enemy.teleMul * sim.diff.teleMul, kind: 'slash', at: [e.x, e.y, e.z + 22], always: true }); e.run = 0; }
    else { e.x += d[0] / L * sp - d[1] / L * zig; e.y += d[1] / L * sp + d[0] / L * zig; e.z += (tgt[2] - e.z) * Math.min(1, sp / L); }
  } else if (e.state === 'wind') {
    e.run = 0; e.facing = Math.atan2(c.y - e.y, c.x - e.x); e.atk = 'wind';
    if (!e.threat || e.threat.done) { e.state = 'slash'; e.t = .3; e.atk = 'active'; sim.emit('slash', { id: e.id, blocked: e.threat ? !e.threat.result : true }); }
  } else if (e.state === 'slash') {
    e.t -= dt; if (e.t <= 0) { e.state = 'back'; e.t = .9; e.atk = null; const a = e.facing + Math.PI; e.vel = [Math.cos(a) * 90, Math.sin(a) * 90, 0]; e.stag = .5; }
  } else if (e.state === 'back') { e.t -= dt; e.run = .6; if (e.t <= 0) { e.state = 'sprint'; } }
}

// ---- shields: walk the route between covers, fire over the shield; the shotgun or GL knocks it aside
function shieldAI(sim, e, dt) {
  if (e.state === 'enter' || e.state === 'walk') {
    e.state = 'walk'; e.point = false; e.up = 1;
    const T = e.route[e.ri + 1];
    if (!T) { e.state = 'hide'; e.t = .6; return; }
    const d = vsub(T, [e.x, e.y, e.z]), L = Math.hypot(d[0], d[1]), sp = 32 * dt; e.run = .45; e.facing = faceTarget(sim, e);
    if (L <= sp) { e.x = T[0]; e.y = T[1]; e.ri++; e.state = 'hide'; e.t = .4; e.run = 0; } else { e.x += d[0] / L * sp; e.y += d[1] / L * sp; }
    e.walkT = (e.walkT || 0) + dt; if (e.walkT > 2.6) { e.walkT = 0; e.state = 'aim'; e.t = .45; e.shots = e.A.burst; e.decided = false; e.threat = null; e.exposeLeft = 1; }
    return;
  }
  soldierAI(sim, e, dt);
  if (e.state === 'hide' && e.t <= .05 && e.route[e.ri + 1]) { e.state = 'walk'; }
  e.up = 1;
}

// ---- drones: fly in from afar, then a figure-eight around the center; a zap beam
function droneAI(sim, e, dt) {
  e.phase += dt * 1.3; const c = e.center;
  if (e.state === 'enter') { e.enterT += dt; const u = clamp(e.enterT / 1.2, 0, 1); e.x = lerp(e.from[0], c[0], u); e.y = lerp(e.from[1], c[1], u); e.z = lerp(e.from[2], c[2], u); if (u >= 1) { e.state = 'hide'; e.t = .6; } e.up = 1; return; }
  const tx = c[0] + Math.sin(e.phase) * 30, ty = c[1] + Math.sin(e.phase * 2) * 22, tz = c[2] + Math.sin(e.phase * 1.7) * 8;
  e.x += (tx - e.x) * Math.min(1, dt * 3); e.y += (ty - e.y) * Math.min(1, dt * 3); e.z += (tz - e.z) * Math.min(1, dt * 3);
  e.up = 1; e.t -= dt;
  if (e.state === 'hide' && e.t <= 0) { e.state = 'aim'; e.t = e.A.aim[0]; e.decided = false; e.threat = null; e.shots = 1; e.exposeLeft = 1; }
  else if (e.state === 'aim') { if (!e.decided) { e.decided = true; decideFire(sim, e); } if ((e.threat && e.threat.done) || (!e.threat && e.t <= 0)) { e.state = 'fire'; e.t = 0; } }
  else if (e.state === 'fire') { sim.emit('eshot', { id: e.id, at: muzzle(e), kind: 'zap', target: e.target }); e.state = 'hide'; e.t = sim.rng('ai').range(1.4, 2.4); }
}

// ---- jet skis: race a water path; the rider fires a pistol on the way
function jetskiAI(sim, e, dt) {
  e.pd += e.speed * dt; const L = e.path.length; if (e.pd >= L) { e.gone = true; sim.emit('fled', { id: e.id }); return; }
  const a = e.path.at(e.pd), b = e.path.at(Math.min(L, e.pd + 6));
  e.x = a.x; e.y = a.y; e.z = (sim.water > -1e8 ? sim.water : a.z) + 6 + Math.sin(sim.t * 9 + e.id) * 1.2; e.ski = { yaw: Math.atan2(b.y - a.y, b.x - a.x) };
  e.up = 1; e.facing = faceTarget(sim, e); e.t -= dt;
  if (e.state === 'enter' || e.state === 'hide') { if (e.state === 'enter') { e.state = 'hide'; e.t = .8; } if (e.t <= 0) { e.state = 'aim'; e.t = e.A.aim[0]; e.decided = false; e.threat = null; e.shots = e.A.burst; e.exposeLeft = 1; } }
  else if (e.state === 'aim') { e.point = true; if (!e.decided) { e.decided = true; decideFire(sim, e); } if ((e.threat && e.threat.done) || (!e.threat && e.t <= 0)) { e.state = 'fire'; e.t = 0; } }
  else if (e.state === 'fire') { if (e.t <= 0 && e.shots > 0) { fireShot(sim, e); e.shots--; e.t = e.A.gap; } if (e.shots <= 0) { e.state = 'hide'; e.t = 1.6; e.point = false; } }
}

// ---- captors: hold the hostage, show the head in short windows
function captorAI(sim, e, dt) {
  e.t -= dt; e.facing = faceTarget(sim, e);
  if (e.state === 'hide' || e.state === 'enter' || e.state === 'peek') { e.up = approach(e.up, 0, dt / .15); if (e.t <= 0 && e.state !== 'peek') { e.state = 'peek'; e.t = .2; e.side = sim.rng('ai')() < .5 ? -1 : 1; } if (e.state === 'peek' && e.t <= 0) { e.state = 'aim'; e.t = e.A.expose[0]; e.decided = false; e.threat = null; } return; }
  if (e.state === 'aim') {
    e.up = approach(e.up, 1, dt / .1); e.point = true;
    if (!e.decided) { e.decided = true; e.threat = TC.requestThreat(sim, { src: e.id, target: e.target, dur: e.A.tele * tune.enemy.teleMul * sim.diff.teleMul, kind: 'elite', at: muzzle(e), always: true }); }
    if (e.threat && e.threat.done) { sim.emit('eshot', { id: e.id, at: muzzle(e), kind: 'pistol', target: e.target }); e.state = 'hide'; e.t = sim.rng('ai').range(...e.A.hide); }
  }
}
// ---- training cut-outs: flip up, stay, flip down; never fire
function cutoutAI(sim, e, dt) {
  e.t -= dt; e.facing = faceTarget(sim, e);
  if (e.state === 'enter' || e.state === 'hide') { e.up = approach(e.up, 0, dt / .2); if (e.t <= 0) { e.state = 'peek'; e.t = sim.rng('ai').range(...e.A.expose) * (e.o.stay || 1); } }
  else { e.up = approach(e.up, 1, dt / .15); if (e.t <= 0 && !e.o.stay) { e.state = 'hide'; e.t = sim.rng('ai').range(...e.A.hide); } }
}
// ---- the range's turret robot: three telegraphed shots, a few seconds apart
function turretAI(sim, e, dt) {
  e.t -= dt; e.up = 1; e.facing = faceTarget(sim, e);
  if (e.state === 'enter') { e.state = 'hide'; e.t = 1.5; }
  if (e.state === 'hide' && e.t <= 0 && (e.fired || 0) < (e.o.shots || 3)) { e.state = 'aim'; e.threat = TC.requestThreat(sim, { src: e.id, target: 0, dur: 1.1, kind: 'shot', at: [e.x, e.y, e.z + 12], always: true }); }
  if (e.state === 'aim' && e.threat && e.threat.done) { sim.emit('eshot', { id: e.id, at: [e.x, e.y, e.z + 12], kind: 'zap', target: 0 }); e.fired = (e.fired || 0) + 1; e.state = 'hide'; e.t = 2.2; if (e.fired >= (e.o.shots || 3)) { e.done = true; } }
}

// ---------------------------------------------------------------- damage, reactions, death
function damageEnemy(sim, e, dmg, o = {}) {
  if (e.dead) return;
  if (o.part === 'ski') { e.skiHp -= dmg; sim.emit('impact', { at: o.at, surf: 'metal' }); if (o.p) { sim.addScore(o.p, 100, o.at, 'hit'); sim.chainUp(o.p); } if (e.skiHp <= 0) { sim.emit('explode', { at: [e.x, e.y, e.z], size: 1.2 }); if (o.p) sim.addScore(o.p, 1000, o.at, 'ski'); killEnemy(sim, e, Object.assign({}, o, { style: 'flyback' })); } return; }
  if (e.A.ai === 'turret') { sim.emit('impact', { at: o.at, surf: 'metal' }); return; }
  if (e.o.civ) { if (o.p && !(e.hitT > sim.t)) { e.hitT = sim.t + .5; o.p.stats.civ++; sim.addScore(o.p, -5000, o.at, 'civ'); sim.emit('civhit', { p: o.p.i, at: o.at }); sim.say('juno', "That's a civilian! Don't shoot!"); } return; }
  e.hp -= dmg; e.flashT = .06; e.hurtT = .25;
  sim.emit('hit', { id: e.id, p: o.p ? o.p.i : -1, part: o.part, at: o.at, head: o.part === 'head' });
  if (o.p) { sim.addScore(o.p, 100, null, 'hit'); sim.chainUp(o.p); }
  if ((o.part === 'legs' || o.w === 'sg') && e.hp > 0 && !e.A.fly) { const a = Math.atan2(o.dir ? o.dir[1] : 0, o.dir ? o.dir[0] : 1); e.vel = [Math.cos(a) * 45, Math.sin(a) * 45, 0]; e.stag = .35; if (e.state === 'aim' || e.state === 'fire') { e.state = 'hide'; e.t = .8; if (e.threat && !e.threat.done) TC.cancelThreat(sim, e.threat); } }
  if (e.A.ai === 'rusher' && o.w === 'sg' && e.hp > 0) { e.state = 'back'; e.t = 1; e.stag = .5; const a = e.facing + Math.PI; e.vel = [Math.cos(a) * 110, Math.sin(a) * 110, 0]; if (e.threat && !e.threat.done) TC.cancelThreat(sim, e.threat); }
  if (e.hp <= 0) killEnemy(sim, e, o);
}
TC.damageEnemy = damageEnemy;
function shieldHit(sim, e, o) {
  if (o.w === 'sg' || o.w === 'gl') { e.shieldDown = 1.5; sim.emit('shieldknock', { id: e.id }); if (o.p) { sim.addScore(o.p, 100, null, 'hit'); sim.chainUp(o.p); } }
}
TC.shieldHit = shieldHit;
function killEnemy(sim, e, o = {}) {
  if (e.dead) return;
  e.dead = true; e.deadT = 0; e.point = false; e.state = 'dead';
  if (e.cover) e.cover.busy = Math.max(0, e.cover.busy - 1);
  if (e.threat && !e.threat.done) TC.cancelThreat(sim, e.threat);
  for (const t of sim.threats) if (t.src === e.id && !t.done) TC.cancelThreat(sim, t);
  const p = o.p; let style = o.style || 'crumple';
  if (!o.style) { if (e.A.fly) style = 'drop'; else if (o.w === 'sg' || o.blast) style = 'flyback'; else if (o.w === 'mg') style = 'spin'; else if (e.z > (sim.ground || 0) + 30 && e.cover && e.cover.ledge) style = 'fall'; else if (e.A.ai === 'jetski' || (sim.water > -1e8 && e.z <= sim.water + 8)) style = 'splash'; else if (o.part === 'head') style = 'head'; }
  e.death = style; e.vel = [0, 0, 0];
  if (style === 'flyback') { const a = o.dir ? Math.atan2(o.dir[1], o.dir[0]) : e.facing + Math.PI; e.vel = [Math.cos(a) * 120, Math.sin(a) * 120, 90]; }
  if (style === 'fall') { e.vel = [Math.cos(e.facing) * 30, Math.sin(e.facing) * 30, 40]; }
  if (style === 'drop') e.vel = [0, 0, -10];
  sim.emit('kill', { id: e.id, kind: e.type, p: p ? p.i : -1, at: [e.x, e.y, e.z + 18], style, head: o.part === 'head', ally: !!o.ally });
  sim.killsInScene = (sim.killsInScene || 0) + 1;
  if (e.hostage) { e.hostage.freed = true; sim.emit('rescue', {}); sim._cue('rescue'); }
  if (p) {
    p.stats.kills++;
    let pts = e.A.score; sim.addScore(p, pts, [e.x, e.y, e.z + 30], 'kill');
    if (o.part === 'head') { p.stats.heads++; sim.addScore(p, 500, null, 'head'); sim.emit('headshot', { p: p.i, at: o.at }); }
    if (e.exposedT < .7 && e.exposedT > 0 || e.state === 'enter') { p.stats.quick++; sim.addScore(p, 500, null, 'quick'); }
    if (e.A.elite) { sim.timer += tune.time.eliteBonus; sim.emit('extend', { s: tune.time.eliteBonus }); }
    const drop = e.drop || (e.A.ai === 'runner' ? 'mg' : null);
    if (drop) { const w = get('weapon', drop); sim.giveAmmo(p, drop, w.pick); }
  }
  if (e.A.fly) sim.emit('explode', { at: [e.x, e.y, e.z], size: .6 });
}
TC.killEnemy = killEnemy;
function deathStep(sim, e, dt) {
  if (e.death === 'flyback' || e.death === 'fall' || e.death === 'drop') {
    e.x += e.vel[0] * dt; e.y += e.vel[1] * dt; e.z += e.vel[2] * dt; e.vel[2] -= 300 * dt; e.vel[0] *= .96; e.vel[1] *= .96;
    const g = e.A.fly ? (sim.ground || 0) : e.groundZ !== undefined ? e.groundZ : (e.death === 'fall' ? (sim.ground || 0) : (e.cover ? e.cover.at[2] : 0) - (e.death === 'fall' ? 999 : 0));
    const floor = e.death === 'fall' ? Math.max(sim.water > -1e8 ? sim.water - 30 : -999, sim.ground || 0) : (e.from ? e.from[2] : g);
    if (e.z < floor) { e.z = floor; e.vel = [0, 0, 0]; if (sim.water > -1e8 && floor <= sim.water) { if (!e.splashed) { e.splashed = true; sim.emit('splash', { at: [e.x, e.y, sim.water] }); } } }
  }
  if (e.death === 'splash') { e.z -= dt * 14; if (!e.splashed) { e.splashed = true; sim.emit('splash', { at: [e.x, e.y, sim.water > -1e8 ? sim.water : e.z] }); } }
}

// ===== 22-combat.js
// 22-combat: the ThreatDirector (the crisis flash: caps, minimum gap, pop-out protection, resolution against cover),
// projectiles (grenades, rockets, harpoons, torpedoes, missiles, flares, the player's GL rounds; all shootable),
// objects (explosive barrels and tanks, breakable crates, lanterns, bottles and goods, windows, life rings, intel
// bottles, gate locks, the fireworks barge's crates), civilians and hostages. Reads: Sim (20), enemies (21).

// ---------------------------------------------------------------- threats
// a threat: { id, src, target, left, dur, kind, at, done, result (true = hit, false = blocked), protect }
function requestThreat(sim, o) {
  const p = sim.players[o.target]; if (!p || p.left || p.out) return null;
  const st = sim.stageId || 1, base = st === 1 ? 1 : 2, maxT = Math.max(1, (tune.enemy.maxThreats || base) + sim.diff.maxThreatAdd);
  const mine = sim.threats.filter(t => t.target === o.target && !t.done);
  if (!o.always && mine.length >= maxT) return null;
  let dur = o.dur;
  // no two impacts on one player closer than minGap
  const gap = tune.enemy.minGap; let last = p.lastImpact !== undefined ? p.lastImpact - sim.t : -9;
  for (const t of mine) last = Math.max(last, t.left);
  if (dur < last + gap) { if (!o.always) return null; dur = last + gap; }
  const t = { id: sim.nextId++, src: o.src, target: o.target, left: dur, dur, kind: o.kind || 'shot', at: o.at, done: false, result: null, proj: o.proj || null, unblockable: !!o.unblockable, protect: false, sweep: o.sweep || 0 };
  sim.threats.push(t); p.lastImpact = sim.t + dur;
  sim.emit('threat', { id: t.id, src: o.src, target: o.target, dur, kind: t.kind, at: o.at });
  return t;
}
TC.requestThreat = requestThreat;
function cancelThreat(sim, t) { if (t.done) return; t.done = true; t.result = false; t.cancelled = true; sim.emit('threatcancel', { id: t.id }); }
TC.cancelThreat = cancelThreat;
function resolveThreat(sim, t) {
  if (t.done) return; t.done = true;
  const p = sim.players[t.target]; if (!p || p.out || p.left) { t.result = false; return; }
  const exposed = sim.exposed(p) || t.unblockable;
  if (exposed && p.iframes <= 0 && !(sim.cheats.god || tune.player.god)) { t.result = true; sim.hurt(p, { reason: t.kind }); sim.emit('threathit', { id: t.id, p: p.i, kind: t.kind }); }
  else { t.result = false; if (!exposed) { p.stats.saves++; sim.emit('blocked', { id: t.id, p: p.i, kind: t.kind, at: t.at }); } else sim.emit('threatgod', { id: t.id, p: p.i }); }
}
TC.resolveThreat = resolveThreat;
TC.stepThreats = (sim, dt) => {
  for (const t of sim.threats) {
    if (t.done || t.proj) continue;
    const p = sim.players[t.target]; if (!p) { t.done = true; continue; }
    const before = t.left; t.left -= dt;
    // pop-out protection: leaving cover with under 0.15 s of telegraph left slides the impact 0.15 s later
    if (!t.protect && sim.exposed(p) && p.wasCover && t.left < .15 && t.left > -dt) { t.left = .15; t.protect = true; }
    if (t.sweep) { if (t.left <= 0 && t.left > -t.sweep) { if (sim.exposed(p) && p.iframes <= 0 && !(sim.cheats.god || tune.player.god)) { t.done = true; t.result = true; sim.hurt(p, { reason: 'sweep' }); } continue; } if (t.left <= -t.sweep) { t.done = true; t.result = false; p.stats.saves++; sim.emit('blocked', { id: t.id, p: p.i, kind: t.kind, at: t.at }); } continue; }
    if (t.left <= 0 && before > 0) resolveThreat(sim, t);
  }
  for (const p of sim.players) p.wasCover = p.c >= .5;
  sim.threats = sim.threats.filter(t => !t.done || sim.t - (t.doneAt || (t.doneAt = sim.t)) < .4);
};

// ---------------------------------------------------------------- projectiles
// { id, kind, pos, vel, gravity, hp, r, team, target, threat, life, shootable, owner }
const PROJ = {
  grenade: { hp: 1, r: 4.5, score: 1000 }, rocket: { hp: 1, r: 5, score: 1000 }, harpoon: { hp: 2, r: 4.5, score: 1000 }, torpedo: { hp: 2, r: 6, score: 1000, unblockable: true },
  missile: { hp: 1, r: 5, score: 1000 }, flare: { hp: 1, r: 5.5, score: 1000 }, pgl: { hp: 99, r: 2 }, debris: { hp: 99, r: 0 }
};
function spawnProjectile(sim, kind, pos, vel, o = {}) {
  const K = PROJ[kind] || {};
  const pr = Object.assign({ id: sim.nextId++, kind, pos: pos.slice(), vel: vel.slice(), gravity: 0, hp: K.hp || 1, r: K.r || 4, team: 'enemy', life: 8, shootable: kind !== 'pgl' && kind !== 'debris', t: 0 }, o);
  sim.projectiles.push(pr); sim.emit('proj', { id: pr.id, kind });
  return pr;
}
TC.spawnProjectile = spawnProjectile;
// the point in front of player i's cover where something aimed at it arrives
function coverPoint(sim, i, ahead = 18) { const c = sim.poseOf(i, 'stand'), f = [Math.cos(c.yaw), Math.sin(c.yaw), 0]; return [c.x + f[0] * ahead, c.y + f[1] * ahead, c.z - 6]; }
TC.coverPoint = coverPoint;
function lobGrenade(sim, e, at) {
  const tgt = coverPoint(sim, e.target, 34 + sim.rng('proj')() * 20), T0 = 1.1 + sim.rng('proj')() * .3, g = 240;
  const th = requestThreat(sim, { src: e.id, target: e.target, dur: T0, kind: 'grenade', at, always: true, proj: true }), T = th ? th.dur : T0;
  const vel = [(tgt[0] - at[0]) / T, (tgt[1] - at[1]) / T, (tgt[2] - at[2]) / T + .5 * g * T];
  return spawnProjectile(sim, 'grenade', at, vel, { gravity: g, target: e.target, threat: th, arrive: T, src: e.id });
}
TC.lobGrenade = lobGrenade;
function fireRocket(sim, src, at, kind = 'rocket', o = {}) {
  const tgt = o.to || coverPoint(sim, src.target !== undefined ? src.target : 0, 14), d = vsub(tgt, at), L = vlen(d), sp0 = o.speed || (kind === 'torpedo' ? 120 : kind === 'flare' ? 160 : kind === 'harpoon' ? 300 : 220), T0 = L / sp0;
  const th = requestThreat(sim, { src: src.id, target: src.target || 0, dur: T0, kind, at, always: true, proj: true, unblockable: kind === 'torpedo' }), T = th ? th.dur : T0, sp = L / T;
  let vel = vmul(vnorm(d), sp), g = 0;
  if (kind === 'missile') { g = 160; vel = [d[0] / T, d[1] / T, d[2] / T + .5 * g * T]; }
  return spawnProjectile(sim, kind, at, vel, { gravity: g, target: src.target || 0, threat: th, arrive: T, src: src.id, to: tgt });
}
TC.fireRocket = fireRocket;
TC.stepProjectiles = (sim, dt) => {
  for (const pr of sim.projectiles) {
    if (pr.dead) continue;
    pr.t += dt; pr.life -= dt;
    pr.vel[2] -= pr.gravity * dt; pr.pos[0] += pr.vel[0] * dt; pr.pos[1] += pr.vel[1] * dt; pr.pos[2] += pr.vel[2] * dt;
    if (pr.kind === 'torpedo' && sim.water > -1e8) pr.pos[2] = sim.water + 1;
    if (pr.team === 'player') {
      // the player's grenade: explode on a collider, an enemy, the water or after 1.2 s
      let boom = pr.t > 1.2 || pr.pos[2] < (sim.ground || 0) - 2 || (sim.water > -1e8 && pr.pos[2] < sim.water);
      if (!boom) for (const c of sim.colliders) { if (!c.on) continue; const b = c.b; if (pr.pos[0] > b[0] && pr.pos[0] < b[3] && pr.pos[1] > b[1] && pr.pos[1] < b[4] && pr.pos[2] > b[2] && pr.pos[2] < b[5] && pr.t > .06) { boom = true; break; } }
      if (!boom) for (const e of sim.enemies) if (!e.dead && Math.hypot(e.x - pr.pos[0], e.y - pr.pos[1]) < 10 && pr.pos[2] > e.z - 2 && pr.pos[2] < e.z + 32) { boom = true; break; }
      if (!boom && sim.boss) for (const part of sim.boss.parts) if (part.alive && part.pos && vdist(part.pos, pr.pos) < part.r + 4) { boom = true; break; }
      if (boom) { pr.dead = true; explode(sim, pr.pos, tune.weapon.glRadius, tune.weapon.glDamage, { p: sim.players[pr.owner], w: 'gl', player: true }); }
      continue;
    }
    if (pr.team === 'fx') { if (pr.life <= 0) pr.dead = true; continue; }
    // enemy projectiles arrive at their target: the threat resolves there
    if (pr.threat && !pr.threat.done && pr.arrive !== undefined) pr.threat.left = pr.arrive - pr.t;
    if (pr.arrive !== undefined && pr.t >= pr.arrive) {
      pr.dead = true;
      if (pr.threat && !pr.threat.done) resolveThreat(sim, pr.threat);
      const blocked = pr.threat && !pr.threat.result;
      if (pr.kind === 'grenade' || pr.kind === 'rocket' || pr.kind === 'missile') sim.emit('explode', { at: pr.pos.slice(), size: .9, cover: blocked, p: pr.target });
      else if (pr.kind === 'flare') sim.emit('fireworks', { at: pr.pos.slice() });
      else if (pr.kind === 'torpedo') sim.emit('explode', { at: pr.pos.slice(), size: 1.2, water: true });
      else sim.emit('impact', { at: pr.pos.slice(), surf: 'metal' });
    }
    if (pr.life <= 0) pr.dead = true;
  }
  sim.projectiles = sim.projectiles.filter(p => !p.dead);
};
function damageProjectile(sim, pr, dmg, o) {
  pr.hp -= dmg; sim.emit('impact', { at: o.at, surf: 'metal' });
  if (pr.hp > 0) return;
  pr.dead = true; if (pr.threat) cancelThreat(sim, pr.threat);
  if (o.p) { sim.addScore(o.p, PROJ[pr.kind] ? PROJ[pr.kind].score || 1000 : 1000, pr.pos.slice(), 'shotdown'); sim.chainUp(o.p); }
  sim.emit('shotdown', { kind: pr.kind, at: pr.pos.slice(), p: o.p ? o.p.i : -1 });
  if (pr.kind === 'grenade' || pr.kind === 'rocket' || pr.kind === 'missile' || pr.kind === 'torpedo') explode(sim, pr.pos, 48, 3, { p: o.p, shotdown: true });
  if (pr.kind === 'flare') sim.emit('fireworks', { at: pr.pos.slice() });
  if (sim.boss && sim.boss.onShotdown) sim.boss.onShotdown(sim, pr);
}
TC.damageProjectile = damageProjectile;
// an explosion: hurts enemies (never players), boss parts, objects; chains barrels
function explode(sim, at, radius, dmg, o = {}) {
  sim.emit('explode', { at: at.slice(), size: radius / 48, player: !!o.player });
  for (const e of sim.enemies) {
    if (e.dead) continue; const d = Math.hypot(e.x - at[0], e.y - at[1], (e.z + 14) - at[2]);
    if (d < radius) { const k = lerp(1, .25, d / radius); TC.damageEnemy(sim, e, dmg * k, { p: o.p, w: o.w || 'blast', blast: true, at: [e.x, e.y, e.z + 16], dir: vnorm([e.x - at[0], e.y - at[1], 0]), part: e.A.ai === 'shield' ? 'body' : 'body' }); if (e.A.ai === 'shield') e.shieldDown = 1.5; }
  }
  if (sim.boss) for (const part of sim.boss.parts) { if (!part.alive || !part.pos || part.hidden) continue; const d = vdist(part.pos, at); if (d < radius + part.r) TC.damageBoss(sim, part, dmg * lerp(1, .3, clamp(d / (radius + part.r), 0, 1)) * (o.bossMul || 1), { p: o.p, w: 'gl', at, blast: true }); }
  for (const ob of sim.objects) { if (ob.dead || !ob.hp) continue; const d = vdist(ob.pos, at); if (d < radius && ob !== o.src) { if (ob.explosive) { ob.chainT = ob.chainT || .15; } else damageObject(sim, ob, dmg, { p: o.p, at: ob.pos, blast: true }); } }
}
TC.explode = explode;

// ---------------------------------------------------------------- objects
const OBJ = {
  barrel: { hp: 2, r: 7, h: 20, explosive: true, radius: 56, dmg: 8, score: 500 },
  tank: { hp: 2, r: 9, h: 28, explosive: true, radius: 64, dmg: 8, score: 500, white: true },
  crate: { hp: 3, r: 0, box: true, score: 50, surf: 'wood' },
  lantern: { hp: 1, r: 3.5, score: 50, fall: true },
  bottles: { hp: 1, r: 3, score: 50 },
  window: { hp: 1, r: 0, box: true, score: 50, surf: 'glass' },
  lifering: { hp: 1, r: 6, score: 2000, bonus: true },
  intel: { hp: 1, r: 3, score: 2000, bonus: true },
  lock: { hp: 6, r: 6, score: 1500, objective: true },
  fwcrate: { hp: 2, r: 7, score: 500, explosive: true, radius: 40, dmg: 4, fireworks: true },
  lever: { hp: 1, r: 8, score: 0, objective: true },
  sign: { hp: 2, r: 0, box: true, score: 50, surf: 'wood' }
};
TC.OBJ = OBJ;
function makeObject(sim, kind, at, o = {}) {
  const K = OBJ[kind]; if (!K) throw new Error('unknown object ' + kind);
  const p = sim.carrier && o.local ? sim.cw(at) : at.slice();
  const ob = Object.assign({ id: sim.nextId++, kind, K, pos: p, hp: K.hp, r: K.r, explosive: !!K.explosive, dead: false, t: 0 }, o);
  if (K.box) { const s = o.size || [16, 16, 14]; ob.box = [p[0] - s[0] / 2, p[1] - s[1] / 2, p[2], p[0] + s[0] / 2, p[1] + s[1] / 2, p[2] + s[2]]; ob.r = 1; ob.col = { id: -ob.id, b: ob.box, surf: K.surf, on: true, obj: ob.id }; if (kind === 'crate') sim.colliders.push(ob.col); }
  else if (K.r && kind !== 'lantern' && kind !== 'bottles' && kind !== 'intel' && kind !== 'lifering') ob.pos = [p[0], p[1], p[2] + (K.h || 0) * .5];
  sim.objects.push(ob); return ob;
}
TC.makeObject = makeObject;
function damageObject(sim, ob, dmg, o = {}) {
  if (ob.dead) return false;
  ob.hp -= dmg; sim.emit('impact', { at: o.at || ob.pos, surf: ob.K.surf || (ob.kind === 'lantern' ? 'paper' : ob.kind === 'bottles' || ob.kind === 'intel' ? 'glass' : 'metal') });
  if (ob.hp > 0) return !!ob.K.objective;
  breakObject(sim, ob, o);
  return !!(ob.K.bonus || ob.K.objective);
}
TC.damageObject = damageObject;
function breakObject(sim, ob, o = {}) {
  if (ob.dead) return; ob.dead = true; ob.t = 0;
  const p = o.p || sim.players[0];
  if (ob.col) { ob.col.on = false; }
  sim.emit('break', { id: ob.id, kind: ob.kind, at: ob.pos.slice(), p: p ? p.i : -1 });
  if (p && ob.K.score) sim.addScore(p, ob.K.score, ob.pos, 'object');
  if (ob.kind === 'lifering' && p) { p.lives++; sim.emit('extra', { p: p.i, ring: true }); }
  if (ob.kind === 'intel' && p) sim.emit('intel', { id: ob.intel, p: p.i });
  if (ob.explosive) { explode(sim, ob.pos, ob.K.radius, ob.K.dmg * (ob.dmgMul || 1), { p, src: ob, bossMul: ob.bossMul || 1 }); if (ob.K.fireworks) sim.emit('fireworks', { at: ob.pos.slice(), big: true }); }
  if (ob.onBreak) ob.onBreak(sim, ob);
  if (ob.cue) sim._cue(ob.cue);
}
TC.breakObject = breakObject;
TC.stepObjects = (sim, dt) => {
  for (const ob of sim.objects) {
    ob.t += dt;
    if (!ob.dead && ob.chainT !== undefined) { ob.chainT -= dt; if (ob.chainT <= 0) breakObject(sim, ob, {}); }
    if (ob.follow && !ob.dead) { const p = sim.cw(ob.follow); ob.pos = [p[0], p[1], p[2]]; }
  }
  sim.objects = sim.objects.filter(o => !(o.dead && o.t > 3));
  // civilians
  for (const c of sim.civilians) {
    if (c.dead) { c.deadT = (c.deadT || 0) + dt; continue; }
    c.t += dt;
    if (c.hostage) { if (c.freed) { c.state = 'free'; c.x += Math.cos(c.face) * 0; } c.vols = [{ part: 'body', cap: true, a: [c.x, c.y, c.z + 2], b: [c.x, c.y, c.z + 22], r: 5 }, { part: 'head', c: [c.x, c.y, c.z + 27], r: 4 }]; continue; }
    if (c.route && c.ri < c.route.length) {
      const T = c.route[c.ri], d = vsub(T, [c.x, c.y, c.z]), L = Math.hypot(d[0], d[1]), sp = (c.speed || 75) * dt;
      c.face = Math.atan2(d[1], d[0]); c.state = 'run';
      if (L <= sp) { c.x = T[0]; c.y = T[1]; c.ri++; } else { c.x += d[0] / L * sp; c.y += d[1] / L * sp; }
    } else { c.state = 'crouch'; if (c.route && c.leave && c.t > c.leave) c.gone = true; }
    const hh = c.state === 'crouch' ? 18 : 26;
    c.vols = [{ part: 'body', cap: true, a: [c.x, c.y, c.z + 2], b: [c.x, c.y, c.z + hh - 6], r: 5 }, { part: 'head', c: [c.x, c.y, c.z + hh], r: 4 }];
  }
  sim.civilians = sim.civilians.filter(c => !c.gone && !(c.dead && c.deadT > 3));
};
function spawnCivilian(sim, o) {
  const at = o.at || (o.route ? o.route[0] : [0, 0, 0]);
  const c = { id: sim.nextId++, kind: o.kind || 'festival', x: at[0], y: at[1], z: at[2], route: o.route ? o.route.slice(1) : null, ri: 0, t: 0, state: 'run', face: 0, hostage: !!o.hostage, look: o.look || 0, speed: o.speed, leave: o.leave, dead: false, captor: o.captor, line: o.line };
  sim.civilians.push(c); if (o.line) sim.say(o.line[0], o.line[1]);
  return c;
}
TC.spawnCivilian = spawnCivilian;
function hitCivilian(sim, c, p, at) {
  if (c.dead || c.hitT > sim.t) return;
  c.hitT = sim.t + .6; sim.emit('civhit', { id: c.id, p: p.i, at });
  p.stats.civ++; sim.addScore(p, -5000, at, 'civ'); sim.hurt(p, { ignoreI: true, reason: 'civilian' });
  sim.say('juno', c.hostage ? "Watch the hostage!" : "Hold your fire! Civilians!");
}
TC.hitCivilian = hitCivilian;

// ===== 25-bosses.js
// 25-bosses: the boss framework (named parts with hp, armor and weak points, HP bars, an intro card, a pattern
// script on the Sim's runner, defeat with slow motion) and the bosses: STINGRAY -> BARRACUDA (1-B), BULLDOG (1-3),
// THE GULL (2-3), HAMMERHEAD (2-B, with cover that degrades), SEAWOLF (3-2), SCYLLA (3-5) and ADMIRAL KRAKE (3-6,
// the FINAL SHOT). Every attack goes through the ThreatDirector and the projectiles (22). Reads: Sim (20).

function makeBoss(sim, id) {
  const D = get('boss', id), parts = [];
  for (const k in D.parts) { const P = D.parts[k]; const hp = P.hp * (P.noMul ? 1 : tune.enemy.bossHpMul); parts.push(Object.assign({ id: k, hp, max: hp, r: 8, pos: null, alive: true, weak: false, hidden: false, armor: false, flashT: 0 }, P, { hp, max: hp })); }
  const B = { id, D, parts, phase: 1, t: 0, defeated: false, outT: 0, intro: D.card === false || sim.mode === 'host' || sim.mode === 'replica' ? 0 : 2.5, x: 0, y: 0, z: 0, yaw: 0, s: {}, minions: [], pose: {} };
  B.part = k => parts.find(p => p.id === k);
  sim.boss = B;
  if (D.init) D.init(B, sim);
  sim.emit('boss', { id, name: D.name, title: D.title, card: B.intro > 0 });
  if (D.time) { sim.timeMax = sim.timer = D.time * sim.diff.timeMul * tune.time.sceneMul; }
  sim.runner.run(D.script(B, sim), B);
  return B;
}
TC.makeBoss = makeBoss;
TC.stepBoss = (sim, dt) => {
  const B = sim.boss; B.t += dt; if (B.intro > 0) B.intro -= dt;
  for (const p of B.parts) p.flashT = Math.max(0, p.flashT - dt);
  if (B.D.pose) B.D.pose(B, sim, dt);
  for (const e of sim.enemies) if (e.ride === B && !e.dead && e.local) { const c = Math.cos(B.yaw), s = Math.sin(B.yaw); e.x = B.x + e.local[0] * c - e.local[1] * s; e.y = B.y + e.local[0] * s + e.local[1] * c; e.z = B.z + e.local[2]; }
  if (B.defeated) B.outT += dt;
};
function damageBoss(sim, part, dmg, o = {}) {
  const B = sim.boss; if (!B || B.defeated || !part.alive || part.hidden) return;
  if (part.armor && !(o.w === 'gl' || o.blast)) { sim.emit('impact', { at: o.at, surf: 'armor' }); sim.emit('armor', { at: o.at }); return; }
  const mul = (part.weakMul || 1) * (o.w === 'sg' && part.sgMul ? part.sgMul : 1);
  part.hp -= dmg * mul; part.flashT = .08;
  sim.emit('bosshit', { part: part.id, at: o.at, p: o.p ? o.p.i : -1 });
  if (o.p) { sim.addScore(o.p, 100, null, 'hit'); sim.chainUp(o.p); }
  if (part.hp <= 0) { part.hp = 0; part.alive = false; sim.emit('partbreak', { part: part.id, at: part.pos ? part.pos.slice() : o.at }); if (o.p) sim.addScore(o.p, part.score || 3000, part.pos || o.at, 'part'); if (B.D.onPart) B.D.onPart(B, sim, part, o); }
}
TC.damageBoss = damageBoss;
function defeatBoss(sim, B, o = {}) {
  if (B.defeated) return; B.defeated = true; B.outT = 0;
  for (const t of sim.threats) if (!t.done) TC.cancelThreat(sim, t);
  sim.projectiles = sim.projectiles.filter(p => p.team !== 'enemy');
  for (const p of sim.players) if (!p.out && !p.left) sim.addScore(p, B.D.bonus || 20000, null, 'bonus');
  sim.emit('bossdown', { id: B.id, at: [B.x, B.y, B.z + 20], slow: B.D.slow !== false });
  if (B.D.defeatLine) sim.say(B.D.defeatLine[0], B.D.defeatLine[1]);
  if (o.killMinions !== false) for (const e of sim.enemies) if (!e.dead) TC.killEnemy(sim, e, { style: 'crumple' });
}
TC.defeatBoss = defeatBoss;
// the boss is done once outT passes its outro: the scene's clear check waits for it
const bossOver = (B, s = 2.4) => () => B.defeated && B.outT > s;
const barFrac = (B, ids) => { let h = 0, m = 0; for (const p of B.parts) if (ids.includes(p.id)) { h += p.hp; m += p.max; } return m ? h / m : 0; };
TC.bossBars = B => B.D.bars ? B.D.bars(B) : [{ label: B.D.name, f: barFrac(B, B.parts.map(p => p.id)) }];
const boatXY = (B, l) => { const c = Math.cos(B.yaw), s = Math.sin(B.yaw); return [B.x + l[0] * c - l[1] * s, B.y + l[0] * s + l[1] * c, B.z + l[2]]; };
TC.boatXY = boatXY;
function nearestTarget(sim) { const alive = sim.players.filter(p => !p.out && !p.left); return alive.length ? alive[(sim.rng('boss')() * alive.length) | 0].i : 0; }

// ---------------------------------------------------------------- STINGRAY -> BARRACUDA (1-B)
def('boss', 'stingray', { name: 'STINGRAY', title: 'Black Current gunboat', time: 100, bonus: 30000,
  parts: { turretL: { hp: 12, r: 9, weak: true, score: 5000 }, turretR: { hp: 12, r: 9, weak: true, score: 5000 }, barracuda: { hp: 30, r: 7, hidden: true, score: 10000, human: true, weakMul: 1 } },
  bars: B => [{ label: 'STINGRAY', f: barFrac(B, ['turretL', 'turretR']) }, { label: 'BARRACUDA', f: barFrac(B, ['barracuda']) }],
  init(B, sim) { B.home = sim.scene.bossAt.slice(); B.x = B.home[0]; B.y = B.home[1]; B.z = B.home[2]; B.yaw = Math.PI; B.drums = []; B.board = 0; B.swing = 0;
    for (const [i, l] of [[0, [-34, 10, 10]], [1, [6, 12, 10]], [2, [40, 10, 10]]]) { const p = boatXY(B, l); const ob = TC.makeObject(sim, 'barrel', [p[0], p[1], p[2] - 10], { local: false, drum: i, follow: null }); ob.bossMul = 1.8; ob.lpos = l; B.drums.push(ob); } },
  pose(B, sim, dt) {
    if (B.phase < 3) { B.x = B.home[0] + Math.sin(B.t * .35) * 60; B.y = B.home[1] + Math.sin(B.t * .21) * 14; B.z = B.home[2] + Math.sin(B.t * 1.3) * 1.5; }
    B.roll = Math.sin(B.t * 1.1) * .03; B.yaw = Math.PI + Math.sin(B.t * .35) * .05;
    const tl = B.part('turretL'), tr = B.part('turretR'), bc = B.part('barracuda');
    tl.pos = boatXY(B, [-18, 2, 22]); tr.pos = boatXY(B, [24, 2, 22]);
    for (const ob of B.drums) if (!ob.dead) { const p = boatXY(B, ob.lpos); ob.pos = [p[0], p[1], p[2] - 2]; }
    if (B.phase === 3) { const c = sim.poseOf(0, 'stand'), f = [Math.cos(c.yaw), Math.sin(c.yaw)]; const land = [c.x + f[0] * 50, c.y + f[1] * 50, c.z - TC.EYE.stand]; const u = clamp(B.swing, 0, 1); const from = boatXY(B, [0, 0, 40]); B.bx = lerp(from[0], land[0], u); B.by = lerp(from[1], land[1], u); B.bz = lerp(from[2], land[2], u) + Math.sin(u * Math.PI) * 30; }
    else { const p = boatXY(B, [0, -4, 34]); B.bx = p[0]; B.by = p[1]; B.bz = p[2] - (B.duck ? 10 : 0); }
    bc.pos = [B.bx, B.by, B.bz + 22]; bc.hidden = B.phase < 2 || B.duck || (B.phase === 3 && !B.open);
  },
  onPart(B, sim, part) { if (part.id === 'barracuda') { defeatBoss(sim, B); } },
  *script(B, sim) {
    yield () => B.intro <= 0;
    sim.say('barracuda', "CREST! The Admiral said you'd come. He didn't say you'd be this slow!");
    for (const d of B.drums) d.onBreak = (s, ob) => { for (const k of ['turretL', 'turretR']) { const p = B.part(k); if (p.alive && vdist(p.pos, ob.pos) < 60) damageBoss(s, p, 6, { at: p.pos, blast: true }); } };
    // phase 1: the turrets spin up (the whine is the telegraph) and fire bursts; deckhands on deck
    let deck = 0;
    while (B.part('turretL').alive || B.part('turretR').alive) {
      if (sim.enemies.filter(e => !e.dead && e.ride === B).length < 2 && deck < 8) { deck++; const l = [[-40, -6, 10], [36, -6, 10], [0, -8, 10]][deck % 3]; const e = TC.makeEnemy(sim, 'deckhand', null, { at: boatXY(B, l), entry: 'stand', mount: true, noClear: true }); e.ride = B; e.local = l; e.state = 'hide'; e.t = 1; e.cover = { h: 14, peek: ['up'], at: e.local, busy: 0 }; }
      for (const k of ['turretL', 'turretR']) {
        const p = B.part(k); if (!p.alive) continue;
        sim.emit('spinup', { part: k, at: p.pos });
        TC.requestThreat(sim, { src: 'boss', target: nearestTarget(sim), dur: .8 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'turret', at: p.pos.slice(), always: true });
        yield 1.4;
      }
      yield 1.2;
    }
    // phase 2: Barracuda on the bridge wing: harpoons and torpedoes, ducking between volleys
    B.phase = 2; sim.emit('bossphase', { phase: 2 }); sim.say('barracuda', 'Say hello to the Stingray!');
    let v = 0;
    while (B.part('barracuda').hp > B.part('barracuda').max * .42) {
      B.duck = false; yield .5;
      const tgt = nearestTarget(sim);
      if (v % 2 === 1) { sim.say('mari', 'Torpedo in the water! Shoot it!'); const at = boatXY(B, [10, -14, -8]); at[2] = sim.water + 1; TC.fireRocket(sim, { id: 'boss', target: tgt }, at, 'torpedo', { to: TC.coverPoint(sim, tgt, 20), speed: 115 }); sim.emit('prompt', { id: 'torpedo' }); }
      else TC.fireRocket(sim, { id: 'boss', target: tgt }, [B.bx, B.by, B.bz + 22], 'harpoon');
      yield 2.0; B.duck = true; yield 1.6; v++;
    }
    // phase 3: the Stingray burns, she swings across with her cutlass
    B.phase = 3; B.duck = false; B.open = false; sim.say('barracuda', "Enough! I'll do this myself!"); sim.emit('bossphase', { phase: 3 });
    for (const k of ['turretL', 'turretR']) B.part(k).alive = false;
    while (B.swing < 1) { B.swing += 1 / 120 * 1.2; yield; }
    sim.emit('land', { at: [B.bx, B.by, B.bz] });
    for (let cycle = 0; cycle < 6 && !B.defeated; cycle++) {
      B.atk = 'wind'; const th = TC.requestThreat(sim, { src: 'boss', target: nearestTarget(sim), dur: .6 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'slash', at: [B.bx, B.by, B.bz + 24], always: true });
      yield () => !th || th.done; B.atk = 'active'; sim.emit('slash', { boss: true, blocked: th ? !th.result : true }); yield .3; B.atk = null;
      B.open = true; sim.emit('stagger', {}); yield 1.5; B.open = false; yield .5;
    }
    if (!B.defeated) { B.open = true; yield () => B.defeated; }
  },
  defeatLine: ['barracuda', "This isn't over, CREST!"]
});

// ---------------------------------------------------------------- BULLDOG, the armored truck (1-3 mini-boss)
def('boss', 'bulldog', { name: 'BULLDOG', title: 'Armored truck', card: false, slow: false, bonus: 8000,
  parts: { tank: { hp: 6, r: 8, weak: true, score: 6000, noMul: false } },
  init(B, sim) { const s = sim.scene.bulldog; B.from = s.from; B.to = s.to; B.x = s.from[0]; B.y = s.from[1]; B.z = s.from[2]; B.yaw = Math.atan2(s.to[1] - s.from[1], s.to[0] - s.from[0]); B.u = 0; sim.emit('fx', { kind: 'crash', at: s.from }); },
  pose(B, sim, dt) { B.u = Math.min(1, B.u + dt / 1.6); const k = 1 - Math.pow(1 - B.u, 3); B.x = lerp(B.from[0], B.to[0], k); B.y = lerp(B.from[1], B.to[1], k); B.part('tank').pos = boatXY(B, [-22, -17, 14]); },
  onPart(B, sim, part) { sim.emit('explode', { at: part.pos.slice(), size: 2.2, big: true }); TC.explode(sim, part.pos, 90, 10, {}); sim.say('rook', 'Boom. Scratch one truck.'); defeatBoss(sim, B, { killMinions: false }); },
  *script(B, sim) {
    yield 1.6; sim.say('kai', 'Armored truck! Take out the gunner!');
    const g = TC.makeEnemy(sim, 'gunner', null, { at: boatXY(B, [4, 0, 26]), entry: 'stand', mount: true }); g.ride = B; g.local = [4, 0, 26]; g.cover = { h: 12, peek: ['up'], at: g.local, busy: 0 }; g.state = 'hide'; g.t = .5;
    yield 1.2; for (const l of [[-30, 26, 0], [50, -24, 0]]) { const p = sim.scene.bulldogMen ? sim.scene.bulldogMen[l[0] < 0 ? 0 : 1] : boatXY(B, l); TC.makeEnemy(sim, 'marine', null, { at: p, entry: 'stand' }).state = 'peek'; }
    yield 3; sim.say('rook', 'Fuel tank—light it up!');
    yield () => B.defeated;
  }
});

// ---------------------------------------------------------------- THE GULL, a laser sniper among three perches (2-3)
def('boss', 'gull', { name: 'THE GULL', title: 'Black Current sharpshooter', card: false, bonus: 10000,
  parts: { gull: { hp: 4, r: 6, weak: false, score: 6000, human: true } },
  init(B, sim) { B.perches = sim.scene.perches; B.pi = 0; B.up = 0; const p = B.perches[0]; B.x = p[0]; B.y = p[1]; B.z = p[2]; },
  pose(B, sim, dt) { const g = B.part('gull'); g.pos = [B.x, B.y, B.z + (B.up > .5 ? 22 : 14)]; g.hidden = B.up < .5; B.yaw = Math.atan2(sim.poseOf(0, 'stand').y - B.y, sim.poseOf(0, 'stand').x - B.x); },
  onPart(B, sim) { defeatBoss(sim, B, { killMinions: false }); sim.emit('kill', { boss: 'gull', at: [B.x, B.y, B.z + 20], style: 'fall' }); },
  *script(B, sim) {
    sim.say('juno', 'Laser sight! Sniper on the lighthouse!'); yield 1.2; sim.say('gull', 'Hold still, little agents.');
    for (;;) {
      B.up = 1; B.laser = 1.4; const tgt = nearestTarget(sim);
      const th = TC.requestThreat(sim, { src: 'boss', target: tgt, dur: 1.4 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'sniper', at: [B.x, B.y, B.z + 22], always: true });
      B.laserT = tgt; yield () => !th || th.done; sim.emit('eshot', { at: [B.x, B.y, B.z + 22], kind: 'sniper', target: tgt, boss: true }); B.laser = 0;
      yield .8; B.up = 0; yield .6; B.pi = (B.pi + 1) % B.perches.length; const p = B.perches[B.pi]; B.x = p[0]; B.y = p[1]; B.z = p[2]; yield .7;
    }
  }
});

// ---------------------------------------------------------------- HAMMERHEAD (2-B): shield advance, rotary sweep, grenades, the charge
def('boss', 'hammerhead', { name: 'HAMMERHEAD', title: 'Enforcer of the Black Current', time: 120, bonus: 40000,
  parts: { body: { hp: 44, r: 10, score: 20000, human: true }, legs: { hp: 999, r: 7, noMul: true, link: 'body' } },
  bars: B => [{ label: 'HAMMERHEAD', f: B.part('body').hp / B.part('body').max }],
  init(B, sim) { const s = sim.scene.hammer; B.track = s.track; B.u = .5; B.x = lerp(s.track[0][0], s.track[1][0], .5); B.y = lerp(s.track[0][1], s.track[1][1], .5); B.z = s.track[0][2]; B.shield = true; B.shieldDown = 0; B.coverHp = 3; B.mode = 'walk'; B.yaw = 0; },
  pose(B, sim, dt) {
    B.shieldDown = Math.max(0, B.shieldDown - dt);
    const c = sim.poseOf(0, 'stand'); B.yaw = Math.atan2(c.y - B.y, c.x - B.x);
    if (B.mode === 'walk') { B.u += dt * .12 * (B.dir || 1); if (B.u > .9 || B.u < .1) B.dir = -(B.dir || 1); B.x = lerp(B.track[0][0], B.track[1][0], B.u); B.y = lerp(B.track[0][1], B.track[1][1], B.u); }
    if (B.mode === 'charge') { const d = vsub([c.x, c.y], [B.x, B.y]), L = Math.hypot(d[0], d[1]); if (L > 52) { B.x += d[0] / L * 95 * dt; B.y += d[1] / L * 95 * dt; } }
    if (B.mode === 'back') { const h = [lerp(B.track[0][0], B.track[1][0], B.u), lerp(B.track[0][1], B.track[1][1], B.u)], d = vsub(h, [B.x, B.y]), L = Math.hypot(d[0], d[1]); if (L > 3) { B.x += d[0] / L * 80 * dt; B.y += d[1] / L * 80 * dt; } else B.mode = 'walk'; }
    const body = B.part('body'), legs = B.part('legs'), fx = Math.cos(B.yaw), fy = Math.sin(B.yaw);
    body.pos = [B.x, B.y, B.z + 30]; legs.pos = [B.x + fx * 4, B.y + fy * 4, B.z + 8]; legs.r = 7;
    const covered = B.shield && B.shieldDown <= 0;
    body.hidden = false; body.armor = covered && B.mode !== 'sweepFire' ? true : false; legs.armor = false;
    if (covered && B.mode !== 'sweepFire' && B.mode !== 'toss') body.armor = true;
    // shotgun or GL hits on the shield knock it aside
  },
  onPart(B, sim, part) { if (part.id === 'body') defeatBoss(sim, B); },
  *script(B, sim) {
    yield () => B.intro <= 0; sim.say('hammer', 'LITTLE AGENTS. BIG MISTAKE.');
    const S = sim.scene.hammer;
    B.onHit = (o) => { if (B.shield && (o.w === 'sg' || o.w === 'gl' || o.blast)) { B.shieldDown = 1.5; sim.emit('shieldknock', { boss: true }); } };
    let n = 0;
    while (!B.defeated) {
      const body = B.part('body');
      if (B.shield && body.hp < body.max * .5) { B.shield = false; sim.emit('fx', { kind: 'doorfall', at: [B.x, B.y, B.z] }); sim.say('hammer', 'MY DOOR! YOU BROKE MY DOOR!'); yield 1.2; }
      if (!B.shield) {
        // the charge: 6 damage within 1.5 s staggers him, otherwise he slams the cover
        B.mode = 'charge'; sim.say('rook', "He's charging!"); const hp0 = body.hp; let tt = 0; yield .8;
        const th = TC.requestThreat(sim, { src: 'boss', target: nearestTarget(sim), dur: 1.5 * tune.enemy.teleMul, kind: 'slam', at: [B.x, B.y, B.z + 30], always: true });
        while (th && !th.done) { tt += 1 / 120; if (hp0 - body.hp >= 6) { TC.cancelThreat(sim, th); sim.emit('stagger', { boss: true }); B.mode = 'stagger'; break; } yield; }
        if (B.mode === 'stagger') { yield 1.6; } else { sim.emit('slam', {}); degradeCover(sim, B); }
        B.mode = 'back'; yield () => B.mode === 'walk'; yield 1;
        if (sim.rng('boss')() < .6) { sim.emit('fx', { kind: 'beam' }); }
      }
      // B: rotary sweep
      B.mode = 'spin'; sim.emit('spinup', { boss: true, at: [B.x, B.y, B.z + 26] }); if (n === 0) sim.say('rook', 'Minigun! Get down!');
      const tg = nearestTarget(sim);
      const th = TC.requestThreat(sim, { src: 'boss', target: tg, dur: 1.2 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'sweep', at: [B.x, B.y, B.z + 26], always: true, sweep: 2.5 });
      for (const p of sim.players) if (p.i !== tg && !p.out && !p.left) TC.requestThreat(sim, { src: 'boss', target: p.i, dur: 1.2, kind: 'sweep', at: [B.x, B.y, B.z + 26], always: true, sweep: 2.5 });
      yield 1.2; B.mode = 'sweepFire'; yield 2.5; B.mode = 'walk';
      if (th && th.result === false) degradeCover(sim, B);
      yield 1.5;
      // C: grenade volley
      B.mode = 'toss'; for (let g = 0; g < 3; g++) { const gr = TC.lobGrenade(sim, { id: 'boss', target: nearestTarget(sim) }, [B.x, B.y, B.z + 40]); gr.near = true; yield .45; }
      B.mode = 'walk'; yield 2.2; n++;
    }
  },
  onShotdown(sim, pr) { const B = sim.boss; if (pr.kind === 'grenade' && vdist(pr.pos, [B.x, B.y, B.z + 30]) < 140) damageBoss(sim, B.part('body'), 4, { at: pr.pos, blast: true }); },
  defeatLine: ['hammer', 'HAMMERHEAD… FALLS… DOWN…']
});
function degradeCover(sim, B) {
  B.coverHp--; sim.emit('coverhit', { hp: B.coverHp });
  if (B.coverHp <= 0) for (const ob of sim.objects) if (ob.coverProp && !ob.dead) TC.breakObject(sim, ob, {});
  if (B.coverHp <= 0 && !sim.flags.cover2) { sim.flags.cover2 = true; sim.say('kai', "Cover's gone—moving!"); sim.emit('coverswap', {}); sim.scene.slots = sim.scene.slots2; B.coverHp = 3; }
}
// hits on Hammerhead's legs count against his body; the shield knock-aside
const _dmgBoss = damageBoss;
TC.damageBoss = (sim, part, dmg, o = {}) => {
  const B = sim.boss;
  if (B && B.id === 'hammerhead') {
    if (part.id === 'legs') { if (B.shield && B.shieldDown <= 0) { sim.emit('impact', { at: o.at, surf: 'metal' }); } return _dmgBoss(sim, B.part('body'), dmg * .8, Object.assign({}, o, { blast: true })); }
    if (B.onHit) B.onHit(o);
    if (part.armor && (o.w === 'sg' || o.w === 'gl' || o.blast)) { B.shieldDown = 1.5; part.armor = false; sim.emit('shieldknock', { boss: true }); return; }
  }
  return _dmgBoss(sim, part, dmg, o);
};

// ---------------------------------------------------------------- SEAWOLF, the gunship (3-2: pods, then the rotor hub)
def('boss', 'seawolf', { name: 'SEAWOLF', title: 'Gunship', card: false, bonus: 25000,
  parts: { podL: { hp: 10, r: 8, weak: true, score: 6000 }, podR: { hp: 10, r: 8, weak: true, score: 6000 }, hub: { hp: 15, r: 9, weak: true, hidden: true, score: 10000 } },
  bars: B => [{ label: 'SEAWOLF', f: barFrac(B, ['podL', 'podR', 'hub']) }],
  init(B, sim) { B.home = sim.scene.seawolf.slice(); B.x = B.home[0] + 300; B.y = B.home[1] - 200; B.z = B.home[2] + 80; B.yaw = Math.PI; B.bank = 0; B.crash = 0; },
  pose(B, sim, dt) {
    if (B.crash > 0) { B.crash += dt; B.z -= dt * 60 * B.crash; B.yaw += dt * 3; B.x += dt * 30; }
    else { const tx = B.home[0] + Math.sin(B.t * .4) * 90, ty = B.home[1] + Math.cos(B.t * .3) * 30, tz = B.home[2] + Math.sin(B.t * .9) * 10; B.bank = clamp((tx - B.x) * .01, -.3, .3); B.x += (tx - B.x) * Math.min(1, dt * 1.2); B.y += (ty - B.y) * Math.min(1, dt * 1.2); B.z += (tz - B.z) * Math.min(1, dt * 1.2); const c = sim.poseOf(0, 'stand'); B.yaw = lerpAng(B.yaw, Math.atan2(c.y - B.y, c.x - B.x), dt * 2); }
    B.part('podL').pos = boatXY(B, [4, -18, -6]); B.part('podR').pos = boatXY(B, [4, 18, -6]); B.part('hub').pos = [B.x, B.y, B.z + 18];
    B.part('hub').hidden = B.part('podL').alive || B.part('podR').alive || B.crash > 0;
  },
  onPart(B, sim, part) { if (part.id === 'hub') { B.crash = .01; sim.say('rook', 'Scratch one gunship.'); sim.emit('fx', { kind: 'heliCrash' }); defeatBoss(sim, B, { killMinions: false }); } else sim.emit('explode', { at: part.pos.slice(), size: 1.2 }); },
  *script(B, sim) {
    sim.say('juno', "Gunship inbound! It's the Seawolf!"); yield 2.5;
    let n = 0;
    while (!B.defeated) {
      // strafe: a burst of threats on every player
      sim.emit('spinup', { at: [B.x, B.y, B.z] });
      for (const p of sim.players) if (!p.out && !p.left) TC.requestThreat(sim, { src: 'boss', target: p.i, dur: 1.0 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'strafe', at: [B.x, B.y, B.z - 4], always: true });
      yield 2.2;
      if (n % 2 === 0 && (B.part('podL').alive || B.part('podR').alive)) { const tgt = nearestTarget(sim); for (const k of ['podL', 'podR']) if (B.part(k).alive) { TC.fireRocket(sim, { id: 'boss', target: tgt }, B.part(k).pos.slice(), 'rocket'); yield .5; } }
      if (n === 1 || n === 4) { for (const l of [[-10, 0, -20], [10, 0, -20]]) { const at = boatXY(B, l), tgtC = sim.scene.rappelTo; if (tgtC) { const e = TC.makeEnemy(sim, 'marine', null, { at: tgtC[(n + l[0] > 0 ? 1 : 0) % tgtC.length], entry: 'rappel', from: at }); e.cover = { h: 16, peek: ['up'], at: e.to, busy: 1 }; } } sim.say('juno', 'Ropes! More of them!'); }
      if (!B.part('podL').alive && !B.part('podR').alive && n > 0 && !B.saidHub) { B.saidHub = true; sim.say('juno', 'Pods are down! Hit the rotor hub!'); }
      yield 2.4; n++;
    }
  }
});

// ---------------------------------------------------------------- SCYLLA, the crab walker (3-5)
def('boss', 'scylla', { name: 'SCYLLA', title: "Krake's crab walker", time: 90, bonus: 40000,
  parts: Object.assign({ cockpit: { hp: 20, r: 10, weak: true, hidden: true, score: 15000 } }, ...[0, 1, 2, 3, 4, 5].map(i => ({ ['knee' + i]: { hp: 8, r: 6, weak: true, score: 3000 } }))),
  bars: B => [{ label: 'SCYLLA', f: barFrac(B, ['cockpit', 'knee0', 'knee1', 'knee2', 'knee3', 'knee4', 'knee5']) }],
  init(B, sim) { B.home = sim.scene.scyllaAt.slice(); B.x = B.home[0]; B.y = B.home[1]; B.z = B.home[2]; B.yaw = Math.PI; B.topple = 0; B.toppled = false; B.gait = 0; B.downs = 0; },
  pose(B, sim, dt) {
    const c = sim.poseOf(0, 'stand'); if (!B.toppled) { B.gait += dt * 1.4; B.x = B.home[0] + Math.sin(B.t * .3) * 50; B.yaw = Math.atan2(c.y - B.y, c.x - B.x); }
    B.topple = approach(B.topple, B.toppled ? 1 : 0, dt * 1.6);
    B.z = B.home[2] + 40 - B.topple * 26 + (B.toppled ? 0 : Math.abs(Math.sin(B.gait * 2)) * 2);
    for (let i = 0; i < 6; i++) { const side = i < 3 ? -1 : 1, k = i % 3, a = (k - 1) * .7, lift = (i % 2 === (Math.floor(B.gait) % 2) ? Math.max(0, Math.sin(B.gait * Math.PI)) * 6 : 0); B.part('knee' + i).pos = boatXY(B, [Math.cos(a) * 26 * (k === 1 ? 1 : 1) - 0, side * (26 + Math.abs(Math.sin(a)) * 6), -4 + lift - B.topple * 10]); B.part('knee' + i).hidden = false; }
    B.part('cockpit').pos = boatXY(B, [14, 0, 6]); B.part('cockpit').hidden = !B.hatch;
    B.roll = B.topple * .9;
  },
  onPart(B, sim, part) { sim.emit('explode', { at: part.pos.slice(), size: .8 }); if (part.id === 'cockpit') { B.cockpitBroken = true; } },
  *script(B, sim) {
    yield () => B.intro <= 0; sim.say('krake', 'You climbed my tower. Admirable. Now meet my Scylla.');
    const kneesLeft = () => B.parts.filter(p => p.id.startsWith('knee') && p.alive).length;
    let n = 0;
    while (!B.defeated) {
      if (6 - kneesLeft() >= 3 * (B.downs + 1) || (B.downs === 1 && kneesLeft() === 0)) {
        B.downs++; B.toppled = true; sim.emit('fx', { kind: 'topple' }); sim.say('juno', "It's down! Hit the cockpit!"); yield .8; B.hatch = true;
        const t0 = sim.t; yield () => sim.t - t0 > 6 || B.cockpitBroken;
        B.hatch = false;
        if (B.cockpitBroken || B.downs >= 2) { B.toppled = true; sim.emit('explode', { at: [B.x, B.y, B.z + 10], size: 2, big: true }); sim.say('krake', 'You think a machine is my only weapon? I am the storm!'); defeatBoss(sim, B, { killMinions: true }); return; }
        B.toppled = false; yield 1.2; continue;
      }
      // claw cannons: threats with a charge glow
      B.charge = 1; const tgt = nearestTarget(sim);
      const at = boatXY(B, [36, (n % 2 ? 1 : -1) * 22, 10]); sim.emit('spinup', { at });
      TC.requestThreat(sim, { src: 'boss', target: tgt, dur: .9 * tune.enemy.teleMul * sim.diff.teleMul, kind: 'claw', at, always: true });
      yield 1.3; B.charge = 0;
      if (n % 2 === 1) { sim.say('juno', 'Missiles! Shoot them down!'); for (let m = 0; m < 6; m++) { const t2 = nearestTarget(sim), cp = TC.coverPoint(sim, t2, 14); TC.fireRocket(sim, { id: 'boss', target: t2 }, boatXY(B, [-4, (m % 2 ? 1 : -1) * 14, 24]), 'missile', { to: [cp[0] + (m - 2.5) * 10, cp[1], cp[2]], speed: 150 }); yield .32; } }
      yield 1.4; n++;
    }
  }
});

// ---------------------------------------------------------------- ADMIRAL KRAKE (3-6): flares, smoke, Red Tide, the FINAL SHOT
def('boss', 'krake', { name: 'ADMIRAL KRAKE', title: 'Commander of the Black Current', time: 90, bonus: 60000,
  parts: { krake: { hp: 40, r: 7, score: 30000, human: true }, lever: { hp: 1, r: 9, hidden: true, noMul: true, score: 0 } },
  bars: B => [{ label: 'KRAKE', f: B.part('krake').hp / B.part('krake').max }],
  init(B, sim) { const s = sim.scene.krake; B.spots = s.spots; B.si = 0; B.x = s.spots[0][0]; B.y = s.spots[0][1]; B.z = s.spots[0][2]; B.leverAt = s.lever; B.final = 0; B.roll = 0; B.mv = null; B.up = 1; },
  pose(B, sim, dt) {
    if (B.mv) { B.mv.u = Math.min(1, B.mv.u + dt / B.mv.d); B.x = lerp(B.mv.a[0], B.mv.b[0], B.mv.u); B.y = lerp(B.mv.a[1], B.mv.b[1], B.mv.u); B.flip = B.mv.u < 1 ? B.mv.u : 0; if (B.mv.u >= 1) B.mv = null; }
    const c = sim.poseOf(0, 'stand'); B.yaw = Math.atan2(c.y - B.y, c.x - B.x);
    const k = B.part('krake'); k.pos = [B.x, B.y, B.z + (B.duck ? 16 : 25)]; k.hidden = B.final > 0;
    const lv = B.part('lever'); lv.pos = B.leverAt.slice(); lv.hidden = B.final <= 0;
  },
  onPart(B, sim, part) {
    if (part.id === 'lever') { B.finalHit = true; part.alive = true; part.hp = 1; }
    if (part.id === 'krake') { part.alive = true; part.hp = 1; }
  },
  *script(B, sim) {
    yield () => B.intro <= 0;
    const k = B.part('krake'); let n = 0;
    while (!B.defeated) {
      if (k.hp <= k.max * .15 || k.hp <= 1.01) {
        // the FINAL SHOT: he lunges for the master sluice lever; slow motion, a 3-second ring over the lever arm
        sim.say('tejada', "He's going for the master lever—stop him!");
        B.mv = { a: [B.x, B.y], b: [B.leverAt[0] - 14, B.leverAt[1]], u: 0, d: .6 }; yield .6;
        B.final = 3; B.finalHit = false; sim.emit('finalshot', { at: B.leverAt.slice() }); sim.slow = 1;
        while (B.final > 0 && !B.finalHit) { B.final -= 1 / 120; yield; }
        sim.slow = 0;
        if (B.finalHit) { B.final = 0; k.hp = 0; sim.emit('kill', { boss: 'krake', at: [B.x, B.y, B.z + 20] }); defeatBoss(sim, B); sim.say('krake', 'The sea… always… wins…'); return; }
        B.final = 0; sim.water += 3; sim.emit('surge', {}); sim.say('juno', 'TIDE RISING! Again—stop him!'); k.hp = Math.max(2, k.max * .2); yield 1.2;
        B.mv = { a: [B.x, B.y], b: B.spots[0].slice(), u: 0, d: .8 }; yield 1;
        continue;
      }
      // roll to the next console
      B.si = (B.si + 1 + (sim.rng('boss')() * (B.spots.length - 1) | 0)) % B.spots.length; const s = B.spots[B.si];
      B.duck = false; B.mv = { a: [B.x, B.y], b: [s[0], s[1]], u: 0, d: .7 }; sim.emit('roll', {}); yield .8;
      // twin flare pistols
      for (let f = 0; f < 2; f++) { TC.fireRocket(sim, { id: 'boss', target: nearestTarget(sim) }, [B.x, B.y, B.z + 22], 'flare'); yield .5; }
      yield 1.2;
      if (n % 3 === 1) { sim.emit('smoke', { s: 3 }); sim.flags.smoke = sim.t + 3; }
      if (n % 3 === 2 && sim.enemies.filter(e => !e.dead).length < 2) { for (const cv of sim.scene.krake.minions) TC.makeEnemy(sim, 'redtide', cv, { entry: 'roll' }); }
      B.duck = true; yield 1.3; n++;
    }
  },
  defeatLine: ['kai', 'Not today.']
});

// ===== 30-stagefmt.js
// 30-stagefmt: the stage and scene format helpers and the prefabs. Scenes are authored in an arena's local frame
// (d = metres... in world units forward, l = to the right, z up from the arena's ground): A(frame).p(d, l, z) gives a
// world point. Slots (P1 left, P2 right) with their stand and cover poses and their cover props, cover points for
// enemies, rails between arenas. Prefabs build geometry on a Builder: piers, warehouses, stalls, lantern strings,
// containers, cranes, forklifts, houses, lamps, boats, bridges, railings, catwalks, consoles and the rest.
// The validators check every stage's data (tests run them). Reads: Builder (03), registries (00).

class Frame {
  constructor(x, y, z, yaw) { this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.c = Math.cos(yaw); this.s = Math.sin(yaw); }
  // local (d forward, l right, h up) -> world
  p(d, l = 0, h = 0) { return [this.x + d * this.c - l * this.s, this.y + d * this.s + l * this.c, this.z + h]; }
  yawOf(a = 0) { return this.yaw + a; }
  // two slots: P1 on the left, P2 on the right; o: { gap: 22, coverH: 17, turn: 14, back: 4, lift: 0, pitch: -2 }
  slots(o = {}) {
    const gap = o.gap || 22, turn = (o.turn === undefined ? 14 : o.turn) * DEG, eye = 24 + (o.lift || 0), pz = (o.pitch === undefined ? -3 : o.pitch);
    const out = [];
    for (const side of [-1, 1]) {
      const l = side * gap + (o.shift || 0), st = this.p(0, l, eye), lookD = 300, lk = this.p(lookD, l * .4, eye + Math.tan(pz * DEG) * lookD);
      const ca = this.p(-(o.back || 4), l + side * (o.out || 12), 12 + (o.lift || 0)), cy = this.yaw + side * turn;
      const clk = [ca[0] + Math.cos(cy) * 300, ca[1] + Math.sin(cy) * 300, ca[2] - 12];
      out.push({ stand: { at: st, look: lk }, cover: { at: ca, look: clk }, side, prop: { at: [ca[0] + Math.cos(cy) * 13, ca[1] + Math.sin(cy) * 13, this.z + (o.lift || 0)], yaw: cy, h: o.coverH || 18 } });
    }
    return out;
  }
}
TC.Frame = Frame;
const F = (x, y, z, yawDeg) => new Frame(x, y, z, yawDeg * DEG);
TC.F = F;

// a rail from frame a's stand to frame b's: world points (the arrival path); vias in b's local frame or world points
function rail(a, b, vias = [], eye = 24) {
  const pts = [a.p(0, 0, eye)];
  for (const v of vias) pts.push(v.length === 3 && v.world ? v : b.p(v[0], v[1], v[2] === undefined ? eye : v[2]));
  pts.push(b.p(0, 0, eye));
  return pts;
}
TC.rail = rail;

// cover points: covers(frame, { c1: [d, l, h?, peek?, extra], ... }) -> { c1: { at, h, peek } }
function covers(fr, spec) {
  const out = {};
  for (const k in spec) { const [d, l, h, peek, x] = spec[k]; out[k] = Object.assign({ at: fr.p(d, l, x && x.z || 0), h: h || 18, peek: peek || ['up'] }, x || {}); }
  return out;
}
TC.covers = covers;
TC.noCheck = cs => { for (const k in cs) cs[k].noCheck = true; return cs; };   // moving scenes: checked in play, not from the start pose

// ---------------------------------------------------------------- prefabs
const PF = {};
TC.PF = PF;
// the cover prop in front of a slot's cover pose: crates, barrels, a sandbag wall, a cart...
PF.slotProp = (G, s, kind = 'crates') => {
  const p = s.prop; G.push(p.at[0], p.at[1], p.at[2], p.yaw);
  const h = p.h;
  if (kind === 'crates') { G.box(-7, -11, 0, 7, 1, h, 'crate', { fit: true, surf: 'wood' }); G.box(-6, 1, 0, 6, 12, h - 3, 'crate', { fit: true, surf: 'wood' }); }
  else if (kind === 'barrels') { for (const [x, y] of [[0, -7], [0, 5]]) { G.cyl(x, y, 0, h, 7, 7, 10, 'iron', { collide: 'metal' }); } }
  else if (kind === 'sandbags') { for (let r = 0; r < 3; r++) G.box(-6, -12 + r % 2 * 2, r * 6, 6, 12 - r % 2 * 2, r * 6 + 6, 'sandbag', { surf: 'concrete' }); }
  else if (kind === 'concrete') { G.box(-6, -12, 0, 6, 12, h, 'concrete', { surf: 'concrete' }); G.box(-6.5, -12.5, h - 2, 6.5, 12.5, h, 'hazard', { collide: false }); }
  else if (kind === 'steel') { G.box(-4, -12, 0, 4, 12, h, 'steel-paint', { surf: 'metal' }); }
  else if (kind === 'cart') { G.box(-8, -16, 6, 8, 16, h, 'plank', { surf: 'wood' }); G.cyl(0, -17, 0, 0, 0, 0, 4, 'iron'); G.box(-6, -18, 0, 6, -16, 8, 'iron', { collide: false }); G.box(-6, 16, 0, 6, 18, 8, 'iron', { collide: false }); }
  else if (kind === 'well') { G.cyl(0, 0, 0, h, 14, 14, 12, 'stone', { collide: 'concrete' }); G.box(-2, -15, h, 2, -13, h + 22, 'timber', { collide: false }); G.box(-2, 13, h, 2, 15, h + 22, 'timber', { collide: false }); G.box(-3, -16, h + 22, 3, 16, h + 25, 'timber', { collide: false }); }
  else if (kind === 'console') { G.box(-6, -12, 0, 6, 12, h, 'gunmetal', { surf: 'metal' }); G.box(-6, -11, h - 1, 2, 11, h + 1, 'screen-teal', { collide: false }); }
  G.pop();
};
PF.lantern = (G, x, y, z, mat = 'lantern', light = true) => { G.lathe(x, y, z - 6, [[0, 0], [3, 1], [4.5, 3], [4.5, 7], [3, 9.5], [0, 10.5]], 6, mat); if (light) G.light(x, y, z, 95, .85, mat === 'lantern-red' ? '#ff6a4a' : '#ffb347'); };
PF.lanternString = (G, a, b, n = 6, sag = 8) => {
  for (let i = 0; i <= n; i++) { const t = i / n, p = vlerp(a, b, t); p[2] -= Math.sin(t * Math.PI) * sag; const cols = ['#ff5a5a', '#ffd34a', '#5ad1ff', '#8aff8a']; G.box(p[0] - .8, p[1] - .8, p[2] - 1.6, p[0] + .8, p[1] + .8, p[2], 'glow' + cols[i % 4], { collide: false, tess: false }); }
};
PF.lamppost = (G, x, y, z, h = 60, sodium = false, light = true) => { G.cyl(x, y, z, z + h, 1.6, 1.2, 6, 'iron', { collide: 'metal' }); G.box(x - 5, y - 3, z + h, x + 5, y + 3, z + h + 3, 'iron', { collide: false }); G.box(x - 4, y - 2, z + h - 2, x + 4, y + 2, z + h, sodium ? 'lamp-sodium' : 'lamp', { collide: false, skip: 't' }); if (light) G.light(x, y, z + h - 4, 150, .8, sodium ? '#ffb04a' : '#ffe0b0'); };
PF.bollard = (G, x, y, z) => { G.cyl(x, y, z, z + 10, 4, 3.5, 8, 'iron', { collide: 'metal' }); G.cyl(x, y, z + 10, z + 12, 5, 5, 8, 'iron'); };
PF.crateStack = (G, x, y, z, n = 2, yaw = 0) => { G.push(x, y, z, yaw); for (let i = 0; i < n; i++) G.box(-8, -8 + (i % 2) * 2, i * 15, 8, 8 - (i % 2) * 2, i * 15 + 15, 'crate', { fit: true, surf: 'wood' }); G.pop(); };
PF.barrel = (G, x, y, z, mat = 'iron') => { G.cyl(x, y, z, z + 18, 6.5, 6.5, 10, mat, { collide: 'metal' }); };
PF.container = (G, x, y, z, yaw, mat = 'container-red', o = {}) => {
  G.push(x, y, z, yaw); G.box(-49, -19.5, 0, 49, 19.5, 42, mat, { surf: 'metal', top: mat }); G.box(49, -19.5, 0, 50, 19.5, 42, 'iron', { collide: false });
  if (o.doors) { G.box(49.5, -18, 2, 50.5, -1, 40, 'iron', { collide: false }); G.box(49.5, 1, 2, 50.5, 18, 40, 'iron', { collide: false }); }
  G.pop();
};
PF.warehouse = (G, fr, d, l, w, depth, h, o = {}) => {
  // a brick shed along l (width w), depth along d, a door and lit windows facing the arena (-d side)
  const A = fr.p(d, l - w / 2), yaw = fr.yaw;
  G.push(A[0], A[1], A[2], yaw);
  G.box(0, 0, 0, depth, w, h, o.mat || 'brick', { surf: 'concrete', top: 'iron' });
  for (let i = 0; i < Math.floor(w / 40); i++) G.box(-.6, 12 + i * 40, h * .55, 0, 26 + i * 40, h * .55 + 14, o.lit === false ? 'window-dark' : 'glasslit', { collide: false, tess: false });
  if (o.door !== false) G.box(-1, w / 2 - 10, 0, 0, w / 2 + 10, 34, 'plank', { collide: false });
  if (o.sign) G.box(-1.2, w / 2 - 30, h - 16, -.2, w / 2 + 30, h - 4, 'poster', { collide: false });
  G.pop();
};
PF.stall = (G, x, y, z, yaw, awn = 'awning-red', goods = true) => {
  G.push(x, y, z, yaw);
  G.box(-10, -18, 0, 10, 18, 14, 'plank', { surf: 'wood' });
  for (const [a, b] of [[-10, -18], [-10, 16], [8, -18], [8, 16]]) G.box(a, b, 14, a + 2, b + 2, 34, 'timber', { collide: false });
  G.quad([-14, -20, 36], [-14, 20, 36], [12, 20, 30], [12, -20, 30], awn, { double: true });
  if (goods) { for (let i = 0; i < 4; i++) G.box(-6 + i % 2 * 6, -14 + i * 7, 14, -2 + i % 2 * 6, -9 + i * 7, 18, i % 2 ? '#c0a040' : '#5a8ad0', { collide: false, tess: false }); }
  G.pop();
};
PF.boat = (G, x, y, z, yaw, len = 80, o = {}) => {
  G.push(x, y, z, yaw);
  const w = len * .32, hl = len / 2;
  G.box(-hl, -w / 2, -6, hl - 12, w / 2, 8, o.hull || 'hull', { surf: 'metal' });
  G.quad([hl - 12, -w / 2, -6], [hl + 6, 0, 0], [hl + 6, 0, 10], [hl - 12, -w / 2, 8], o.hull || 'hull', { tess: false });
  G.quad([hl + 6, 0, 0], [hl - 12, w / 2, -6], [hl - 12, w / 2, 8], [hl + 6, 0, 10], o.hull || 'hull', { tess: false });
  G.box(-hl + 4, -w / 2 + 2, 8, hl - 14, w / 2 - 2, 9, 'planks', { collide: false });
  if (o.cabin !== false) { G.box(-hl * .4, -w * .35, 9, hl * .15, w * .35, 30, 'plaster', { surf: 'wood', top: 'planks' }); G.box(hl * .15 - .2, -w * .25, 18, hl * .15 + .6, w * .25, 26, 'glasslit', { collide: false, tess: false }); }
  G.pop();
};
PF.railing = (G, a, b, h = 14, mat = 'iron') => {
  const n = Math.max(1, Math.round(vdist(a, b) / 24));
  for (let i = 0; i <= n; i++) { const p = vlerp(a, b, i / n); G.box(p[0] - .8, p[1] - .8, p[2], p[0] + .8, p[1] + .8, p[2] + h, mat, { collide: false, tess: false }); }
  const d = vnorm(vsub(b, a)), nn = [-d[1] * .6, d[0] * .6, 0];
  G.quad(vadd(vadd(a, nn), [0, 0, h - 1.4]), vadd(vadd(b, nn), [0, 0, h - 1.4]), vadd(vadd(b, nn), [0, 0, h]), vadd(vadd(a, nn), [0, 0, h]), mat, { double: true });
};
PF.house = (G, fr, d, l, w, depth, h, o = {}) => {
  const A = fr.p(d, l - w / 2); G.push(A[0], A[1], A[2], fr.yaw + (o.turn || 0));
  const wall = o.wall || 'plaster';
  G.box(0, 0, 0, depth, w, h, wall, { surf: 'wood', top: 'roof-slate', skip: 't' });
  // a pitched roof along w
  G.quad([-3, -3, h], [-3, w + 3, h], [depth / 2, w + 3, h + depth * .45], [depth / 2, -3, h + depth * .45], 'roof-slate', { double: false });
  G.quad([depth + 3, w + 3, h], [depth + 3, -3, h], [depth / 2, -3, h + depth * .45], [depth / 2, w + 3, h + depth * .45], 'roof-slate', {});
  G.quad([0, 0, h], [depth, 0, h], [depth / 2, 0, h + depth * .45], [depth / 2, 0, h + depth * .45], wall, { tess: false });
  G.quad([depth, w, h], [0, w, h], [depth / 2, w, h + depth * .45], [depth / 2, w, h + depth * .45], wall, { tess: false });
  if (o.timber) for (let i = 0; i <= w; i += 24) G.box(-.6, i, 0, 0, i + 3, h, 'timber', { collide: false, tess: false });
  const wins = o.windows || [];
  for (const wn of wins) G.box(-.5, wn[0], wn[1], 0, wn[0] + 14, wn[1] + 16, wn[2] ? 'glasslit' : 'window-dark', { collide: false, tess: false });
  if (o.door) G.box(-.8, o.door - 9, 0, 0, o.door + 9, 32, 'plank', { collide: false, tess: false });
  G.pop();
};
PF.catwalk = (G, a, b, w = 24, mat = 'grate') => {
  const d = vnorm(vsub(b, a)), n = [-d[1] * w / 2, d[0] * w / 2, 0];
  G.quad(vadd(a, vmul(n, -1)), vadd(b, vmul(n, -1)), vadd(b, n), vadd(a, n), mat, { double: true });
  PF.railing(G, vadd(a, n), vadd(b, n), 14); PF.railing(G, vadd(a, vmul(n, -1)), vadd(b, vmul(n, -1)), 14);
};
PF.water = (G, x0, y0, x1, y1, z, mat = 'sea-night') => { G.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], mat, {}); };
PF.ground = (G, x0, y0, x1, y1, z, mat) => { G.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], mat, {}); };
PF.skylineBlock = (G, x, y, w, d, h, lit = true) => { G.box(x, y, 0, x + w, y + d, h, lit ? 'glasslit' : 'concrete-dark', { collide: false, tess: false }); };

// the shapes of moving things (dynamic meshes, built once)
const MESH = {};
TC.MESH = MESH;
TC.mesh = (id) => MESH[id] || (MESH[id] = TC.makeMesh(MESHDEF[id]));
const MESHDEF = {
  speedboat: G => { PF.boat(G, 0, 0, 0, 0, 96, { hull: 'hull', cabin: false }); G.box(-30, -16, 8, -26, 16, 20, 'steel-paint', { surf: 'metal' }); G.box(-10, -14, 8, 6, -6, 22, 'steel-paint'); G.box(-10, -6, 20, 6, 6, 24, 'glass'); G.box(10, -16, 8, 40, -14, 18, 'steel-paint'); G.box(10, 14, 8, 40, 16, 18, 'steel-paint'); },
  stingray: G => { PF.boat(G, 0, 0, 0, 0, 150, { hull: 'hull-dark', cabin: false }); G.box(-20, -18, 9, 22, 18, 34, 'gunmetal'); G.box(-14, -16, 34, 16, 16, 46, 'gunmetal'); G.box(16.2, -12, 36, 16.8, 12, 42, 'glasslit'); G.box(-60, -24, 8, 60, -23, 18, 'iron'); G.box(-60, 23, 8, 60, 24, 18, 'iron'); },
  turret: G => { G.cyl(0, 0, 0, 6, 7, 6, 8, 'gunmetal'); G.box(-5, -5, 6, 5, 5, 12, 'gunmetal'); G.pipe(4, 22, -2, 9, 1.4, 6, 'iron'); G.pipe(4, 22, 2, 9, 1.4, 6, 'iron'); },
  truck: G => { G.box(-46, -16, 6, 20, 16, 40, 'camo'); G.box(20, -16, 6, 46, 16, 30, 'camo'); G.box(46, -15, 14, 46.6, 15, 26, 'glass'); for (const x of [-30, 0, 32]) for (const y of [-17, 17]) G.cyl(x, y, 0, 0, 0, 0, 3, 'rubber'); for (const x of [-30, 0, 32]) for (const y of [-18, 14]) G.box(x - 7, y, 0, x + 7, y + 4, 12, 'rubber'); G.box(-28, -17, 6, -16, -13, 20, 'tank-white'); G.box(-6, -8, 40, 8, 8, 46, 'gunmetal'); G.box(4, -10, 46, 6, 10, 56, 'steel-paint'); },
  jetski: G => { G.box(-10, -5, -2, 8, 5, 5, 'teal-paint'); G.quad([8, -5, -2], [16, 0, 0], [16, 0, 4], [8, -5, 5], 'teal-paint', { tess: false }); G.quad([16, 0, 0], [8, 5, -2], [8, 5, 5], [16, 0, 4], 'teal-paint', { tess: false }); G.box(-4, -3, 5, 4, 3, 8, 'rubber'); G.box(5, -6, 8, 7, 6, 9, 'iron'); },
  drone: G => { G.box(-5, -5, -2, 5, 5, 3, 'gunmetal'); for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { G.box(x - 4, y - 4, 3, x + 4, y + 4, 3.6, 'rubber', { double: true }); G.box(x * .5 - 1, y * .5 - 1, 1, x * .5 + 1, y * .5 + 1, 3, 'iron'); } G.box(4.5, -1.5, -1, 5.5, 1.5, 1.5, 'red-lamp'); },
  seawolf: G => { G.box(-30, -12, -10, 22, 12, 12, 'gunmetal'); G.quad([22, -12, -10], [38, 0, -4], [38, 0, 6], [22, -12, 12], 'gunmetal', { tess: false }); G.quad([38, 0, -4], [22, 12, -10], [22, 12, 12], [38, 0, 6], 'gunmetal', { tess: false }); G.box(22.2, -8, 0, 30, 8, 10, 'glasslit'); G.box(-80, -3, -2, -30, 3, 6, 'gunmetal'); G.box(-84, -1, 6, -78, 1, 24, 'gunmetal'); G.box(-6, -32, -6, 10, 32, -3, 'gunmetal'); G.cyl(4, -18, -12, -1, 6, 6, 8, 'steel-paint', { bottom: true }); G.cyl(4, 18, -12, -1, 6, 6, 8, 'steel-paint', { bottom: true }); G.cyl(0, 0, 12, 18, 4, 4, 8, 'iron'); },
  rotor: G => { G.box(-90, -3, 0, 90, 3, 1, 'iron', { double: true }); G.box(-3, -90, 0, 3, 90, 1, 'iron', { double: true }); },
  scyllaBody: G => { G.lathe(0, 0, -6, [[0, 0], [30, 2], [36, 10], [30, 22], [0, 26]], 10, 'gunmetal'); G.box(18, -10, 4, 40, 10, 18, 'steel-paint'); G.box(40, -8, 8, 41, 8, 16, 'glasslit'); for (const s of [-1, 1]) { G.box(20, s * 18 - 5, 0, 54, s * 18 + 5, 10, 'steel-paint'); G.box(-10, s * 14 - 7, 22, 10, s * 14 + 7, 32, 'hazard'); } },
  scyllaLeg: G => { G.box(-3, -3, -3, 3, 30, 3, 'steel-paint'); },
  lens: G => { G.lathe(0, 0, 0, [[0, 0], [16, 4], [18, 20], [16, 36], [0, 40]], 8, 'lens'); },
  turbine: G => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; G.push(0, 0, 0, a); G.box(0, -4, -1, 50, 4, 1, 'steel-paint', { double: true }); G.pop(); } G.cyl(0, 0, -6, 6, 9, 9, 10, 'gunmetal'); },
  funicular: G => { G.box(-36, -18, 0, 36, 18, 3, 'planks'); G.box(-36, -18, 3, 36, -16, 18, 'teal-paint'); G.box(-36, 16, 3, 36, 18, 18, 'teal-paint'); G.box(-36, -18, 3, -34, 18, 40, 'teal-paint'); G.box(-36, -18, 40, 36, 18, 42, 'teal-paint'); G.box(34, -18, 30, 36, 18, 40, 'teal-paint'); G.box(-20, -14, 3, -12, 14, 15, 'plank'); G.box(-36, -18, 18, -35, 18, 30, 'glass'); },
  lift: G => { G.box(-30, -24, 0, 30, 24, 3, 'grate'); G.box(-30, -24, 3, 30, -22, 14, 'steel-paint'); G.box(-30, 22, 3, 30, 24, 14, 'steel-paint'); G.box(-6, -14, 3, 6, 14, 18, 'gunmetal'); },
  bargeCrate: G => { G.box(-7, -7, 0, 7, 7, 14, 'fireworks'); },
  krakeLever: G => { G.box(-4, -4, 0, 4, 4, 30, 'gunmetal'); G.box(-1.5, -1.5, 30, 1.5, 1.5, 44, 'hazard'); G.box(-4, -4, 44, 4, 4, 48, 'red-lamp'); }
};
TC.MESHDEF = MESHDEF;

// ---------------------------------------------------------------- validators (the content suite runs them)
TC.validate = () => {
  const errs = [], err = s => errs.push(s);
  for (const st of all('stage')) {
    for (const sid of st.scenes) { if (!has('scene', sid)) { err('stage ' + st.id + ': missing scene ' + sid); continue; } }
    for (const k of ['intro', 'outro', 'ending']) if (st[k] && !has('cutscene', st[k])) err('stage ' + st.id + ': missing cutscene ' + st[k]);
    if (st.music && !has('song', st.music)) err('stage ' + st.id + ': missing song ' + st.music);
  }
  for (const sc of all('scene')) {
    if (!sc.slots || sc.slots.length < 2) err('scene ' + sc.id + ': needs two slots');
    for (const w of sc.waves || []) for (const s of w.spawn || []) { if (!has('enemy', s[0])) err('scene ' + sc.id + ': unknown enemy ' + s[0]); if (s[1] && !(sc.covers || {})[s[1]]) err('scene ' + sc.id + ': unknown cover ' + s[1]); }
    for (const c of sc.cues || []) if (c.say && !has('speaker', c.say[0])) err('scene ' + sc.id + ': unknown speaker ' + c.say[0]);
    for (const w of sc.waves || []) if (w.say && !has('speaker', w.say[0])) err('scene ' + sc.id + ': unknown speaker ' + w.say[0]);
    if (sc.boss && !has('boss', sc.boss)) err('scene ' + sc.id + ': unknown boss ' + sc.boss);
  }
  for (const c of all('cutscene')) for (const s of c.steps) if (s.say && !has('speaker', s.say[0])) err('cutscene ' + c.id + ': unknown speaker ' + s.say[0]);
  for (const h of all('highlight')) { if (!has('stage', h.stage)) err('highlight ' + h.id + ': unknown stage'); else if (!get('stage', h.stage).scenes.includes(h.scene)) err('highlight ' + h.id + ': scene ' + h.scene + ' not in stage ' + h.stage); }
  return errs;
};
// geometric validation of one scene (needs a Sim at that scene): every cover point's exposed head can be seen and shot
// from slot 0's stand pose, and the hidden pose is covered
TC.validateScene = (sim) => {
  const errs = [], cs = camSetup(Object.assign({}, sim.poseOf(0, 'stand'), { fov: 55, aspect: 16 / 9 }));
  for (const k in sim.covers) {
    const c = sim.covers[k]; if (c.noCheck) continue;
    const tallC = c.h >= 30, head = [c.at[0], c.at[1], c.at[2] + RIGH.head];
    let target = head;
    if (tallC) { const f = Math.atan2(cs.pos[1] - c.at[1], cs.pos[0] - c.at[0]), s = c.peek.includes('left') ? -1 : 1; target = [c.at[0] - Math.sin(f) * 14 * s, c.at[1] + Math.cos(f) * 14 * s, c.at[2] + RIGH.head]; }
    const v = projectVU(cs, target);
    if (!v || Math.abs(v[0]) > .95 * 16 / 9 || Math.abs(v[1]) > .95) { errs.push(sim.sceneId + ' cover ' + k + ': exposed head off screen (' + (v ? v[0].toFixed(2) + ',' + v[1].toFixed(2) : 'behind') + ')'); continue; }
    const d = vnorm(vsub(target, cs.pos)), t = vdist(target, cs.pos);
    for (const col of sim.colliders) { if (!col.on) continue; const ht = rayAABB(cs.pos, d, col.b); if (ht < t - 6) { errs.push(sim.sceneId + ' cover ' + k + ': head blocked by a collider at ' + ht.toFixed(0) + ' of ' + t.toFixed(0)); break; } }
  }
  // objective and bonus targets (locks, life rings, intel bottles) can be seen and shot from slot 1 or slot 2
  for (const ob of sim.objects) {
    if (!ob.K.objective && !ob.K.bonus) continue;
    const ok = [0, 1].some(i => { const c2 = camSetup(Object.assign({}, sim.poseOf(i, 'stand'), { fov: 55, aspect: 16 / 9 })), v = projectVU(c2, ob.pos); if (!v || Math.abs(v[0]) > .95 * 16 / 9 || Math.abs(v[1]) > .95) return false; const h = sim.raycast(c2.pos, vnorm(vsub(ob.pos, c2.pos))); return h && h.kind === 'object' && h.ob === ob; });
    if (!ok && !ob.noCheck) errs.push(sim.sceneId + ' object ' + ob.kind + ' at ' + ob.pos.map(Math.round) + ': not visible or not shootable');
  }
  return errs;
};
const cam = (t, at, look) => ({ t, at, look });   // a cutscene camera key

// ===== 31-stage1.js
// 31-stage1: HARBOR LIGHTS (Port Lumen Docks, 23:40, the Lantern Festival). Scenes 1-1 LANTERN PIER, 1-2 FISH MARKET,
// 1-3 CONTAINER YARD (the Bulldog), 1-4 CANAL RUN (moving), 1-B STINGRAY -> BARRACUDA. Reads: stagefmt (30).

const S1 = { pier: F(0, 0, 0, 0), market: F(620, 220, 0, 90), yard: F(620, 900, 0, 90), canal: F(860, 1500, -24, 0), mouth: F(3620, 1500, -24, 0) };
const W1 = -24;   // the harbor's water
const sl11 = S1.pier.slots({ gap: 22 }), sl12 = S1.market.slots({ gap: 24 }), sl13 = S1.yard.slots({ gap: 24 });

def('stage', 1, { name: 'HARBOR LIGHTS', place: 'Port Lumen Docks', clock: '23:40', music: 'harbor', briefing: 'b1',
  env: { sky: { stops: ['#0b1026', '#1b2a52', '#3a3060'], stars: true, moon: { az: -.6, el: .55, color: '#fff3d0' }, clouds: { color: '#262c58', cover: .4, k: .6 }, glow: { color: '#a03a8a', az: 1.2, w: 1.2, k: .45 },
    sil: [{ color: '#121834', lit: '#ffd070', h: az => (Math.cos(az - 1.5) > -.2 ? .035 + .06 * Math.abs(Math.sin(az * 17)) * Math.abs(Math.sin(az * 5.3)) : .012) }] },
    fog: ['#1a2242', 420, 2100], ambient: .34, ambientColor: '#8a98d8', sun: { dir: [-.35, .45, .82], color: '#a8b8ff', k: .42 }, water: { z: W1, mat: 'sea-night' }, fireworks: true },
  build(G) {
    // ---- 1-1 the pier: a wooden deck, stalls, lanterns, a fishing boat, warehouses on the quay ahead
    const A = S1.pier;
    G.push(A.x, A.y, A.z, A.yaw);
    G.box(-260, -62, -10, 420, 62, 0, 'planks', { surf: 'wood' });
    for (let d = -240; d < 420; d += 60) for (const l of [-58, 58]) G.cyl(d, l, W1 - 4, 0, 3, 3, 6, 'timber');
    PF.railing(G, [-260, -62, 0], [330, -62, 0], 12, 'timber'); PF.railing(G, [-260, 62, 0], [200, 62, 0], 12, 'timber');
    G.box(420, -440, -10, 760, 140, 0, 'cobble', { surf: 'concrete' });          // the quay
    for (const [d, l, a] of [[150, -44, 'awning-red'], [215, 44, 'awning-blue'], [280, -44, 'awning-green'], [90, 44, 'awning-red']]) PF.stall(G, d, l, 0, 0, a);
    for (let d = -200; d <= 380; d += 60) { G.cyl(d, -62, 0, 46, 1.2, 1.2, 5, 'timber', { collide: false }); G.cyl(d, 62, 0, 46, 1.2, 1.2, 5, 'timber', { collide: false }); }
    for (let d = -200; d < 380; d += 60) { PF.lanternString(G, [d, -62, 44], [d + 60, -62, 44], 5, 5); PF.lanternString(G, [d, 62, 44], [d + 60, 62, 44], 5, 5); PF.lanternString(G, [d, -62, 46], [d + 30, 62, 46], 8, 10); }
    for (const d of [-120, 40, 180, 330]) { PF.lantern(G, d, -50, 40); PF.lantern(G, d + 20, 50, 40, 'lantern-red'); }
    G.box(196, -8, 0, 210, 8, 14, 'crate', { fit: true, surf: 'wood' });    // c3's crates
    G.box(196, 8, 0, 210, 18, 12, 'crate', { fit: true, surf: 'wood' });
    PF.barrel(G, 304, -18, 0); PF.barrel(G, 314, -8, 0, 'iron');            // c6
    PF.boat(G, 238, 104, -16, .15, 110, { hull: 'hull' });                    // a fishing boat beside the pier
    PF.bollard(G, 120, 58, 0); PF.bollard(G, 120, -58, 0); PF.bollard(G, -60, 58, 0);
    PF.warehouse(G, A, 480, -140, 200, 160, 70, { sign: true }); PF.warehouse(G, A, 470, -340, 160, 150, 80, { lit: true });
    PF.lamppost(G, 440, -30, 0, 64, true); PF.lamppost(G, 560, 110, 0, 64, true);
    // the giant festival screen on the warehouse (Krake's broadcast)
    G.box(481, -172, 68, 486, -108, 114, 'iron', { collide: false }); G.box(479.5, -168, 72, 481, -112, 110, 'screen-teal', { collide: false, tess: false });
    G.pop();
    for (const s of sl11) PF.slotProp(G, s, 'crates');
    // ---- 1-2 the fish market: a brick hall, tiled floor, stalls, ice tables, an upper gallery
    const M = S1.market;
    G.push(M.x, M.y, M.z, M.yaw);
    G.box(-60, -120, -1, 380, 120, 0, 'tiles', { surf: 'concrete' });
    G.box(-60, -122, 0, 380, -120, 96, 'brick', { surf: 'concrete' }); G.box(-60, 120, 0, 380, 122, 96, 'brick', { surf: 'concrete' });
    G.box(378, -120, 0, 380, -20, 96, 'brick'); G.box(378, 20, 0, 380, 120, 96, 'brick'); G.box(378, -20, 40, 380, 20, 96, 'brick');
    G.box(-62, -120, 0, -60, -24, 96, 'brick'); G.box(-62, 24, 0, -60, 120, 96, 'brick'); G.box(-62, -24, 40, -60, 24, 96, 'brick');
    G.box(-60, -120, 96, 380, 120, 98, 'timber', { collide: false, bottom: true });
    // the gallery along the far end (z 48) on posts, with a railing
    G.box(260, -118, 46, 378, 118, 48, 'planks', { surf: 'wood', bottom: true }); G.box(258, -118, 46, 262, 118, 60, 'timber', { surf: 'wood' });
    for (const l of [-100, -40, 40, 100]) G.box(258, l - 2, 0, 262, l + 2, 46, 'timber', { surf: 'wood' });
    for (const l of [-60, 60]) { G.cyl(250, l, 0, 18, 7, 7, 10, 'barrel-red', { collide: 'metal' }); }
    for (const [d, l] of [[120, -60], [130, 50], [200, -10], [60, 80]]) { G.box(d - 14, l - 22, 0, d + 14, l + 22, 15, 'steel', { surf: 'metal', top: 'ice' }); }
    for (const [d, l, a] of [[170, 70, 'awning-blue'], [180, -80, 'awning-red']]) PF.stall(G, d, l, 0, 0, a);
    for (let d = 0; d < 360; d += 70) { PF.lantern(G, d, -50, 80, 'lantern-red'); PF.lantern(G, d + 30, 50, 80); }
    G.box(377.5, -40, 60, 378, 40, 80, 'poster', { collide: false });
    G.pop();
    for (const s of sl12) PF.slotProp(G, s, 'crates');
    // ---- the street between: the quay continues south
    G.box(540, 598, -10, 700, 782, 0, 'cobble', { surf: 'concrete' }); G.box(538, 598, 0, 540, 782, 60, 'brick'); G.box(700, 598, 0, 702, 782, 60, 'brick');
    // ---- 1-3 the container yard: asphalt, stacks, a gantry crane, forklifts, sodium lamps
    const Y = S1.yard;
    G.push(Y.x, Y.y, Y.z, Y.yaw);
    G.box(-120, -260, -2, 470, 300, 0, 'asphalt', { surf: 'concrete' });
    PF.container(G, 200, -80, 0, Math.PI / 2, 'container-blue'); PF.container(G, 200, -80, 42, Math.PI / 2, 'container-red');
    PF.container(G, 240, 70, 0, 0, 'container-ochre'); PF.container(G, 330, -150, 0, Math.PI / 2, 'container-green'); PF.container(G, 330, -150, 42, Math.PI / 2, 'container-grey');
    PF.container(G, 420, 40, 0, 0, 'container-red'); PF.container(G, 420, 40, 42, 0, 'container-blue'); PF.container(G, 120, 170, 0, .1, 'container-green');
    PF.container(G, 300, 250, 0, Math.PI / 2, 'container-ochre');   // the wall the Bulldog smashes through
    G.box(256, -14, 0, 272, 2, 16, 'crate', { fit: true, surf: 'wood' }); G.box(348, -28, 0, 364, -12, 16, 'crate', { fit: true, surf: 'wood' });
    G.box(120, -50, 0, 150, -26, 20, 'container-ochre', { surf: 'metal' });   // a forklift's body
    G.box(150, -46, 0, 160, -30, 34, 'iron', { collide: false });
    G.box(150, 30, 0, 176, 52, 20, 'container-ochre', { surf: 'metal' }); G.box(176, 34, 0, 184, 48, 34, 'iron', { collide: false });
    // the gantry crane
    for (const l of [-220, 220]) { G.box(480, l - 6, 0, 492, l + 6, 170, 'container-red', { surf: 'metal' }); G.box(380, l - 6, 0, 392, l + 6, 170, 'container-red', { surf: 'metal' }); }
    G.box(380, -226, 170, 492, 226, 186, 'container-red', { collide: false, bottom: true });
    for (const [d, l] of [[60, -200], [60, 200], [300, -230], [300, 220]]) PF.lamppost(G, d, l, 0, 80, true);
    G.pop();
    for (const s of sl13) PF.slotProp(G, s, 'crates');
    // ---- the canal: water between walls of houses, bridges
    const C = S1.canal;
    G.push(C.x, C.y, 0, C.yaw);
    for (const side of [-1, 1]) {
      G.box(-200, side * 90, -40, 2500, side * 90 + side * 30, 0, 'stone', { surf: 'concrete' });
      for (let d = -150; d < 2500; d += 140) { G.box(d, side * 120 + (side > 0 ? 0 : -70), 0, d + 120, side * 120 + (side > 0 ? 70 : 0), 80 + (d % 3) * 18, d % 280 === 130 ? 'plaster' : 'brick', { surf: 'concrete' }); G.box(side > 0 ? d + 20 : d + 20, side * 119.4, 30, d + 100, side * 119.4 + side * .4, 48, 'glasslit', { collide: false }); }
    }
    for (const d of [500, 1100, 1700]) { G.box(d, -90, 26, d + 40, 90, 34, 'stone', { surf: 'concrete', bottom: true }); PF.railing(G, [d + 2, -90, 34], [d + 2, 90, 34], 14); PF.railing(G, [d + 38, -90, 34], [d + 38, 90, 34], 14); for (let l = -80; l <= 80; l += 40) PF.lantern(G, d + 20, l, 30, l % 80 ? 'lantern' : 'lantern-red'); }
    G.box(1400, -90, 14, 1430, 90, 20, 'stone', { surf: 'concrete', bottom: true });   // the low bridge
    for (const d of [300, 900, 1500, 2100]) PF.lanternString(G, [d, -90, 60], [d, 90, 60], 8, 12);
    PF.boat(G, 760, 60, -16, 0, 90, { hull: 'hull' });   // a moored boat
    G.box(1880, 40, -26, 1980, 86, -14, 'plank', { surf: 'wood' });   // the fireworks barge
    G.pop();
    // ---- the harbor mouth: a breakwater, a far lighthouse
    G.push(S1.mouth.x, S1.mouth.y, 0, 0);
    G.box(-100, -460, -40, 900, -420, 6, 'stone', { surf: 'concrete' });
    G.cyl(820, -440, 6, 120, 12, 9, 10, 'plaster'); G.cyl(820, -440, 120, 136, 10, 10, 10, 'lamp');
    G.light(820, -440, 128, 200, 1, '#fff0c0');
    G.pop();
    // far skyline blocks
    for (let i = 0; i < 14; i++) PF.skylineBlock(G, 900 + i * 90, -700 - (i % 3) * 60, 70, 60, 100 + (i * 37) % 120, i % 2 === 0);
  },
  intro: 'c1-intro', outro: 'c1-outro', scenes: ['1-1', '1-2', '1-3', '1-4', '1-B'] });

// ---------------------------------------------------------------- 1-1 LANTERN PIER
def('scene', '1-1', { title: 'LANTERN PIER', time: 45,
  arrive: { path: [S1.pier.p(-240, 30, 14), S1.pier.p(-150, 10, 22), S1.pier.p(-60, 0, 24), S1.pier.p(0, 0, 24)], speed: 110 },
  slots: sl11,
  covers: covers(S1.pier, { c1: [150, -30, 16, ['up', 'right']], c2: [215, 30, 16, ['up', 'left']], c3: [220, 0, 15, ['up']], c4: [250, 48, 16, ['up']], c5: [340, 10, 18, ['up', 'left']], c6: [325, -14, 20, ['up']], c7: [290, -30, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'c3']] },
    { after: 'clear', spawn: [['deckhand', 'c5', { entry: 'door', from: S1.pier.p(478, -140, 0) }], ['deckhand', 'c4', { entry: 'jump', from: S1.pier.p(250, 96, 22) }]] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [S1.pier.p(330, -60, 0), S1.pier.p(330, 60, 0), S1.pier.p(420, 120, 0)], drop: 'mg', speed: 55 }], ['deckhand', 'c6', { entry: 'run', from: S1.pier.p(420, -60, 0) }], ['deckhand', 'c7', { entry: 'run', from: S1.pier.p(440, 90, 0) }]] } ],
  civilians: [],
  objects: [['lifering', S1.pier.p(96, 60, 22)], ['lantern', S1.pier.p(150, -50, 36)], ['lantern', S1.pier.p(200, 50, 36)], ['bottles', S1.pier.p(152, -44, 16)], ['bottles', S1.pier.p(215, 44, 16)], ['barrel', S1.pier.p(270, 40, 0)]],
  cues: [{ at: 0, say: ['juno', 'Hostiles on the pier! Watch the festival crowd!'] }, { at: 0, prompt: 'cover' }, { at: 1.5, fn: sim => TC.spawnCivilian(sim, { kind: 'festival', route: [S1.pier.p(160, 0, 0), S1.pier.p(260, 20, 0), S1.pier.p(420, 40, 0)], leave: 4, speed: 80, line: ['juno', "Civilians on the pier! Don't hit them!"] }) },
    { on: 'spawn:quartermaster', say: ['juno', "Orange vest! He's hauling ammo—drop him!"] }, { on: 'clear', say: ['kai', "Pier's clear. Moving!"] }, { at: 4, prompt: 'reload' }] });

// ---------------------------------------------------------------- 1-2 FISH MARKET
def('scene', '1-2', { title: 'FISH MARKET', time: 50,
  arrive: { path: [S1.pier.p(0, 0, 24), S1.pier.p(300, 0, 24), S1.pier.p(520, 20, 24), S1.pier.p(620, 60, 24), S1.market.p(-80, 0, 24), S1.market.p(0, 0, 24)], speed: 140 },
  slots: sl12,
  covers: covers(S1.market, { c1: [130, -60, 16, ['up']], c2: [140, 50, 16, ['up']], g1: [274, -60, 12, ['up'], { z: 48, ledge: true }], g2: [274, 70, 12, ['up'], { z: 48, ledge: true }], c3: [210, -10, 16, ['up']], c4: [180, 70, 14, ['up']], g3: [274, 0, 12, ['up'], { z: 48, ledge: true }], c5: [110, 70, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['deckhand', 'c1'], ['deckhand', 'c2'], ['deckhand', 'g1'], ['deckhand', 'g2']] },
    { after: 'clear', spawn: [['redtide', 'c3', { entry: 'roll', from: S1.market.p(230, -70, 0) }]], say: ['juno', "Red uniform! That's Red Tide—they don't miss. Hit him first!"] },
    { after: 'clear', spawn: [['marine', 'c4', { entry: 'vault' }], ['marine', 'c5', { entry: 'vault' }], ['grenadier', 'g3', { entry: 'stand' }]] } ],
  objects: [['tank', S1.market.p(250, -60, 0), { cue: 'gallery' }], ['tank', S1.market.p(250, 60, 0), { cue: 'gallery' }], ['intel', S1.market.p(260, 104, 60), { intel: 'i1a' }], ['lantern', S1.market.p(70, -50, 76)], ['bottles', S1.market.p(170, 70, 16)]],
  allies: [{ agent: 'rook', at: S1.market.p(300, -100, 0), facing: Math.PI }],
  cues: [{ at: 0, say: ['rook', 'Market hall. Stay sharp.'] }, { on: 'spawn:grenadier', say: ['juno', 'Grenade! Shoot it out of the air!'] }, { on: 'gallery', say: ['rook', "Now that's what I call fresh fish."], fn: sim => { for (const e of sim.enemies) if (!e.dead && e.cover && e.cover.ledge) TC.killEnemy(sim, e, { style: 'fall', p: sim.players[0] }); sim.emit('fx', { kind: 'gallery' }); } }] });

// ---------------------------------------------------------------- 1-3 CONTAINER YARD (the Bulldog)
def('scene', '1-3', { title: 'CONTAINER YARD', time: 60,
  arrive: { path: [S1.market.p(0, 0, 24), S1.market.p(250, 0, 24), S1.market.p(420, 0, 24), S1.yard.p(-130, 0, 24), S1.yard.p(0, 0, 24)], speed: 150 },
  slots: sl13,
  covers: covers(S1.yard, { k3: [420, 24, 12, ['up'], { z: 84, ledge: true }], f1: [130, -62, 20, ['up']], f2: [165, 60, 20, ['up']], c1: [160, -6, 16, ['up']], c2: [276, -6, 16, ['up']], c3: [362, -20, 16, ['up']] }),
  bulldog: { from: S1.yard.p(300, 330, 0), to: S1.yard.p(320, 10, 0) }, bulldogMen: [S1.yard.p(296, -34, 0), S1.yard.p(300, 48, 0)],
  waves: [
    { at: .6, spawn: [['deckhand', 'f1', { entry: 'jump', from: S1.yard.p(200, -60, 84) }], ['deckhand', 'f2', { entry: 'jump', from: S1.yard.p(240, 70, 42) }], ['deckhand', 'c1', { entry: 'jump', from: S1.yard.p(200, -20, 84) }], ['deckhand', 'k3']] },
    { after: 'clear', id: 'truck', spawn: [], fx: { kind: 'bulldog' } },
    { after: 'truck', spawn: [['grenadier', 'c3', { entry: 'run' }], ['quartermaster', null, { route: [S1.yard.p(300, -230, 0), S1.yard.p(300, 0, 0), S1.yard.p(330, 260, 0)], drop: 'mg', speed: 60 }], ['deckhand', 'c2', { entry: 'run' }]] } ],
  objects: [['barrel', S1.yard.p(210, -30, 0)], ['barrel', S1.yard.p(240, 30, 0)]],
  cues: [{ at: 0, say: ['juno', 'Something big is coming through the containers!'] }, { at: 3, fn: sim => TC.spawnCivilian(sim, { kind: 'worker', at: S1.yard.p(140, 40, 0), route: [S1.yard.p(140, 40, 0), S1.yard.p(150, 42, 0)], line: ['worker', "Don't shoot! I just work here!"] }) }],
  objective: sim => !sim.waves.find(w => w.id === 'truck' && w.fired) || sim.flags.bulldogDone });

// the Bulldog: a mini-boss launched by its wave
TC.bus.on('*', () => {});
const _fireWave = Sim.prototype._fireWave;
Sim.prototype._fireWave = function (w) {
  _fireWave.call(this, w);
  if (w.fx && w.fx.kind === 'bulldog') { this.startBoss('bulldog'); }
};
const _isClear = Sim.prototype._isClear;
Sim.prototype._isClear = function () {
  if (this.boss && this.boss.id === 'bulldog' && this.boss.defeated && this.boss.outT > 1) { this.flags.bulldogDone = true; this.boss = null; }
  if (this.boss && (this.boss.id === 'gull' || this.boss.id === 'seawolf') && this.boss.defeated && this.boss.outT > 1.5) { this.flags[this.boss.id + 'Done'] = true; this.boss = null; }
  if (this.boss && this.boss.defeated && this.boss.outT < 2.4) return false;
  return _isClear.call(this);
};

// ---------------------------------------------------------------- 1-4 CANAL RUN (moving: Mari's speedboat)
const CN = S1.canal, boatSlots = [
  { stand: { at: [0, -10, 32], look: [300, -6, 26] }, cover: { at: [-6, -20, 18], look: [300, -70, 14] } },
  { stand: { at: [0, 10, 32], look: [300, 6, 26] }, cover: { at: [-6, 20, 18], look: [300, 70, 14] } }];
def('scene', '1-4', { title: 'CANAL RUN', time: 60,
  arrive: { path: [S1.yard.p(0, 0, 24), S1.yard.p(150, 0, 24), S1.yard.p(300, 20, 24), S1.yard.p(360, -30, 20), [CN.x - 160, CN.y - 40, 8], [CN.x - 40, CN.y, 8]], speed: 150 },
  carrier: { path: [CN.p(-40, 0, 0), CN.p(600, 0, 0), CN.p(1300, -10, 0), CN.p(2000, 0, 0), CN.p(2400, 0, 0)], speed: 58, mesh: 'speedboat', cover: [[[8, -18, 8], [40, -14, 22]], [[8, 14, 8], [40, 18, 22]]] },
  slots: boatSlots,
  covers: covers(CN, { b1: [512, -30, 14, ['up'], { z: 58 }], b2: [512, 40, 14, ['up'], { z: 58 }], b3: [1112, -40, 14, ['up'], { z: 58, noCheck: true }], b4: [1112, 30, 14, ['up'], { z: 58, noCheck: true }], m1: [780, 60, 14, ['up'], { z: 17 }] }),
  waves: [
    { atD: 60, spawn: [['jetski', null, { path: [CN.p(260, -300, W1 - CN.z), CN.p(330, -60, 0), CN.p(500, 30, 0), CN.p(900, 60, 0)], speed: 150 }], ['jetski', null, { path: [CN.p(300, 300, 0), CN.p(380, 50, 0), CN.p(560, -30, 0), CN.p(950, -60, 0)], speed: 150 }]], say: ['juno', 'Jet skis, three o\'clock!'] },
    { atD: 250, hold: 430, spawn: [['gunner', 'b1', { mount: true }], ['deckhand', 'b2', { entry: 'stand' }]] },
    { atD: 560, spawn: [['quartermaster', null, { route: [CN.p(780, 30, 10), CN.p(780, 90, 10)], drop: 'mg', speed: 30 }], ['deckhand', 'm1']] },
    { atD: 760, spawn: [['jetski', null, { path: [CN.p(900, -300, 0), CN.p(980, -40, 0), CN.p(1200, 20, 0), CN.p(1600, 50, 0)], speed: 140 }], ['jetski', null, { path: [CN.p(940, 300, 0), CN.p(1020, 40, 0), CN.p(1250, -20, 0), CN.p(1650, -50, 0)], speed: 140 }]] },
    { atD: 860, hold: 1030, spawn: [['gunner', 'b3', { mount: true }], ['deckhand', 'b4', { entry: 'stand' }]] },
    { atD: 1450, spawn: [['jetski', null, { path: [CN.p(1700, -300, 0), CN.p(1760, -40, 0), CN.p(2000, 30, 0), CN.p(2300, 60, 0)], speed: 120 }], ['jetski', null, { path: [CN.p(1740, 300, 0), CN.p(1800, 40, 0), CN.p(2040, -30, 0), CN.p(2350, -60, 0)], speed: 120 }]], say: ['rook', 'Fireworks barge. Happy festival.'] } ],
  objects: [['fwcrate', CN.p(1900, 60, -14)], ['fwcrate', CN.p(1930, 50, -14)], ['fwcrate', CN.p(1960, 66, -14)]],
  cues: [{ at: 0, say: ['mari', "Grab something! We're taking the canals!"] }, { at: 20, say: ['mari', 'Low bridge! Heads down!'] }] });

// ---------------------------------------------------------------- 1-B STINGRAY -> BARRACUDA
def('scene', '1-B', { title: 'HARBOR MOUTH', time: 100, boss: 'stingray',
  arrive: { path: [CN.p(2400, 0, 32), CN.p(2600, 0, 32), S1.mouth.p(-140, 0, 32), S1.mouth.p(0, -10, 32)], speed: 120, vehicle: true },
  carrier: { path: [S1.mouth.p(-20, 0, 0), S1.mouth.p(20, 0, 0)], speed: 1, mesh: 'speedboat', cover: [[[8, -18, 8], [40, -14, 22]], [[8, 14, 8], [40, 18, 22]]], idle: true },
  slots: [{ stand: { at: [0, -10, 32], look: [60, -300, 26] }, cover: { at: [-4, -20, 18], look: [-60, -300, 14] } }, { stand: { at: [0, 10, 32], look: [100, -300, 26] }, cover: { at: [8, -16, 18], look: [180, -300, 14] } }],
  bossAt: S1.mouth.p(80, -290, 0),
  covers: {},
  cues: [] });

// ===== 32-stage2.js
// 32-stage2: STORM SIGNAL (Gull's Rest and Lighthouse Point, 02:10, a thunderstorm). Scenes 2-1 GULL'S REST
// (rushers, the shotgun), 2-2 NET LOFTS (shields, rappellers), 2-3 FUNICULAR (moving; the passing car; THE GULL),
// 2-4 LIGHTHOUSE KEEP (the hostage), 2-B HAMMERHEAD on the lantern gallery. Rain, lightning, the lighthouse beam.

const S2 = { lane: F(0, 0, 0, 0), lofts: F(640, 0, 0, 0), funi: F(1120, 0, 0, 0), keep: F(1980, 0, 460, 0), gal: F(2180, 0, 760, 0) };
const FUN_TOP = [1880, 0, 448];
const sl21 = S2.lane.slots({ gap: 22 }), sl22 = S2.lofts.slots({ gap: 24 }), sl24 = S2.keep.slots({ gap: 24 });
const sl2B = S2.gal.slots({ gap: 22 }), sl2B2 = F(2180 - 34, -64, 760, 0).slots({ gap: 18 });
const LH = S2.keep.p(300, 0, 0);   // the lighthouse's foot

def('stage', 2, { name: 'STORM SIGNAL', place: "Gull's Rest · Lighthouse Point", clock: '02:10', music: 'storm', briefing: 'b2', amb: 'storm',
  env: { sky: { stops: ['#141c22', '#26343c', '#34444a'], stars: false, clouds: { color: '#3c4c54', cover: .2, k: .9 }, sil: [{ color: '#1a2428', h: az => .03 + .04 * Math.abs(Math.sin(az * 3.1)) }] },
    fog: ['#26343c', 220, 1300], ambient: .36, ambientColor: '#90a8b0', sun: { dir: [.3, -.4, .86], color: '#b8c8d0', k: .35 }, water: { z: -60, mat: 'sea-storm' }, rain: true, lightning: true },
  build(G) {
    // ---- 2-1 the lane: cobbles, timber and plaster houses with slate roofs, balconies, washing lines, a boat on blocks
    const L = S2.lane;
    G.push(L.x, L.y, L.z, L.yaw);
    G.box(-160, -64, -4, 560, 64, 0, 'wet-cobble', { surf: 'concrete' });
    for (const side of [-1, 1]) for (let d = -150, k = 0; d < 520; d += 96, k++) {
      const timber = (k + (side > 0 ? 1 : 0)) % 2 === 0, l0 = side > 0 ? 64 : -64 - 76;
      PF.house(G, L, d, l0 + 38, 76, 88, 66 + (k % 3) * 10, { wall: timber ? 'plaster' : 'stone', timber, windows: [[16, 38, k % 2], [46, 38, (k + 1) % 2]], door: 44 });
    }
    // windows and doors on the house fronts that face the lane
    for (const side of [-1, 1]) for (let d = -150; d < 520; d += 96) { const f = side * 64 - side * .6; for (const w of [14, 50]) G.box(d + w, Math.min(f, side * 64), 34, d + w + 14, Math.max(f, side * 64), 52, ((d + 150) / 96 | 0) % 2 ? 'glasslit' : 'window-dark', { collide: false, tess: false }); G.box(d + 34, Math.min(f, side * 64), 0, d + 50, Math.max(f, side * 64), 28, 'plank', { collide: false, tess: false }); }
    // balconies for the window shooters
    for (const [d, side] of [[170, -1], [262, 1], [380, -1]]) { G.box(d - 14, side * 64, 30, d + 14, side * 50, 32, 'timber', { surf: 'wood', bottom: true }); G.box(d - 14, side * 50, 32, d + 14, side * 52, 44, 'timber', { surf: 'wood' }); }
    for (const d of [60, 200, 320]) { PF.railing(G, [d, -64, 60], [d + 10, 64, 60], 1, 'rope'); for (let l = -50; l <= 50; l += 18) G.box(d + 4 + l * .04, l - 4, 46, d + 5 + l * .04, l + 4, 59, (l / 18 | 0) % 2 ? 'awning-blue' : 'linen', { collide: false, tess: false, double: true }); }
    PF.boat(G, 290, -36, 8, .3, 70, { hull: 'hull' }); G.box(276, -46, 0, 304, -26, 8, 'timber');
    for (const [d, l] of [[150, 30], [300, 20], [330, -10], [420, 30]]) PF.barrel(G, d, l, 0, d === 330 ? 'iron' : 'oak');
    G.box(326, -30, 0, 344, 30, 16, 'plank', { surf: 'wood' });   // the cart barricade
    PF.lamppost(G, 100, -56, 0, 60, false); PF.lamppost(G, 300, 56, 0, 60, false); PF.lamppost(G, 470, -56, 0, 60, false);
    G.pop();
    PF.slotProp(G, sl21[0], 'cart'); PF.slotProp(G, sl21[1], 'well');
    // ---- 2-2 the net lofts: a tall wooden hall, an upper floor, hanging nets, fish-oil barrels, a roof hatch
    const N = S2.lofts;
    G.push(N.x, N.y, N.z, N.yaw);
    G.box(-50, -100, -1, 380, 100, 0, 'planks', { surf: 'wood' });
    G.box(-50, -102, 0, 380, -100, 112, 'timber', { surf: 'wood' }); G.box(-50, 100, 0, 380, 102, 112, 'timber', { surf: 'wood' }); G.box(378, -100, 0, 380, 100, 112, 'timber', { surf: 'wood' });
    G.box(-52, -100, 0, -50, -22, 112, 'timber'); G.box(-52, 22, 0, -50, 100, 112, 'timber'); G.box(-52, -22, 44, -50, 22, 112, 'timber');
    G.box(-50, -100, 112, 380, 100, 114, 'plank', { collide: false, bottom: true });
    G.box(230, -100, 54, 380, 100, 56, 'planks', { surf: 'wood', bottom: true }); G.box(226, -100, 54, 230, 100, 68, 'timber', { surf: 'wood' });
    for (let k = 0; k < 8; k++) G.box(150 + k * 10, 64, 0, 160 + k * 10, 100, 7 + k * 7, 'plank', { surf: 'wood' });
    for (const [d, l] of [[60, -70], [100, 60], [180, -40], [300, 50], [320, -60]]) G.quad([d, l - 30, 100], [d, l + 30, 100], [d, l + 30, 40], [d, l - 30, 40], 'net', { double: true, tess: false });
    for (const l of [-90, 90]) for (let d = 0; d < 360; d += 90) G.box(d - 3, l - 3, 0, d + 3, l + 3, 112, 'timber', { collide: false });
    G.box(140, -40, 110, 180, 0, 112.5, 'iron', { collide: false });
    for (let d = 30; d < 360; d += 90) PF.lantern(G, d, 0, 100, 'lantern');
    for (const [d, l] of [[110, -30], [150, 40], [70, 70]]) G.box(d - 12, l - 16, 0, d + 12, l + 16, 16, 'crate', { fit: true, surf: 'wood' });
    G.box(108, 48, 0, 124, 72, 16, 'crate', { fit: true, surf: 'wood' });
    G.pop();
    PF.slotProp(G, sl22[0], 'crates'); PF.slotProp(G, sl22[1], 'barrels');
    // ---- 2-3 the cliff and the funicular track
    const C = S2.funi;
    G.push(C.x, C.y, 0, 0);
    G.box(-140, -100, -4, 60, 100, 0, 'planks', { surf: 'wood' });   // the bottom station
    for (const y of [-28, 28]) G.quad([0, y - 2, 0], [790, y - 2, 448], [790, y + 2, 448], [0, y + 2, 0], 'iron', { tess: false });
    G.quad([0, -40, -2], [790, -40, 446], [790, 40, 446], [0, 40, -2], 'stone', {});
    // the cliff face to the left (terraces) and the drop to the right
    for (let k = 0; k < 6; k++) { const d = 80 + k * 130, z = d * 448 / 790; G.box(d, -240, -60, d + 130, -60, z + 30, 'cliff', { surf: 'concrete' }); G.box(d + 10, -110, z + 30, d + 120, -60, z + 32, 'planks', { surf: 'wood' }); G.box(d + 10, -62, z + 32, d + 120, -60, z + 44, 'timber', { surf: 'wood' }); }
    G.box(-140, -400, -60, 900, -240, 520, 'cliff', { collide: false });
    G.box(740, -120, 440, 900, 120, 448, 'planks', { surf: 'wood' });   // the top station
    G.pop();
    // ---- 2-4 the keep: a courtyard, the keeper's house, the lighthouse
    const K = S2.keep;
    G.push(K.x, K.y, K.z, K.yaw);
    G.box(-120, -200, -4, 420, 200, 0, 'wet-cobble', { surf: 'concrete' });
    G.box(-120, -200, -80, 420, -196, 0, 'cliff', { collide: false });
    G.box(100, -170, 0, 220, -70, 70, 'stone', { surf: 'concrete', top: 'roof-slate' }); G.box(99.4, -150, 30, 100, -130, 46, 'glasslit', { collide: false }); G.box(99.4, -110, 0, 100, -94, 30, 'plank', { collide: false });
    G.box(150, -70, 30, 190, -58, 32, 'timber', { surf: 'wood', bottom: true }); G.box(150, -60, 32, 190, -58, 44, 'timber', { surf: 'wood' });
    for (const [d, l] of [[120, 60], [160, 20], [200, 80]]) G.box(d - 10, l - 12, 0, d + 10, l + 12, 16, 'crate', { fit: true, surf: 'wood' });
    G.box(140, -30, 0, 160, 10, 18, 'stone', { surf: 'concrete' });
    PF.lamppost(G, 60, 100, 0, 60, false); PF.lamppost(G, 240, -40, 0, 60, false);
    G.pop();
    PF.slotProp(G, sl24[0], 'crates'); PF.slotProp(G, sl24[1], 'well');
    // the lighthouse: a tapering tower, a lower balcony, the lantern gallery at the top
    G.cyl(LH[0], LH[1], LH[2], LH[2] + 300, 44, 34, 14, 'plaster', { collide: 'concrete' });
    for (let z = 40; z < 300; z += 60) G.cyl(LH[0], LH[1], LH[2] + z, LH[2] + z + 14, 44 - z * .033 + .6, 44 - (z + 14) * .033 + .6, 14, '#c03028', { cap: false });
    G.box(LH[0] - 44.5, LH[1] - 10, LH[2], LH[0] - 43, LH[1] + 10, LH[2] + 34, 'plank', { collide: false });
    G.cyl(LH[0], LH[1], LH[2] + 96, LH[2] + 98, 56, 56, 14, 'iron', { collide: false, bottom: true });
    // ---- 2-B the lantern gallery (a wide platform around the lantern room) at z 760
    const Gl = S2.gal;
    G.push(Gl.x, Gl.y, Gl.z, Gl.yaw);
    G.box(-60, -130, -6, 240, 130, 0, 'iron', { surf: 'metal', bottom: true });
    PF.railing(G, [240, -130, 0], [240, 130, 0], 16); PF.railing(G, [-60, -130, 0], [240, -130, 0], 16); PF.railing(G, [-60, 130, 0], [240, 130, 0], 16);
    G.cyl(100, -70, 0, 50, 34, 34, 12, 'glass', { collide: 'glass' }); G.cyl(100, -70, 50, 70, 36, 10, 12, 'iron');
    G.box(-62, -40, 0, -56, 40, 40, 'stone', { surf: 'concrete' });   // the doorway
    G.pop();
    PF.slotProp(G, sl2B2[0], 'steel'); PF.slotProp(G, sl2B2[1], 'steel');
  },
  // the lighthouse beam and the second funicular car
  dyn(R, sim, view) {
    const top = [LH[0] + 20, LH[1] - 70, LH[2] + 330], a = view.t * .78;
    R.drawMesh({ mesh: TC.mesh('lens'), x: S2.gal.p(100, -70)[0], y: S2.gal.p(100, -70)[1], z: 760 + 6, yaw: a });
    const dir = [Math.cos(a), Math.sin(a), -.08];
    for (let k = -2; k <= 2; k++) { const d2 = [Math.cos(a + k * .05), Math.sin(a + k * .05), -.08]; R.line(S2.gal.p(100, -70, 30), vadd(S2.gal.p(100, -70, 30), vmul(d2, 1400)), [255, 245, 200], 'add', .16); }
    FX.light(vadd(S2.gal.p(100, -70, 30), vmul(dir, 120)), 200, .5, '#fff0c0', .03);
    if (sim.scene && sim.scene.id === '2-3' && sim.flags.passing) { const p = sim.flags.passing; R.drawMesh({ mesh: TC.mesh('funicular'), x: p[0], y: p[1], z: p[2], yaw: Math.PI, pitch: .52 }); }
    if (sim.scene && sim.scene.id === '2-3' && sim.flags.passing === undefined) R.drawMesh({ mesh: TC.mesh('funicular'), x: FUN_TOP[0] - 40, y: 28, z: FUN_TOP[2] - 20, yaw: Math.PI, pitch: .52 });
  },
  intro: 'c2-intro', outro: 'c2-outro', scenes: ['2-1', '2-2', '2-3', '2-4', '2-B'] });

// ---------------------------------------------------------------- 2-1 GULL'S REST
def('scene', '2-1', { title: "GULL'S REST", time: 50,
  arrive: { path: [S2.lane.p(-150, 20, 24), S2.lane.p(-80, 0, 24), S2.lane.p(0, 0, 24)], speed: 100 },
  slots: sl21,
  covers: covers(S2.lane, { b1: [170, -57, 12, ['up'], { z: 32, ledge: true }], b2: [262, 57, 12, ['up'], { z: 32, ledge: true }], b3: [380, -57, 12, ['up'], { z: 32, ledge: true }], c1: [160, 38, 18, ['up']], c2: [312, 22, 18, ['up']], c3: [352, -10, 16, ['up']], c4: [352, 18, 16, ['up']], c5: [292, -10, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['deckhand', 'b1', { entry: 'stand' }], ['deckhand', 'b2', { entry: 'stand' }], ['deckhand', 'c1']], fx: { kind: 'glass' } },
    { after: 'clear', id: 'blades', spawn: [['rusher', null, { from: S2.lane.p(480, -20, 0), ground: 0 }], ['rusher', null, { from: S2.lane.p(500, 30, 0), ground: 0 }]], say: ['juno', "Blades! Don't let them get close!"] },
    { after: 'blades', id: 'blades2', spawn: [['rusher', null, { from: S2.lane.p(470, 0, 0), ground: 0 }], ['rusher', null, { from: S2.lane.p(520, -30, 0), ground: 0 }], ['rusher', null, { from: S2.lane.p(540, 40, 0), ground: 0 }]] },
    { after: 'blades2', spawn: [['quartermaster', null, { route: [S2.lane.p(250, -70, 0), S2.lane.p(250, 0, 0), S2.lane.p(250, 70, 0)], drop: 'sg', speed: 50 }], ['marine', 'c3', { entry: 'run' }], ['marine', 'c4', { entry: 'run' }], ['deckhand', 'b3', { entry: 'stand' }]] } ],
  objects: [['window', S2.lane.p(64, -63.6, 34), { size: [16, 2, 18] }], ['window', S2.lane.p(208, 63.6, 34), { size: [16, 2, 18] }], ['barrel', S2.lane.p(300, 40, 0)], ['lantern', S2.lane.p(100, -50, 56)]],
  cues: [{ at: 0, say: ['mari', 'Gull\'s Rest. Stay low, the whole lane is watching.'] }, { at: 2, fn: sim => TC.spawnCivilian(sim, { kind: 'fisher', at: S2.lane.p(120, -58, 0), route: [S2.lane.p(120, -58, 0), S2.lane.p(124, -60, 0)], line: ['fisher', 'Not me! Not me!'] }) },
    { on: 'spawn:rusher', prompt: 'switch' }, { on: 'spawn:quartermaster', say: ['juno', 'Orange vest! Drop him for the shotgun!'] }, { at: 12, prompt: 'switch' }],
  step(sim) { if (!sim.flags.shotgunLine && sim.players.some(p => p.owned.sg)) { sim.flags.shotgunLine = true; sim.say('kai', 'Shotgun. Now we\'re talking.'); } } });

// ---------------------------------------------------------------- 2-2 NET LOFTS
def('scene', '2-2', { title: 'NET LOFTS', time: 55,
  arrive: { path: [S2.lane.p(0, 0, 24), S2.lane.p(300, 0, 24), S2.lane.p(520, 0, 24), S2.lofts.p(-90, 0, 24), S2.lofts.p(0, 0, 24)], speed: 140 },
  slots: sl22,
  covers: covers(S2.lofts, { r1: [124, -30, 16, ['up']], r2: [164, 40, 16, ['up']], r3: [120, 60, 16, ['up']], u1: [244, -50, 12, ['up'], { z: 56, ledge: true }], u2: [244, 30, 12, ['up'], { z: 56, ledge: true }], u3: [244, -10, 12, ['up'], { z: 56, ledge: true }], s1: [200, 0, 16, ['up']] }),
  waves: [
    { at: .6, spawn: [['shield', null, { route: [S2.lofts.p(340, 0, 0), S2.lofts.p(240, -10, 0), S2.lofts.p(160, -10, 0), S2.lofts.p(110, 0, 0)] }], ['deckhand', 's1']], say: ['juno', 'Shield! Knock it aside with the shotgun!'] },
    { after: 'clear', spawn: [['marine', 'r1', { entry: 'rappel', from: S2.lofts.p(160, -20, 112) }], ['marine', 'r2', { entry: 'rappel', from: S2.lofts.p(165, -10, 112) }], ['deckhand', 'r3', { entry: 'rappel', from: S2.lofts.p(155, -30, 112) }]], say: ['rook', "Ropes! They're coming through the roof!"] },
    { after: 'clear', spawn: [['redtide', 'u1', { entry: 'stand' }], ['redtide', 'u2', { entry: 'stand' }], ['grenadier', 'u3', { entry: 'stand' }]] } ],
  objects: [['barrel', S2.lofts.p(236, -80, 56)], ['barrel', S2.lofts.p(236, 70, 56)], ['barrel', S2.lofts.p(180, 80, 0)], ['intel', S2.lofts.p(228, 92, 68), { intel: 'i2a' }], ['lantern', S2.lofts.p(120, 0, 96)]],
  allies: [{ agent: 'rook', at: S2.lofts.p(60, -86, 0), facing: 0 }],
  cues: [{ at: 0, prompt: 'shield' }] });

// ---------------------------------------------------------------- 2-3 FUNICULAR (moving) and THE GULL
const funSlots = [{ stand: { at: [0, -8, 34], look: [300, -70, -90] }, cover: { at: [-4, -4, 12], look: [60, -200, -200] } }, { stand: { at: [0, 8, 34], look: [300, 0, -80] }, cover: { at: [-6, 6, 12], look: [60, 200, -200] } }];
def('scene', '2-3', { title: 'FUNICULAR', time: 65,
  arrive: { path: [S2.lofts.p(0, 0, 24), S2.lofts.p(300, 0, 24), S2.lofts.p(420, 0, 24), [1060, -10, 30], [1120 - 20, -28, 32]], speed: 140 },
  carrier: { path: [[1120, -28, 3], [1500, -28, 3 + 380 * 448 / 790], [1880, -28, 448 + 3]], speed: 22, mesh: 'funicular', cover: [[[-36, -18, 3], [36, -16, 18]], [[-20, -14, 3], [-12, 14, 15]], [[-36, 16, 3], [36, 18, 18]]], pitch: true },
  slots: funSlots,
  covers: TC.noCheck(covers(F(1120, 0, 0, 0), { t1: [160, -86, 12, ['up'], { z: 160 * 448 / 790 + 32 }], t2: [290, -86, 12, ['up'], { z: 290 * 448 / 790 + 32 }], t3: [420, -86, 12, ['up'], { z: 420 * 448 / 790 + 32 }], t4: [550, -86, 12, ['up'], { z: 550 * 448 / 790 + 32 }], t5: [680, -86, 12, ['up'], { z: 680 * 448 / 790 + 32 }], q1: [800, 60, 16, ['up'], { z: 448 }] })),
  perches: [S2.keep.p(150, -80, 70), S2.keep.p(170, -64, 32), S2.keep.p(250, -20, 98)],
  waves: [
    { atD: 20, spawn: [['deckhand', 't1', { entry: 'stand' }], ['deckhand', 't2', { entry: 'stand' }]], say: ['mari', "The funicular's the only way up the cliff."] },
    { atD: 140, spawn: [['deckhand', 't3', { entry: 'stand' }], ['marine', 't4', { entry: 'stand' }]] },
    { atD: 300, id: 'passing', spawn: [], say: ['juno', "Car coming down—it's full of them!"] },
    { atD: 560, spawn: [['deckhand', 't5', { entry: 'stand' }], ['quartermaster', null, { route: [[1880, 70, 448], [1900, -10, 448], [1950, -100, 448]], drop: 'mg', speed: 40 }]] },
    { atD: 600, id: 'gull', spawn: [], fx: { kind: 'gull' } } ],
  objects: [['lifering', [1860, 50, 470]]],
  step(sim, dt) {
    // the passing car: down the parallel track with three gunners aboard, for a few seconds
    const w = sim.waves.find(x => x.id === 'passing');
    if (w && w.fired && !sim.flags.passDone) {
      sim.flags.passT = (sim.flags.passT || 0) + dt; const u = clamp(sim.flags.passT / 6.5, 0, 1), d = lerp(780, 40, u), p = [1120 + d, 28, d * 448 / 790 + 3];
      sim.flags.passing = p;
      if (!sim.flags.passMen) { sim.flags.passMen = [-16, 0, 16].map(o => { const e = TC.makeEnemy(sim, 'gunner', null, { at: [p[0] + o, p[1], p[2] + 3], entry: 'stand', mount: true, noClear: false }); e.cover = { h: 14, peek: ['up'], at: [0, 0, 0], busy: 1 }; e.passO = o; e.state = 'peek'; e.t = .3; return e; }); }
      for (const e of sim.flags.passMen) if (!e.dead) { e.x = p[0] + e.passO * Math.cos(.52); e.y = p[1] + 4; e.z = p[2] + 3 + e.passO * Math.sin(.52) * -.1; } else if (e.deathFix !== true) { e.deathFix = true; }
      if (u >= 1) { sim.flags.passDone = true; sim.flags.passing = null; for (const e of sim.flags.passMen) if (!e.dead) e.gone = true; }
    }
  } });
Sim.prototype._fireWave = (orig => function (w) { orig.call(this, w); if (w.fx && w.fx.kind === 'gull') { this.startBoss('gull'); } })(Sim.prototype._fireWave);

// ---------------------------------------------------------------- 2-4 LIGHTHOUSE KEEP (the hostage)
def('scene', '2-4', { title: 'LIGHTHOUSE KEEP', time: 60,
  arrive: { path: [[1880, -28, 470], [1920, 0, 484], S2.keep.p(-40, 0, 24), S2.keep.p(0, 0, 24)], speed: 90 },
  slots: sl24,
  covers: covers(S2.keep, { k1: [126, 60, 16, ['up']], k2: [166, 20, 16, ['up']], k3: [206, 80, 16, ['up']], k4: [168, -10, 18, ['up']], h1: [170, -63, 12, ['up'], { z: 32, ledge: true }], cap: [246, 0, 30, ['left'], { z: 0, noCheck: true }], lb1: [252, 16, 12, ['up'], { z: 98, ledge: true }] }),
  waves: [
    { at: .6, spawn: [['marine', 'k1'], ['marine', 'k3'], ['redtide', 'k2', { entry: 'roll' }]] },
    { after: 'clear', id: 'hostage', spawn: [['captor', 'cap', { at: S2.keep.p(250, 0, 0), entry: 'stand' }]], say: ['captor', 'One more step and the old man swims!'] },
    { after: 'hostage', spawn: [['rusher', null, { from: S2.keep.p(260, 120, 0), ground: S2.keep.z }], ['deckhand', 'h1', { entry: 'stand' }], ['deckhand', 'k4', { entry: 'run' }], ['deckhand', 'lb1', { entry: 'stand' }]] } ],
  objects: [['barrel', S2.keep.p(200, 40, 0)], ['window', S2.keep.p(100, -140, 30), { size: [2, 18, 16] }], ['intel', S2.keep.p(97, -82, 48), { intel: 'i2b' }]],
  cues: [{ on: 'spawn:captor', fn: sim => { sim.say('kai', 'Easy… easy…'); sim.emit('prompt', { id: 'civ' }); } }, { on: 'rescue', fn: sim => { sim.say('tejada', 'Mari! You came!'); sim.say('mari', 'Papa—get down!'); } }] });

// ---------------------------------------------------------------- 2-B HAMMERHEAD on the lantern gallery
def('scene', '2-B', { title: 'LANTERN GALLERY', time: 120, boss: 'hammerhead',
  arrive: { path: [S2.keep.p(0, 0, 24), S2.keep.p(200, 60, 60), [LH[0] - 90, 60, 500], [LH[0] - 80, -40, 650], S2.gal.p(-50, 0, 24), S2.gal.p(0, 0, 24)], speed: 160 },
  slots: sl2B, slots2: sl2B2,
  hammer: { track: [S2.gal.p(150, -60, 0), S2.gal.p(150, 90, 0)] },
  covers: {},
  objects: sl2B.flatMap(s => [-9, 9].map(o => ['crate', [s.prop.at[0] - Math.sin(s.prop.yaw) * o, s.prop.at[1] + Math.cos(s.prop.yaw) * o, s.prop.at[2]], { size: [14, 18, 18], coverProp: true, hp: 999 }])),
  cues: [{ at: 1, say: ['rook', 'Top of the lighthouse. Nowhere left to run.'] }] });

def('cutscene', 'c2-intro', { actors: [{ id: 'kai', at: S2.lane.p(-120, 10, 0), facing: 0 }, { id: 'mari', at: S2.lane.p(-130, -14, 0), facing: .2 }, { id: 'rook', at: S2.lane.p(-136, 24, 0), facing: -.1 }],
  steps: [{ music: 'storm' }, { fx: { kind: 'lightning' } },
    { cam: [cam(0, S2.lane.p(-60, 60, 40), S2.lane.p(-128, 4, 18)), cam(9, S2.lane.p(-80, 40, 30), S2.lane.p(-128, 4, 18))] },
    { say: ['krake', 'Hammerhead. No one reaches the lamp.'], screen: true }, { fx: { kind: 'lightning' } },
    { cam: [cam(0, S2.lane.p(0, 0, 40), [LH[0], LH[1], LH[2] + 200]), cam(8, S2.lane.p(40, 0, 50), [LH[0], LH[1], LH[2] + 240])] },
    { say: ['hammer', 'NOBODY. PASSES. HAMMERHEAD.'], screen: true },
    { cam: [cam(0, S2.lane.p(-100, 30, 22), S2.lane.p(-136, 24, 20)), cam(6, S2.lane.p(-104, 34, 22), S2.lane.p(-136, 24, 20))] },
    { say: ['rook', 'He talks in capital letters.'] }] });
def('cutscene', 'c2-outro', { actors: [{ id: 'tejada', at: S2.gal.p(30, 20, 0), facing: Math.PI }, { id: 'mari', at: S2.gal.p(14, 34, 0), facing: -.6 }, { id: 'kai', at: S2.gal.p(0, -10, 0), facing: .3 }],
  steps: [{ cam: [cam(0, S2.gal.p(80, 40, 30), S2.gal.p(10, 10, 20)), cam(10, S2.gal.p(70, 50, 26), S2.gal.p(10, 10, 20))] },
    { say: ['tejada', 'The override is in the Tidewall control tower. At the peak, Krake opens every gate.'] },
    { say: ['juno', 'Forty minutes to dawn. The maintenance tram can get you there.'] },
    { say: ['kai', "Then let's catch a ride."] }] });

// ===== 33-stage3.js
// 33-stage3: THE TIDEWALL (05:20 -> 06:00, dawn). Scenes 3-1 CREST ROAD (drones, rockets, the grenade launcher),
// 3-2 SLUICE LOCKS (four gate locks to jam; the SEAWOLF gunship), 3-3 TURBINE HALL, 3-5 HELIPAD (SCYLLA), 3-6
// CONTROL ROOM (ADMIRAL KRAKE and the FINAL SHOT). The sea rises scene by scene. Then the ending.

const S3 = { crest: F(0, 0, 0, 0), sluice: F(720, 0, 0, 0), hall: F(1420, 0, -40, 0), roof: F(2040, 0, 170, 0), ctrl: F(2040, 560, 170, 90) };
const sl31 = S3.crest.slots({ gap: 22 }), sl32 = S3.sluice.slots({ gap: 22, pitch: 7 }), sl33 = S3.hall.slots({ gap: 24 }), sl35 = S3.roof.slots({ gap: 24 }), sl36 = S3.ctrl.slots({ gap: 24 });
const rise = k => sim => { sim.water = -46 + k * 6; };

def('stage', 3, { name: 'THE TIDEWALL', place: 'Meridian Tidewall', clock: '05:20', music: 'tidewall', briefing: 'b3', amb: 'tidewall', ending: 'c3-ending',
  env: { sky: { stops: ['#3a2a5a', '#8a4f7a', '#f29e6b'], stars: false, clouds: { color: '#c87a8a', cover: .45, k: .55 }, glow: { color: '#ffd090', az: -.2, w: .9, k: .7 }, moon: { az: -.2, el: .06, color: '#fff2c0' },
    sil: [{ color: '#4a3a5a', h: az => (Math.sin(az) > 0 ? .02 + .05 * Math.abs(Math.sin(az * 13)) * Math.abs(Math.sin(az * 3.7)) : .006) }] },
    fog: ['#8a7a8f', 520, 2400], ambient: .48, ambientColor: '#e8c8d0', sun: { dir: [.9, -.15, .4], color: '#ffc890', k: .55 }, water: { z: -46, mat: 'sea-dawn' } },
  build(G) {
    // ---- 3-1 the crest road on top of the barrier: the sea on the left, the city far below on the right
    const C = S3.crest;
    G.push(C.x, C.y, C.z, C.yaw);
    G.box(-220, -70, -200, 640, 70, 0, 'asphalt', { surf: 'concrete', side: 'concrete' });
    G.box(-220, -76, 0, 640, -70, 12, 'concrete', { surf: 'concrete' }); G.box(-220, 70, 0, 640, 76, 12, 'concrete', { surf: 'concrete' });
    for (let d = -200; d < 640; d += 32) G.box(d, -2, 0, d + 16, 2, .3, 'hazard', { collide: false, tess: false });
    for (const d of [80, 240, 420]) { G.box(d, -70, 0, d + 44, -36, 54, 'concrete-dark', { surf: 'concrete', top: 'steel' }); G.box(d + 44, -60, 10, d + 44.6, -46, 40, 'plank', { collide: false }); G.box(d + 44, -68, 44, d + 44.6, -38, 50, 'hazard', { collide: false }); }
    for (const d of [0, 160, 320, 480]) { PF.lamppost(G, d, 64, 12, 64, true); }
    // a gantry across the road for the rocketeers
    for (const l of [-64, 64]) G.box(276, l - 4, 0, 284, l + 4, 76, 'steel-paint', { surf: 'metal' });
    G.box(270, -68, 76, 290, 68, 80, 'grate', { surf: 'metal', bottom: true }); G.box(268, -68, 80, 270, 68, 90, 'steel-paint', { surf: 'metal' });
    G.box(340, -40, 0, 352, 40, 20, 'sandbag', { surf: 'concrete' });   // the barricade line
    G.pop();
    PF.slotProp(G, sl31[0], 'concrete'); PF.slotProp(G, sl31[1], 'concrete');
    // the city below and its far lights
    for (let i = 0; i < 18; i++) PF.skylineBlock(G, -200 + i * 120, 400 + (i % 4) * 60, 90, 70, 30 + (i * 53) % 140, i % 3 !== 0);
    // ---- 3-2 the sluice: a catwalk platform, the roaring channel, the giant gate with four locks, catwalks across
    const S = S3.sluice;
    G.push(S.x, S.y, S.z, S.yaw);
    G.box(-80, -90, -6, 40, 90, 0, 'grate', { surf: 'metal', bottom: true }); PF.railing(G, [40, -90, 0], [40, 90, 0], 14);
    G.box(-80, -260, -120, 380, -200, 60, 'concrete', { surf: 'concrete' }); G.box(-80, 200, -120, 380, 260, 60, 'concrete', { surf: 'concrete' });
    G.box(360, -260, -120, 400, 260, 230, 'concrete-dark', { surf: 'concrete' });   // the gate
    for (let l = -240; l < 240; l += 40) G.box(359, l, -60, 360, l + 4, 220, 'steel-paint', { collide: false, tess: false });
    G.box(358, -250, 200, 360, 250, 206, 'hazard', { collide: false });
    PF.catwalk(G, [200, -200, 30], [200, 200, 30], 22); G.box(190, -200, 24, 210, 200, 30, 'grate', { surf: 'metal', bottom: true });
    PF.catwalk(G, [330, -200, 92], [330, 200, 92], 22); G.box(320, -200, 86, 340, 200, 92, 'grate', { surf: 'metal', bottom: true });
    for (const l of [-200, 200]) for (const d of [200, 330]) G.box(d - 4, l - 4, -120, d + 4, l + 4, d === 200 ? 30 : 92, 'steel-paint', { collide: false });
    G.box(186, -60, 30, 196, 60, 44, 'steel', { surf: 'metal' }); G.box(316, -160, 92, 326, -100, 104, 'steel', { surf: 'metal' }); G.box(316, 80, 92, 326, 140, 104, 'steel', { surf: 'metal' });
    G.pop();
    PF.slotProp(G, sl32[0], 'steel'); PF.slotProp(G, sl32[1], 'steel');
    // ---- 3-3 the turbine hall: an interior with catwalks, cranes, steam vents and coolant tanks
    const H = S3.hall;
    G.push(H.x, H.y, H.z, H.yaw);
    G.box(-60, -150, -2, 440, 150, 0, 'concrete', { surf: 'concrete' });
    G.box(-60, -152, 0, 440, -150, 170, 'concrete-dark', { surf: 'concrete' }); G.box(-60, 150, 0, 440, 152, 170, 'concrete-dark', { surf: 'concrete' }); G.box(438, -150, 0, 440, 150, 170, 'concrete-dark', { surf: 'concrete' });
    G.box(-62, -150, 0, -60, -30, 170, 'concrete-dark'); G.box(-62, 30, 0, -60, 150, 170, 'concrete-dark'); G.box(-62, -30, 50, -60, 30, 170, 'concrete-dark');
    G.box(-60, -150, 170, 440, 150, 172, 'steel', { collide: false, bottom: true });
    for (let d = 20; d < 440; d += 80) G.box(d, -150, 166, d + 6, 150, 170, 'steel-paint', { collide: false, bottom: true });
    G.box(330, -150, 54, 438, 150, 58, 'grate', { surf: 'metal', bottom: true }); G.box(326, -150, 54, 330, 150, 68, 'steel-paint', { surf: 'metal' });
    G.box(80, -150, 54, 330, -110, 58, 'grate', { surf: 'metal', bottom: true }); G.box(80, -112, 54, 330, -110, 68, 'steel-paint', { surf: 'metal' });
    for (const d of [120, 220, 320]) { G.box(d - 4, -150, 0, d + 4, -142, 54, 'steel-paint', { collide: false }); }
    for (const [d, l] of [[140, 90], [260, 90], [380, 90]]) { G.cyl(d, l, 0, 30, 36, 36, 14, 'gunmetal', { collide: 'metal' }); G.box(d - 8, l - 50, 30, d + 8, l - 36, 70, 'gunmetal', { collide: false }); G.light(d, l - 40, 60, 120, .6, '#43f0c8'); }
    for (const [d, l] of [[120, -30], [200, 30], [260, -60], [180, -90]]) G.box(d - 10, l - 18, 0, d + 10, l + 18, 18, 'steel', { surf: 'metal' });
    for (const l of [-100, 0, 100]) G.box(437.5, l - 30, 70, 438, l + 30, 110, 'screen-teal', { collide: false });
    for (let d = 40; d < 440; d += 100) PF.lamppost(G, d, -140, 0, 150, true, true);
    G.pop();
    PF.slotProp(G, sl33[0], 'steel'); PF.slotProp(G, sl33[1], 'steel');
    // ---- 3-5 the tower roof and helipad
    const Rf = S3.roof;
    G.push(Rf.x, Rf.y, Rf.z, Rf.yaw);
    G.box(-100, -220, -300, 440, 220, 0, 'concrete', { surf: 'concrete' });
    G.cyl(260, 0, .1, .2, 110, 110, 20, 'asphalt', { collide: false }); for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; G.box(260 + Math.cos(a) * 104 - 3, Math.sin(a) * 104 - 3, .2, 260 + Math.cos(a) * 104 + 3, Math.sin(a) * 104 + 3, .4, 'hazard', { collide: false, tess: false }); }
    G.box(225, -40, .3, 235, 40, .5, 'foam', { collide: false }); G.box(285, -40, .3, 295, 40, .5, 'foam', { collide: false }); G.box(235, -5, .3, 285, 5, .5, 'foam', { collide: false });
    for (const l of [-220, 220]) G.box(-100, l - 4, 0, 440, l + 4, 14, 'concrete', { surf: 'concrete' });
    G.box(436, -220, 0, 444, 220, 14, 'concrete'); PF.lamppost(G, 420, -200, 0, 40, true); PF.lamppost(G, 420, 200, 0, 40, true);
    G.box(-100, -60, 0, -60, 60, 40, 'concrete-dark', { surf: 'concrete' });   // the stairwell
    G.pop();
    PF.slotProp(G, sl35[0], 'concrete'); PF.slotProp(G, sl35[1], 'concrete');
    // ---- 3-6 the control room: consoles, windows on the sea, the master lever
    const K = S3.ctrl;
    G.push(K.x, K.y, K.z, K.yaw);
    G.box(-60, -160, -2, 300, 160, 0, 'tiles', { surf: 'concrete' });
    G.box(-60, -162, 0, 300, -160, 90, 'concrete-dark'); G.box(-60, 160, 0, 300, 162, 90, 'concrete-dark'); G.box(-62, -160, 0, -60, 160, 90, 'concrete-dark');
    G.box(298, -160, 0, 300, 160, 24, 'concrete-dark'); G.box(298, -160, 70, 300, 160, 90, 'concrete-dark'); for (let l = -160; l < 160; l += 40) G.box(298, l - 2, 24, 300, l + 2, 70, 'steel-paint', { collide: false });
    G.box(-60, -160, 90, 300, 160, 92, 'steel', { collide: false, bottom: true });
    for (const [d, l] of [[150, -90], [150, 0], [150, 90], [230, -50], [230, 50]]) { G.box(d - 8, l - 26, 0, d + 8, l + 26, 20, 'gunmetal', { surf: 'metal' }); G.box(d - 8.5, l - 24, 14, d - 8, l + 24, 19, 'screen-teal', { collide: false, tess: false }); }
    for (const l of [-100, 0, 100]) G.box(-59.5, l - 30, 40, -59, l + 30, 70, 'screen-teal', { collide: false });
    G.pop();
    PF.slotProp(G, sl36[0], 'console'); PF.slotProp(G, sl36[1], 'console');
  },
  intro: 'c3-intro', scenes: ['3-1', '3-2', '3-3', '3-5', '3-6'] });

// ---------------------------------------------------------------- 3-1 CREST ROAD
def('scene', '3-1', { title: 'CREST ROAD', time: 75, enter: rise(0),
  arrive: { path: [S3.crest.p(-210, 0, 24), S3.crest.p(-100, 0, 24), S3.crest.p(0, 0, 24)], speed: 110 },
  slots: sl31,
  covers: covers(S3.crest, { g1: [282, -30, 10, ['up'], { z: 80, ledge: true }], g2: [282, 40, 10, ['up'], { z: 80, ledge: true }], b1: [362, -20, 20, ['up']], b2: [362, 24, 20, ['up']], h1: [140, -46, 54, ['left']], h2: [300, -46, 54, ['left']] }),
  waves: [
    { at: .6, spawn: [0, 1, 2, 3, 4].map(k => ['drone', null, { at: S3.crest.p(170 + k * 22, -40 + k * 20, 40 + (k % 2) * 16) }]), say: ['juno', 'Drones! Use the machine gun!'] },
    { after: 'clear', spawn: [['rocketeer', 'g1', { entry: 'stand' }], ['rocketeer', 'g2', { entry: 'stand' }], ['deckhand', 'h1', { entry: 'stand' }]], say: ['juno', 'Rocket! Shoot it down!'] },
    { after: 'clear', spawn: [['quartermaster', null, { route: [S3.crest.p(250, -80, 0), S3.crest.p(250, 0, 0), S3.crest.p(250, 80, 0)], drop: 'gl', speed: 50 }], ['marine', 'b1', { entry: 'stand' }], ['shield', null, { route: [S3.crest.p(420, 10, 0), S3.crest.p(380, 10, 0)] }], ['marine', 'b2', { entry: 'stand' }], ['deckhand', 'h2', { entry: 'stand' }]] } ],
  objects: [['barrel', S3.crest.p(360, 50, 0)], ['barrel', S3.crest.p(370, -50, 0)]],
  cues: [{ at: 0, fn: sim => { for (const p of sim.players) { p.owned.mg = true; if (p.ammo.mg < 60) p.ammo.mg = 60; } sim.emit('prompt', { id: 'switch' }); } }],
  step(sim) { if (!sim.flags.glLine && sim.players.some(p => p.owned.gl)) { sim.flags.glLine = true; sim.say('rook', 'Grenade launcher. My kind of party.'); } } });

// ---------------------------------------------------------------- 3-2 SLUICE LOCKS (and the SEAWOLF)
def('scene', '3-2', { title: 'SLUICE LOCKS', time: 100, enter: rise(1),
  arrive: { path: [S3.crest.p(0, 0, 24), S3.crest.p(400, 0, 24), S3.crest.p(600, 0, 24), S3.sluice.p(-70, 0, 24), S3.sluice.p(0, 0, 24)], speed: 160 },
  slots: sl32,
  covers: covers(S3.sluice, { w1: [204, -40, 14, ['up'], { z: 30 }], w2: [204, 80, 14, ['up'], { z: 30 }], w3: [204, -120, 14, ['up'], { z: 30 }], u1: [334, -130, 12, ['up'], { z: 92 }], u2: [334, 110, 12, ['up'], { z: 92 }], u3: [334, 0, 14, ['up'], { z: 92 }] }),
  seawolf: S3.sluice.p(250, 0, 120), rappelTo: [S3.sluice.p(204, -40, 30), S3.sluice.p(204, 80, 30)],
  waves: [
    { at: .6, spawn: [['deckhand', 'w1', { entry: 'stand' }], ['deckhand', 'w2', { entry: 'stand' }], ['redtide', 'u1', { entry: 'stand' }]] },
    { after: 'clear', id: 'wolf', spawn: [['deckhand', 'u2', { entry: 'stand' }], ['drone', null, { at: S3.sluice.p(150, -60, 70) }], ['drone', null, { at: S3.sluice.p(170, 60, 80) }]], fx: { kind: 'seawolf' } },
    { after: 'wolf', delay: 4, spawn: [['redtide', 'u3', { entry: 'stand' }], ['marine', 'w3', { entry: 'stand' }]] } ],
  objects: [['lock', S3.sluice.p(356, -150, 50), { yaw: Math.PI }], ['lock', S3.sluice.p(356, -50, 150), { yaw: Math.PI }], ['lock', S3.sluice.p(356, 60, 76), { yaw: Math.PI }], ['lock', S3.sluice.p(356, 160, 140), { yaw: Math.PI }], ['intel', S3.sluice.p(196, -140, 34), { intel: 'i3a' }]],
  cues: [{ at: 0, say: ['tejada', 'Jam the gate locks! Four of them—the glowing clamps!'] }],
  objective: sim => sim.objects.filter(o => o.kind === 'lock' && !o.dead).length === 0 && !!sim.flags.seawolfDone && sim.boss === null,
  step(sim) { if (!sim.flags.locksLine && sim.objects.filter(o => o.kind === 'lock' && !o.dead).length === 0) { sim.flags.locksLine = true; sim.say('tejada', 'Gate jammed! Hurry to the tower!'); } } });
Sim.prototype._fireWave = (orig => function (w) { orig.call(this, w); if (w.fx && w.fx.kind === 'seawolf') this.startBoss('seawolf'); })(Sim.prototype._fireWave);

// ---------------------------------------------------------------- 3-3 TURBINE HALL
def('scene', '3-3', { title: 'TURBINE HALL', time: 60, enter: rise(2),
  arrive: { path: [S3.sluice.p(0, 0, 24), S3.sluice.p(-60, 120, 24), [1300, 170, -16], S3.hall.p(-120, 0, 24), S3.hall.p(-30, 0, 24), S3.hall.p(0, 0, 24)], speed: 170 },
  slots: sl33,
  covers: covers(S3.hall, { c1: [130, -30, 18, ['up']], c2: [210, 30, 18, ['up']], c3: [270, -60, 18, ['up']], c4: [190, -90, 18, ['up']], k1: [200, -126, 12, ['up'], { z: 58, ledge: true }], k2: [300, -126, 12, ['up'], { z: 58, ledge: true }], u1: [344, -40, 12, ['up'], { z: 58, ledge: true }], u2: [344, 50, 12, ['up'], { z: 58, ledge: true }] }),
  waves: [
    { at: .6, spawn: [['marine', 'k1', { entry: 'stand' }], ['marine', 'k2', { entry: 'stand' }], ['redtide', 'c2', { entry: 'roll' }], ['deckhand', 'c1', { entry: 'stand' }]] },
    { after: 'clear', spawn: [['shield', null, { route: [S3.hall.p(400, 0, 0), S3.hall.p(300, -20, 0), S3.hall.p(230, -20, 0)] }], ['shield', null, { route: [S3.hall.p(410, 60, 0), S3.hall.p(320, 40, 0), S3.hall.p(250, 50, 0)] }], ['rusher', null, { from: S3.hall.p(420, -100, 0), ground: S3.hall.z }], ['rusher', null, { from: S3.hall.p(430, 110, 0), ground: S3.hall.z }]] },
    { after: 'clear', spawn: [['grenadier', 'u1', { entry: 'stand' }], ['rocketeer', 'u2', { entry: 'stand' }], ['redtide', 'c3', { entry: 'roll' }], ['quartermaster', null, { route: [S3.hall.p(300, 140, 0), S3.hall.p(300, 0, 0), S3.hall.p(300, -140, 0)], drop: 'sg', speed: 55 }]] } ],
  objects: [['tank', S3.hall.p(240, -130, 0)], ['tank', S3.hall.p(170, 120, 0)], ['tank', S3.hall.p(350, -20, 58)], ['intel', S3.hall.p(328, -60, 68), { intel: 'i3b' }]],
  allies: [{ agent: 'rook', at: S3.hall.p(60, 130, 0), facing: 0 }],
  cues: [{ at: 0, say: ['rook', 'Turbine hall. Mind the fans.'] }, { at: 6, say: ['juno', 'Coolant tanks—stay clear. Unless the bad guys are closer.'] }],
  dyn(R, sim, view) { for (const [d, l] of [[140, 90], [260, 90], [380, 90]]) { const p = S3.hall.p(d, l, 34); R.drawMesh({ mesh: TC.mesh('turbine'), x: p[0], y: p[1], z: p[2], yaw: view.t * 3 + d }); if (fxRand() < .15) FX.add({ p: S3.hall.p(d - 40, l - 60, 0), v: [0, 0, 30], rgb: [230, 235, 240], size: 4, grow: 8, life: 1.4, mode: 'alpha', alpha: .5 }); } } });

// ---------------------------------------------------------------- 3-5 HELIPAD: SCYLLA
def('scene', '3-5', { title: 'TOWER ROOF', time: 90, boss: 'scylla', enter: rise(3),
  arrive: { path: [S3.hall.p(0, 0, 24), S3.hall.p(380, -20, 24), S3.hall.p(500, -40, 40), [1960, -120, 120], S3.roof.p(-140, -60, 50), S3.roof.p(-40, 0, 24), S3.roof.p(0, 0, 24)], speed: 170 },
  slots: sl35, scyllaAt: S3.roof.p(250, 0, 0),
  covers: {},
  cues: [] });
// ---------------------------------------------------------------- 3-6 CONTROL ROOM: ADMIRAL KRAKE
def('scene', '3-6', { title: 'CONTROL ROOM', time: 90, boss: 'krake', enter: rise(4),
  arrive: { path: [S3.roof.p(0, 0, 24), S3.roof.p(-60, 60, 24), [S3.ctrl.x, S3.ctrl.y - 160, S3.ctrl.z + 24], S3.ctrl.p(-40, 0, 24), S3.ctrl.p(0, 0, 24)], speed: 140 },
  slots: sl36,
  krake: { spots: [S3.ctrl.p(166, -90, 0), S3.ctrl.p(166, 0, 0), S3.ctrl.p(166, 90, 0), S3.ctrl.p(246, -50, 0), S3.ctrl.p(246, 50, 0)], lever: S3.ctrl.p(286, 120, 40), minions: ['m1', 'm2'] },
  covers: covers(S3.ctrl, { m1: [166, -50, 20, ['up']], m2: [166, 50, 20, ['up']] }),
  cues: [{ at: .5, say: ['krake', 'So. The little agents reach the bridge of my storm.'] }] });

def('cutscene', 'c3-intro', { actors: [{ id: 'kai', at: S3.crest.p(-180, -8, 0), facing: 0 }, { id: 'rook', at: S3.crest.p(-190, 14, 0), facing: .1 }, { id: 'mari', at: S3.crest.p(-196, -24, 0), facing: -.1 }],
  steps: [{ music: 'tidewall' },
    { cam: [cam(0, S3.crest.p(-80, -120, 60), S3.crest.p(-190, 0, 20)), cam(9, S3.crest.p(-110, -100, 40), S3.crest.p(-190, 0, 20))] },
    { say: ['krake', 'Look at the sea, CREST. It rises for me.'], screen: true },
    { say: ['krake', 'At dawn, Port Lumen returns to the deep!'], screen: true },
    { cam: [cam(0, S3.crest.p(-150, 10, 24), S3.crest.p(-182, -8, 24)), cam(8, S3.crest.p(-146, 14, 24), S3.crest.p(-182, -8, 24))] },
    { say: ['kai', 'Not on our watch.'] }, { say: ['rook', 'Did you rehearse that?'] }, { say: ['kai', '…Maybe.'] }] });
def('cutscene', 'c3-ending', { actors: [{ id: 'krake', at: S3.ctrl.p(200, 0, 0), facing: Math.PI / 2 + Math.PI, pose: 'kneel' }, { id: 'mari', at: S3.ctrl.p(170, 30, 0), facing: -1.8 }, { id: 'kai', at: S3.ctrl.p(160, -20, 0), facing: 1.2 }, { id: 'rook', at: S3.ctrl.p(140, 40, 0), facing: -.6 }, { id: 'juno', at: S3.ctrl.p(120, -60, 0), facing: .4 }],
  steps: [{ music: 'ending' },
    { cam: [cam(0, S3.ctrl.p(60, 0, 40), S3.ctrl.p(200, 0, 20)), cam(10, S3.ctrl.p(90, 10, 34), S3.ctrl.p(200, 0, 20))] },
    { say: ['juno', 'All forty gates closing! You did it!'] },
    { say: ['mari', "Silas Krake, you're under arrest by the Lumen Coast Guard."] },
    { say: ['krake', 'The tide will turn again.'] },
    { say: ['rook', "Twice a day. It's called science."] },
    { cam: [cam(0, S3.ctrl.p(200, 0, 40), S3.ctrl.p(400, 0, 60)), cam(10, S3.ctrl.p(230, 0, 44), S3.ctrl.p(420, 0, 70))] },
    { say: ['hale', 'Outstanding work, agents. Port Lumen owes you its dawn.'] },
    { say: ['kai', 'Tell the festival to save us some lanterns.'] },
    { say: ['rook', 'Kid. No puns at the debriefing.'] },
    { say: ['kai', 'No promises.'] }] });

// ===== 34-range.js
// 34-range: TRAINING, the CREST RANGE. Juno instructs four drills that teach every mechanic: R-1 AIM & FIRE (pop-up
// cut-outs), R-2 COVER & RELOAD (the turret robot telegraphs three shots; reload in cover), R-3 WEAPONS (an orange
// vest's ammo, drones for the machine gun, a shield for the shotgun, a crate stack for the grenade launcher), R-4 READ
// THE CRISIS (a Red Tide cut-out, a grenade to shoot down, a civilian cut-out, then 8 targets against the clock).

const RG = F(0, 0, 0, 0), slR = RG.slots({ gap: 22 });
def('stage', 'R', { name: 'CREST RANGE', place: 'CREST HQ, sublevel 2', clock: '--:--', music: 'range', amb: 'range',
  env: { sky: { stops: ['#14161c', '#1a1d24', '#20242c'], stars: false }, fog: ['#1a1d24', 500, 1400], ambient: .55, ambientColor: '#e0e4f0', sun: { dir: [0, 0, 1], color: '#ffffff', k: .35 } },
  build(G) {
    G.push(RG.x, RG.y, RG.z, RG.yaw);
    G.box(-60, -160, -2, 460, 160, 0, 'concrete', { surf: 'concrete' });
    G.box(-60, -162, 0, 460, -160, 110, 'rangewall'); G.box(-60, 160, 0, 460, 162, 110, 'rangewall'); G.box(458, -160, 0, 460, 160, 110, 'rangewall'); G.box(-62, -160, 0, -60, 160, 110, 'rangewall');
    G.box(-60, -160, 110, 460, 160, 112, 'steel', { collide: false, bottom: true });
    for (const l of [-90, -30, 30, 90]) G.box(40, l - 2, 0, 400, l + 2, 12, 'concrete-dark', { surf: 'concrete' });
    for (let d = 40; d < 460; d += 60) { G.box(d, -150, 104, d + 30, 150, 108, 'lamp', { collide: false }); G.light(d + 15, 0, 100, 220, .5, '#f0f4ff'); }
    for (const [d, l] of [[340, -120], [340, 0], [340, 120]]) G.box(d - 6, l - 20, 0, d + 6, l + 20, 26, 'plywood', { surf: 'wood' });
    G.box(456, -60, 30, 457.5, 60, 60, 'screen-teal', { collide: false });
    G.pop();
    PF.slotProp(G, slR[0], 'sandbags'); PF.slotProp(G, slR[1], 'sandbags');
  },
  scenes: ['R-1', 'R-2', 'R-3', 'R-4'] });
const rc = (d, l) => RG.p(d, l, 0);
const cut = (d, l, o = {}) => ['cutout', null, Object.assign({ at: rc(d, l), entry: 'stand', stay: 1 }, o)];
def('scene', 'R-1', { title: 'AIM & FIRE', time: 60,
  slots: slR, covers: {},
  waves: [{ at: .5, spawn: [cut(140, -60), cut(180, 20), cut(220, -100), cut(260, 60), cut(300, -20), cut(240, 110)] }],
  cues: [{ at: 0, say: ['juno', 'Welcome to the range, agent. Shoot every cut-out.'] }, { at: 0, prompt: 'aim' }, { on: 'clear', say: ['juno', 'Nice grouping! Next: cover.'] }] });
def('scene', 'R-2', { title: 'COVER & RELOAD', time: 60,
  slots: slR, covers: {},
  waves: [{ at: .5, spawn: [['turret', null, { at: rc(300, 0), entry: 'stand', shots: 3, target: 0 }]] }, { after: 'clear', spawn: [cut(160, -40), cut(200, 40), cut(240, -80), cut(260, 80)] }],
  enter: sim => { sim.flags.reloadsAt = sim.players[0].stats.saves; },
  cues: [{ at: 0, say: ['juno', 'That turret telegraphs every shot. Red ring means DUCK.'] }, { at: 0, prompt: 'cover' }, { at: 8, prompt: 'reload' }, { at: 8, say: ['juno', 'Empty the magazine, then reload in cover.'] }],
  objective: sim => { const t = sim.enemies.find(e => e.type === 'turret'); return !t || t.done; },
  step(sim) { const t = sim.enemies.find(e => e.type === 'turret'); if (t && t.done && !t.gone) { t.gone = true; sim.say('juno', 'Cover works! Now the targets.'); } } });
def('scene', 'R-3', { title: 'WEAPONS', time: 75,
  slots: slR, covers: covers(RG, { s1: [330, 0, 26, ['up']] }),
  waves: [
    { at: .5, spawn: [['quartermaster', null, { route: [rc(250, -150), rc(250, 150)], drop: 'mg', speed: 45, noFire: true }]], say: ['juno', 'Orange vest! Drop him for machine-gun ammo.'] },
    { after: 'clear', spawn: [0, 1, 2].map(k => ['drone', null, { at: RG.p(220 + k * 30, -40 + k * 40, 50), noFire: true }]), say: ['juno', 'Switch to the machine gun and shred those drones.'] },
    { after: 'clear', spawn: [['shield', null, { route: [rc(360, 0), rc(300, 0)], noFire: true }]], say: ['juno', 'Shield! Shotgun knocks it aside.'], id: 'sh' },
    { after: 'sh', spawn: [cut(400, -36), cut(410, 36), ['marine', 's1', { entry: 'stand', noFire: true }]], say: ['juno', 'Grenade launcher on the crates—boom.'] } ],
  objects: [['crate', rc(330, -60), { size: [16, 16, 16] }], ['crate', rc(330, 60), { size: [16, 16, 16] }]],
  cues: [{ at: 0, prompt: 'switch' }, { on: 'spawn:shield', fn: sim => { for (const p of sim.players) sim.giveAmmo(p, 'sg', 8); } }],
  step(sim) { const w = sim.waves.find(x => x.id === 'sh'); if (w && w.fired && !sim.flags.glGiven && sim.enemies.filter(e => !e.dead && e.type === 'shield').length === 0) { sim.flags.glGiven = true; for (const p of sim.players) sim.giveAmmo(p, 'gl', 2); } } });
def('scene', 'R-4', { title: 'READ THE CRISIS', time: 40,
  slots: slR, covers: covers(RG, { r1: [300, -120, 26, ['up']], r2: [300, 120, 26, ['up']] }),
  waves: [
    { at: .5, spawn: [['redtide', 'r1', { entry: 'stand' }]], say: ['juno', "Red Tide never misses. Kill him first—or duck!"] },
    { after: 'clear', spawn: [['grenadier', 'r2', { entry: 'stand' }]], say: ['juno', 'Grenade! Shoot it out of the air!'] },
    { after: 'clear', spawn: [cut(200, 0, { civ: true, noClear: true, look: 0 }), cut(180, -70), cut(220, 70)], say: ['juno', "The blue one's a civilian. DON'T shoot it."] },
    { after: 'clear', id: 'timed', spawn: [cut(140, -100, { stay: 0 }), cut(170, 0, { stay: 0 }), cut(200, 100, { stay: 0 }), cut(230, -50, { stay: 0 }), cut(260, 50, { stay: 0 }), cut(290, -110, { stay: 0 }), cut(320, 0, { stay: 0 }), cut(350, 110, { stay: 0 })], say: ['juno', 'Final drill: eight targets. Beat the clock!'] } ],
  cues: [{ on: 'clear', say: ['juno', "Training complete! You're ready, agent."] }],
  step(sim) { const w = sim.waves.find(x => x.id === 'timed'); if (w && w.fired && !sim.flags.timedT) { sim.flags.timedT = true; sim.timer = 20 * sim.diff.timeMul; sim.timeMax = sim.timer; } } });

// ===== 40-story.js
// 40-story: speakers (name, color, Humanoid look, voice), briefings, cutscene scripts (camera keys, actors, lines),
// and the intel notes. The writing follows the source's B-movie secret-agent tone with original lines. Reads: frames (31-33).

def('speaker', 'kai', { name: 'KAI', color: '#ff6a5a', voice: { base: 150, wave: 'sawtooth', rate: 11 }, rig: { build: 'heroic', size: 1.05, weapon: 'gun', outfit: 'coat', hair: 'short', sleeves: 'long', colors: { coat: '#2e3038', cloth: '#f2f2f2', trim: '#d81e1e', pants: '#26262c', hair: '#141418', skin: '#d8a478', boot: '#111', metal: '#30343c' } } });
def('speaker', 'rook', { name: 'ROOK', color: '#6aa8ff', voice: { base: 105, wave: 'sawtooth', rate: 9, fx: 'gravel' }, rig: { build: 'bulky', size: 1.1, weapon: 'gun', outfit: 'coat', hair: 'bald', sleeves: 'long', colors: { coat: '#6a4428', cloth: '#2a5ab0', pants: '#2a2a30', skin: '#c08a68', boot: '#1a120a', metal: '#2a2e36' } } });
def('speaker', 'mari', { name: 'MARI', color: '#6aff9a', voice: { base: 230, wave: 'square', rate: 12 }, rig: { build: 'heroic', size: 1, weapon: 'gun', outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { coat: '#ff7a2a', cloth: '#f4f4f4', trim: '#22c55e', pants: '#24303a', hair: '#2a1a10', skin: '#c88a5e', boot: '#111' } } });
def('speaker', 'juno', { name: 'JUNO', color: '#ffd84a', voice: { base: 200, wave: 'square', rate: 13, fx: 'radio' }, rig: { build: 'chibi', size: 1, weapon: 'gun', outfit: 'shirt', hair: 'spiky', hat: { style: 'band', color: '#f5b700' }, colors: { cloth: '#f5b700', pants: '#2a2a40', hair: '#2ad0c0', skin: '#e8c098', boot: '#222' } } });
def('speaker', 'hale', { name: 'DIRECTOR HALE', color: '#c8d0e8', voice: { base: 175, wave: 'triangle', rate: 10, fx: 'radio' }, rig: { build: 'heroic', size: 1, weapon: null, outfit: 'coat', hair: 'long', colors: { coat: '#5a6070', cloth: '#e8e8f0', hair: '#d8dce8', skin: '#e0b896', pants: '#3a3e48' } } });
def('speaker', 'tejada', { name: 'DR. TEJADA', color: '#e8e8e8', voice: { base: 140, wave: 'triangle', rate: 9 }, rig: { build: 'heroic', size: .98, weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#f0f0f0', cloth: '#7aa0c8', hair: '#a8a8a8', skin: '#c89a74', pants: '#4a4a52' } } });
def('speaker', 'krake', { name: 'ADMIRAL KRAKE', color: '#ffcf5a', voice: { base: 95, wave: 'sawtooth', rate: 8, fx: 'boom' }, rig: { build: 'heroic', size: 1.15, weapon: 'gun', outfit: 'coat', hair: 'long', hat: { style: 'cap', color: '#141c34' }, cape: { len: 8, width: 6, seg: 2.5 }, sleeves: 'long', colors: { coat: '#18224a', cloth: '#18224a', trim: '#e8b82a', hair: '#f2f2f2', skin: '#d8b090', pants: '#141a34', cape: '#101830', capeIn: '#8a1a1a', boot: '#0a0a10', metal: '#c8a030' } } });
def('speaker', 'barracuda', { name: 'BARRACUDA', color: '#5ae0d8', voice: { base: 210, wave: 'square', rate: 13 }, rig: { build: 'heroic', size: 1.05, weapon: 'sword', bladeLen: 12, outfit: 'shirt', hair: 'ponytail', sleeves: 'long', armor: true, colors: { cloth: '#1a7a7a', plate: '#2a4a5a', pants: '#14444a', hair: '#f4f4f4', skin: '#d8a880', boot: '#0a1a1a', metal: '#d8e0f0' } } });
def('speaker', 'hammer', { name: 'HAMMERHEAD', color: '#ff9a4a', voice: { base: 80, wave: 'sawtooth', rate: 6, fx: 'gravel' }, rig: { build: 'bulky', size: 1.6, weapon: 'rifle', gunLen: 12, outfit: 'shirt', hat: 'helmet', armor: true, sleeves: 'long', colors: { cloth: '#3a3e48', plate: '#5a606c', pants: '#2a2c34', hat: '#6a707c', skin: '#c08a68', boot: '#111', metal: '#20242a' } } });
def('speaker', 'gull', { name: 'THE GULL', color: '#b8c0d0', voice: { base: 190, wave: 'triangle', rate: 10 }, rig: { build: 'heroic', size: 1, weapon: 'rifle', gunLen: 14, outfit: 'coat', hood: true, colors: { coat: '#6a6e76', cloth: '#5a5e66', hair: '#4a4e56', skin: '#c8a080', pants: '#3a3e46' } } });
def('speaker', 'worker', { name: 'DOCK WORKER', color: '#d8c890', voice: { base: 130, wave: 'square', rate: 12 }, rig: { build: 'bulky', size: 1, weapon: null, outfit: 'shirt', hat: 'cap', colors: { cloth: '#c89a3a', hat: '#f2c12e', pants: '#3a4a6a', skin: '#c08a68' } } });
def('speaker', 'fisher', { name: 'FISHERMAN', color: '#ffe04a', voice: { base: 120, wave: 'square', rate: 12 }, rig: { build: 'heroic', size: 1, weapon: null, outfit: 'coat', hat: 'cap', colors: { coat: '#f2d02e', hat: '#f2d02e', pants: '#2a3a4a', skin: '#b07850' } } });
def('speaker', 'captor', { name: 'RED TIDE', color: '#ff4a4a', voice: { base: 120, wave: 'sawtooth', rate: 12, fx: 'gravel' }, rig: { build: 'heroic', weapon: 'gun', outfit: 'coat', hat: { style: 'band', color: '#b0141e' }, colors: { coat: '#b4161e', cloth: '#a81e22', skin: '#2a1a1a', pants: '#2a1012' } } });

// ---------------------------------------------------------------- briefings (pages over the map of the Lumen Isles)
def('briefing', 'b1', { stage: 1, objectives: ['Land at Lantern Pier', 'Find Krake\'s signal', 'Stop the gunboat Stingray'], lines: [
  ['hale', 'Agents. Two hours ago the Black Current seized Port Lumen\'s harbor and the Tidewall.'],
  ['hale', 'Their leader is Silas Krake. A disgraced admiral with a grudge the size of an ocean.'],
  ['juno', 'He\'ll open the floodgates at dawn. King tide. The whole city goes under.'],
  ['hale', 'You have until 06:00. Land at Lantern Pier. Find his signal. End this.'],
  ['kai', 'Understood. CREST is on it.']] });
def('briefing', 'b2', { stage: 2, objectives: ['Climb to Lighthouse Point', 'Rescue Dr. Tejada', 'Silence the relay'], lines: [
  ['hale', 'The lighthouse relays Krake\'s commands to the whole fleet.'],
  ['juno', 'Take it out and his ships go deaf. Also, it\'s raining. A lot.']] });
def('briefing', 'b3', { stage: 3, objectives: ['Jam the sluice gates', 'Reach the control tower', 'Stop Admiral Krake'], lines: [
  ['hale', 'This is it, agents. Jam the gates, reach the tower, stop Krake.'],
  ['juno', 'And maybe don\'t fall in. The water\'s rising.']] });

// ---------------------------------------------------------------- cutscenes

def('cutscene', 'c1-intro', { actors: [
    { id: 'mari', at: S1.pier.p(-236, 34, -12), facing: 0 }, { id: 'kai', at: S1.pier.p(-222, 26, -12), facing: .3 }, { id: 'rook', at: S1.pier.p(-226, 46, -12), facing: -.2 }],
  steps: [
    { music: 'theme' },
    { cam: [cam(0, S1.pier.p(-420, 200, 20), S1.pier.p(-230, 36, 0)), cam(4, S1.pier.p(-300, 110, 14), S1.pier.p(-230, 36, 4)), cam(9, S1.pier.p(-270, 70, 10), S1.pier.p(-226, 34, 6))] },
    { say: ['mari', 'Hang on! Lumen Coast Guard express—next stop, trouble!'] },
    { cam: [cam(0, S1.pier.p(200, -40, 40), S1.pier.p(480, -140, 92)), cam(8, S1.pier.p(260, -60, 50), S1.pier.p(480, -140, 92))] },
    { say: ['krake', 'Citizens of Port Lumen! Enjoy your lanterns. They are the last lights you will see.'], screen: true },
    { say: ['krake', 'At dawn the king tide comes, and I open every gate. The sea takes back what you stole!'], screen: true },
    { cam: [cam(0, S1.pier.p(-200, 50, 6), S1.pier.p(-226, 34, 12)), cam(8, S1.pier.p(-196, 40, 8), S1.pier.p(-226, 34, 12))] },
    { say: ['rook', 'Charming guy.'] },
    { say: ['kai', 'Let\'s make some waves.'] },
    { say: ['rook', 'Kid, you say that every mission.'] }] });
def('cutscene', 'c1-outro', { actors: [{ id: 'kai', at: S1.mouth.p(0, -10, 8), facing: -1.2 }, { id: 'mari', at: S1.mouth.p(-20, 10, 8), facing: -1.4 }, { id: 'rook', at: S1.mouth.p(10, 14, 8), facing: -1.8 }],
  steps: [
    { cam: [cam(0, S1.mouth.p(80, 80, 30), S1.mouth.p(0, 0, 20)), cam(10, S1.mouth.p(60, 60, 26), S1.mouth.p(0, 0, 20))] },
    { say: ['juno', 'Krake\'s signal is coming from Lighthouse Point.'] },
    { say: ['mari', 'Gull\'s Rest. They\'ve held my father there since yesterday.'] },
    { say: ['kai', 'Then that\'s where we\'re going.'] },
    { say: ['rook', 'Into a storm. Naturally.'] }] });


def('intel', 'i1a', { stage: 1, note: 'Note to self: never trust a fish that winks. —J.' });
def('intel', 'i1b', { stage: 1, note: 'Lantern Festival rota: Rook on fireworks. Again. Nobody tell him.' });
def('intel', 'i2a', { stage: 2, note: 'Krake\'s coffee order: black, like the Current. Two sugars.' });
def('intel', 'i2b', { stage: 2, note: 'Hammerhead\'s door is not a door. Do not mention the door.' });
def('intel', 'i3a', { stage: 3, note: 'Tidewall staff memo: the big red lever is NOT a coat hook.' });
def('intel', 'i3b', { stage: 3, note: 'Scylla maintenance log: knees creak. Again. Order more grease.' });

// ===== 41-voice.js
// 41-voice: the gibberish voice synth (Animalese / Simlish style). The text splits into syllables; vowels drive a
// sawtooth or square source through two band-pass formant filters, consonants add short filtered noise by class
// (plosive clicks, fricative hiss, nasal hum, liquid glides); pitch follows the speaker, the sentence contour (falling
// at '.', rising at '?', louder and higher in CAPS or '!'), with a per-letter jitter seeded by the text, so a line
// always sounds the same. Per-speaker effects: radio (band-limited with crackle), boom (low, with a short echo),
// gravel (amplitude-modulated). Headless it schedules nothing and returns the line's duration.
// Reads: game.audio (its context and the effects bus: engine patch 3), speakers (40).

const FORM = { a: [800, 1200], e: [400, 2000], i: [300, 2300], o: [450, 800], u: [325, 700], y: [300, 1900] };
const Voice = {
  active: [], barks: 0,
  syllables(text) { const out = []; const re = /([^aeiouy\s.,!?…—-]*)([aeiouy]+)/gi; let m; while ((m = re.exec(text))) out.push({ c: m[1].toLowerCase(), v: m[2][0].toLowerCase(), caps: m[0] === m[0].toUpperCase() && /[A-Z]/.test(m[0]), at: m.index }); return out; },
  duration(text, spk) { const v = spk && spk.voice || { rate: 10 }; const syl = this.syllables(text).length, pauses = (text.match(/[,…—]/g) || []).length * .12 + (text.match(/[.!?]/g) || []).length * .25; return syl / (v.rate || 10) + pauses; },
  say(game, text, speakerId, o = {}) {
    const spk = has('speaker', speakerId) ? get('speaker', speakerId) : null, V = spk ? spk.voice : { base: 160, wave: 'square', rate: 10 };
    const dur = this.duration(text, spk);
    const A = game && game.audio, ctx = A && A.ctx; if (!ctx || A.muted) return dur;
    if (o.bark) { if (this.barks >= 4) return dur; } else { this.active = this.active.filter(x => x.end > ctx.currentTime); if (this.active.length >= 2) this.active.shift().stop(); }
    const bus = A.bus ? A.bus('sfx') : null; if (!bus) return dur;
    const out = ctx.createGain(); out.gain.value = (o.vol || 1) * .55;
    // the per-speaker effect chain
    let head = out;
    if (V.fx === 'radio') { const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000; const sh = ctx.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); } sh.curve = curve; out.connect(hp); hp.connect(lp); lp.connect(sh); head = sh; }
    else if (V.fx === 'boom') { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; const dl = ctx.createDelay(); dl.delayTime.value = .09; const fb = ctx.createGain(); fb.gain.value = .32; out.connect(lp); lp.connect(dl); dl.connect(fb); fb.connect(dl); const mix = ctx.createGain(); lp.connect(mix); dl.connect(mix); head = mix; }
    else if (V.fx === 'gravel') { const am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 40; lg.gain.value = .35; lfo.connect(lg); lg.connect(am.gain); am.gain.value = .75; out.connect(am); lfo.start(); lfo.stop(ctx.currentTime + dur + .5); head = am; }
    head.connect(bus);
    const R = mkRng(hashStr(text + speakerId)), syl = this.syllables(text), t0 = ctx.currentTime + .03, sl = 1 / (V.rate || 10);
    let t = t0; const end = text.trim().slice(-1), shout = /!/.test(text) || (text === text.toUpperCase() && /[A-Z]{3}/.test(text));
    syl.forEach((s, i) => {
      const u = i / Math.max(1, syl.length - 1), contour = end === '?' ? 1 + u * .25 : 1 - u * .12, f0 = V.base * contour * (shout || s.caps ? 1.25 : 1) * (1 + (R() - .5) * .12);
      const d = sl * (.75 + R() * .5), [f1, f2] = FORM[s.v] || FORM.a;
      // the vowel: a source through two formants
      const osc = ctx.createOscillator(); osc.type = V.wave || 'sawtooth'; osc.frequency.setValueAtTime(f0, t); osc.frequency.linearRampToValueAtTime(f0 * (1 + (R() - .5) * .08), t + d);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((shout ? .5 : .36), t + .012); g.gain.setValueAtTime((shout ? .45 : .32), t + d * .7); g.gain.linearRampToValueAtTime(0, t + d);
      for (const [f, q, k] of [[f1, 7, 1], [f2, 9, .6]]) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (V.base > 190 ? 1.12 : 1); bp.Q.value = q; const gk = ctx.createGain(); gk.gain.value = k * 2.2; osc.connect(bp); bp.connect(gk); gk.connect(g); }
      g.connect(out); osc.start(t); osc.stop(t + d + .02);
      // the consonant
      const c = s.c.slice(-1);
      if (c) {
        const n = ctx.createBufferSource(); n.buffer = A._noise; const nf = ctx.createBiquadFilter(), ng = ctx.createGain();
        let cd = .012, freq = 2500, type = 'bandpass', vol = .25;
        if ('ptkbdgqc'.includes(c)) { cd = .014; freq = 'pt'.includes(c) ? 3200 : 1400; vol = .35; }
        else if ('sfhzxj'.includes(c)) { cd = .04; freq = c === 's' || c === 'z' ? 6000 : 3500; type = 'highpass'; vol = .18; }
        else if ('mn'.includes(c)) { cd = .03; freq = 300; type = 'lowpass'; vol = .3; }
        else if ('lrw'.includes(c)) { cd = .02; freq = 900; vol = .12; }
        nf.type = type; nf.frequency.value = freq; ng.gain.setValueAtTime(vol, t); ng.gain.exponentialRampToValueAtTime(.001, t + cd);
        n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t, R() * .5); n.stop(t + cd + .01);
      }
      t += d;
      const after = text.slice(s.at, (syl[i + 1] || { at: text.length }).at);
      if (/[,…—]/.test(after)) t += .12; if (/[.!?]/.test(after)) t += .25;
    });
    const h = { end: t, stop() { try { out.gain.setValueAtTime(0, ctx.currentTime); } catch (e) { /* already ended */ } } };
    if (o.bark) { this.barks++; setTimeout(() => this.barks--, (t - t0) * 1000 + 50); } else this.active.push(h);
    return dur;
  },
  bark(game, kind, base = 130) {
    const pools = { hurt: ['Ugh!', 'Hnn!', 'Agh!'], die: ['Aaagh!', 'Nooo!', 'Uwaa!'], spot: ['Hraa!', 'There!', 'Fire!'], reload: ['Reloading!'], cheer: ['Yeah!', 'Hah!'] };
    const list = pools[kind] || pools.hurt, R = fxRand, line = list[(R() * list.length) | 0];
    return this.say(game, line, null, { bark: true, vol: .7, base });
  },
  stopAll() { for (const h of this.active) h.stop(); this.active = []; }
};
TC.Voice = Voice;

// ===== 42-audio.js
// 42-audio: every song (the engine tracker, written as note strings by small composing helpers), every sound effect
// (engine voices: noise bursts with falling filters, sine thumps, chirps), stage ambience (small Web Audio graphs on
// the effects bus: surf, crowd, rain, sluices) and the spatial mix (pan by screen x is approximated by volume and
// pitch; volume by distance). Reads: game.audio. Registered as 'song' and 'sfx' so the validators check names.

// ---- composing helpers: one bar = 16 steps
const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const nOf = (name) => { const m = /^([A-G]#?)(\d)$/.exec(name); return NOTE.indexOf(m[1]) + (+m[2] + 1) * 12; };
const nName = (n) => NOTE[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
const tr = (name, semis) => nName(nOf(name) + semis);
// a bar from a rhythm ('x' = note, '-' = hold, '.' = rest) cycling through notes
function bar(rhythm, notes) { let i = 0; return rhythm.split('').filter(c => c !== ' ').map(c => c === 'x' ? notes[i++ % notes.length] : c).join(' '); }
const bars = (list) => list.join(' | ');
// chord tones of a root (minor or major triad, an octave)
const triad = (root, minor) => [root, tr(root, minor ? 3 : 4), tr(root, 7), tr(root, 12)];
function song(spec) { def('song', spec.id, spec); return spec; }

const PROG_THEME = [['D3', 1], ['A#2', 0], ['C3', 0], ['A2', 0]];
song({ id: 'theme', bpm: 140, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: bars(PROG_THEME.map(([r]) => bar('x.x.x.xx.xx.x.x.', [r, tr(r, 12)]))) },
  { name: 'arp', wave: 'pulse12', vol: .05, notes: bars(PROG_THEME.map(([r, m]) => bar('xxxxxxxxxxxxxxxx', triad(tr(r, 12), m).concat(triad(tr(r, 12), m).slice(1, 3).reverse())))) },
  { name: 'lead', wave: 'pulse', vol: .08, notes: bars(['D5 - - - F5 - A5 - - - G5 - F5 - E5 -', 'F5 - - - D5 - - - A#4 - - - D5 - F5 -', 'E5 - - - G5 - C6 - - - A#5 - A5 - G5 -', 'A5 - - - - - - - E5 - C#5 - E5 - A5 -']) },
  { name: 'drums', wave: 'drums', vol: .3, notes: bars(['k . h . s . h k k . h . s . h h', 'k . h . s . h k k . h . s . o .', 'k . h . s . h k k . h . s . h h', 'k . h . s . h k k k s . s s s s']) }] });
song({ id: 'briefing', bpm: 90, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .09, notes: bars(['D4 - - - - - - - - - - - - - - -', 'A#3 - - - - - - - - - - - - - - -', 'C4 - - - - - - - - - - - - - - -', 'A3 - - - - - - - - - - - - - - -']) },
  { name: 'pulse', wave: 'pulse12', vol: .04, notes: bars(PROG_THEME.map(([r, m]) => bar('x...x...x...x.x.', triad(tr(r, 12), m)))) },
  { name: 'drums', wave: 'drums', vol: .18, notes: bars(['h . h . h . h . h . h . h . h .', 'h . h . h . h . h . h . h . h h']) }] });
const PROG_HARBOR = [['E3', 1], ['C3', 0], ['D3', 0], ['B2', 0]];
song({ id: 'harbor', bpm: 150, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: bars(PROG_HARBOR.map(([r]) => bar('x..x..x.x..x..x.', [r, r, tr(r, 7), r, tr(r, 12)]))) },
  { name: 'chords', wave: 'square', vol: .035, notes: bars(PROG_HARBOR.map(([r, m]) => bar('.x.x.x.x.x.x.x.x', triad(tr(r, 12), m).slice(1)))) },
  { name: 'lead', wave: 'pulse', vol: .075, on: false, notes: bars(['E5 - G5 - B5 - - A5 G5 - E5 - D5 - E5 -', 'C5 - E5 - G5 - - F5 E5 - C5 - D5 - E5 -', 'D5 - F#5 - A5 - - G5 F#5 - D5 - E5 - F#5 -', 'B4 - D#5 - F#5 - - - B5 - A5 - F#5 - D#5 -']) },
  { name: 'drums', wave: 'drums', vol: .3, on: false, notes: bars(['k . c k s . c . k . c k s . c c', 'k . c k s . c . k k c . s . o .']) },
  { name: 'clave', wave: 'drums', vol: .16, notes: bars(['t . . t . . t . . . t . t . . .']) }] });
const PROG_STORM = [['A2', 1], ['F2', 0], ['G2', 0], ['E2', 0]];
song({ id: 'storm', bpm: 160, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .11, notes: bars(PROG_STORM.map(([r]) => bar('x.xxx.xxx.xxx.xx', [r, r, tr(r, 12)]))) },
  { name: 'lead', wave: 'square', vol: .065, on: false, notes: bars(['A4 - C5 - E5 - - - D5 - C5 - B4 - C5 -', 'A4 - - - F4 - A4 - C5 - - - A4 - F4 -', 'G4 - B4 - D5 - - - C5 - B4 - G4 - B4 -', 'G#4 - - - B4 - - - E5 - - - D5 - B4 -']) },
  { name: 'pad', wave: 'triangle', vol: .07, notes: bars(PROG_STORM.map(([r, m]) => bar('x---------------', [triad(tr(r, 12), m)[1]]))) },
  { name: 'drums', wave: 'drums', vol: .32, on: false, notes: bars(['k . h k s . h . k k h . s . h h', 'k . h k s . h . k k h . s o s s']) }] });
const PROG_TIDE = [['F3', 0], ['C3', 0], ['D3', 1], ['A#2', 0], ['F3', 0], ['C3', 0], ['G3', 1], ['C3', 0]];
song({ id: 'tidewall', bpm: 155, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .1, notes: bars(PROG_TIDE.map(([r]) => bar('x.x.x.x.x.x.x.xx', [r, tr(r, 12)]))) },
  { name: 'arp', wave: 'pulse12', vol: .04, notes: bars(PROG_TIDE.map(([r, m]) => bar('xxxxxxxxxxxxxxxx', triad(tr(r, 12), m)))) },
  { name: 'lead', wave: 'pulse', vol: .08, on: false, notes: bars(['F5 - - - A5 - C6 - - - A5 - G5 - F5 -', 'E5 - - - G5 - - - C6 - - - G5 - E5 -', 'D5 - - - F5 - A5 - - - F5 - E5 - D5 -', 'D5 - - - F5 - - - A#5 - - - A5 - F5 -', 'F5 - A5 - C6 - - - D6 - C6 - A5 - F5 -', 'G5 - - - E5 - - - C5 - - - E5 - G5 -', 'G5 - A#5 - D6 - - - C6 - A#5 - A5 - G5 -', 'E5 - - - - - - - G5 - - - C6 - - -']) },
  { name: 'drums', wave: 'drums', vol: .3, on: false, notes: bars(['k . h . s . h k k . h . s . h h', 'k . h . s . h k k . h k s . o .']) }] });
const PROG_BOSS = [['C3', 1], ['C3', 1], ['G#2', 0], ['A#2', 0]];
song({ id: 'boss', bpm: 170, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: bars(PROG_BOSS.map(([r]) => bar('xxx.xxx.xx.xxx.x', [r, tr(r, 12), tr(r, 6)]))) },
  { name: 'lead', wave: 'square', vol: .07, notes: bars(['C5 - D#5 - G5 - F#5 - G5 - - - D#5 - C5 -', 'C5 - D#5 - G5 - A#5 - C6 - - - A#5 - G5 -', 'G#5 - - - G5 - - - D#5 - - - C5 - D#5 -', 'D5 - - - F5 - - - A#5 - - - D6 - - -']) },
  { name: 'drums', wave: 'drums', vol: .34, notes: bars(['k k s . k k s . k k s . k s s s']) }] });
const PROG_KING = [['D3', 1], ['A#2', 0], ['G2', 1], ['A2', 0]];
song({ id: 'kingtide', bpm: 165, steps: 4, tracks: [
  { name: 'bass', wave: 'saw', vol: .12, notes: bars(PROG_KING.map(([r]) => bar('x.xxx.xxx.xxx.xx', [r, tr(r, 12)]))) },
  { name: 'pad', wave: 'triangle', vol: .08, notes: bars(PROG_KING.map(([r, m]) => bar('x-------x-------', [triad(tr(r, 12), m)[2], triad(tr(r, 12), m)[1]]))) },
  { name: 'lead', wave: 'pulse', vol: .085, notes: bars(['D5 - - - A5 - - - F5 - G5 - A5 - - -', 'A#5 - - - A5 - - - F5 - D5 - F5 - - -', 'G5 - - - D6 - - - A#5 - A5 - G5 - - -', 'A5 - - - C#6 - - - E6 - - - A5 - - -']) },
  { name: 'drums', wave: 'drums', vol: .34, notes: bars(['k . s k k . s . k . s k k s s s', 'k . s k k . s . k k s . s s o .']) }] });
song({ id: 'range', bpm: 112, steps: 4, tracks: [
  { name: 'bass', wave: 'triangle', vol: .14, notes: bars(['E2 . E3 . . E2 G2 . A2 . A3 . G2 . D3 .', 'E2 . E3 . . E2 G2 . B2 . B3 . A2 . G2 .']) },
  { name: 'keys', wave: 'square', vol: .035, notes: bars(['. . G4 . . . G4 . . . A4 . . . G4 .', '. . G4 . . . G4 . . . B4 . . . A4 .']) },
  { name: 'drums', wave: 'drums', vol: .26, notes: bars(['k . h . s . h k . k h . s . h .']) }] });
song({ id: 'results', bpm: 120, steps: 4, tracks: [
  { name: 'arp', wave: 'pulse12', vol: .05, notes: bars([bar('xxxxxxxxxxxxxxxx', triad('F4', 0)), bar('xxxxxxxxxxxxxxxx', triad('A#3', 0)), bar('xxxxxxxxxxxxxxxx', triad('C4', 0)), bar('xxxxxxxxxxxxxxxx', triad('F4', 0))]) },
  { name: 'bass', wave: 'triangle', vol: .14, notes: bars(['F2 - - - F3 - - - F2 - - - C3 - - -', 'A#2 - - - A#3 - - - A#2 - - - F3 - - -', 'C3 - - - C4 - - - C3 - - - G3 - - -', 'F2 - - - C3 - - - F3 - - - - - - -']) },
  { name: 'drums', wave: 'drums', vol: .2, notes: bars(['k . h . s . h . k . h . s . h h']) }] });
song({ id: 'clear', bpm: 150, steps: 4, len: 32, tracks: [
  { wave: 'pulse', vol: .1, notes: 'C5 E5 G5 C6 - - G5 C6 E6 - - - - - - - | D6 - C6 - G5 - C6 - - - - - - - - -' },
  { wave: 'triangle', vol: .14, notes: 'C3 - - - G3 - - - C4 - - - - - - - | G3 - - - C3 - - - - - - - - - - -' }] });
song({ id: 'extra', bpm: 180, steps: 4, len: 16, tracks: [{ wave: 'square', vol: .09, notes: 'E5 G5 E6 C6 D6 G6 - - - - - - - - - -' }] });
song({ id: 'stinger', bpm: 120, steps: 4, len: 16, tracks: [{ wave: 'saw', vol: .1, notes: 'C3 - C#3 - - - C3 - - - - - - - - -' }, { wave: 'drums', vol: .4, notes: 'k . . . o . . . k . . . . . . .' }] });
song({ id: 'continue', bpm: 100, steps: 4, tracks: [{ name: 'tick', wave: 'pulse12', vol: .06, notes: bars(['A4 . . . A4 . . . A4 . . . A4 . . .', 'G#4 . . . G#4 . . . G#4 . . . G#4 . . .']) }, { name: 'pad', wave: 'triangle', vol: .09, notes: bars(['A3 - - - - - - - - - - - - - - -', 'G#3 - - - - - - - - - - - - - - -']) }] });
song({ id: 'gameover', bpm: 80, steps: 4, len: 32, tracks: [{ wave: 'triangle', vol: .14, notes: 'A4 - - - G4 - - - F4 - - - E4 - - - | D4 - - - - - - - - - - - - - - -' }, { wave: 'saw', vol: .06, notes: 'A2 - - - - - - - F2 - - - - - - - | D2 - - - - - - - - - - - - - - -' }] });
song({ id: 'ending', bpm: 84, steps: 4, tracks: [
  { name: 'pad', wave: 'triangle', vol: .1, notes: bars(PROG_THEME.map(([r, m]) => bar('x-------x-------', [triad(tr(r, 12), m)[1], triad(tr(r, 12), m)[2]]))) },
  { name: 'lead', wave: 'pulse12', vol: .07, notes: bars(['D5 - - - F5 - A5 - - - - - G5 - F5 -', 'F5 - - - D5 - - - - - - - D5 - F5 -', 'E5 - - - G5 - C6 - - - - - A#5 - A5 -', 'A5 - - - - - - - - - - - - - - -']) },
  { name: 'bass', wave: 'triangle', vol: .12, notes: bars(PROG_THEME.map(([r]) => bar('x-------x-------', [r, tr(r, 7)]))) }] });
TC.song = id => get('song', id);

// ---------------------------------------------------------------- sound effects
const SFX = {
  hg: [{ wave: 'noise', freq: 3200, to: 500, dur: .09, vol: .34, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 50, dur: .08, vol: .3 }, { wave: 'square', freq: 900, to: 300, dur: .03, vol: .06 }],
  mg: [{ wave: 'noise', freq: 2600, to: 700, dur: .06, vol: .26, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 50, dur: .05, vol: .22 }],
  sg: [{ wave: 'noise', freq: 1800, to: 200, dur: .25, vol: .45, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 35, dur: .2, vol: .4 }, { wave: 'noise', freq: 800, to: 1400, dur: .08, vol: .12, delay: .32 }, { wave: 'noise', freq: 1400, to: 800, dur: .06, vol: .12, delay: .42 }],
  gl: [{ wave: 'noise', freq: 600, to: 200, dur: .14, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 200, to: 80, dur: .14, vol: .3 }],
  empty: [{ wave: 'square', freq: 1600, to: 1200, dur: .03, vol: .1 }],
  reload: [{ wave: 'noise', freq: 2400, dur: .04, vol: .14 }, { wave: 'square', freq: 700, to: 500, dur: .04, vol: .08, delay: .1 }, { wave: 'noise', freq: 3000, dur: .05, vol: .16, delay: .2 }],
  switch: [{ wave: 'square', freq: 500, to: 800, dur: .05, vol: .08 }, { wave: 'noise', freq: 2400, dur: .04, vol: .1, delay: .05 }],
  coverIn: [{ wave: 'noise', freq: 900, to: 300, dur: .12, vol: .14 }, { wave: 'sine', freq: 90, to: 60, dur: .08, vol: .16, delay: .08 }],
  coverOut: [{ wave: 'noise', freq: 400, to: 1200, dur: .1, vol: .1 }],
  whizz: [{ wave: 'noise', freq: 5000, to: 1600, dur: .14, vol: .1, filter: 'bandpass', q: 3 }],
  ricochet: [{ wave: 'sine', freq: 2600, to: 1400, dur: .18, vol: .08 }, { wave: 'noise', freq: 4000, dur: .03, vol: .1 }],
  metal: [{ wave: 'square', freq: 1800, to: 900, dur: .05, vol: .08 }, { wave: 'noise', freq: 5000, dur: .03, vol: .1 }],
  wood: [{ wave: 'noise', freq: 900, to: 400, dur: .07, vol: .16 }],
  concrete: [{ wave: 'noise', freq: 1400, to: 600, dur: .06, vol: .14 }],
  water: [{ wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .14, filter: 'lowpass' }],
  glass: [{ wave: 'noise', freq: 6000, to: 3000, dur: .2, vol: .16, filter: 'highpass' }, { wave: 'sine', freq: 3200, to: 2400, dur: .1, vol: .05 }],
  ehit: [{ wave: 'noise', freq: 900, to: 300, dur: .06, vol: .2 }, { wave: 'square', freq: 220, to: 120, dur: .05, vol: .1 }],
  head: [{ wave: 'sine', freq: 1760, dur: .12, vol: .14 }, { wave: 'sine', freq: 2640, dur: .1, vol: .07, delay: .03 }],
  tick: [{ wave: 'square', freq: 1400, dur: .025, vol: .08 }],
  chirp: [{ wave: 'square', freq: 1200, to: 2400, dur: .07, vol: .12 }],
  hurt: [{ wave: 'noise', freq: 700, to: 150, dur: .3, vol: .4, filter: 'lowpass' }, { wave: 'saw', freq: 160, to: 60, dur: .3, vol: .2 }],
  timetick: [{ wave: 'square', freq: 980, dur: .03, vol: .07 }],
  extend: [{ wave: 'square', freq: 'C6', dur: .25, vol: .08, arp: [0, 4, 7, 12], step: .05 }],
  tidein: [{ wave: 'noise', freq: 400, to: 100, dur: 1, vol: .4, filter: 'lowpass' }, { wave: 'saw', freq: 220, to: 55, dur: .8, vol: .16 }],
  pickup: [{ wave: 'square', freq: 'E5', dur: .3, vol: .1, arp: [0, 5, 7, 12], step: .06 }],
  newweapon: [{ wave: 'pulse', freq: 'C5', dur: .5, vol: .1, arp: [0, 4, 7, 12, 16, 19], step: .07 }],
  explode: [{ wave: 'noise', freq: 1600, to: 60, dur: 1.2, vol: .55, filter: 'lowpass' }, { wave: 'sine', freq: 60, to: 30, dur: .9, vol: .5 }],
  explodeS: [{ wave: 'noise', freq: 2000, to: 120, dur: .5, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 40, dur: .4, vol: .35 }],
  bounce: [{ wave: 'square', freq: 300, to: 200, dur: .04, vol: .08 }],
  rocket: [{ wave: 'noise', freq: 600, to: 1800, dur: .6, vol: .18, filter: 'bandpass', q: 2 }],
  harpoon: [{ wave: 'saw', freq: 300, to: 900, dur: .18, vol: .12 }, { wave: 'noise', freq: 2000, dur: .06, vol: .1 }],
  torpedo: [{ wave: 'noise', freq: 300, to: 500, dur: 1.2, vol: .14, filter: 'lowpass', hold: true }],
  flare: [{ wave: 'noise', freq: 2500, to: 4000, dur: .4, vol: .14 }, { wave: 'sine', freq: 800, to: 1600, dur: .2, vol: .06 }],
  spinup: [{ wave: 'saw', freq: 80, to: 900, dur: .8, vol: .1 }],
  minigun: [{ wave: 'noise', freq: 1500, to: 900, dur: 2.5, vol: .22, filter: 'lowpass', hold: true }, { wave: 'square', freq: 40, dur: 2.5, vol: .1, hold: true }],
  stomp: [{ wave: 'sine', freq: 70, to: 30, dur: .3, vol: .4 }, { wave: 'noise', freq: 300, to: 80, dur: .2, vol: .2 }],
  servo: [{ wave: 'saw', freq: 220, to: 330, dur: .25, vol: .06 }],
  rotor: [{ wave: 'noise', freq: 200, dur: .5, vol: .1, filter: 'lowpass' }],
  zap: [{ wave: 'saw', freq: 1800, to: 300, dur: .18, vol: .12 }],
  laser: [{ wave: 'sine', freq: 2400, to: 2800, dur: 1.2, vol: .04, hold: true }],
  sniper: [{ wave: 'noise', freq: 4000, to: 300, dur: .35, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 120, to: 40, dur: .3, vol: .3 }],
  erifle: [{ wave: 'noise', freq: 2200, to: 400, dur: .07, vol: .14, filter: 'lowpass' }],
  slash: [{ wave: 'noise', freq: 3000, to: 800, dur: .14, vol: .2, filter: 'bandpass', q: 2 }],
  clang: [{ wave: 'square', freq: 1200, to: 600, dur: .12, vol: .14 }, { wave: 'sine', freq: 2400, to: 1800, dur: .25, vol: .08 }],
  break: [{ wave: 'noise', freq: 1200, to: 300, dur: .2, vol: .2 }],
  glassbreak: [{ wave: 'noise', freq: 7000, to: 2000, dur: .35, vol: .2, filter: 'highpass' }, { wave: 'sine', freq: 3500, to: 2800, dur: .2, vol: .06 }, { wave: 'sine', freq: 4200, to: 3600, dur: .15, vol: .05, delay: .06 }],
  fireworks: [{ wave: 'noise', freq: 3000, to: 200, dur: .6, vol: .2, delay: .0 }, { wave: 'noise', freq: 5000, to: 3000, dur: .4, vol: .06, delay: .25 }],
  ui: [{ wave: 'square', freq: 880, dur: .03, vol: .06 }],
  uiok: [{ wave: 'square', freq: 'E5', dur: .14, vol: .08, arp: [0, 7], step: .05 }],
  uiback: [{ wave: 'square', freq: 'A4', dur: .12, vol: .07, arp: [0, -5], step: .05 }],
  stamp: [{ wave: 'noise', freq: 600, to: 100, dur: .3, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 80, to: 40, dur: .3, vol: .4 }],
  count: [{ wave: 'square', freq: 1320, dur: .02, vol: .05 }],
  thunder: [{ wave: 'noise', freq: 400, to: 60, dur: 2.4, vol: .4, filter: 'lowpass' }, { wave: 'noise', freq: 200, to: 50, dur: 1.6, vol: .3, delay: .3, filter: 'lowpass' }],
  splash: [{ wave: 'noise', freq: 1800, to: 300, dur: .4, vol: .25, filter: 'lowpass' }],
  door: [{ wave: 'noise', freq: 300, to: 120, dur: .25, vol: .3, filter: 'lowpass' }, { wave: 'square', freq: 90, to: 60, dur: .15, vol: .1 }],
  land: [{ wave: 'sine', freq: 90, to: 40, dur: .12, vol: .25 }],
  armor: [{ wave: 'square', freq: 2200, to: 1600, dur: .05, vol: .07 }, { wave: 'sine', freq: 3000, to: 2600, dur: .1, vol: .05 }],
  surge: [{ wave: 'noise', freq: 200, to: 900, dur: 1.4, vol: .35, filter: 'lowpass' }],
  slowmo: [{ wave: 'sine', freq: 300, to: 80, dur: .8, vol: .2 }],
  boat: [{ wave: 'saw', freq: 70, dur: .5, vol: .04, hold: true }],
  beep: [{ wave: 'sine', freq: 1000, dur: .08, vol: .08 }]
};
for (const k in SFX) def('sfx', k, { voices: SFX[k] });
TC.SFX = SFX;
TC.defineSfx = (audio) => { for (const k in SFX) audio.define('tc-' + k, SFX[k]); };

// ---------------------------------------------------------------- ambience: small Web Audio graphs on the effects bus
const Amb = {
  nodes: [],
  start(game, kind) {
    this.stop();
    const A = game.audio, ctx = A.ctx, bus = A.bus && A.bus('sfx'); if (!ctx || !bus || !A._noise) return;
    const add = (freq, type, q, vol, lfoF = 0, lfoK = 0) => {
      const src = ctx.createBufferSource(); src.buffer = A._noise; src.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(bus); src.start();
      if (lfoF) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfoF; lg.gain.value = lfoK; l.connect(lg); lg.connect(g.gain); l.start(); this.nodes.push(l); }
      this.nodes.push(src);
    };
    if (kind === 'festival') { add(500, 'lowpass', .7, .05, .13, .03); add(1500, 'bandpass', .8, .012, .4, .008); }
    if (kind === 'storm') { add(5000, 'highpass', .5, .05); add(300, 'lowpass', .7, .06, .2, .04); }
    if (kind === 'tidewall') { add(250, 'lowpass', 1, .08, .07, .02); add(120, 'bandpass', 4, .05); }
    if (kind === 'range') { add(200, 'lowpass', 1, .015); }
  },
  stop() { for (const n of this.nodes) { try { n.stop(); } catch (e) { /* already stopped */ } } this.nodes = []; }
};
TC.Amb = Amb;

// ===== 44-view.js
// 44-view: the presentation of the world. One Rail3D per viewport; the stage's baked batches; dynamic meshes
// (carriers, bosses, vehicles, turbines, water); engine Humanoid rigs driven from the Sim's plain state and drawn as
// billboards; particles, tracers, explosions, fireworks, rain and lightning driven by the Sim's events; the camera's
// presentation offsets (shake, recoil, hit jolt, carrier sway) that never move the aim ray. Reads the Sim only.

const FX = {
  list: [], lights: [], trauma: [0, 0, 0, 0], jolt: [0, 0, 0, 0], recoil: [0, 0, 0, 0], tracers: [], flashes: [], decals: [], lightning: 0, smoke: 0,
  clear() { this.list.length = 0; this.tracers.length = 0; this.lights.length = 0; this.decals.length = 0; this.flashes.length = 0; },
  add(p) { if (this.list.length > 900) this.list.shift(); this.list.push(Object.assign({ v: [0, 0, 0], g: 0, life: .5, t: 0, size: 2, rgb: [255, 220, 150], mode: 'add', drag: 0 }, p)); },
  burst(at, n, o) { const R = fxRand; for (let i = 0; i < n; i++) { const a = R() * 6.283, b = (R() - .3) * 3, s = (o.speed || 60) * (.4 + R() * .8); this.add(Object.assign({}, o, { p: at.slice(), v: [Math.cos(a) * Math.cos(b) * s, Math.sin(a) * Math.cos(b) * s, Math.sin(b) * s + (o.up || 0)], life: (o.life || .5) * (.6 + R() * .7), size: (o.size || 2) * (.6 + R() * .8) })); } },
  light(at, r, k, color, life = .12) { this.lights.push({ p: at.slice(), r, k, color, life, t: 0 }); },
  tracer(a, b, rgb = [255, 230, 160], life = .06) { this.tracers.push({ a: a.slice(), b: b.slice(), rgb, life, t: 0 }); },
  step(dt) {
    for (const p of this.list) { p.t += dt; p.v[2] -= p.g * dt; if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.v[0] *= k; p.v[1] *= k; p.v[2] *= k; } p.p[0] += p.v[0] * dt; p.p[1] += p.v[1] * dt; p.p[2] += p.v[2] * dt; if (p.grow) p.size += p.grow * dt; }
    this.list = this.list.filter(p => p.t < p.life);
    for (const l of this.lights) l.t += dt; this.lights = this.lights.filter(l => l.t < l.life);
    for (const t of this.tracers) t.t += dt; this.tracers = this.tracers.filter(t => t.t < t.life);
    for (let i = 0; i < 4; i++) { this.trauma[i] = Math.max(0, this.trauma[i] - 1.6 * dt); this.jolt[i] = Math.max(0, this.jolt[i] - 3 * dt); this.recoil[i] = Math.max(0, this.recoil[i] - 6 * dt); }
    this.lightning = Math.max(0, this.lightning - dt * 3); this.smoke = Math.max(0, this.smoke - dt);
  },
  explosion(at, size = 1) {
    const R = fxRand;
    this.burst(at, 18 * size, { rgb: [255, 170, 60], size: 7 * size, speed: 70 * size, life: .45, mode: 'add', drag: 3, grow: 6 });
    this.burst(at, 10 * size, { rgb: [255, 240, 180], size: 4 * size, speed: 30 * size, life: .25, mode: 'add' });
    for (let i = 0; i < 10 * size; i++) this.add({ p: [at[0] + (R() - .5) * 12 * size, at[1] + (R() - .5) * 12 * size, at[2] + R() * 8], v: [(R() - .5) * 20, (R() - .5) * 20, 18 + R() * 20], rgb: [40 + R() * 20 | 0, 38, 40], size: 8 * size, grow: 10, life: 1.6, mode: 'alpha', alpha: .7 });
    this.burst(at, 12 * size, { rgb: [60, 50, 40], size: 1.6, speed: 120 * size, life: 1.2, mode: 'solid', g: 260, up: 60 });
    this.light(at, 220 * size, 1.4, '#ffb060', .35);
  }
};
TC.FX = FX;

// ---------------------------------------------------------------- looks of the people who are not enemies
const CIV_LOOKS = {
  festival: [{ build: 'heroic', weapon: null, outfit: 'shirt', hair: 'long', colors: { cloth: '#e85a8a', pants: '#2a2a44', hair: '#3a2010', skin: '#e0b090' } }, { build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#4a8ad8', cloth: '#f0f0f0', pants: '#3a3a3a', hair: '#1a1a1a', skin: '#a07050' } }],
  worker: [{ build: 'bulky', weapon: null, outfit: 'shirt', hat: 'cap', colors: { cloth: '#c89a3a', hat: '#f2c12e', pants: '#3a4a6a', skin: '#c08a68' } }],
  fisher: [{ build: 'heroic', weapon: null, outfit: 'coat', hat: 'cap', colors: { coat: '#f2d02e', hat: '#f2d02e', pants: '#2a3a4a', skin: '#b07850' } }],
  hostage: [{ build: 'heroic', size: .98, weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#f0f0f0', cloth: '#7aa0c8', hair: '#a8a8a8', skin: '#c89a74', pants: '#4a4a52' } }]
};
TC.CIV_LOOKS = CIV_LOOKS;

class WorldView {
  constructor(game) { this.game = game; this.R = []; this.rigs = new Map(); this.batches = null; this.stageId = null; this.t = 0; this.seen = new Set(); this.water = null; }
  rail(i) { return this.R[i] || (this.R[i] = new Rail3D()); }
  // bake the stage's geometry once (presentation only)
  setStage(sim) { if (this.stageId === sim.stageId && this.batches && this.simRef === sim) return; this.simRef = sim; this.stageId = sim.stageId; this.batches = sim.builder.bake(); this.rigs.clear(); FX.clear(); this.lights = sim.builder.lights; }
  rigFor(key, look) {
    let r = this.rigs.get(key);
    if (!r) { r = { rig: new E.Humanoid(Object.assign({ size: 1 }, look)), seen: 0 }; this.rigs.set(key, r); }
    r.seen = this.t; return r.rig;
  }
  // update rigs from the Sim (call once per frame with the frame's dt)
  updateRigs(sim, dt) {
    this.t += dt;
    for (const e of sim.enemies) {
      if (!e.look || e.A.ai === 'drone') continue;
      const rig = this.rigFor('e' + e.id, Object.assign({}, e.look, { size: (e.look.size || 1) * e.size }));
      const tp = sim.cameraFor(e.target), d = Math.hypot(tp.x - e.x, tp.y - e.y), aimP = Math.atan2(tp.z - (e.z + 22), d);
      const st = { x: e.x, y: e.y, z: e.z - e.sinkNow + (e.ski ? 4 : 0), vx: e.vel[0] * (e.run || e.state === 'enter' ? 1 : 0) + (e.run ? Math.cos(e.facing) * 90 * e.run : 0), vy: e.vel[1] * (e.run ? 1 : 0) + (e.run ? Math.sin(e.facing) * 90 * e.run : 0), facing: e.facing, point: e.point && !e.dead, aim: e.point ? aimP : 0, hurt: e.hurtT > 0, air: e.air, climb: e.climb, vz: e.climb ? -40 : 0, flip: e.flip || 0 };
      if (e.dead) { st.pose = 'die'; st.vx = 0; st.vy = 0; if (e.death === 'flyback') st.flip = clamp(e.deadT * 1.6, 0, 1) * (e.deadT < .6 ? 1 : 0); }
      else if (e.state === 'hide' && !(e.cover && e.cover.h >= 30) && e.A.ai !== 'shield') st.pose = 'crouch';
      else if (e.ski) st.pose = 'kneel';
      if (e.A.ai === 'runner' && !e.dead) st.pose = null;
      if (e.A.ai === 'rusher' && e.atk) st.attack = E.move('slash', e.atk === 'wind' ? .15 : .6, e.atk === 'wind' ? 'wind' : 'active');
      if (e.A.ai === 'grenadier' && e.lob && e.state === 'fire') st.attack = E.move('throw', .5);
      if (e.side && (e.cover && e.cover.h >= 30)) { const f = e.facing, sd = e.side * 14; st.x += -Math.sin(f) * sd; st.y += Math.cos(f) * sd; }
      rig.update(dt, st);
    }
    for (const c of sim.civilians) {
      const rig = this.rigFor('c' + c.id, CIV_LOOKS[c.kind] ? CIV_LOOKS[c.kind][c.look % CIV_LOOKS[c.kind].length] : CIV_LOOKS.festival[0]);
      rig.update(dt, { x: c.x, y: c.y, z: c.z, vx: c.state === 'run' ? Math.cos(c.face) * 80 : 0, vy: c.state === 'run' ? Math.sin(c.face) * 80 : 0, facing: c.face, pose: c.dead ? 'die' : c.hostage ? (c.freed ? 'wave' : null) : c.state === 'crouch' ? 'crouch' : null, expr: c.hostage ? 'wince' : 'shout' });
    }
    for (const a of sim.allies) {
      const rig = this.rigFor('a' + a.id, get('speaker', a.agent).rig);
      const f = a.aimAt ? Math.atan2(a.aimAt[1] - a.at[1], a.aimAt[0] - a.at[0]) : a.facing;
      rig.update(dt, { x: a.at[0], y: a.at[1], z: a.at[2], facing: f, point: true, aim: 0 });
    }
    if (sim.cut) for (const a of sim.cut.actors) { const rig = this.rigFor('cut' + a.id, get('speaker', a.id).rig); rig.update(dt, { x: a.at[0], y: a.at[1], z: a.at[2], facing: a.facing || 0, pose: a.pose || null, expr: sim.cut.line && sim.cut.line.speaker === a.id ? 'shout' : null }); }
    if (sim.players.length > 1) for (const p of sim.players) { if (p.left) continue; const cam = sim.cameraFor(p.i), rig = this.rigFor('p' + p.i, get('speaker', p.agent).rig); rig.update(dt, { x: cam.x - Math.cos(cam.yaw) * 6, y: cam.y - Math.sin(cam.yaw) * 6, z: cam.z - (p.c > .5 ? 12 : 24) - 1, facing: cam.yaw, point: p.c < .5, aim: cam.pitch, pose: p.c > .5 ? 'crouch' : p.out ? 'kneel' : null }); }
    const B = sim.boss;
    if (B) this.updateBossRigs(sim, B, dt);
    for (const [k, r] of this.rigs) if (this.t - r.seen > 1) this.rigs.delete(k);
  }
  updateBossRigs(sim, B, dt) {
    const sp = id => get('speaker', id).rig;
    if (B.id === 'stingray') { const rig = this.rigFor('boss', sp('barracuda')); rig.update(dt, { x: B.bx, y: B.by, z: B.bz - (B.duck ? 12 : 0), facing: B.yaw + Math.PI / 2, point: !B.duck && B.phase === 2, air: B.phase === 3 && B.swing < 1, pose: B.defeated ? 'die' : B.duck ? 'crouch' : null, attack: B.atk ? E.move('slash', B.atk === 'wind' ? .2 : .6, B.atk === 'wind' ? 'wind' : 'active') : null, hurt: B.part('barracuda').flashT > 0 }); }
    if (B.id === 'gull') { const rig = this.rigFor('boss', sp('gull')); rig.update(dt, { x: B.x, y: B.y, z: B.z, facing: B.yaw, point: B.up > .5, pose: B.defeated ? 'die' : B.up > .5 ? 'kneel' : 'crouch' }); }
    if (B.id === 'hammerhead') { const rig = this.rigFor('boss', sp('hammer')); rig.update(dt, { x: B.x, y: B.y, z: B.z, facing: B.yaw, point: B.mode === 'spin' || B.mode === 'sweepFire', aim: -.1, vx: B.mode === 'charge' ? Math.cos(B.yaw) * 95 : B.mode === 'walk' ? Math.cos(B.yaw + 1.57) * 20 : 0, vy: B.mode === 'charge' ? Math.sin(B.yaw) * 95 : 0, sprint: B.mode === 'charge', pose: B.defeated ? 'die' : B.mode === 'stagger' ? 'kneel' : null, attack: B.mode === 'toss' ? E.move('throw', .5) : null, hurt: B.part('body').flashT > 0, expr: 'angry' }); }
    if (B.id === 'krake') { const rig = this.rigFor('boss', sp('krake')); rig.update(dt, { x: B.x, y: B.y, z: B.z, facing: B.yaw, point: !B.duck, flip: B.flip || 0, pose: B.defeated ? 'die' : B.duck ? 'crouch' : B.final > 0 ? null : null, vx: B.final > 0 ? 30 : 0, hurt: B.part('krake').flashT > 0, expr: 'angry' }); }
  }
  // the light an actor stands in: ambient + sun + the stage's static lights + this frame's dynamic lights, 0.45..1.25
  lightAt(sim, p) {
    const env = sim.stage.env, amb = env.ambient === undefined ? .4 : env.ambient; let k = amb + (env.sun ? env.sun.k * .6 : .3), r = 0, g = 0, b = 0, best = 0, bc = null;
    for (const l of this.lights) { const d = vdist(l.p, p); if (d < l.r) { const f = (1 - d / l.r); const w = f * f * l.k; k += w; if (w > best) { best = w; bc = l.c; } } }
    for (const l of FX.lights) { const d = vdist(l.p, p); if (d < l.r) { const f = (1 - d / l.r); k += f * f * l.k; } }
    k = clamp(k + FX.lightning * .6, .45, 1.25);
    const tint = bc ? [lerp(1, bc[0] / 255 * 1.2, .25), lerp(1, bc[1] / 255 * 1.2, .25), lerp(1, bc[2] / 255 * 1.2, .25)] : env.ambientColor ? hexRGB(env.ambientColor).map(v => lerp(1, v / 200, .3)) : [1, 1, 1];
    return [k * tint[0], k * tint[1], k * tint[2]];
  }
  // the camera a viewport draws with: the logical pose plus presentation offsets (shake, recoil, jolt, sway)
  presentCam(sim, i) {
    const c = Object.assign({}, sim.cameraFor(i)), set = this.game.settings || {}, reduce = !!this.game.reduceMotion, sk = reduce ? 0 : (set.shake === undefined ? 1 : set.shake);
    const tr = FX.trauma[i] || 0, t = this.t;
    if (sk && tr) { const a = tr * tr * 2.5 * DEG * sk; c.yaw += (TC.vnoise(t * 18, 1, 3) - .5) * 2 * a; c.pitch += (TC.vnoise(t * 18, 2, 4) - .5) * 2 * a; c.roll = (c.roll || 0) + (TC.vnoise(t * 18, 3, 5) - .5) * a; }
    c.pitch += (FX.recoil[i] || 0) * 1.4 * DEG;
    if (FX.jolt[i]) { c.roll = (c.roll || 0) + FX.jolt[i] * 4 * DEG; c.pitch -= FX.jolt[i] * 2 * DEG; }
    if (sim.carrier && !reduce) { c.roll = (c.roll || 0) + Math.sin(t * 1.3) * 1.2 * DEG; c.pitch += Math.sin(t * .9) * .6 * DEG; }
    if (!reduce && sim.phase === 'action') { c.pitch += Math.sin(t * 1.1) * .15 * DEG; }
    return c;
  }
  // ------------------------------------------------------------ draw one viewport
  draw(g, sim, i, vp, o = {}) {
    this.setStage(sim);
    const R = this.rail(i), env = sim.stage.env, cam = o.cam || this.presentCam(sim, i);
    R.wobble = !!(this.game.settings && this.game.settings.wobble);
    const flash = env.lightning ? FX.lightning * .35 : 0;
    R.begin(cam, vp.w, vp.h, Object.assign({}, env, { flashNow: flash }), this.t);
    for (const l of FX.lights) R.addLight(l.p[0], l.p[1], l.p[2], l.r, l.k * (1 - l.t / l.life), l.color);
    for (const b of this.batches) R.drawBatch(b);
    if (env.water) this.drawWater(R, sim, cam, env.water.mat);
    this.drawDynamic(R, sim);
    R.sky(Object.assign({}, env.sky, { flash: FX.lightning * .5 }));
    this.drawActors(R, sim, i);
    this.drawFx(R, sim);
    if (sim.flags.smoke && sim.flags.smoke > sim.t) R.haze(.55, [150, 150, 160]);
    if (sim.players[i] && sim.players[i].c > .3 && sim.phase === 'action') R.vignette(sim.players[i].c * 2.2);
    R.present(g, vp.x, vp.y);
    return R;
  }
  drawWater(R, sim, cam, matId) {
    if (!this.water) this.water = { mesh: TC.makeMesh(G => { for (let x = -8; x < 8; x++) for (let y = -8; y < 8; y++) G.quad([x * 256, y * 256, 0], [(x + 1) * 256, y * 256, 0], [(x + 1) * 256, (y + 1) * 256, 0], [x * 256, (y + 1) * 256, 0], 'sea-night', { tess: false }); }), mats: {} };
    const m = this.water.mesh, M = mat(matId); for (const gq of m.groups) gq.mat = M;
    const sx = Math.round(cam.x / 256) * 256, sy = Math.round(cam.y / 256) * 256;
    R.drawMesh({ mesh: m, x: sx, y: sy, z: sim.water, yaw: 0 });
  }
  drawDynamic(R, sim) {
    const C = sim.carrier;
    if (C && C.mesh) R.drawMesh({ mesh: TC.mesh(C.mesh), x: C.pos[0], y: C.pos[1], z: C.pos[2] + (C.pitch ? 0 : Math.sin(this.t * 1.7) * 1), yaw: C.yaw, pitch: -(C.pitch || 0), roll: C.pitch ? 0 : Math.sin(this.t * 1.3) * .02 });
    const sc = sim.scene;
    if (sc && sc.dyn) sc.dyn(R, sim, this);
    if (sim.stage.dyn) sim.stage.dyn(R, sim, this);
    // objects
    for (const ob of sim.objects) {
      if (ob.dead && ob.kind !== 'crate') continue;
      const p = ob.pos, k = ob.kind, fl = sim.t - (ob.hitAt || -9) < .06 ? .5 : 0;
      if (k === 'barrel') R.drawMesh({ mesh: TC.mesh('objBarrel'), x: p[0], y: p[1], z: p[2] - 10, yaw: 0, flash: fl });
      else if (k === 'tank') R.drawMesh({ mesh: TC.mesh('objTank'), x: p[0], y: p[1], z: p[2] - 14, yaw: 0 });
      else if (k === 'crate' && !ob.dead) R.drawMesh({ mesh: TC.mesh('objCrate'), x: p[0], y: p[1], z: p[2], yaw: 0, s: ob.size ? ob.size[2] / 14 : 1 });
      else if (k === 'lantern') { R.drawMesh({ mesh: TC.mesh('objLantern'), x: p[0], y: p[1], z: p[2] - 4, yaw: this.t }); }
      else if (k === 'bottles') R.drawMesh({ mesh: TC.mesh('objBottles'), x: p[0], y: p[1], z: p[2] - 3, yaw: 0 });
      else if (k === 'intel') { R.drawMesh({ mesh: TC.mesh('objIntel'), x: p[0], y: p[1], z: p[2] - 3, yaw: this.t * .5 }); if ((this.t * 2 | 0) % 2) R.splat(p, 1.6, [120, 255, 160], 'add', .8); }
      else if (k === 'lifering') R.drawMesh({ mesh: TC.mesh('objRing'), x: p[0], y: p[1], z: p[2] - 6, yaw: ob.yaw || 0, pitch: 0 });
      else if (k === 'lock') { R.drawMesh({ mesh: TC.mesh('objLock'), x: p[0], y: p[1], z: p[2] - 6, yaw: ob.yaw || 0 }); R.splat(p, 3 + Math.sin(this.t * 6), [255, 200, 60], 'add', .7); }
      else if (k === 'fwcrate') R.drawMesh({ mesh: TC.mesh('bargeCrate'), x: p[0], y: p[1], z: p[2] - 7, yaw: 0 });
    }
    // projectiles
    for (const pr of sim.projectiles) {
      const p = pr.pos;
      if (pr.kind === 'grenade') { R.splat(p, 2.6, [40, 46, 40], 'solid'); if ((this.t * 10 | 0) % 2) R.splat([p[0], p[1], p[2] + 2], 1, [255, 60, 40], 'add'); }
      else if (pr.kind === 'pgl') { R.splat(p, 2, [60, 70, 60], 'solid'); }
      else if (pr.kind === 'rocket' || pr.kind === 'missile') { const d = vnorm(pr.vel); R.line(p, vsub(p, vmul(d, 10)), [200, 200, 200], 'solid'); R.splat(vsub(p, vmul(d, 11)), 2.5, [255, 180, 80], 'add'); if (fxRand() < .6) FX.add({ p: vsub(p, vmul(d, 12)), v: [0, 0, 6], rgb: [150, 150, 150], size: 3, grow: 6, life: .8, mode: 'alpha', alpha: .5 }); }
      else if (pr.kind === 'harpoon') { const d = vnorm(pr.vel); R.line(p, vsub(p, vmul(d, 16)), [200, 210, 220], 'solid'); R.line(vsub(p, vmul(d, 16)), [sim.boss ? sim.boss.bx : p[0], sim.boss ? sim.boss.by : p[1], sim.boss ? sim.boss.bz + 22 : p[2]], [120, 100, 70], 'solid'); }
      else if (pr.kind === 'torpedo') { R.drawMesh({ mesh: TC.mesh('torpedo'), x: p[0], y: p[1], z: p[2] - 1, yaw: Math.atan2(pr.vel[1], pr.vel[0]) }); if (fxRand() < .8) FX.add({ p: [p[0], p[1], sim.water + .5], v: [0, 0, 4], rgb: [220, 240, 255], size: 3, grow: 4, life: 1.2, mode: 'alpha', alpha: .6 }); }
      else if (pr.kind === 'flare') { R.splat(p, 4, [255, 120, 60], 'add'); R.splat(p, 2, [255, 255, 200], 'add'); FX.light(p, 90, .6, '#ff8040', .05); }
    }
    // the boss
    const B = sim.boss; if (B && B.D.draw) B.D.draw(R, B, sim, this);
  }
  drawActors(R, sim, i) {
    const A = [], self = sim.players[i];
    for (const e of sim.enemies) {
      if (e.A.ai === 'drone') { if (!e.dead || e.deadT < 1.5) R.drawMesh({ mesh: TC.mesh('drone'), x: e.x, y: e.y, z: e.z, yaw: this.t * 2, roll: e.dead ? e.deadT * 3 : Math.sin(this.t * 3 + e.id) * .1, flash: e.flashT > 0 ? .8 : 0 }); continue; }
      if (e.A.ai === 'turret') { R.drawMesh({ mesh: TC.mesh('turretBot'), x: e.x, y: e.y, z: e.z, yaw: e.facing }); R.splat([e.x, e.y, e.z + 18], 2.4 + (e.state === 'aim' ? Math.sin(this.t * 20) * 1.5 : 0), [255, 60, 40], 'add'); continue; }
      if (e.A.board) { R.drawMesh({ mesh: TC.mesh(e.o.civ ? 'cutoutCiv' : 'cutout'), x: e.x, y: e.y, z: e.z, yaw: e.facing, pitch: (1 - e.up) * -1.45, flash: e.flashT > 0 ? .7 : 0 }); continue; }
      if (e.ski) R.drawMesh({ mesh: TC.mesh('jetski'), x: e.x, y: e.y, z: e.z - 1, yaw: e.ski.yaw, roll: Math.sin(this.t * 5 + e.id) * .08, flash: e.flashT > 0 ? .5 : 0 });
      const r = this.rigs.get('e' + e.id); if (!r) continue;
      const fade = e.dead && e.deadT > 2.6 ? 1 - (e.deadT - 2.6) / .6 : 1;
      const cz = e.cover ? (e.cover.ledge ? e.cover.at[2] : e.cover.at[2]) : e.z;
      A.push({ x: e.x, y: e.y, z: e.z - e.sinkNow, chest: 16, h: 34 * e.size, rig: r.rig, flash: e.flashT > 0 ? .75 : 0, alpha: fade, clipZ: e.sinkNow > .5 ? cz - .5 : undefined, light: this.lightAt(sim, [e.x, e.y, e.z + 18]) });
      if (e.A.ai === 'shield' && !e.dead) R.drawMesh({ mesh: TC.mesh('riotShield'), x: e.x + Math.cos(e.facing) * 9, y: e.y + Math.sin(e.facing) * 9, z: e.z, yaw: e.facing, roll: e.shieldDown > 0 ? .9 : 0 });
      if (e.laser > 0 && !e.dead) { const tp = sim.cameraFor(e.target), m = TC.muzzle(e), k = 1 - e.laser / 1.6, to = [lerp(tp.x + 30, tp.x, k), lerp(tp.y + 20, tp.y, k), lerp(tp.z - 10, tp.z - 2, k)]; R.line(m, to, [255, 40, 40], 'add', .9); }
      if (e.glint > 0 && e.state === 'aim') R.splat(TC.muzzle(e), 2 + Math.sin(this.t * 30), [255, 255, 200], 'add');
    }
    for (const c of sim.civilians) { const r = this.rigs.get('c' + c.id); if (r) A.push({ x: c.x, y: c.y, z: c.z, chest: 16, h: 34, rig: r.rig, light: this.lightAt(sim, [c.x, c.y, c.z + 18]), alpha: c.dead && c.deadT > 2.4 ? .5 : 1 }); }
    for (const a of sim.allies) { const r = this.rigs.get('a' + a.id); if (r) A.push({ x: a.at[0], y: a.at[1], z: a.at[2], chest: 16, h: 36, rig: r.rig, light: this.lightAt(sim, a.at) }); }
    if (sim.cut) for (const a of sim.cut.actors) { const r = this.rigs.get('cut' + a.id); if (r) A.push({ x: a.at[0], y: a.at[1], z: a.at[2], chest: 16, h: 40, rig: r.rig, light: this.lightAt(sim, a.at) }); }
    if (sim.players.length > 1) for (const p of sim.players) { if (p.i === i || p.left) continue; const r = this.rigs.get('p' + p.i); if (r) { const cam = sim.cameraFor(p.i); A.push({ x: cam.x - Math.cos(cam.yaw) * 6, y: cam.y - Math.sin(cam.yaw) * 6, z: cam.z - (p.c > .5 ? 12 : 24) - 1, chest: 14, h: 38, rig: r.rig, light: this.lightAt(sim, [cam.x, cam.y, cam.z]) }); } }
    const B = sim.boss;
    if (B && this.rigs.get('boss') && B.D.rigAt) { const at = B.D.rigAt(B), r = this.rigs.get('boss'); const pt = B.parts.find(p => p.human); A.push({ x: at[0], y: at[1], z: at[2], chest: at[3] || 20, h: at[4] || 50, rig: r.rig, flash: pt && pt.flashT > 0 ? .75 : 0, light: this.lightAt(sim, at) }); }
    const cs = R.cs; A.sort((a, b) => vdist([b.x, b.y, b.z], cs.pos) - vdist([a.x, a.y, a.z], cs.pos));
    for (const a of A) { this.shadow(R, a); R.billboard({ x: a.x, y: a.y, z: a.z, chest: a.chest, h: a.h, light: a.light, flash: a.flash, alpha: a.alpha, clipZ: a.clipZ, draw: (g, ox, oy, view) => a.rig.draw(g, ox, oy, view) }); }
  }
  shadow(R, a) { const p = R.project([a.x, a.y, a.z + .3]); if (!p) return; const k = R.F / p[2], rx = 7 * k, ry = 2.6 * k, W = R.W, H = R.H, col = R.col, dep = R.depth; for (let y = Math.max(0, p[1] - ry | 0); y <= Math.min(H - 1, p[1] + ry | 0); y++) for (let x = Math.max(0, p[0] - rx | 0); x <= Math.min(W - 1, p[0] + rx | 0); x++) { const dx = (x - p[0]) / rx, dy = (y - p[1]) / ry; if (dx * dx + dy * dy > 1 || ((x + y) & 1)) continue; const idx = y * W + x; if (dep[idx] < p[2] - 8) continue; const c = col[idx]; col[idx] = 0xff000000 | ((((c >> 16) & 255) * .55) << 16) | ((((c >> 8) & 255) * .55) << 8) | ((c & 255) * .55); } }
  drawFx(R, sim) {
    for (const p of FX.list) { const k = 1 - p.t / p.life; if (p.mode === 'rain') { R.line(p.p, [p.p[0] - p.v[0] * .03, p.p[1] - p.v[1] * .03, p.p[2] - p.v[2] * .03], p.rgb, 'add', .35); continue; } if (p.mode === 'alpha') R.splat(p.p, p.size, p.rgb, 'alpha', (p.alpha || .6) * k); else if (p.mode === 'solid') R.splat(p.p, p.size, p.rgb, 'solid'); else R.splat(p.p, p.size * (.4 + k * .6), p.rgb, 'add', k); }
    for (const t of FX.tracers) R.line(t.a, t.b, t.rgb, 'add', 1 - t.t / t.life);
  }
}
TC.WorldView = WorldView;

// small dynamic meshes for objects and props
Object.assign(MESHDEF, {
  objBarrel: G => { G.cyl(0, 0, 0, 20, 7, 7, 10, 'barrel-red'); },
  objTank: G => { G.cyl(0, 0, 0, 28, 9, 9, 10, 'tank-white'); G.box(-2, -2, 28, 2, 2, 32, 'iron'); },
  objCrate: G => { G.box(-8, -8, 0, 8, 8, 14, 'crate', { fit: true }); },
  objLantern: G => { G.lathe(0, 0, 0, [[0, 0], [2.5, 1], [3.5, 3], [3.5, 6], [2.5, 8], [0, 9]], 6, 'lantern'); },
  objBottles: G => { for (let i = 0; i < 4; i++) G.box(-5 + i * 3, -1, 0, -3.5 + i * 3, 1, 6 + (i % 2) * 2, i % 2 ? 'bottle' : 'glass'); },
  objIntel: G => { G.box(-1.5, -1.5, 0, 1.5, 1.5, 6, 'bottle'); G.box(-.7, -.7, 6, .7, .7, 8.5, 'bottle'); G.box(-.8, -.8, 8.5, .8, .8, 9.5, 'plank'); },
  objRing: G => { for (let i = 0; i < 10; i++) { const a0 = i / 10 * Math.PI * 2, a1 = (i + 1) / 10 * Math.PI * 2, r = 6; G.quad([Math.cos(a0) * r, -1.5, 6 + Math.sin(a0) * r], [Math.cos(a1) * r, -1.5, 6 + Math.sin(a1) * r], [Math.cos(a1) * (r - 2.5), -1.5, 6 + Math.sin(a1) * (r - 2.5)], [Math.cos(a0) * (r - 2.5), -1.5, 6 + Math.sin(a0) * (r - 2.5)], 'lifering', { double: true, tess: false }); } },
  objLock: G => { G.box(-6, -4, 0, 6, 4, 12, 'gunmetal'); G.box(-4, -4.5, 3, 4, 4.5, 9, 'weak'); },
  torpedo: G => { G.pipe(-10, 10, 0, 0, 2.2, 6, 'gunmetal'); },
  riotShield: G => { G.box(-1, -7, 2, 1, 7, 28, 'gunmetal', { double: true }); G.box(-1.2, -4, 18, 1.2, 4, 22, 'glass'); },
  hatch: G => { G.box(-1.5, -12, 0, 1.5, 12, 34, 'rusted', { double: true }); G.box(-1.8, -4, 22, 1.8, 4, 28, 'glass'); },
  cutout: G => { G.box(-.5, -7, 0, .5, 7, 20, 'cutout', { double: true }); G.cyl(0, 0, 20, 30, 4.5, 4.5, 8, 'cutout'); G.box(-1, -2, -4, 1, 2, 0, 'iron'); },
  cutoutCiv: G => { G.box(-.5, -7, 0, .5, 7, 20, 'awning-blue', { double: true }); G.cyl(0, 0, 20, 30, 4.5, 4.5, 8, 'plywood'); },
  turretBot: G => { G.box(-8, -8, 0, 8, 8, 14, 'steel-paint'); G.box(-4, -4, 14, 4, 4, 20, 'gunmetal'); G.pipe(4, 14, 0, 17, 1.2, 6, 'iron'); }
});

// ===== 45-bossdraw.js
// 45-bossdraw: how each boss is drawn (presentation only): its meshes posed from the boss's state, its rig's place,
// weak points pulsing gold, smoke and fire on broken parts. Attached to the boss registry entries (25).
// Reads: WorldView (44), meshes (30).

const weakGlow = (R, view, p, r = 4) => { const k = .6 + .4 * Math.sin(view.t * 8); R.splat(p, r * k, [255, 200, 60], 'add', .55); };
const smokeAt = (p, k = .3) => { if (fxRand() < k) FX.add({ p: p.slice(), v: [(fxRand() - .5) * 8, (fxRand() - .5) * 8, 22], rgb: [50, 48, 50], size: 5, grow: 9, life: 1.8, mode: 'alpha', alpha: .6 }); if (fxRand() < k * .6) FX.add({ p: p.slice(), v: [0, 0, 18], rgb: [255, 140, 40], size: 3, life: .4, mode: 'add' }); };
Object.assign(MESHDEF, { legX: G => { G.box(0, -3, -3, 30, 3, 3, 'steel-paint'); }, footX: G => { G.box(0, -2.4, -2.4, 30, 2.4, 2.4, 'gunmetal'); } });
const leg = (R, a, b, id = 'legX') => { const d = vsub(b, a), L = vlen(d); R.drawMesh({ mesh: TC.mesh(id), x: a[0], y: a[1], z: a[2], yaw: Math.atan2(d[1], d[0]), pitch: -Math.atan2(d[2], Math.hypot(d[0], d[1])), s: L / 30 }); };

Object.assign(get('boss', 'stingray'), {
  draw(R, B, sim, view) {
    R.drawMesh({ mesh: TC.mesh('stingray'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, roll: B.roll || 0 });
    const c = sim.poseOf(0, 'stand');
    for (const k of ['turretL', 'turretR']) { const p = B.part(k); const base = [p.pos[0], p.pos[1], p.pos[2] - 10]; R.drawMesh({ mesh: TC.mesh('turret'), x: base[0], y: base[1], z: base[2], yaw: p.alive ? Math.atan2(c.y - base[1], c.x - base[0]) : B.yaw + .6, flash: p.flashT > 0 ? .7 : 0 }); if (p.alive) weakGlow(R, view, p.pos, 4); else smokeAt(p.pos, .35); }
    if (B.phase >= 3) for (const l of [[-40, 0, 12], [20, 6, 14], [50, -4, 10]]) smokeAt(TC.boatXY(B, l), .4);
    if (B.phase === 2 && !B.duck) weakGlow(R, view, B.part('barracuda').pos, 3);
  },
  rigAt: B => [B.bx, B.by, B.bz - (B.duck ? 12 : 0), 18, 40]
});
Object.assign(get('boss', 'bulldog'), {
  draw(R, B, sim, view) { R.drawMesh({ mesh: TC.mesh('truck'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, flash: B.part('tank').flashT > 0 ? .5 : 0 }); if (B.part('tank').alive) weakGlow(R, view, B.part('tank').pos, 5); else smokeAt([B.x, B.y, B.z + 30], .6); if (B.u < 1) for (let i = 0; i < 2; i++) FX.add({ p: [B.x - Math.cos(B.yaw) * 40, B.y - Math.sin(B.yaw) * 40, B.z + 4], v: [(fxRand() - .5) * 30, (fxRand() - .5) * 30, 10], rgb: [120, 110, 100], size: 6, grow: 10, life: 1, mode: 'alpha', alpha: .5 }); }
});
Object.assign(get('boss', 'gull'), {
  draw(R, B, sim, view) { if (B.laser > 0 && !B.defeated) { const t = sim.threats.find(x => x.src === 'boss' && !x.done); if (t) { const tp = sim.cameraFor(t.target), k = 1 - t.left / t.dur, from = [B.x, B.y, B.z + 22]; R.line(from, [lerp(tp.x + 40, tp.x, k), lerp(tp.y - 30, tp.y, k), lerp(tp.z - 14, tp.z - 1, k)], [255, 40, 40], 'add', 1); } } },
  rigAt: B => [B.x, B.y, B.z, 14, 36]
});
Object.assign(get('boss', 'hammerhead'), {
  draw(R, B, sim, view) {
    if (B.shield) { const down = B.shieldDown > 0, f = B.yaw, d = 18; R.drawMesh({ mesh: TC.mesh('hatch'), x: B.x + Math.cos(f) * d - (down ? Math.sin(f) * 14 : 0), y: B.y + Math.sin(f) * d + (down ? Math.cos(f) * 14 : 0), z: B.z, yaw: f + (down ? 1.1 : 0) }); }
    if (B.mode === 'spin' || B.mode === 'sweepFire') { const m = [B.x + Math.cos(B.yaw) * 30, B.y + Math.sin(B.yaw) * 30, B.z + 34]; R.splat(m, 3 + Math.sin(view.t * 40) * 1.5, [255, 90, 40], 'add'); if (B.mode === 'sweepFire') { FX.light(m, 140, 1, '#ffb060', .05); if (fxRand() < .7) FX.tracer(m, [m[0] + Math.cos(B.yaw) * 400 + (fxRand() - .5) * 200, m[1] + Math.sin(B.yaw) * 400 + (fxRand() - .5) * 200, m[2] - 20 + fxRand() * 30], [255, 220, 140], .05); } }
  },
  rigAt: B => [B.x, B.y, B.z, 30, 64]
});
Object.assign(get('boss', 'seawolf'), {
  draw(R, B, sim, view) {
    R.drawMesh({ mesh: TC.mesh('seawolf'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, roll: B.bank || 0, flash: B.parts.some(p => p.flashT > 0) ? .4 : 0 });
    R.drawMesh({ mesh: TC.mesh('rotor'), x: B.x, y: B.y, z: B.z + 19, yaw: view.t * 24 });
    for (const k of ['podL', 'podR']) { const p = B.part(k); if (p.alive) weakGlow(R, view, p.pos, 4); else smokeAt(p.pos, .3); }
    if (!B.part('hub').hidden) weakGlow(R, view, B.part('hub').pos, 5);
    if (B.crash > 0) smokeAt([B.x, B.y, B.z + 6], .8);
    if (sim.water > -1e8 && B.z - sim.water < 160 && fxRand() < .5) FX.add({ p: [B.x + (fxRand() - .5) * 120, B.y + (fxRand() - .5) * 120, sim.water + 1], v: [0, 0, 10], rgb: [220, 235, 255], size: 4, grow: 6, life: .8, mode: 'alpha', alpha: .5 });
  }
});
Object.assign(get('boss', 'scylla'), {
  draw(R, B, sim, view) {
    R.drawMesh({ mesh: TC.mesh('scyllaBody'), x: B.x, y: B.y, z: B.z, yaw: B.yaw, roll: B.roll || 0, flash: B.parts.some(p => p.flashT > 0) ? .35 : 0 });
    for (let i = 0; i < 6; i++) {
      const side = i < 3 ? -1 : 1, k = i % 3, a = (k - 1) * .7, knee = B.part('knee' + i);
      const hip = TC.boatXY(B, [Math.cos(a) * 14, side * 18, 8 - B.topple * 6]), foot = TC.boatXY(B, [Math.cos(a) * 44, side * (52 + Math.abs(Math.sin(a)) * 10), -B.z + B.home[2] + (B.toppled ? 4 : 0)]);
      foot[2] = B.home[2]; const kp = knee.pos;
      leg(R, hip, kp); leg(R, kp, foot, 'footX');
      if (knee.alive) weakGlow(R, view, kp, 3.6); else smokeAt(kp, .15);
    }
    if (!B.part('cockpit').hidden) weakGlow(R, view, B.part('cockpit').pos, 7);
    if (B.charge) { const at = TC.boatXY(B, [54, -18, 10]); R.splat(at, 3 + Math.sin(view.t * 30) * 2, [120, 220, 255], 'add'); }
  }
});
Object.assign(get('boss', 'krake'), {
  draw(R, B, sim, view) { R.drawMesh({ mesh: TC.mesh('krakeLever'), x: B.leverAt[0], y: B.leverAt[1], z: B.leverAt[2] - 30, yaw: 0, pitch: B.final > 0 ? -.2 : 0 }); if (B.final > 0) weakGlow(R, view, B.leverAt, 6); },
  rigAt: B => [B.x, B.y, B.z - (B.duck ? 9 : 0), 18, 42]
});

// ===== 46-input.js
// 46-input: the action preset (DualSense standard mapping; keyboard and mouse as a PC shooter expects), each
// player's aim in view units (mouse: absolute, exactly under the pointer like a light gun; pad: a response curve,
// acceleration and aim assist with friction and magnetism; keys: a constant speed), cover hold or toggle, and the
// Command each player gives the Sim. Prompts always come from input.label(). Reads: Sim (20), settings.

const DI = E.Input.DEFAULT;
const TC_INPUT = {
  up: DI.up, down: DI.down, left: DI.left, right: DI.right, start: DI.start, pause: DI.pause, confirm: DI.confirm, cancel: DI.cancel,
  fire: ['Mouse0', 'KeyZ', 'KeyJ', 'Pad7', 'Pad0'],
  cover: ['Mouse2', 'Space', 'KeyX', 'ShiftLeft', 'Pad6', 'Pad1'],
  next: ['KeyE', 'WheelDown', 'Pad5'], prev: ['KeyQ', 'WheelUp', 'Pad4'],
  reload: ['KeyR', 'Pad2'], more: ['KeyM', 'Pad3'],
  w1: ['Digit1'], w2: ['Digit2'], w3: ['Digit3'], w4: ['Digit4'],
  tab: ['Tab', 'Pad4'], tabR: ['Pad5'], reset: ['Backspace', 'Pad2']
};
TC.INPUT = TC_INPUT;
TC.CONTROL_NAMES = { fire: 'Fire', cover: 'Take cover', next: 'Next weapon', prev: 'Previous weapon', reload: 'Quick reload', more: 'More time (AI Hub card)', w1: 'Handgun', w2: 'Machine gun', w3: 'Shotgun', w4: 'Grenade launcher', tab: false, tabR: false, reset: false };

class Aimer {
  constructor(input, i) { this.input = input; this.i = i; this.aim = [0, 0]; this.held = 0; this.coverOn = false; this.lastPtr = null; this.mouseOwned = i === 0; this.skipT = 0; this.dev = 'keyboard'; }
  // vp: the player's viewport { x, y, w, h } in screen pixels; targets: projected [ax, ay, r] (view units)
  build(dt, sim, vp, targets, set = {}) {
    const I = this.input, p = sim.players[this.i], aspect = vp.w / vp.h; if (p) p.aspect = aspect;
    this.dev = I.lastDevice;
    // mouse (player 1 only): exactly under the pointer
    const ptr = this.mouseOwned && I.pointer ? I.pointer() : null;
    if (ptr && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') && (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1] || I.lastDevice === 'mouse')) {
      if (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1]) { this.aim = [(ptr[0] - (vp.x + vp.w / 2)) / (vp.h / 2), -(ptr[1] - (vp.y + vp.h / 2)) / (vp.h / 2)]; this.src = 'mouse'; }
      this.lastPtr = ptr.slice();
    }
    // pad: the right stick (or the left), a response curve, acceleration, assist
    const st = I.padAim || (Math.hypot(I.padMove[0], I.padMove[1]) > .05 ? I.padMove : null);
    if (st && I.lastDevice === 'gamepad') {
      const m = Math.hypot(st[0], st[1]), curve = Math.pow(Math.min(1, m), 2.2) / (m || 1);
      this.held = m > .5 ? this.held + dt : 0; const acc = 1 + Math.min(.5, Math.max(0, this.held - .35) * 1.2);
      let sp = tune.player.padSpeed * (set.padSpeed || 1) * acc;
      const assist = set.aimAssist === undefined ? tune.player.assist : set.aimAssist;
      let near = null, nd = 1e9;
      for (const t of targets) { const d = Math.hypot(t[0] - this.aim[0], t[1] - this.aim[1]) - t[2]; if (d < nd) { nd = d; near = t; } }
      if (near && nd < .07) sp *= 1 - .55 * assist;
      this.aim[0] += st[0] * curve * sp * dt; this.aim[1] -= st[1] * curve * sp * dt;
      if (near && nd < .12 && m > .2) { const k = Math.min(1, assist * 6 * dt); this.aim[0] += (near[0] - this.aim[0]) * k; this.aim[1] += (near[1] - this.aim[1]) * k; }
      this.src = 'pad';
    }
    // keys: a constant speed (also the d-pad nudge)
    const kx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0), ky = (I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0);
    if ((kx || ky) && !st) { this.aim[0] += kx * 1.2 * dt; this.aim[1] += ky * 1.2 * dt; }
    this.aim[0] = clamp(this.aim[0], -aspect, aspect); this.aim[1] = clamp(this.aim[1], -1, 1);
    // cover: hold or toggle
    const toggle = set.coverMode === 'Toggle';
    if (toggle) { if (I.pressed('cover')) this.coverOn = !this.coverOn; } else this.coverOn = I.down('cover');
    if (sim.phase !== 'action') this.coverOn = toggle ? false : this.coverOn;
    // cutscene: confirm advances, held 0.6 s skips
    const adv = I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked() && this.i === 0);
    this.skipT = (I.down('confirm') || I.down('fire')) ? this.skipT + dt : 0;
    const sel = I.pressed('w1') ? 1 : I.pressed('w2') ? 2 : I.pressed('w3') ? 3 : I.pressed('w4') ? 4 : 0;
    return { aim: this.aim.slice(), fireDown: I.down('fire'), fireP: I.pressed('fire'), cover: this.coverOn, next: I.pressed('next'), prev: I.pressed('prev'), sel, reload: I.pressed('reload') || I.down('reload'), advance: adv, skip: this.skipT >= .6, autoFire: set.autoFire !== false };
  }
}
TC.Aimer = Aimer;

// targets for the aim assist (and the bot): projected view-unit points of what can be shot, never civilians
TC.assistTargets = (sim, i) => {
  const cs = sim.camSetupFor(i), out = [];
  const add = (p, r) => { const v = projectVU(cs, p); if (v) out.push([v[0], v[1], r / (v[2] * cs.t)]); };
  for (const e of sim.enemies) if (!e.dead && e.vols && e.up > .5) for (const v of e.vols) { if (v.part === 'head') add(v.c, v.r); else if (v.part === 'body' && !v.cap) add(v.c, v.r); else if (v.part === 'body') add(vlerp(v.a, v.b, .5), v.r + 3); }
  for (const pr of sim.projectiles) if (pr.shootable && pr.team === 'enemy') add(pr.pos, pr.r);
  for (const ob of sim.objects) if (!ob.dead && (ob.K.bonus || ob.K.objective)) add(ob.pos, ob.r);
  if (sim.boss) for (const pt of sim.boss.parts) if (pt.alive && pt.pos && !pt.hidden && !pt.armor) add(pt.pos, pt.r);
  return out;
};

// a prompt label for an action on the device the player used last (keyboard and mouse share one family)
TC.label = (input, action, dev) => { const d = dev || input.lastDevice; const l = input.label(action, d === 'touch' ? 'keyboard' : d); return l || '?'; };

// ===== 50-hud.js
// 50-hud: the canvas pixel HUD per viewport, anchored to the viewport's edges. TIME (a plate whose water rises as time
// runs out), SCORE and the chain, LIFE badges, the weapon panel (pips, ammo, a reload ring, the weapon strip), the
// reticle (cross, ring, dot; S/M/L), hit markers, ACTION! and WAIT, banners (TIME EXTEND, TIDE'S IN!, pickups, NEW
// WEAPON, 1UP!), score popups at world points, crisis rings with a "!" and edge arrows, the cover vignette tag, the
// radio box with a live portrait, device-aware prompts, boss bars, the continue countdown and the teammate strip.
// Reads: Sim state, WorldView's Rail3D (projection), input labels.

const UI = { bg: ['#10244a', '#081428'], accent: '#3aa0e8', text: '#f4f7ff', gold: '#ffd36a', warn: '#ff3b30', dim: '#8aa0c8' };
TC.UI = UI;
const txt = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"');   // the font has ✕ ○ □ △ — … · (engine patch 5)
TC.txt = txt;
const T = (g, s, x, y, c = UI.text, o = {}) => E.font.text(g, txt(s), Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000000', outline: false }, o));
TC.T = T;
const TW = (s, o = {}) => E.font.width(txt(s), o);
const WICON = {
  hg: E.sprite(['..######', '.##ww###', '########', '###.....', '##......'], { '#': '#c8d0e0', w: '#ffffff' }, 1),
  mg: E.sprite(['.##########.', '############', '####..#.....', '###...#.....', '##..........'], { '#': '#c8d0e0' }, 1),
  sg: E.sprite(['##############', '##############', '####.##.......', '###...........'], { '#': '#e0c890' }, 1),
  gl: E.sprite(['..########', '.##########', '###oooo####', '###.....##.', '##.........'], { '#': '#a8c890', o: '#ffd36a' }, 1)
};
const BADGE = E.sprite(['.rrrrr.', 'rwwwwwr', 'rwrrrwr', 'rwwwwwr', '.rwwwr.', '..rwr..', '...r...'], { r: '#e8443a', w: '#fff3e0' }, 1);
const BADGE_OFF = E.sprite(['.ddddd.', 'd.....d', 'd.....d', 'd.....d', '.d...d.', '..d.d..', '...d...'], { d: '#5a6078' }, 1);
const PIP = E.sprite(['ww', 'yy', 'yy', 'yy'], { w: '#fff0c0', y: '#e0a030' }, 1), PIP_OFF = E.sprite(['..', 'dd', 'dd', 'dd'], { d: '#3a3f58' }, 1);

class Hud {
  constructor(i) { this.i = i; this.pop = []; this.banners = []; this.markers = []; this.action = 0; this.strip = 0; this.flashR = 0; this.radio = null; this.radioQ = []; this.prompt = null; this.seen = {}; this.muzzle = 0; this.edge = 0; this.ring = 0; }
  banner(text, color = UI.gold, dur = 1.4, scale = 2) { this.banners.push({ text, color, t: 0, dur, scale }); if (this.banners.length > 3) this.banners.shift(); }
  // events from the Sim (and presentation) for this player
  onEvent(e, sim, view, game) {
    const mine = e.p === this.i;
    switch (e.type) {
      case 'points': if (mine && e.at) this.pop.push({ at: e.at.slice(), v: e.v, t: 0, c: e.v < 0 ? UI.warn : e.why === 'kill' ? UI.gold : UI.text }); break;
      case 'hit': if (mine) this.markers.push({ t: 0, gold: e.head }); break;
      case 'bosshit': if (mine) this.markers.push({ t: 0, gold: false }); break;
      case 'action': this.action = 1.2; break;
      case 'extend': this.banner('TIME EXTEND +' + e.s, '#7fe3ff'); break;
      case 'timeup': this.banner("TIDE'S IN!", UI.warn, 1.8, 3); break;
      case 'pickup': if (mine) { const w = get('weapon', e.w); this.banner((e.first ? 'NEW WEAPON: ' : '') + w.short + ' +' + e.n, '#ffb347', e.first ? 2.2 : 1.4); this.strip = 1.5; } break;
      case 'switch': if (mine) this.strip = .9; break;
      case 'extra': if (mine) this.banner('1UP!', '#8aff8a'); break;
      case 'hurt': if (mine) { this.flashR = .5; } break;
      case 'shot': if (mine) this.muzzle = .06; break;
      case 'empty': if (mine) this.banner('RELOAD!', UI.warn, .7, 2); break;
      case 'clear': this.banner(e.bonus ? 'AREA CLEAR  +' + e.bonus : 'AREA CLEAR', UI.gold, 1.4, 2); break;
      case 'headshot': if (mine) this.banner('HEADSHOT', UI.gold, .6, 1); break;
      case 'shotdown': if (mine) this.banner('SHOT DOWN +1000', '#7fe3ff', .8, 1); break;
      case 'civhit': if (mine) this.banner('CIVILIAN HIT!', UI.warn, 1.4, 2); break;
      case 'intel': if (mine) this.banner('INTEL FOUND', '#8aff8a', 1.6, 2); break;
      case 'finalshot': this.banner('FINAL SHOT!', UI.warn, 2.4, 3); break;
      case 'stageclear': this.banner('STAGE CLEAR', UI.gold, 3, 4); break;
      case 'prompt': this.showPrompt(e.id); break;
      case 'say': if (!e.modal) { this.radioQ.push({ speaker: e.speaker, text: e.text }); if (this.radioQ.length > 4) this.radioQ.shift(); } break;
      case 'surge': this.banner('TIDE RISING!', '#7fe3ff', 1.6, 3); break;
      case 'armor': if (mine) this.banner('ARMORED — USE THE GL OR SHOTGUN', '#c8d0e0', .9, 1); break;
    }
  }
  showPrompt(id) { if (this.seen[id] || this.noPrompts) return; this.seen[id] = true; this.prompt = { id, t: 0, dur: id === 'torpedo' ? 3 : 4.5 }; }
  step(dt) {
    for (const p of this.pop) p.t += dt; this.pop = this.pop.filter(p => p.t < 1.1);
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.dur);
    for (const m of this.markers) m.t += dt; this.markers = this.markers.filter(m => m.t < .25);
    this.action = Math.max(0, this.action - dt); this.strip = Math.max(0, this.strip - dt); this.flashR = Math.max(0, this.flashR - dt); this.muzzle = Math.max(0, this.muzzle - dt);
    if (this.prompt) { this.prompt.t += dt; if (this.prompt.t > this.prompt.dur) this.prompt = null; }
    if (this.radio) { this.radio.t += dt; if (this.radio.t > this.radio.dur) this.radio = null; }
    if (!this.radio && this.radioQ.length) { const r = this.radioQ.shift(); this.radio = { speaker: r.speaker, text: r.text, t: 0, dur: clamp(r.text.length * .055 + 1.4, 2.4, 4.6) }; }
  }
  // ------------------------------------------------------------ draw over the viewport (after present)
  draw(g, sim, vp, R, ctx) {
    const p = sim.players[this.i]; if (!p) return;
    const x0 = vp.x, y0 = vp.y, W = vp.w, H = vp.h, cx = x0 + W / 2, small = W < 300, set = ctx.settings || {}, input = ctx.input;
    if (tune.view.hideHud) return;
    const cut = sim.phase === 'cut';
    if (cut) return;
    // ---- crisis rings and edge arrows (under the rest)
    this.drawThreats(g, sim, vp, R, set);
    // ---- the player's muzzle flash and the cover tag
    if (this.muzzle > 0 && p.c < .3) { const mx = x0 + W - 24, my = y0 + H - 18; E.px.blend(g, .8, 'add', () => { E.px.disc(g, mx, my, 9, '#ffb347'); E.px.disc(g, mx - 6, my - 5, 5, '#fff3b0'); }); }
    // ---- reticle
    if (sim.phase === 'action' && p.c < .5 && !p.out) this.drawReticle(g, sim, vp, p, set);
    // ---- hit markers
    for (const m of this.markers) { const a = sim.players[this.i].aim, sx = cx + a[0] * H / 2, sy = y0 + H / 2 - a[1] * H / 2, s = 4 + m.t * 10, c = m.gold ? UI.gold : '#ffffff'; E.px.line(g, sx - s, sy - s, sx - s + 3, sy - s + 3, c); E.px.line(g, sx + s, sy - s, sx + s - 3, sy - s + 3, c); E.px.line(g, sx - s, sy + s, sx - s + 3, sy + s - 3, c); E.px.line(g, sx + s, sy + s, sx + s - 3, sy + s - 3, c); }
    // ---- score popups at world points
    for (const pp of this.pop) { const s = R.project(pp.at); if (!s) continue; T(g, (pp.v > 0 ? '+' : '') + pp.v, x0 + s[0], y0 + s[1] - pp.t * 18, pp.c, { align: 'center', outline: '#000' }); }
    // ---- top: TIME, SCORE
    this.drawTime(g, sim, vp, small);
    const sc = String(p.score).padStart(7, '0'), sy = y0 + (small ? 36 : 0);
    T(g, (p.name === 'P1' || !ctx.hub ? 'SCORE' : p.name) + (small && sim.players.length > 1 ? ' ' + p.name : ''), x0 + 6, sy + 5, UI.dim);
    T(g, sc, x0 + 6, sy + 14, '#ffffff', { scale: 2 });
    if (p.contMark) T(g, 'C' + p.contMark, x0 + 8 + TW(sc, { scale: 2 }), sy + 14, UI.warn);
    const mul = 1 + Math.min(10, Math.floor(p.chain / 5)) * .1;
    if (p.chain >= 5) T(g, 'x' + mul.toFixed(1) + '  CHAIN ' + p.chain, x0 + 6, sy + 31, UI.gold);
    // ---- boss bars under TIME
    if (sim.boss && !sim.boss.defeated && sim.boss.intro <= 0) { const bars = TC.bossBars(sim.boss); bars.forEach((b, k) => { const bw = Math.min(150, W * .42), bx = cx - bw / 2, by = y0 + 38 + k * 12; T(g, b.label, bx, by - 1, '#ffb0a0', { font: 'tiny' }); E.ui.bar(g, bx, by + 5, bw, 4, b.f, b.f < .25 ? '#ff3b30' : '#ff8a3a'); }); }
    // ---- bottom left: LIFE
    const ly = y0 + H - 16;
    T(g, 'LIFE', x0 + 6, ly - 9, UI.dim);
    const shown = Math.max(p.lives, 0);
    for (let k = 0; k < Math.max(shown, Math.min(9, sim.diff.lives)); k++) E.px.sprite(g, k < shown ? BADGE : BADGE_OFF, x0 + 6 + k * 9, ly, false);
    if (shown > 9) T(g, 'x' + shown, x0 + 6 + 9 * 9, ly, '#fff');
    if (this.flashR > 0 && ((this.flashR * 20) | 0) % 2) { E.px.rect(g, x0, y0, W, 2, UI.warn); E.px.rect(g, x0, y0 + H - 2, W, 2, UI.warn); E.px.rect(g, x0, y0, 2, H, UI.warn); E.px.rect(g, x0 + W - 2, y0, 2, H, UI.warn); }
    // ---- bottom right: the weapon panel
    this.drawWeapon(g, sim, vp, p, input);
    // ---- center texts
    if (sim.phase === 'travel') { if (((sim.t * 3) | 0) % 2) E.font.title(g, 'WAIT', cx, y0 + H * .42, { scale: small ? 2 : 3, colors: ['#ffffff', '#9fe3ff', '#3aa0e8'], outline: '#08142a', align: 'center' }); }
    if (this.action > 0) { const k = clamp((1.2 - this.action) / .15, 0, 1), off = (1 - k) * W * .5; E.font.title(g, 'ACTION!', cx + off, y0 + H * .38, { scale: small ? 3 : 4, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#1a0808', depth: 2, align: 'center' }); }
    if (p.c >= .5 && sim.phase === 'action') T(g, p.reloadT > 0 || p.mag < 9 ? 'COVER · RELOADING' : 'COVER', cx, y0 + H - 12, '#9fe3ff', { align: 'center' });
    if (p.mag === 0 && p.w === 'hg' && sim.phase === 'action' && p.c < .5 && ((sim.t * 4) | 0) % 2) T(g, 'RELOAD!', cx, y0 + H * .58, UI.warn, { align: 'center', scale: 2 });
    this.banners.forEach((b, k) => { const a = b.t < .12 ? b.t / .12 : 1; T(g, b.text, cx, y0 + H * .27 + k * 14 * (b.scale > 2 ? 1.6 : 1) - (1 - a) * 6, b.color, { align: 'center', scale: small ? Math.min(2, b.scale) : b.scale, outline: '#000000' }); });
    // ---- radio box (top), prompts (bottom center)
    this.bossShown = !!(sim.boss && !sim.boss.defeated && sim.boss.intro <= 0);
    if (this.radio && set.subtitles !== false) this.drawRadio(g, vp, this.radio, ctx);
    if (this.prompt) this.drawPrompt(g, sim, vp, input);
    // ---- continue
    if (p.out) { E.ui.box(g, cx - 70, y0 + H / 2 - 26, 140, 52, { bg: UI.bg, border: UI.accent }); T(g, ctx.hub ? 'BACK IN…' : 'CONTINUE?', cx, y0 + H / 2 - 20, '#ffffff', { align: 'center', scale: 2 }); T(g, Math.ceil(p.cont), cx, y0 + H / 2 - 4, UI.gold, { align: 'center', scale: 3 }); if (!ctx.hub) T(g, 'PRESS ' + TC.label(input, 'confirm'), cx, y0 + H / 2 + 18, UI.dim, { align: 'center' }); }
    // ---- teammates (AI Hub)
    if (ctx.hub && sim.players.length > 1) { let ty = y0 + 6; for (const q of sim.players) { if (q.i === this.i) continue; const tx = x0 + W - 90; E.px.rect(g, tx, ty, 6, 6, q.color); T(g, q.name.slice(0, 10), tx + 9, ty - 1, q.left ? '#666' : '#fff'); T(g, (q.out ? 'OUT' : q.lives + '♥') + (q.c >= .5 ? ' •' : ''), tx + 66, ty - 1, q.out ? UI.warn : UI.gold); ty += 10; } }
  }
  drawTime(g, sim, vp, small) {
    const W = vp.w, cx = vp.x + W / 2, y = vp.y + 3, w = 92, h = 30, t = Math.max(0, sim.timer), frac = sim.timeMax ? 1 - t / sim.timeMax : 0;
    E.ui.box(g, cx - w / 2, y, w, h, { bg: ['#0a1a34', '#06101e'], border: '#3aa0e8', alpha: .9 });
    // the tide rising inside the plate
    const wl = Math.round((h - 4) * clamp(frac, 0, 1)), wy = y + h - 2 - wl;
    for (let xx = 0; xx < w - 4; xx++) { const s = Math.sin(xx * .35 + sim.t * 4) * 1.2; E.px.rect(g, cx - w / 2 + 2 + xx, wy + s, 1, Math.max(0, wl - s), t < 10 ? '#5a1a2a' : '#163e6a'); }
    const red = t < 10, blink = t < 5 && ((sim.t * 4) | 0) % 2;
    T(g, 'TIME', cx, y + 2, red ? '#ff8a80' : UI.dim, { align: 'center', font: 'tiny' });
    if (!blink) T(g, t.toFixed(2), cx, y + 10, red ? UI.warn : '#ffffff', { align: 'center', scale: 2 });
  }
  drawReticle(g, sim, vp, p, set) {
    const a = p.aim, sx = Math.round(vp.x + vp.w / 2 + a[0] * vp.h / 2), sy = Math.round(vp.y + vp.h / 2 - a[1] * vp.h / 2), style = set.reticle || 'Cross', size = { S: .7, M: 1, L: 1.4 }[set.reticleSize || 'M'] || 1;
    const col = p.color, out = '#ffffff', s = Math.round(6 * size), b = p.bloom ? Math.round(p.bloom * 1.5) : 0;
    const L = (x0, y0, x1, y1) => { E.px.line(g, x0, y0 + 1, x1, y1 + 1, '#000000'); E.px.line(g, x0, y0, x1, y1, col); };
    if (style === 'Cross') { L(sx - s - b - 3, sy, sx - 2 - b, sy); L(sx + 2 + b, sy, sx + s + b + 3, sy); L(sx, sy - s - b - 3, sx, sy - 2 - b); L(sx, sy + 2 + b, sx, sy + s + b + 3); E.px.dot(g, sx, sy, out); }
    else if (style === 'Ring') { for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; E.px.dot(g, sx + Math.cos(an) * (s + b), sy + Math.sin(an) * (s + b), k % 2 ? col : out); } E.px.dot(g, sx, sy, out); }
    else { E.px.disc(g, sx, sy, Math.max(1, s * .35), '#000000'); E.px.disc(g, sx, sy, Math.max(1, s * .25), col); }
  }
  drawThreats(g, sim, vp, R, set) {
    const big = set.threatSize === 'Large' ? 2 : 1;
    for (const t of sim.threats) {
      if (t.done || t.cancelled) continue;
      const mine = t.target === this.i, p = R.project(t.at || [0, 0, 0]);
      const k = clamp(t.left / t.dur, 0, 1), rad = (6 + 20 * k) * big;
      if (p && p[0] >= 0 && p[0] < vp.w && p[1] >= 0 && p[1] < vp.h) {
        const x = vp.x + p[0], y = vp.y + p[1];
        if (!mine) { for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; E.px.dot(g, x + Math.cos(an) * rad * .6, y + Math.sin(an) * rad * .6, '#ff9a8a'); } continue; }
        const n = Math.max(16, rad * 4 | 0);
        for (let a = 0; a < n; a++) { const an = a / n * Math.PI * 2; E.px.rect(g, x + Math.cos(an) * rad - 1, y + Math.sin(an) * rad - 1, 2, 2, '#ff2a1a'); }
        for (let a = 0; a < n; a++) { const an = a / n * Math.PI * 2; E.px.dot(g, x + Math.cos(an) * (rad - 2), y + Math.sin(an) * (rad - 2), '#ffffff'); }
        E.px.blend(g, .6, 'add', () => E.px.disc(g, x, y, 3 + (1 - k) * 3, '#ff6a40'));
        T(g, '!', x - 1, y - 18 - (big - 1) * 10, '#ffffff', { outline: '#ff2a1a', scale: big + 1 });
        if (t.kind === 'torpedo') T(g, 'SHOOT IT!', x, y + rad + 4, '#7fe3ff', { align: 'center', outline: '#000' });
      } else if (mine) {
        // the edge arrow toward an off-screen shooter
        const dx = p ? p[0] - vp.w / 2 : (t.at ? 1 : 0), dy = p ? p[1] - vp.h / 2 : 0, an = Math.atan2(dy, dx), ex = vp.x + vp.w / 2 + Math.cos(an) * (vp.w / 2 - 14), ey = vp.y + vp.h / 2 + Math.sin(an) * (vp.h / 2 - 14);
        const pts = [[ex + Math.cos(an) * 9, ey + Math.sin(an) * 9], [ex + Math.cos(an + 2.4) * 8, ey + Math.sin(an + 2.4) * 8], [ex + Math.cos(an - 2.4) * 8, ey + Math.sin(an - 2.4) * 8]];
        if (((sim.t * 8) | 0) % 2) E.px.poly(g, pts, '#ff2a1a'); T(g, '!', ex - 1, ey - 4, '#ffffff', { outline: '#ff2a1a' });
      }
    }
    // the FINAL SHOT ring over the lever arm
    const B = sim.boss; if (B && B.id === 'krake' && B.final > 0) { const p = R.project(B.leverAt); if (p) { const x = vp.x + p[0], y = vp.y + p[1], rad = 8 + B.final / 3 * 26; for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 2; E.px.rect(g, x + Math.cos(an) * rad - 1, y + Math.sin(an) * rad - 1, 2, 2, a % 2 ? '#ffd36a' : '#ffffff'); } T(g, 'SHOOT THE LEVER!', x, y + rad + 6, UI.gold, { align: 'center', outline: '#000' }); } }
  }
  drawWeapon(g, sim, vp, p, input) {
    const x1 = vp.x + vp.w - 6, y1 = vp.y + vp.h - 6, w = get('weapon', p.w), inf = sim.cheats.ammo || tune.player.infAmmo;
    const ic = WICON[p.w];
    E.ui.box(g, x1 - 84, y1 - 28, 84, 28, { bg: ['#0a1a34', '#06101e'], border: p.switchT > 0 ? UI.gold : '#3aa0e8', alpha: .85 });
    E.px.sprite(g, ic, x1 - 80, y1 - 24, false);
    T(g, w.name, x1 - 64, y1 - 25, '#ffffff', { font: 'tiny' });
    if (p.w === 'hg') { for (let k = 0; k < 9; k++) E.px.sprite(g, k < p.mag ? PIP : PIP_OFF, x1 - 64 + k * 4, y1 - 14, false); T(g, 'INF', x1 - 24, y1 - 14, UI.dim, { font: 'tiny' }); }
    else { T(g, inf ? 'INF' : p.ammo[p.w], x1 - 64, y1 - 18, '#ffffff', { scale: 2 }); E.ui.bar(g, x1 - 30, y1 - 13, 24, 3, inf ? 1 : p.ammo[p.w] / w.pool, '#ffb347'); }
    if (p.c >= .5 && p.mag < 9) { const k = clamp(p.reloadT / tune.player.reload, 0, 1); E.ui.bar(g, x1 - 80, y1 - 6, 76, 2, k, '#7fe3ff'); }
    if (this.strip > 0) {
      const ws = TC.WEAPONS; ws.forEach((id, k) => { const have = id === 'hg' || p.ammo[id] > 0 || (inf && p.owned[id]); const bx = x1 - 84 + k * 21, by = y1 - 44; E.ui.box(g, bx, by, 19, 14, { bg: id === p.w ? ['#3a5a8a', '#20304a'] : ['#101c30', '#0a1220'], border: id === p.w ? UI.gold : '#2a3a5a', alpha: have ? .95 : .5 }); E.px.sprite(g, WICON[id], bx + 2, by + 4, false); T(g, k + 1, bx + 14, by + 1, have ? '#fff' : '#555', { font: 'tiny' }); });
      T(g, TC.label(input, 'prev') + ' / ' + TC.label(input, 'next'), x1 - 42, y1 - 54, UI.dim, { align: 'center', font: 'tiny' });
    }
  }
  drawRadio(g, vp, r, ctx) {
    const spk = has('speaker', r.speaker) ? get('speaker', r.speaker) : null, w = Math.min(vp.w - 120, 260), x = vp.x + vp.w / 2 - w / 2, y = vp.y + 37 + (this.bossShown ? 26 : 0);
    E.ui.box(g, x, y, w, 30, { bg: UI.bg, border: spk ? spk.color : UI.accent, alpha: .88 });
    const rig = ctx.portrait(r.speaker); if (rig) rig.drawPortrait(g, x + 3, y + 3, 24, { zoom: 2.4, turn: .5, bg: '#0a1426', frame: false });
    T(g, spk ? spk.name : '', x + 31, y + 3, spk ? spk.color : UI.gold, { font: 'tiny' });
    const shown = txt(r.text).slice(0, Math.floor(r.t * 40)), lines = E.font.wrap(shown, w - 36);
    lines.slice(0, 2).forEach((l, k) => T(g, l, x + 31, y + 10 + k * 9, '#ffffff'));
  }
  drawPrompt(g, sim, vp, input) {
    const id = this.prompt.id, L = a => '[' + TC.label(input, a) + ']';
    const txt = { cover: 'HOLD ' + L('cover') + ' TO TAKE COVER', reload: 'YOU RELOAD IN COVER  ·  ' + L('reload') + ' QUICK RELOAD', torpedo: "COVER WON'T STOP IT — SHOOT THE TORPEDO!", switch: L('prev') + ' / ' + L('next') + ' — OR FIRE IN COVER — TO SWITCH', shield: 'SHOTGUN OR GRENADE KNOCKS THE SHIELD ASIDE', civ: "DON'T SHOOT CIVILIANS", aim: 'AIM ' + (input.lastDevice === 'gamepad' ? '[STICK]' : '[MOUSE]') + '  ·  FIRE ' + L('fire') }[id] || id;
    const w = TW(txt) + 16, x = vp.x + vp.w / 2 - w / 2, y = vp.y + vp.h - 40;
    E.ui.box(g, x, y, w, 14, { bg: ['#203a6a', '#10203e'], border: UI.gold, alpha: .92 }); T(g, txt, vp.x + vp.w / 2, y + 3, '#ffffff', { align: 'center' });
  }
}
TC.Hud = Hud;

// ===== 51-screens.js
// 51-screens: the 10-foot screens. A big-focus list (d-pad, stick or arrows move; hover moves the focus; a click,
// Enter or Cross picks; Circle, Esc or a right click goes back), the title (a flyover of the night harbor rendered by
// Rail3D, the logo, device-aware PRESS prompts), the touch-only notice, briefings over a map of the Lumen Isles,
// results with count-ups and a rank stamp, records (tables, the range's best, INTEL), about (pages), how to play
// (device-aware), and the credits roll. Reads: input labels (46), UI (50), Session (60).

class ListMenu {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.o = o; this.t = 0; this.rects = []; this.lastPtr = null; while (this.items[this.i] && this.items[this.i].disabled) this.i++; }
  update(dt, game) {
    const I = game.input; this.t += dt;
    const mv = d => { const n = this.items.length; let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; this.t = 0; game.audio.sfx && game.audio.sfx('tc-ui'); } };
    if (I.repeat('down', .3, .1)) mv(1); if (I.repeat('up', .3, .1)) mv(-1);
    const ptr = I.pointer ? I.pointer() : null;
    if (ptr && (!this.lastPtr || ptr[0] !== this.lastPtr[0] || ptr[1] !== this.lastPtr[1])) { const k = this.rects.findIndex(r => ptr[0] >= r[0] && ptr[0] < r[0] + r[2] && ptr[1] >= r[1] && ptr[1] < r[1] + r[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; game.audio.sfx && game.audio.sfx('tc-ui'); } }
    this.lastPtr = ptr ? ptr.slice() : null;
    const cl = I.clicked ? I.clicked() : null;
    if (cl) { const k = this.rects.findIndex(r => cl[0] >= r[0] && cl[0] < r[0] + r[2] && cl[1] >= r[1] && cl[1] < r[1] + r[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(game); } }
    if (I.pressed('confirm') || I.pressed('start')) return this.pick(game);
    if ((I.pressed('cancel') || I.pressed('cover') && I.lastDevice === 'mouse') && this.o.back) { game.audio.sfx && game.audio.sfx('tc-uiback'); this.o.back(); return true; }
    return false;
  }
  pick(game) { const it = this.items[this.i]; if (!it || it.disabled) return false; game.audio.sfx && game.audio.sfx('tc-uiok'); game.input.consumeAll(); it.on && it.on(); return true; }
  draw(g, r, x, y, o = {}) {
    const w = o.w || Math.min(r.W - 40, 260), rowH = o.rowH || 20; this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * rowH, on = k === this.i, xx = x - w / 2;
      this.rects.push([xx, yy - 2, w, rowH - 2]);
      if (on) { E.ui.box(g, xx, yy - 2, w, rowH - 2, { bg: ['#2a5aa0', '#10305e'], border: UI.gold }); const wave = Math.sin(this.t * 6) * 2; T(g, '▸', xx + 6 + wave, yy + 2, UI.gold, { scale: 2 }); }
      T(g, it.label, x, yy + (on ? 1 : 3), it.disabled ? '#5a6078' : on ? '#ffffff' : '#b8c8e8', { align: 'center', scale: on ? 2 : 1, outline: '#000' });
    });
    const cur = this.items[this.i]; if (cur && cur.desc && o.desc !== false) { const dy = o.descY || (r.H - 26); E.ui.box(g, r.W / 2 - Math.min(r.W - 40, 300) / 2, dy - 3, Math.min(r.W - 40, 300), 13, { bg: ['#10244a', '#081428'], border: '#2a5aa0', alpha: .85 }); T(g, cur.desc, r.W / 2, dy, '#cfe0ff', { align: 'center' }); }
  }
}
TC.ListMenu = ListMenu;

// ---- the screen frame: a gradient backdrop with a slow wave band, a title, a hint line
function frame(g, r, title, t) {
  E.px.rect(g, 0, 0, r.W, r.H, '#060e1e');
  for (let y = 0; y < r.H; y += 2) { const k = y / r.H; E.px.rect(g, 0, y, r.W, 2, mixHex('#0b1a3a', '#040814', k)); }
  for (let x = 0; x < r.W; x += 2) { const h = Math.sin(x * .05 + t * 1.4) * 4 + Math.sin(x * .013 - t) * 6; E.px.rect(g, x, r.H - 34 + h, 2, 34 - h, '#0e2a52'); E.px.rect(g, x, r.H - 34 + h, 2, 1, '#3aa0e8'); }
  if (title) E.font.title(g, title, r.W / 2, 12, { scale: 2, colors: ['#ffffff', '#9fe3ff', '#3aa0e8'], outline: '#08142a', align: 'center' });
}
TC.frame = frame;
function hintLine(g, r, input, parts) { const s = parts.map(([a, txt]) => '[' + TC.label(input, a) + '] ' + txt).join('   '); T(g, s, r.W / 2, r.H - 11, '#cfe0ff', { align: 'center' }); }
TC.hintLine = hintLine;
function logo(g, r, y, t, scale = 4) {
  E.font.title(g, 'TIDE CRISIS', r.W / 2 - 12, y, { scale, colors: ['#ffffff', '#9fe3ff', '#3aa0e8', '#1a4f9c'], outline: '#08142a', depth: 3, depthColor: '#08142a', align: 'center' });
  const w = E.font.width('TIDE CRISIS', { scale }); E.font.title(g, '3', r.W / 2 + w / 2 - 4, y - 6, { scale: scale + 2, colors: ['#fff3b0', '#ffb347', '#ff5a2a', '#a81e1e'], outline: '#1a0808', depth: 3, depthColor: '#3a0808' });
  const by = y + scale * 9 + 4; for (let x = r.W / 2 - w / 2 - 10; x < r.W / 2 + w / 2 + 20; x += 2) { const h = Math.sin(x * .2 + t * 4) * 1.5; E.px.rect(g, x, by + h, 2, 2, '#3aa0e8'); E.px.rect(g, x, by + 3 + h, 2, 1, '#9fe3ff'); }
}
TC.logo = logo;

// ---- touch-only: no fine pointer, no pad, no key pressed yet
TC.touchOnly = (game) => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (TC._keyed || (game.input.lastDevice === 'gamepad') || (game.input.lastDevice === 'keyboard' && TC._keyed)) return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches, fine = window.matchMedia('(any-pointer: fine)').matches;
  return coarse && !fine;
};

// ---- the map of the Lumen Isles (briefings and the hub card)
function islesMap(g, x, y, w, h, stage, t) {
  E.ui.box(g, x, y, w, h, { bg: ['#0a2a4a', '#06162c'], border: '#3aa0e8' });
  for (let yy = y + 2; yy < y + h - 2; yy += 6) for (let xx = x + 2; xx < x + w - 2; xx += 6) if (((xx + yy) / 6 | 0) % 2) E.px.dot(g, xx, yy, '#0e3458');
  const isl = [[.28, .55, .2, .26, '#3a6a3a'], [.62, .38, .16, .18, '#4a6a3a'], [.78, .7, .1, .1, '#5a5a4a']];
  for (const [ix, iy, iw, ih, c] of isl) { E.px.ell ? E.px.ell(g, x + ix * w, y + iy * h, iw * w, ih * h, c) : E.px.disc(g, x + ix * w, y + iy * h, iw * w, c); }
  E.px.rect(g, x + .18 * w, y + .78 * h, .5 * w, 3, '#c8c8d0');   // the Tidewall
  const marks = { 1: [.3, .48, 'PORT LUMEN'], 2: [.64, .3, "GULL'S REST"], 3: [.42, .79, 'THE TIDEWALL'] };
  for (const k in marks) { const [mx, my, name] = marks[k], on = +k === stage; E.px.disc(g, x + mx * w, y + my * h, on ? 3 + Math.sin(t * 6) : 2, on ? '#ff5a2a' : '#ffd36a'); T(g, name, x + mx * w + 6, y + my * h - 4, on ? '#ffffff' : '#9fc3e8', { font: 'tiny' }); }
  T(g, 'LUMEN ISLES', x + 4, y + 3, '#9fe3ff', { font: 'tiny' });
}
TC.islesMap = islesMap;

// ---- briefing pages (an overlay used by the play scene before each stage)
class Briefing {
  constructor(id, portrait) { this.B = get('briefing', id); this.i = 0; this.t = 0; this.portrait = portrait; this.done = false; this.voiced = -1; }
  update(dt, game) {
    this.t += dt; const I = game.input, line = this.B.lines[this.i];
    if (this.voiced !== this.i) { this.voiced = this.i; TC.Voice.say(game, line[1], line[0]); }
    const n = Math.floor(this.t * 42);
    if (I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked())) { if (n < line[1].length) this.t = 99; else { this.i++; this.t = 0; if (this.i >= this.B.lines.length) this.done = true; } }
    if (I.pressed('cancel') || I.pressed('start')) this.done = true;
  }
  draw(g, r, game) {
    const st = get('stage', this.B.stage); frame(g, r, null, this.t + this.i);
    T(g, 'BRIEFING · STAGE ' + st.id, 10, 8, '#9fe3ff'); E.font.title(g, st.name, 10, 18, { scale: 2, colors: ['#ffffff', '#ffd36a'], outline: '#000' }); T(g, st.place + ' · ' + st.clock, 10, 36, '#cfe0ff');
    const mw = Math.min(r.W * .45, 200), mh = mw * .62; islesMap(g, r.W - mw - 10, 10, mw, mh, st.id, this.t);
    T(g, 'OBJECTIVES', 10, 52, UI.gold); this.B.objectives.forEach((o, k) => T(g, '▸ ' + o, 14, 63 + k * 10, '#ffffff'));
    const line = this.B.lines[Math.min(this.i, this.B.lines.length - 1)], spk = get('speaker', line[0]), w = r.W - 20, y = r.H - 78;
    E.ui.box(g, 10, y, w, 54, { bg: UI.bg, border: spk.color });
    const rig = this.portrait(line[0]); if (rig) rig.drawPortrait(g, 15, y + 6, 42, { zoom: 2.6, turn: .5, bg: '#0a1426', frame: true });
    T(g, spk.name, 64, y + 5, spk.color);
    E.font.wrap(TC.txt(line[1]).slice(0, Math.floor(this.t * 42)), w - 64).slice(0, 3).forEach((l, k) => T(g, l, 64, y + 16 + k * 10, '#ffffff'));
    hintLine(g, r, game.input, [['confirm', 'NEXT'], ['cancel', 'SKIP']]);
  }
}
TC.Briefing = Briefing;

// ---- results: count-ups, bonuses and the rank stamp
class Results {
  constructor(sim, p) {
    const s = p.stats, b = p.stageStats || {}, d = k => s[k] - (b[k] || 0), shots = d('shots'), hits = d('hits'), acc = shots ? Math.min(1, hits / shots) : 0, lost = d('livesLost');
    this.rows = [['TIME', Math.round(sim.stageT) + ' s'], ['ACCURACY', Math.round(acc * 100) + '%'], ['KILLS', d('kills')], ['HEADSHOTS', d('heads')], ['COVER SAVES', d('saves')], ['LIVES LOST', lost]];
    this.accBonus = Math.round(acc * 100) * 300; this.noDmg = lost === 0 ? 20000 : 0;
    this.rank = p.stageCont ? 'D' : acc >= .75 && lost === 0 ? 'S' : acc >= .6 && lost <= 1 ? 'A' : acc >= .45 ? 'B' : 'C';
    this.t = 0; this.p = p; this.total = p.score + this.accBonus + this.noDmg; this.stage = sim.stage; this.applied = false; this.stamped = false;
  }
  update(dt, game, sim) {
    this.t += dt;
    if (!this.applied && this.t > 2.6) { this.applied = true; sim.addScore(this.p, this.accBonus + this.noDmg, null, 'bonus'); }
    if (this.t > 3.2 && !this.stamped) { this.stamped = true; game.audio.sfx && game.audio.sfx('tc-stamp'); FX.trauma[0] = .4; }
    if (this.t < 3.4 && Math.floor(this.t * 20) !== Math.floor((this.t - dt) * 20)) game.audio.sfx && game.audio.sfx('tc-count');
    const I = game.input; if ((I.pressed('confirm') || I.pressed('fire') || (I.clicked && I.clicked())) && this.t > .4) { if (this.t < 3.4) this.t = 3.4; else return true; }
    return false;
  }
  draw(g, r, game) {
    frame(g, r, 'STAGE ' + this.stage.id + ' CLEAR', this.t);
    T(g, this.stage.name, r.W / 2, 34, UI.gold, { align: 'center', scale: 2 });
    const x0 = r.W / 2 - 110;
    this.rows.forEach(([k, v], i) => { const show = this.t > .3 + i * .25; if (!show) return; T(g, k, x0, 56 + i * 15, '#9fc3e8', { scale: 1 }); T(g, v, x0 + 150, 54 + i * 15, '#ffffff', { scale: 2, align: 'right' }); });
    if (this.t > 2) { T(g, 'ACCURACY BONUS', x0, 150, '#9fc3e8'); T(g, '+' + this.accBonus, x0 + 150, 150, UI.gold, { align: 'right' }); T(g, 'NO-DAMAGE BONUS', x0, 161, '#9fc3e8'); T(g, '+' + this.noDmg, x0 + 150, 161, UI.gold, { align: 'right' }); }
    if (this.t > 2.6) { T(g, 'TOTAL', x0, 176, '#ffffff', { scale: 2 }); T(g, this.total, x0 + 150, 176, '#ffffff', { scale: 2, align: 'right' }); }
    if (this.t > 3.2) { const k = clamp((this.t - 3.2) / .15, 0, 1), sc = Math.round(lerp(14, 7, k)); E.font.title(g, this.rank, x0 + 196, 70, { scale: sc, colors: this.rank === 'S' ? ['#fff3b0', '#ffd36a', '#ff8a2a'] : ['#ffffff', '#9fe3ff', '#3aa0e8'], outline: '#000', depth: 2, align: 'center' }); T(g, 'RANK', x0 + 196, 60, '#9fc3e8', { align: 'center' }); }
    hintLine(g, r, game.input, [['confirm', 'CONTINUE']]);
  }
}
TC.Results = Results;

// ---- the credits roll (the ending)
class Credits {
  constructor(portrait, score) { this.t = 0; this.portrait = portrait; this.score = score; this.lines = [['TIDE CRISIS 3', 't'], ['', ''], ['THE CAST', 'h'], ...['kai', 'rook', 'mari', 'juno', 'hale', 'tejada', 'krake', 'barracuda', 'hammer', 'gull'].map(id => [id, 'cast']), ['', ''], ['GAME DESIGN, CODE, ART, MUSIC', 'h'], ['Claude (Anthropic) · claude-opus-5-5', ''], ['from a plan by claude-opus-5-5', ''], ['', ''], ['MADE WITH my-3D2dge v0.85.2', 'h'], ['Every pixel, note and voice written in code', ''], ['', ''], ['INSPIRED BY', 'h'], ['Time Crisis 3 (Namco, 2003)', ''], ['An original game. No names, levels or art', ''], ['from the source were used.', ''], ['', ''], ['THANK YOU FOR PLAYING', 't'], ['FINAL SCORE ' + score, 'h']]; }
  update(dt, game) { this.t += dt; const I = game.input; if (I.down('confirm') || I.down('fire')) this.t += dt * 3; return this.t > this.lines.length * 1.2 + 6 || I.pressed('start'); }
  draw(g, r, game) {
    frame(g, r, null, this.t); const y0 = r.H - this.t * 22;
    this.lines.forEach(([s, k], i) => { const y = y0 + i * 24; if (y < -30 || y > r.H) return; if (k === 'cast') { const spk = get('speaker', s), rig = this.portrait(s); if (rig) rig.drawPortrait(g, r.W / 2 - 70, y - 4, 22, { zoom: 2, turn: .5, bg: '#0a1426', frame: true }); T(g, spk.name, r.W / 2 - 40, y + 4, spk.color, { scale: 1 }); } else if (k === 't') E.font.title(g, s, r.W / 2, y, { scale: 2, colors: ['#fff3b0', '#ffb347', '#ff5a2a'], outline: '#000', align: 'center' }); else T(g, s, r.W / 2, y, k === 'h' ? UI.gold : '#ffffff', { align: 'center' }); });
    hintLine(g, r, game.input, [['confirm', 'HOLD: FASTER'], ['start', 'SKIP']]);
  }
}
TC.Credits = Credits;

// ---- how to play (device-aware)
function drawHowto(g, r, input, t, page = 0) {
  frame(g, r, 'HOW TO PLAY', t);
  const L = a => TC.label(input, a), pad = input.lastDevice === 'gamepad';
  const rows = [
    ['AIM', pad ? 'Right stick (left stick too)' : 'Mouse — the reticle sits under it'],
    ['FIRE', L('fire') + (pad ? '' : '  ·  hold for auto-fire')],
    ['TAKE COVER', 'Hold ' + L('cover') + ' — you are safe and you reload'],
    ['SWITCH WEAPON', L('prev') + ' / ' + L('next') + (pad ? '' : '  ·  1 2 3 4') + '  ·  or fire while in cover'],
    ['QUICK RELOAD', L('reload')],
    ['PAUSE', L('pause')]];
  rows.forEach(([k, v], i) => { T(g, k, 24, 40 + i * 16, UI.gold); T(g, v, 130, 40 + i * 16, '#ffffff'); });
  const tips = ['A RED RING WITH "!" MEANS THAT SHOT WILL HIT YOU: TAKE COVER OR KILL THE SHOOTER FIRST.', 'EVERY AREA HAS A TIME LIMIT. WHEN THE TIDE COMES IN, YOU LOSE A LIFE.', 'ORANGE VESTS CARRY AMMO FOR YOUR SPECIAL WEAPONS. RED UNIFORMS NEVER MISS.', 'SHOOT GRENADES, ROCKETS AND TORPEDOES OUT OF THE AIR. NEVER SHOOT CIVILIANS.'];
  tips.forEach((s, i) => E.font.wrap(TC.txt(s), r.W - 48).forEach((l, k) => T(g, l, 24, 142 + i * 20 + k * 9, i === 0 ? '#ff9a8a' : '#cfe0ff')));
}
TC.drawHowto = drawHowto;

// ===== 52-dev.js
// 52-dev: dev mode, reached from the pause menu (not in AI Hub sessions). A canvas panel with six tabs generated from
// one descriptor list (a slider or toggle is one line: its path into tune, its range and step), the ACTIONS tab
// (restart, jump to any scene, kill all, spawn, weapons, lives, threats, clear, game over, the bot, a P2 bot, voice
// and music tests), RESET ALL TO DEFAULTS with a confirmation; changed values gold with the default in grey. The Sim
// is frozen while the panel is open. Hover focuses, a drag moves a knob, the wheel adjusts.
// Reads: tune and TUNE (00), the play scene's Session (60).

const DEVT = [
  ['PLAYER', [['God mode', 'player.god'], ['Infinite ammo', 'player.infAmmo'], ['Start lives', 'player.lives', 1, 9, 1], ['I-frames (s)', 'player.iframes', .5, 3, .1], ['Cover in (s)', 'player.coverIn', .05, .4, .01], ['Cover out (s)', 'player.coverOut', .05, .4, .01], ['Reload (s)', 'player.reload', .1, 1, .05], ['Pad aim speed', 'player.padSpeed', .5, 3, .1], ['Aim assist', 'player.assist', 0, 1, .05]]],
  ['WEAPONS', [['Handgun damage', 'weapon.hgDamage', .5, 3, .1], ['MG rate (/s)', 'weapon.mgRate', 4, 20, 1], ['MG damage', 'weapon.mgDamage', .1, 1, .05], ['Shotgun pellets', 'weapon.sgPellets', 4, 14, 1], ['Shotgun spread', 'weapon.sgSpread', 2, 12, .5], ['GL radius', 'weapon.glRadius', 24, 96, 4], ['GL damage', 'weapon.glDamage', 2, 12, .5], ['Ammo pickups ×', 'weapon.ammoMul', .5, 3, .1]]],
  ['ENEMIES', [['HP ×', 'enemy.hpMul', .5, 3, .1], ['Threat chance ×', 'enemy.threatMul', 0, 3, .1], ['Telegraph ×', 'enemy.teleMul', .5, 2, .05], ['Fire interval ×', 'enemy.fireMul', .5, 2, .05], ['Max threats (0 = stage)', 'enemy.maxThreats', 0, 4, 1], ['Minimum gap (s)', 'enemy.minGap', .1, 1, .05], ['Reaction delay ×', 'enemy.reactMul', .5, 2, .05], ['Boss HP ×', 'enemy.bossHpMul', .25, 3, .05]]],
  ['TIME', [['Freeze timer', 'time.freeze'], ['Scene time ×', 'time.sceneMul', .5, 2, .05], ['Elite bonus (s)', 'time.eliteBonus', 0, 5, .5], ['Refill after time-up', 'time.refill', .2, 1, .05], ['Game speed', 'time.speed', .25, 1.5, .05]]],
  ['VIEW', [['FOV', 'view.fov', 45, 75, 1], ['Show hit volumes', 'view.hitVolumes'], ['Colliders', 'view.colliders'], ['Rail and cover points', 'view.railPoints'], ['AI state labels', 'view.aiLabels'], ['Threat debug', 'view.threatDebug'], ['Perf overlay', 'view.perf'], ['Free camera', 'view.freeCam'], ['Hide HUD', 'view.hideHud']]],
  ['ACTIONS', null]
];
const Dev = {
  isOpen: false, tab: 0, i: 0, confirm: false, play: null, msg: '', msgT: 0, jumpI: 0, spawnI: 0, rects: [], drag: null, free: null,
  open(play) { if (!play || play.s.hub) return; this.isOpen = true; this.play = play; this.i = 0; this.confirm = false; game.input.consumeAll(); },
  close() { this.isOpen = false; this.confirm = false; if (this.play) this.play.s.sim.cheats.god = !!tune.player.god; },
  items() {
    const t = DEVT[this.tab];
    if (t[1]) return t[1].map(([label, path, min, max, step]) => ({ label, path, min, max, step, kind: min === undefined ? 'toggle' : 'slider' })).concat([{ label: 'RESET ALL TO DEFAULTS', kind: 'reset' }]);
    const sim = this.play.s.sim, jumps = this.jumps(), spawns = all('enemy').filter(e => !e.board && e.ai !== 'turret').map(e => e.id);
    return [
      { label: 'Restart scene', kind: 'act', run: () => sim.jump(sim.stageId, sim.sceneId) },
      { label: 'Next scene', kind: 'act', run: () => { const sc = sim.stage.scenes, k = sim.sceneIdx; if (k + 1 < sc.length) sim.jump(sim.stageId, sc[k + 1]); else this.say('Last scene of the stage'); } },
      { label: 'Previous scene', kind: 'act', run: () => { const sc = sim.stage.scenes, k = sim.sceneIdx; if (k > 0) sim.jump(sim.stageId, sc[k - 1]); } },
      { label: 'Jump to: ' + jumps[this.jumpI % jumps.length].label, kind: 'pick', list: 'jump', run: () => jumps[this.jumpI % jumps.length].go() },
      { label: 'Kill all', kind: 'act', run: () => { for (const e of sim.enemies) if (!e.dead) TC.killEnemy(sim, e, { p: sim.players[0] }); } },
      { label: 'Spawn: ' + spawns[this.spawnI % spawns.length], kind: 'pick', list: 'spawn', run: () => { const id = spawns[this.spawnI % spawns.length], free = Object.keys(sim.covers).find(k => sim.covers[k].busy === 0) || Object.keys(sim.covers)[0]; if (id === 'drone') TC.makeEnemy(sim, 'drone', null, { at: vadd(sim.poseOf(0, 'stand') ? [sim.poseOf(0, 'stand').x + Math.cos(sim.poseOf(0, 'stand').yaw) * 160, sim.poseOf(0, 'stand').y + Math.sin(sim.poseOf(0, 'stand').yaw) * 160, sim.poseOf(0, 'stand').z + 20] : [0, 0, 40], [0, 0, 0]) }); else if (id === 'jetski' || id === 'runner') this.say('Spawned on its own path in its scenes'); else if (free) TC.makeEnemy(sim, id, free, { entry: 'stand' }); else { const c = sim.poseOf(0, 'stand'); TC.makeEnemy(sim, id, null, { at: [c.x + Math.cos(c.yaw) * 180, c.y + Math.sin(c.yaw) * 180, c.z - 24], entry: 'stand' }); } } },
      { label: 'All weapons and full ammo', kind: 'act', run: () => { for (const p of sim.players) for (const w of ['mg', 'sg', 'gl']) { p.owned[w] = true; p.ammo[w] = get('weapon', w).pool; } } },
      { label: '+1 life', kind: 'act', run: () => sim.players.forEach(p => p.lives++) },
      { label: 'Lose a life', kind: 'act', run: () => sim.hurt(sim.players[0], { ignoreI: true, reason: 'dev' }) },
      { label: 'Trigger a threat on me', kind: 'act', run: () => { const c = sim.poseOf(0, 'stand'); TC.requestThreat(sim, { src: 'dev', target: 0, dur: 1.2, kind: 'shot', at: [c.x + Math.cos(c.yaw) * 200, c.y + Math.sin(c.yaw) * 200, c.z], always: true }); } },
      { label: 'Clear stage', kind: 'act', run: () => { sim.phase = 'results'; sim.emit('stageclear', {}); } },
      { label: 'Game over', kind: 'act', run: () => { for (const p of sim.players) { p.lives = 0; p.out = true; p.cont = 0; } sim.phase = 'gameover'; } },
      { label: 'Bot plays (Autopilot): ' + (this.play.s.bots[0] ? 'ON' : 'OFF'), kind: 'act', run: () => { this.play.s.bots[0] = this.play.s.bots[0] ? null : new TC.Autopilot('expert'); } },
      { label: 'Add a P2 bot (split screen): ' + (sim.players.length > 1 ? 'ON' : 'OFF'), kind: 'act', run: () => this.p2bot() },
      { label: 'Voice test', kind: 'act', run: () => { const ids = ['kai', 'rook', 'mari', 'juno', 'hale', 'krake', 'barracuda', 'hammer']; ids.forEach((id, k) => game.after(k * 1.6, () => { TC.Voice.say(game, ['Copy that!', 'Kid, stay sharp.', 'Hang on tight!', 'Hostiles ahead!', 'Agents, report.', 'The sea takes all!', 'Too slow, CREST!', 'NOBODY PASSES.'][k], id); this.say(get('speaker', id).name); })); } },
      { label: 'Music test: ' + (this.songI === undefined ? 'next song' : all('song')[this.songI % all('song').length].id), kind: 'act', run: () => { this.songI = this.songI === undefined ? 0 : this.songI + 1; const s = all('song')[this.songI % all('song').length]; game.audio.music && game.audio.music(s, { fade: .3 }); this.play.s.music = s; this.say('Playing ' + s.id); } }
    ];
  },
  jumps() { const out = []; for (const st of all('stage')) for (const sc of st.scenes) out.push({ label: st.id + ' · ' + sc + ' ' + get('scene', sc).title, go: () => { const sim = this.play.s.sim; if (!sim.stageList.includes(st.id)) sim.stageList = [st.id]; sim.jump(st.id, sc); } }); for (const st of all('stage')) for (const k of ['intro', 'outro', 'ending']) if (st[k]) out.push({ label: 'cutscene ' + st[k], go: () => { const sim = this.play.s.sim; if (sim.stageId !== st.id) { sim.stageList = [st.id]; sim.jump(st.id, st.scenes[0]); } sim.startCut(st[k], () => sim.startScene(0)); } }); return out; },
  p2bot() { const s = this.play.s, sim = s.sim; if (sim.players.length > 1) { sim.players.splice(1); s.huds.splice(1); s.aimers.splice(1); s.bots.splice(1); s.inputs.splice(1); return; } s.addPlayer(null, 'rook', new TC.Autopilot('fair')); },
  say(m) { this.msg = m; this.msgT = 2; },
  adjust(it, dir, big) {
    if (it.kind === 'toggle') { tset(it.path, !tget(it.path)); return; }
    if (it.kind === 'slider') { const v = clamp(Math.round((tget(it.path) + dir * it.step * (big ? 5 : 1)) / it.step) * it.step, it.min, it.max); tset(it.path, +v.toFixed(4)); }
    if (it.kind === 'pick') { if (it.list === 'jump') this.jumpI = (this.jumpI + dir + this.jumps().length) % this.jumps().length; else this.spawnI = Math.max(0, this.spawnI + dir); }
  },
  update(dt) {
    const I = game.input, items = this.items(); this.msgT = Math.max(0, this.msgT - dt); this.i = clamp(this.i, 0, items.length - 1);
    if (I.pressed('pause') || (I.pressed('cancel') && !this.confirm)) { this.close(); I.consumeAll(); return; }
    if (I.pressed('tab') || I.pressed('prev')) { this.tab = (this.tab + DEVT.length - 1) % DEVT.length; this.i = 0; }
    if (I.pressed('tabR') || I.pressed('next')) { this.tab = (this.tab + 1) % DEVT.length; this.i = 0; }
    if (I.repeat('down', .3, .08)) { this.i = (this.i + 1) % items.length; this.confirm = false; } if (I.repeat('up', .3, .08)) { this.i = (this.i + items.length - 1) % items.length; this.confirm = false; }
    const it = items[this.i];
    if (I.repeat('right', .3, .05)) this.adjust(it, 1, I.down('cover')); if (I.repeat('left', .3, .05)) this.adjust(it, -1, I.down('cover'));
    const ptr = I.pointer && I.pointer();
    if (ptr) { const k = this.rects.findIndex(q => ptr[0] >= q[0] && ptr[0] < q[0] + q[2] && ptr[1] >= q[1] && ptr[1] < q[1] + q[3]); if (k >= 0 && (!this.lp || this.lp[0] !== ptr[0] || this.lp[1] !== ptr[1])) this.i = k; this.lp = ptr.slice(); }
    if (ptr && I.down('fire') && items[this.i].kind === 'slider' && this.knob) { const s = items[this.i], k = clamp((ptr[0] - this.knob[0]) / this.knob[1], 0, 1); tset(s.path, +(Math.round(lerp(s.min, s.max, k) / s.step) * s.step).toFixed(4)); }
    if (I.pressed('reset') && it.path) { tset(it.path, it.path.split('.').reduce((o, k) => o[k], TUNE)); }
    const tabHit = I.clicked && I.clicked() && this.tabRects ? this.tabRects.findIndex(q => I.clicked()[0] >= q[0] && I.clicked()[0] < q[0] + q[2] && I.clicked()[1] >= q[1] && I.clicked()[1] < q[1] + q[3]) : -1;
    if (tabHit >= 0) { this.tab = tabHit; this.i = 0; return; }
    if (I.pressed('confirm') || (I.clicked && I.clicked() && it.kind !== 'slider')) {
      if (it.kind === 'reset') { if (this.confirm) { TC.resetTune(); this.confirm = false; this.say('All values reset to defaults'); } else this.confirm = true; }
      else if (it.kind === 'toggle') this.adjust(it, 1);
      else if (it.run) { it.run(); this.say(it.label + ' ✓'); }
    }
    this.play.s.sim.cheats.god = !!tune.player.god;
  },
  draw(g, r) {
    const items = this.items(), w = Math.min(r.W - 20, 300), x = (r.W - w) / 2, y = 14, h = r.H - 28;
    E.ui.box(g, x, y, w, h, { bg: ['#0a1a34', '#040a18'], border: UI.gold, alpha: .96 });
    T(g, 'DEV MODE', x + 6, y + 4, UI.gold); T(g, '[' + TC.label(game.input, 'prev') + '/' + TC.label(game.input, 'next') + '] TAB', x + w - 6, y + 4, UI.dim, { align: 'right', font: 'tiny' });
    this.tabRects = []; let tx = x + 6; DEVT.forEach(([name], k) => { const tw = TW(name, { font: 'tiny' }) + 8; this.tabRects.push([tx, y + 14, tw, 10]); E.px.rect(g, tx, y + 14, tw, 10, k === this.tab ? '#2a5aa0' : '#10244a'); T(g, name, tx + 4, y + 16, k === this.tab ? '#ffffff' : '#8aa0c8', { font: 'tiny' }); tx += tw + 2; });
    const rowH = 11, top = y + 30, vis = Math.floor((h - 46) / rowH), off = Math.max(0, Math.min(this.i - vis + 2, items.length - vis));
    this.rects = []; this.knob = null;
    items.forEach((it, k) => {
      const yy = top + (k - off) * rowH; this.rects.push([x + 4, yy - 1, w - 8, rowH]); if (k < off || k >= off + vis) return;
      const on = k === this.i; if (on) E.px.rect(g, x + 4, yy - 1, w - 8, rowH, '#1e3e70');
      if (it.kind === 'reset') { T(g, this.confirm && on ? 'PRESS AGAIN TO RESET EVERYTHING' : it.label, x + w / 2, yy, this.confirm && on ? UI.warn : UI.gold, { align: 'center' }); return; }
      T(g, it.label, x + 8, yy, on ? '#ffffff' : '#b8c8e8');
      if (it.path) { const v = tget(it.path), d = it.path.split('.').reduce((o, q) => o[q], TUNE), changed = v !== d, col = changed ? UI.gold : '#ffffff';
        if (it.kind === 'toggle') T(g, v ? 'ON' : 'OFF', x + w - 8, yy, col, { align: 'right' });
        else { const bx = x + w - 118, bw = 70, k2 = (v - it.min) / (it.max - it.min); E.px.rect(g, bx, yy + 3, bw, 2, '#3a4a6a'); E.px.rect(g, bx + k2 * bw - 1, yy, 3, 8, col); if (on) this.knob = [bx, bw]; T(g, +v.toFixed(2), x + w - 8, yy, col, { align: 'right' }); }
        if (changed) T(g, '(' + d + ')', x + w - 124 - (it.kind === 'toggle' ? -40 : 0), yy, '#5a6078', { align: 'right', font: 'tiny' }); }
      if (it.kind === 'pick' && on) T(g, '◂ ▸', x + w - 8, yy, UI.dim, { align: 'right' });
    });
    if (this.msgT > 0) T(g, this.msg, r.W / 2, y + h - 22, '#8aff8a', { align: 'center' });
    T(g, '[' + TC.label(game.input, 'confirm') + '] RUN/TOGGLE  [◂ ▸] ADJUST  [' + TC.label(game.input, 'reset') + '] RESET ONE  [' + TC.label(game.input, 'cancel') + '] CLOSE', r.W / 2, y + h - 10, UI.dim, { align: 'center', font: 'tiny' });
  }
};
// the overlays (after present, in the viewport's pixels) and the free camera
Dev.overlay = (g, R, sim, vp) => {
  const V = tune.view, P = (p) => { const s = R.project(p); return s ? [vp.x + s[0], vp.y + s[1]] : null; };
  const seg = (a, b, c) => { const A = P(a), B = P(b); if (A && B) E.px.line(g, A[0], A[1], B[0], B[1], c); };
  const box = (b, c) => { const [x0, y0, z0, x1, y1, z1] = b; const pts = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]; for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) seg(pts[i], pts[j], c); };
  if (V.colliders) for (const c of sim.colliders) if (c.on && vdist([(c.b[0] + c.b[3]) / 2, (c.b[1] + c.b[4]) / 2, 0], R.cs.pos) < 700) box(c.b, '#40ff80');
  if (V.hitVolumes) { for (const e of sim.enemies) for (const v of e.vols || []) { if (v.cap) { seg(v.a, v.b, v.shield ? '#40a0ff' : '#ffff40'); const A = P(v.a); if (A) E.px.dot(g, A[0], A[1], '#ffff40'); } else { const c = P(v.c), k = R.project(v.c); if (c && k) { const rr = v.r * R.F / k[2]; for (let a = 0; a < 12; a++) E.px.dot(g, c[0] + Math.cos(a / 12 * 6.28) * rr, c[1] + Math.sin(a / 12 * 6.28) * rr, v.part === 'head' ? '#ff4040' : '#ffff40'); } } } if (sim.boss) for (const pt of sim.boss.parts) if (pt.pos && pt.alive) { const c = P(pt.pos), k = R.project(pt.pos); if (c && k) { const rr = pt.r * R.F / k[2]; for (let a = 0; a < 16; a++) E.px.dot(g, c[0] + Math.cos(a / 16 * 6.28) * rr, c[1] + Math.sin(a / 16 * 6.28) * rr, pt.hidden ? '#606060' : pt.armor ? '#40a0ff' : '#ff40ff'); T(g, pt.id + ' ' + pt.hp.toFixed(1), c[0], c[1] - rr - 8, '#ff80ff', { align: 'center', font: 'tiny' }); } } }
  if (V.railPoints) { if (sim.arrive) { let last = null; for (let d = 0; d <= sim.arrive.length; d += 20) { const q = sim.arrive.at(d), p = [q.x, q.y, q.z]; if (last) seg(last, p, '#40c0ff'); last = p; } } for (const k in sim.covers) { const c = sim.covers[k], s = P(c.at); if (s) { E.px.rect(g, s[0] - 2, s[1] - 2, 4, 4, c.busy ? '#ff8040' : '#40ff40'); T(g, k, s[0] + 4, s[1] - 4, '#ffffff', { font: 'tiny' }); } } }
  if (V.aiLabels) for (const e of sim.enemies) { const s = P([e.x, e.y, e.z + 36]); if (s) T(g, e.type + ':' + e.state + (e.threat && !e.threat.done ? '!' : ''), s[0], s[1], e.dead ? '#888' : '#ffffff', { align: 'center', font: 'tiny' }); }
  if (V.threatDebug) sim.threats.forEach((t, k) => T(g, 'T' + t.id + ' p' + t.target + ' ' + t.kind + ' ' + t.left.toFixed(2) + (t.done ? (t.result ? ' HIT' : ' BLOCK') : ''), vp.x + 4, vp.y + 60 + k * 8, t.done ? '#888' : '#ff8080', { font: 'tiny' }));
  if (V.freeCam) T(g, 'FREE CAMERA · WASD/stick move · mouse/right stick look · Q/E down/up · ' + TC.label(game.input, 'confirm') + ' copy pose', vp.x + vp.w / 2, vp.y + vp.h - 20, '#7fe3ff', { align: 'center', font: 'tiny' });
};
Dev.freeStep = (dt, sim) => {
  const I = game.input; let f = Dev.free; if (!f) { const c = sim.cameraFor(0); f = Dev.free = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, roll: 0, fov: tune.view.fov }; }
  const sp = (I.held && (I.held.has ? I.held.has('ShiftLeft') : false) ? 400 : 140) * dt, m = I.move(), fx = Math.cos(f.yaw), fy = Math.sin(f.yaw);
  f.x += (fx * -m[1] - fy * m[0]) * sp; f.y += (fy * -m[1] + fx * m[0]) * sp;
  if (I.down('prev')) f.z -= sp; if (I.down('next')) f.z += sp;
  const a = I.padAim; if (a) { f.yaw += a[0] * 2 * dt; f.pitch = clamp(f.pitch - a[1] * 2 * dt, -1.4, 1.4); }
  const ptr = I.pointer && I.pointer(); if (ptr && Dev.lastFree) { f.yaw += (ptr[0] - Dev.lastFree[0]) * .01; f.pitch = clamp(f.pitch - (ptr[1] - Dev.lastFree[1]) * .01, -1.4, 1.4); } Dev.lastFree = ptr ? ptr.slice() : null;
  f.fov = tune.view.fov;
  if (I.pressed('confirm')) { const s = JSON.stringify([+f.x.toFixed(1), +f.y.toFixed(1), +f.z.toFixed(1), +(f.yaw / DEG).toFixed(1), +(f.pitch / DEG).toFixed(1)]); console.log('pose', s); try { navigator.clipboard && navigator.clipboard.writeText(s); } catch (e) { /* clipboard is optional */ } Dev.say('Pose copied: ' + s); }
  return f;
};
TC.dev = Dev;

// ===== 53-attract.js
// 53-attract: the Autopilot (a bot that gives the same Commands a player does: perception of the Sim, target
// priority, a damped aim with a reaction delay, cover timing against threats, reloads, weapon choice) in three
// skills: fair (tests and balance), expert, showoff (attract: uses every weapon and bonus target). And the attract
// controller: 10 s idle on the title or menu -> DEMO (a highlight, with cheats) -> HIGH SCORES -> DEMO -> TITLE ...
// Reads: Sim (20), assist targets (46).

const SKILL = { fair: { react: .3, speed: 2.2, head: .3 }, expert: { react: .18, speed: 3.5, head: .6 }, showoff: { react: .16, speed: 3.6, head: .6, show: true } };
class Autopilot {
  constructor(skill = 'fair') { this.skill = SKILL[skill] || SKILL.fair; this.name = skill; this.aim = [0, -.1]; this.tgt = null; this.react = 0; this.head = false; this.coverT = 0; this.t = 0; this.R = mkRng(hashStr('bot' + skill)); this.wpT = 0; }
  // candidates: { key, p (world point), r, pri, kind, ref }
  candidates(sim, i) {
    const out = [], mine = sim.threats.filter(t => !t.done && t.target === i);
    const srcIds = new Set(mine.map(t => t.src));
    for (const e of sim.enemies) {
      if (e.dead || !e.vols || e.A.ai === 'turret' || (e.o && e.o.civ)) continue;
      const exposed = e.up > .85 && (e.state !== 'hide' || (e.cover && e.cover.h >= 30 && e.side));
      if (!exposed && e.state !== 'enter' && e.A.ai !== 'drone' && e.A.ai !== 'runner' && e.A.ai !== 'rusher' && e.A.ai !== 'jetski') continue;
      const head = e.vols.find(v => v.part === 'head'), body = e.vols.find(v => v.part === 'body'), ski = e.vols.find(v => v.part === 'ski');
      let pri = 6; if (srcIds.has(e.id)) pri = 1; else if (e.A.elite) pri = 3; else if (e.A.ai === 'rusher') pri = 4; else if (e.A.ai === 'shield') pri = 5; else if (e.A.ai === 'runner') pri = 4.5;
      const p = body ? (body.cap ? vlerp(body.a, body.b, .55) : body.c) : head ? head.c : [e.x, e.y, e.z + 18];
      const shielded = e.A.ai === 'shield' && e.shieldDown <= 0;
      if (shielded && !(e.state === 'aim' || e.state === 'fire')) { out.push({ key: 'e' + e.id, p, hp: head ? head.c : p, r: body ? body.r : 5, pri: 9, kind: 'enemy', ref: e, shield: true }); continue; }
      out.push({ key: 'e' + e.id, p: shielded && head ? head.c : p, hp: head ? head.c : p, r: shielded && head ? head.r : body ? body.r : 5, pri, kind: 'enemy', ref: e, shield: shielded, headOnly: shielded });
      if (ski && e.skiHp > 0) out.push({ key: 's' + e.id, p: ski.c, hp: ski.c, r: ski.r, pri: pri + .5, kind: 'enemy', ref: e });
    }
    for (const pr of sim.projectiles) if (pr.shootable && pr.team === 'enemy') out.push({ key: 'p' + pr.id, p: pr.pos, hp: pr.pos, r: pr.r, pri: pr.kind === 'torpedo' ? .5 : 2, kind: 'proj', ref: pr });
    if (sim.boss && !sim.boss.defeated) for (const pt of sim.boss.parts) if (pt.alive && pt.pos && !pt.hidden && (pt.hp < 900 || pt.link)) out.push({ key: 'b' + pt.id, p: pt.pos, hp: pt.pos, r: pt.r, pri: pt.id === 'lever' ? 0 : pt.armor ? 9 : srcIds.has('boss') ? 1.5 : 6.5, kind: 'boss', ref: pt, armor: pt.armor });
    for (const ob of sim.objects) if (!ob.dead && (ob.K.objective || (this.skill.show && (ob.K.bonus || ob.explosive)))) out.push({ key: 'o' + ob.id, p: ob.pos, hp: ob.pos, r: ob.r || 5, pri: ob.K.objective ? 6.2 : ob.explosive ? 8 : 7, kind: 'object', ref: ob });
    return out;
  }
  visible(sim, i, c) {
    const cs = sim.camSetupFor(i), d = vnorm(vsub(c.p, cs.pos)), hit = sim.raycast(cs.pos, d);
    if (!hit) return false;
    if (c.kind === 'enemy') return hit.kind === 'enemy' && hit.e === c.ref || (c.shield && !c.headOnly && hit.kind === 'shield' && hit.e === c.ref && (sim.players[i].ammo.sg > 0 || sim.players[i].ammo.gl > 0));
    if (c.kind === 'proj') return hit.kind === 'proj' && hit.pr === c.ref;
    if (c.kind === 'boss') return hit.kind === 'boss' && hit.part === c.ref;
    if (c.kind === 'object') return hit.kind === 'object' && hit.ob === c.ref;
    return false;
  }
  command(sim, i, dt) {
    const p = sim.players[i], S = this.skill; this.t += dt;
    const cmd = { aim: this.aim.slice(), fireDown: false, fireP: false, cover: false, next: false, prev: false, sel: 0, reload: false, advance: false, skip: false, autoFire: true };
    if (!p) return cmd;
    if (sim.phase === 'cut') { cmd.advance = sim.cut && sim.cut.line && sim.cut.lineT > (this.name === 'showoff' ? 1.4 : .9); cmd.skip = this.name === 'fair'; return cmd; }
    if (p.out) { cmd.advance = true; return cmd; }
    if (sim.phase !== 'action') { this.aim[0] *= .9; this.aim[1] = lerp(this.aim[1], -.05, .05); cmd.aim = this.aim.slice(); return cmd; }
    const cs = sim.camSetupFor(i), mine = sim.threats.filter(t => !t.done && t.target === i && !t.unblockable).sort((a, b) => a.left - b.left), soon = mine[0];
    const torpedo = sim.threats.some(t => !t.done && t.target === i && t.unblockable);
    // cover: hide when an impact is due, to reload, or while switching
    let hide = false;
    if (soon && soon.left < .28 && !torpedo) hide = true;
    if (sim.boss && sim.boss.id === 'hammerhead' && sim.boss.mode === 'sweepFire') hide = true;
    if (p.w === 'hg' && p.mag === 0) hide = true;
    if (p.w === 'hg' && p.mag <= 2 && !soon && !this.tgt) hide = true;
    if (p.c >= .5 && p.mag < 9 && p.reloadT > 0 && !(soon && soon.left < .1)) hide = hide || p.mag < 9 && p.reloadT < tune.player.reload;
    if (soon && soon.left > .3 && p.mag > 0 && p.c > .5 && !(p.w === 'hg' && p.mag < 9 && p.reloadT > 0)) hide = false;
    this.coverT = hide ? this.coverT + dt : 0;
    cmd.cover = hide;
    // targets
    const cands = this.candidates(sim, i).filter(c => !(c.kind === 'boss' && c.armor && p.w !== 'gl' && p.w !== 'sg' && !(sim.boss && sim.boss.id === 'hammerhead')));
    cands.sort((a, b) => a.pri - b.pri || vdist(a.p, cs.pos) - vdist(b.p, cs.pos));
    let target = null;
    if (this.tgt) target = cands.find(c => c.key === this.tgt && c.pri <= (cands[0] ? cands[0].pri : 9)) || null;
    let headOnly = false;
    if (!target) for (const c of cands.slice(0, 6)) { if (this.visible(sim, i, c)) { target = c; break; } if (c.kind === 'enemy' && c.hp !== c.p && this.visible(sim, i, Object.assign({}, c, { p: c.hp }))) { target = c; headOnly = true; break; } }
    if (target && target.key !== this.tgt) { this.tgt = target.key; this.react = S.react * (sim.mode === 'attract' ? .8 : 1); this.head = headOnly || (target.kind === 'enemy' && this.R() < S.head && !target.shield); }
    if (!target) this.tgt = null;
    // weapon choice
    this.wpT -= dt;
    if (this.wpT <= 0 && p.c < .5) {
      const have = id => p.ammo[id] > 0 || ((sim.cheats.ammo || tune.player.infAmmo) && p.owned[id]);
      let want = 'hg';
      if (target) {
        const e = target.ref, d = vdist(target.p, cs.pos);
        if (target.shield && have('sg')) want = 'sg';
        else if (target.kind === 'boss' && target.armor && have('gl')) want = 'gl';
        else if (target.kind === 'boss' && have('mg')) want = 'mg';
        else if (target.kind === 'enemy' && (e.A.ai === 'drone' || e.A.ai === 'jetski') && have('mg')) want = 'mg';
        else if (target.kind === 'enemy' && e.A.ai === 'rusher' && have('sg')) want = 'sg';
        else if (target.kind === 'enemy' && d < 160 && have('sg') && S.show) want = 'sg';
        else if (S.show && have('mg') && cands.filter(c => c.kind === 'enemy').length >= 3) want = 'mg';
        else if (S.show && have('gl') && target.kind === 'enemy' && this.R() < .08) want = 'gl';
      }
      if (p.w === 'hg' && p.mag === 0 && want === 'hg') want = 'hg';
      if (want !== p.w) cmd.sel = TC.WEAPONS.indexOf(want) + 1;
      this.wpT = .5;
    }
    // aim: a damped move toward the target's head or chest
    if (target) {
      const pt = this.head ? target.hp : target.p, v = projectVU(cs, pt);
      if (v) {
        if (this.react > 0) this.react -= dt;
        else {
          const dx = v[0] - this.aim[0], dy = v[1] - this.aim[1], d = Math.hypot(dx, dy), step = S.speed * dt;
          if (d <= step) { this.aim[0] = v[0]; this.aim[1] = v[1]; } else { this.aim[0] += dx / d * step; this.aim[1] += dy / d * step; }
          const rv = (target.r * (this.head ? .7 : .9)) / (v[2] * cs.t);
          if (Math.hypot(v[0] - this.aim[0], v[1] - this.aim[1]) < rv && p.c < .2 && !hide) { cmd.fireDown = true; cmd.fireP = p.cool <= 0; }
        }
      }
    } else if (!hide) { this.aim[0] *= .98; }
    const asp = p.aspect || 16 / 9; this.aim[0] = clamp(this.aim[0], -asp, asp); this.aim[1] = clamp(this.aim[1], -1, 1);
    cmd.aim = this.aim.slice();
    return cmd;
  }
}
TC.Autopilot = Autopilot;

// ---------------------------------------------------------------- the attract mode
def('highlight', 'h1', { stage: 1, scene: '1-1', len: 26 });
def('highlight', 'h2', { stage: 1, scene: '1-4', len: 26 });
def('highlight', 'h3', { stage: 1, scene: '1-B', len: 30 });
def('highlight', 'h4', { stage: 2, scene: '2-1', len: 26 });
def('highlight', 'h5', { stage: 2, scene: '2-3', len: 28 });
def('highlight', 'h6', { stage: 2, scene: '2-B', len: 30 });
def('highlight', 'h7', { stage: 3, scene: '3-2', len: 28 });
def('highlight', 'h8', { stage: 3, scene: '3-3', len: 26 });
def('highlight', 'h9', { stage: 3, scene: '3-5', len: 30 });
const Attract = {
  idle: 0, phase: 'title', i: 0, t: 0, session: null, lastProgress: 0, lastHash: '',
  // input that wakes the title: any key or button, a pointer move over 4 px, the wheel, a stick past its dead zone
  anyInput(game) {
    const I = game.input; let any = I.anyPressed() || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .3) || !!I.padAim || (I.clicked && I.clicked());
    const ptr = I.pointer ? I.pointer() : null; if (ptr) { if (this.lastPtr && Math.hypot(ptr[0] - this.lastPtr[0], ptr[1] - this.lastPtr[1]) > 4) any = true; this.lastPtr = ptr.slice(); }
    for (const q of game.players || []) if (q !== I && q.anyPressed && q.anyPressed()) any = true;
    return any;
  },
  playlist() { return all('highlight'); },
  startDemo(game) {
    const list = this.playlist(), h = list[this.i % list.length]; this.i++;
    this.phase = 'demo'; this.t = 0; this.len = h.len; this.lastProgress = 0;
    this.session = new Session(game, { mode: 'attract', simMode: 'attract', stages: [h.stage], stage: h.stage, scene: h.scene, cheats: { god: true, ammo: true }, bot: 'showoff', players: [{ input: null, agent: 'kai' }], seed: 7 + this.i, skipCuts: true });
    const p = this.session.sim.players[0]; for (const w of ['mg', 'sg', 'gl']) { p.owned[w] = true; p.ammo[w] = get('weapon', w).pool; }
    for (const h of this.session.huds) h.noPrompts = true;
    this.watch = { hash: '', t: 0 };
    return this.session;
  },
  // the watchdog: if nothing progresses for 8 s, move on
  progressed(sim) { const s = sim.phase + sim.sceneId + sim.enemies.filter(e => !e.dead).length + Math.round(sim.travelD / 50) + (sim.boss ? sim.boss.parts.map(p => Math.round(p.hp)).join() : ''); if (s !== this.watch.hash) { this.watch.hash = s; this.watch.t = 0; return true; } return false; }
};
TC.Attract = Attract;

// ===== 60-session.js
// 60-session: a play session: the Sim, the WorldView, a HUD and an Aimer per player, devices routed to players (P1:
// keyboard, mouse and any pad; P2: its own pad, split screen), the bot (attract, tests, the dev P2 bot), the events
// turned into sound, effects and HUD feedback, slow motion, music by phase, and the cutscene dialog box.
// Reads: Sim (20), WorldView (44), Hud (50), Aimer (46), Voice and audio (41, 42), Autopilot (53).

class Session {
  constructor(game, o) {
    this.game = game; this.o = o; this.hub = !!o.hub; this.mode = o.mode || 'arcade';
    const players = (o.players || [{ input: game.input }]).map((p, i) => ({ id: i, name: p.name || 'P' + (i + 1), color: p.color || ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i], agent: p.agent || TC.AGENTS[i], aspect: 16 / 9 }));
    this.inputs = (o.players || [{ input: game.input }]).map(p => p.input || null);
    this.sim = o.sim || new Sim({ mode: o.simMode || this.mode, stages: o.stages, stage: o.stage, scene: o.scene, difficulty: o.difficulty || 'normal', seed: o.seed === undefined ? (Date.now() & 0xffff) : o.seed, players, cheats: o.cheats, skipCuts: o.skipCuts });
    this.view = o.view || TC.view;
    this.huds = players.map((p, i) => new Hud(i)); this.aimers = this.inputs.map((inp, i) => inp ? new Aimer(inp, i) : null);
    this.bots = players.map(() => null); if (o.bot) this.bots[0] = new TC.Autopilot(o.bot);
    this.music = null; this.layersOn = null; this.slowT = 0; this.portraits = new Map(); this.dialogT = 0; this.lastLine = null; this.clearSeen = false; this.countT = 0;
    this.lastTimeTick = 99; this.seenWeapons = {};
    this.vps = [{ x: 0, y: 0, w: 427, h: 240 }];
    if (TC.view) TC.view.setStage(this.sim);
    this.applyAmbience();
  }
  get split() { return this.sim.players.length > 1 && !this.hub; }
  // a second player drops in (a controller's Start during ARCADE, or the co-op screen): split screen from now on
  addPlayer(input, agent = 'rook', bot = null) {
    const sim = this.sim; if (sim.players.length >= 2) return null;
    const p = sim._newPlayer({ name: 'P2', agent, color: '#3b82f6' }, sim.players.length); sim.players.push(p);
    this.huds.push(new Hud(p.i)); this.inputs.push(input); this.aimers.push(input ? new Aimer(input, p.i) : null); this.bots.push(bot);
    sim.emit('join', { p: p.i }); this.huds[p.i].banner('PLAYER 2 JOINED', '#6aa8ff', 1.6, 2);
    return p;
  }
  portrait(id) { if (!has('speaker', id)) return null; let r = this.portraits.get(id); if (!r) { r = new E.Humanoid(Object.assign({}, get('speaker', id).rig, { size: 1 })); r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); this.portraits.set(id, r); } return r; }
  viewports(r) {
    const W = r ? r.W : 427, H = r ? r.H : 240;
    if (this.split && this.sim.players.length === 2) return [{ x: 0, y: 0, w: Math.floor(W / 2) - 1, h: H }, { x: Math.floor(W / 2) + 1, y: 0, w: W - Math.floor(W / 2) - 1, h: H }];
    return [{ x: 0, y: 0, w: W, h: H }];
  }
  // ------------------------------------------------------------ update
  update(dt) {
    const sim = this.sim, set = this.game.settings || {};
    const vps = this.vps;
    const cmds = sim.players.map((p, i) => {
      if (this.bots[i]) return this.bots[i].command(sim, i, dt);
      const A = this.aimers[i]; if (!A) return this.remote ? this.remote(i) : {};
      const vp = vps[Math.min(i, vps.length - 1)] || vps[0], tg = A.dev === 'gamepad' ? TC.assistTargets(sim, i) : [];
      return A.build(dt, sim, vp, tg, { padSpeed: set.padSpeed, aimAssist: set.aimAssist === undefined ? undefined : { Off: 0, Low: .35, Medium: .6, High: .85 }[set.aimAssist], coverMode: set.coverMode, autoFire: set.autoFire });
    });
    if (this.netCmds) this.netCmds(cmds);
    this.lastCmds = cmds;
    if (tune.view.freeCam && !this.hub) { TC.dev.freeStep(dt, sim); cmds[0] = {}; } else TC.dev.free = null;
    const evs = sim.step(dt, cmds);
    this.handle(evs);
    this.view.updateRigs(sim, dt);
    FX.step(dt);
    for (const h of this.huds) h.step(dt);
    this.timeScale(dt);
    this.musicByPhase();
    // the storm: lightning every 9-15 s (a flash, the sky lit, thunder after), rain around every camera
    const env = sim.stage && sim.stage.env;
    if (env && env.lightning && sim.phase !== 'results') { this.boltT = (this.boltT === undefined ? 4 : this.boltT) - dt; if (this.boltT <= 0) { this.boltT = 9 + fxRand() * 6; this.fxCue({ kind: 'lightning' }); } }
    if (env && env.rain) for (let i = 0; i < Math.min(2, sim.players.length); i++) { const c = sim.cameraFor(i); for (let k = 0; k < 6; k++) { const a = fxRand() * 6.283, r = 20 + fxRand() * 220; FX.add({ p: [c.x + Math.cos(a) * r + Math.cos(c.yaw) * 80, c.y + Math.sin(a) * r + Math.sin(c.yaw) * 80, c.z + 60 + fxRand() * 40], v: [-40, 20, -420], rgb: [150, 170, 190], size: .4, life: .35, mode: 'rain' }); } }
    // time ticks below 10 s
    if (sim.phase === 'action' && sim.timer < 10 && Math.ceil(sim.timer) !== this.lastTimeTick) { this.lastTimeTick = Math.ceil(sim.timer); this.sfx('timetick'); }
    if (this.game.audio && this.music && this.game.audio.tempo) { /* tempo follows TIME below 10 s */ const want = this.music.bpm + (sim.phase === 'action' && sim.timer < 10 ? 8 : 0); if (this._tempo !== want) { this._tempo = want; this.game.audio.tempo(want); } }
  }
  timeScale(dt) {
    const sim = this.sim, g = this.game;
    if (this.slowT > 0) this.slowT -= 1 / 120;
    const want = sim.slow ? .3 : this.slowT > 0 ? .35 : 1;
    g.timeScale = want * (tune.time.speed || 1);
  }
  sfx(name, o = {}) { const A = this.game.audio; if (A && A.ctx !== undefined) A.sfx('tc-' + name, o); }
  // ------------------------------------------------------------ events -> sound, effects, HUD
  handle(evs) {
    const sim = this.sim;
    for (const e of evs) {
      for (const h of this.huds) h.onEvent(e, sim, this.view, this.game);
      const P = e.p !== undefined && e.p >= 0 ? e.p : 0;
      switch (e.type) {
        case 'shot': { this.sfx(e.w, { vary: .04 }); FX.recoil[P] = get('weapon', e.w).recoil / 2; if (this.inputs[P] && this.inputs[P].rumble && e.w !== 'hg') this.inputs[P].rumble(.25, .06); const cs = sim.camSetupFor(P), d = aimRay(cs, e.aim[0], e.aim[1]), hit = sim.raycast(cs.pos, d); const from = vadd(vadd(cs.pos, vmul(cs.r, 6)), vadd(vmul(cs.u, -5), vmul(cs.f, 8))); if (e.w === 'mg' || e.w === 'sg' || fxRand() < .35) FX.tracer(from, hit ? hit.at : vadd(cs.pos, vmul(d, 900)), [255, 230, 150], .05); FX.light(vadd(cs.pos, vmul(cs.f, 20)), 120, .5, '#ffd080', .05); break; }
        case 'impact': { const s = e.surf; this.sfx(s === 'wood' || s === 'paper' ? 'wood' : s === 'water' ? 'water' : s === 'glass' ? 'glass' : s === 'concrete' ? 'concrete' : 'metal', { vol: .7 }); const rgb = s === 'wood' ? [180, 130, 70] : s === 'water' ? [200, 220, 255] : s === 'concrete' ? [170, 165, 150] : s === 'glass' ? [200, 230, 255] : [255, 220, 120]; FX.burst(e.at, s === 'water' ? 8 : 6, { rgb, size: s === 'metal' || s === 'armor' || s === 'shield' ? 1 : 1.6, speed: s === 'water' ? 30 : 50, life: .35, mode: s === 'metal' || s === 'armor' || s === 'shield' ? 'add' : 'alpha', g: 160, up: s === 'water' ? 40 : 0 }); break; }
        case 'hit': { this.sfx(e.head ? 'head' : 'ehit'); FX.burst(e.at, 5, { rgb: [230, 230, 230], size: 1.6, speed: 40, life: .25, mode: 'alpha', alpha: .8 }); break; }
        case 'kill': { if (fxRand() < .5) TC.Voice.bark(this.game, 'die', 120); if (e.at) FX.burst(e.at, 6, { rgb: [200, 200, 200], size: 2.2, speed: 40, life: .4, mode: 'alpha' }); break; }
        case 'bosshit': { this.sfx('ehit'); if (e.at) FX.burst(e.at, 6, { rgb: [255, 220, 120], size: 1.2, speed: 60, life: .3, mode: 'add', g: 100 }); break; }
        case 'eshot': { this.sfx(e.kind === 'zap' ? 'zap' : e.kind === 'sniper' ? 'sniper' : 'erifle', { vol: .55 }); FX.light(e.at, 80, .7, '#ffc070', .06); FX.burst(e.at, 3, { rgb: [255, 210, 120], size: 2.2, speed: 20, life: .08 }); const tp = sim.cameraFor(e.target || 0), miss = [tp.x + (fxRand() - .5) * 40, tp.y + (fxRand() - .5) * 40, tp.z + (fxRand() - .3) * 20]; FX.tracer(e.at, miss, e.kind === 'zap' ? [120, 220, 255] : [255, 220, 150], .07); this.sfx('whizz', { vol: .4 }); break; }
        case 'threat': this.sfx('tick', { vol: e.target === 0 ? 1 : .4 }); if (e.kind === 'sweep' || e.kind === 'turret') this.sfx('spinup'); break;
        case 'threathit': case 'hurt': if (e.type === 'hurt') { this.sfx('hurt'); FX.jolt[P] = 1; FX.trauma[P] = Math.min(1, FX.trauma[P] + .5); this.game.flash && this.game.flash('#ff2020', .12, .5); if (this.inputs[P] && this.inputs[P].rumble) this.inputs[P].rumble(.6, .25); TC.Voice.bark(this.game, 'hurt', 150); } break;
        case 'blocked': this.sfx('ricochet', { vol: .6 }); { const cp = TC.coverPoint(sim, P, 13); cp[2] += 12; FX.burst(cp, 6, { rgb: [255, 220, 120], size: 1, speed: 70, life: .25, g: 200 }); } break;
        case 'cover': this.sfx(e.on ? 'coverIn' : 'coverOut', { vol: .6 }); break;
        case 'reload': this.sfx('reload'); break;
        case 'switch': this.sfx('switch'); break;
        case 'empty': this.sfx('empty'); break;
        case 'pickup': this.sfx(e.first ? 'newweapon' : 'pickup'); break;
        case 'extra': this.game.audio.sting && this.game.audio.sting(TC.song('extra'), { at: 'now' }); break;
        case 'extend': this.sfx('extend'); break;
        case 'timeup': this.sfx('tidein'); FX.trauma[0] = 1; break;
        case 'explode': { this.sfx(e.size > 1.1 ? 'explode' : 'explodeS'); FX.explosion(e.at, Math.min(2.4, e.size || 1)); for (let i = 0; i < 4; i++) { const c = sim.cameraFor(i); if (!sim.players[i]) continue; const d = vdist(e.at, [c.x, c.y, c.z]); FX.trauma[i] = Math.min(1, FX.trauma[i] + clamp(1 - d / 500, 0, 1) * .7 * (e.size || 1)); } break; }
        case 'fireworks': this.firework(e.at, e.big); break;
        case 'splash': this.sfx('splash'); FX.burst(e.at, 14, { rgb: [220, 235, 255], size: 2.2, speed: 40, up: 70, g: 240, life: .8, mode: 'alpha', alpha: .8 }); break;
        case 'break': { this.sfx(e.kind === 'window' || e.kind === 'bottles' || e.kind === 'intel' ? 'glassbreak' : 'break'); FX.burst(e.at, 8, { rgb: e.kind === 'lantern' ? [255, 170, 60] : [170, 130, 80], size: 1.4, speed: 50, g: 220, life: .7, mode: e.kind === 'lantern' ? 'add' : 'solid' }); if (e.kind === 'intel') this.saveIntel(e); break; }
        case 'intel': this.saveIntel(e); break;
        case 'door': this.sfx('door'); break;
        case 'land': this.sfx('land'); break;
        case 'throw': this.sfx('slash', { vol: .4 }); break;
        case 'proj': this.sfx(e.kind === 'pgl' ? 'gl' : e.kind === 'harpoon' ? 'harpoon' : e.kind === 'torpedo' ? 'torpedo' : e.kind === 'flare' ? 'flare' : e.kind === 'grenade' ? 'bounce' : 'rocket', { vol: .7 }); break;
        case 'slash': this.sfx(e.blocked ? 'clang' : 'slash'); break;
        case 'spinup': this.sfx('spinup', { vol: .7 }); break;
        case 'armor': this.sfx('armor'); break;
        case 'shieldknock': this.sfx('clang'); break;
        case 'boss': this.view.bossCard = e.card ? { name: e.name, title: e.title, t: 0 } : null; if (e.card) this.game.audio.sting && this.game.audio.sting(TC.song('stinger'), { at: 'now' }); break;
        case 'bossdown': if (e.slow && !this.hub) this.slowT = .6; this.chainExplosions(e.at); break;
        case 'finalshot': this.sfx('slowmo'); break;
        case 'surge': this.sfx('surge'); FX.trauma[0] = .8; break;
        case 'smoke': for (let i = 0; i < 30; i++) FX.add({ p: [sim.boss.x + (fxRand() - .5) * 120, sim.boss.y + (fxRand() - .5) * 120, sim.boss.z + fxRand() * 30], v: [0, 0, 3], rgb: [170, 170, 180], size: 14, grow: 6, life: 3, mode: 'alpha', alpha: .7 }); break;
        case 'say': { if (e.modal || !this.subtitlesOnly) TC.Voice.say(this.game, e.text, e.speaker, { vol: e.modal ? 1 : .8 }); break; }
        case 'music': this.playMusic(e.song); break;
        case 'stageclear': this.game.audio.sting && this.game.audio.sting(TC.song('clear'), { at: 'now' }); break;
        case 'fx': this.fxCue(e); break;
        case 'coverswap': this.sfx('break'); FX.trauma[0] = .6; break;
        case 'coverhit': { this.sfx('break'); for (let i = 0; i < sim.players.length; i++) { const cp = TC.coverPoint(sim, i, 13); cp[2] += 10; FX.burst(cp, 12, { rgb: [150, 140, 130], size: 2, speed: 70, g: 240, life: .7, mode: 'solid' }); } break; }
        case 'scene': this.lastTimeTick = 99; break;
        case 'stage': this.view.setStage(sim); this.applyAmbience(); break;
      }
      if (this.onEvent) this.onEvent(e);
    }
  }
  saveIntel(e) { if (!e.id) return; const got = E.store.get('tc3:intel', []); if (!got.includes(e.id)) { got.push(e.id); E.store.set('tc3:intel', got); } }
  firework(at, big) { const cols = [[255, 90, 90], [255, 211, 74], [90, 209, 255], [138, 255, 138], [255, 140, 255]], c = cols[(fxRand() * cols.length) | 0]; FX.burst(at, big ? 40 : 24, { rgb: c, size: 2, speed: big ? 110 : 70, life: 1.1, g: 40, drag: 1.2, mode: 'add' }); FX.light(at, 400, .9, '#ffd0a0', .3); this.sfx('fireworks', { vol: .6 }); }
  chainExplosions(at) { if (!at) return; for (let i = 0; i < 5; i++) this.game.after ? this.game.after(i * .18, () => { this.sfx('explode'); FX.explosion([at[0] + (fxRand() - .5) * 50, at[1] + (fxRand() - .5) * 50, at[2] + (fxRand() - .5) * 20], 1.4); }) : null; }
  fxCue(e) {
    const sim = this.sim, k = e.kind;
    if (k === 'gallery') { this.sfx('explode'); FX.trauma[0] = .8; }
    if (k === 'bulldog' || k === 'crash') { this.sfx('explode'); FX.trauma[0] = .7; if (e.at) FX.explosion(e.at, 1.2); }
    if (k === 'doorfall') this.sfx('clang');
    if (k === 'beam') { this.game.flash && this.game.flash('#ffffff', .3, .35); }
    if (k === 'topple') { this.sfx('stomp'); FX.trauma[0] = 1; }
    if (k === 'heliCrash') { this.sfx('explode'); }
    if (k === 'lightning') { FX.lightning = 1; this.game.flash && this.game.flash('#ffffff', .1, .25); this.game.after && this.game.after(.6 + fxRand(), () => this.sfx('thunder')); }
  }
  applyAmbience() { const st = this.sim.stage; if (!st || !this.game.audio || !this.game.audio.ctx) return; TC.Amb.start(this.game, st.amb || (st.id === 1 ? 'festival' : st.id === 2 ? 'storm' : st.id === 3 ? 'tidewall' : 'range')); }
  playMusic(id, o = {}) { if (!id || !has('song', id)) return; const s = TC.song(id); if (this.music === s && !o.restart) return; this.music = s; this._tempo = s.bpm; this.layersOn = null; this.game.audio.music && this.game.audio.music(s, { fade: o.fade === undefined ? .8 : o.fade }); }
  musicByPhase() {
    const sim = this.sim; if (sim.phase === 'cut') return;
    const st = sim.stage, boss = sim.boss && !sim.boss.defeated && sim.boss.D && (sim.boss.D.card !== false), want = boss ? (sim.stageId === 3 && sim.boss.id !== 'seawolf' ? 'kingtide' : 'boss') : st.music;
    if (sim.phase === 'results' || sim.phase === 'done') return;
    this.playMusic(want);
    const on = sim.phase === 'action'; if (this.layersOn !== on && this.game.audio.layer) { this.layersOn = on; for (const n of ['lead', 'drums']) try { this.game.audio.layer(n, on ? 1 : 0, .6); } catch (err) { /* this song has no such layer */ } }
  }
  // ------------------------------------------------------------ draw
  draw(r) {
    const sim = this.sim, vps = this.vps = this.viewports(r);
    r.overlay(g => {
      vps.forEach((vp, k) => {
        const i = this.split ? k : (this.localIndex || 0), free = k === 0 && tune.view.freeCam && TC.dev.free, Rr = this.view.draw(g, sim, i, vp, free ? { cam: TC.dev.free } : {});
        TC.dev.overlay(g, Rr, sim, vp);
        this.huds[i] && this.huds[i].draw(g, sim, vp, Rr, { settings: this.game.settings, input: this.inputs[i] || this.game.input, hub: this.hub, portrait: id => this.portrait(id) });
      });
      if (this.split) E.px.rect(g, Math.floor(r.W / 2) - 1, 0, 2, r.H, '#000000');
      this.drawCut(g, r);
      this.drawBossCard(g, r);
      if (tune.view.perf && this.view.R[0]) { const s = this.view.R[0].stats; T(g, 'tris ' + s.tris + ' px ' + s.px + ' actors ' + s.actors, 4, r.H - 10, '#7fe3ff', { font: 'tiny' }); }
      if (this.overlayDraw) this.overlayDraw(g, r);
    });
  }
  drawBossCard(g, r) {
    const c = this.view.bossCard, B = this.sim.boss; if (!c || !B || B.intro <= 0) return;
    const k = clamp((2.5 - B.intro) / .3, 0, 1), y = r.H * .34;
    E.px.rect(g, 0, y - 4, r.W * k, 40, '#08142a'); E.px.rect(g, 0, y - 4, r.W * k, 2, '#ff5a2a'); E.px.rect(g, 0, y + 34, r.W * k, 2, '#ff5a2a');
    if (k >= 1) { E.font.title(g, c.name, r.W / 2, y, { scale: 3, colors: ['#ffffff', '#ffd36a', '#ff5a2a'], outline: '#1a0808', align: 'center' }); T(g, c.title, r.W / 2, y + 24, '#ffb0a0', { align: 'center' }); }
  }
  drawCut(g, r) {
    const sim = this.sim, C = sim.cut; if (!C) return;
    E.px.rect(g, 0, 0, r.W, 16, '#000000'); E.px.rect(g, 0, r.H - 16, r.W, 16, '#000000');
    const I = this.inputs[0] || this.game.input;
    T(g, 'HOLD ' + TC.label(I, 'confirm') + ' TO SKIP', r.W - 6, 4, '#8aa0c8', { align: 'right', font: 'tiny' });
    if (!C.line) return;
    const spk = has('speaker', C.line.speaker) ? get('speaker', C.line.speaker) : null, w = Math.min(r.W - 24, 380), x = (r.W - w) / 2, y = r.H - 72;
    E.ui.box(g, x, y, w, 52, { bg: UI.bg, border: spk ? spk.color : UI.accent, alpha: .94 });
    const rig = this.portrait(C.line.speaker); if (rig) rig.drawPortrait(g, x + 5, y + 6, 40, { zoom: 2.6, turn: .5, bg: C.line.screen ? '#0c3a34' : '#0a1426', frame: true });
    T(g, (spk ? spk.name : '') + (C.line.screen ? '  · BROADCAST' : ''), x + 52, y + 5, spk ? spk.color : UI.gold);
    const full = TC.txt(C.line.text), n = Math.floor(C.lineT * 42), shown = full.slice(0, n), lines = E.font.wrap(shown, w - 60);
    lines.slice(0, 3).forEach((l, k) => T(g, l, x + 52, y + 16 + k * 10, '#ffffff'));
    if (n >= full.length && ((sim.t * 2) | 0) % 2) T(g, '▸', x + w - 10, y + 40, UI.gold);
  }
}
TC.Session = Session;

// ===== 62-net.js
// 62-net: AI Hub Session Protocol v1, shared-world co-op for 1-4 players. Our own card (the stage, the players in
// their colours with READY ticks, the goal, this device's controls, the countdown; Enter or Cross answers ready,
// Triangle or M asks for more time), the 3-2-1 start on the hub's clock, a host-authoritative Sim (the host steps the
// world with every player's commands; clients send their input and presses), snapshots (10/s, unreliable, kept under
// 1,100 bytes) and event batches (reliable, at most 8/s) down to replicas, which predict their own cover and aim,
// a server copy with no player of its own, players leaving, time-up, finish() with standings, scores, stats and
// awards, and the end of the round. Network only through AIHub.send; names drawn only on the canvas.
// Reads: Session (60), Sim (20), HUD (50).

const ST_CODES = ['enter', 'hide', 'peek', 'aim', 'fire', 'move', 'run', 'sprint', 'wind', 'slash', 'back', 'walk', 'dead', 'ride', 'route', 'fly'];
const PH_CODES = ['boot', 'cut', 'travel', 'action', 'clear', 'results', 'done', 'gameover'];
const EN_TYPES = () => Object.keys(TC.REG.enemy);
const PR_KINDS = ['grenade', 'rocket', 'harpoon', 'torpedo', 'missile', 'flare', 'pgl', 'debris'];
const TH_KINDS = ['shot', 'elite', 'sniper', 'grenade', 'rocket', 'harpoon', 'torpedo', 'missile', 'flare', 'slash', 'sweep', 'turret', 'strafe', 'claw', 'slam'];
const BOSS_F = ['x', 'y', 'z', 'yaw', 'roll', 'phase', 'bx', 'by', 'bz', 'duck', 'mode', 'shield', 'shieldDown', 'laser', 'up', 'final', 'topple', 'toppled', 'hatch', 'charge', 'crash', 'bank', 'gait', 'flip', 'swing', 'u', 'open', 'atk', 'defeated', 'intro', 'outT', 'pi'];
const EV_KEEP = new Set(['hit', 'kill', 'explode', 'say', 'threat', 'blocked', 'hurt', 'pickup', 'extend', 'timeup', 'clear', 'scene', 'action', 'boss', 'bossdown', 'break', 'fireworks', 'splash', 'finalshot', 'surge', 'shotdown', 'bosshit', 'eshot', 'extra', 'headshot', 'points', 'civhit', 'intel', 'stageclear', 'partbreak', 'spinup', 'slash', 'coverhit', 'coverswap', 'fx', 'door', 'smoke', 'shot', 'impact', 'proj']);
const r1 = v => Math.round(v * 10) / 10, r0 = Math.round;

const Net = {
  hub: null, info: null, state: 'connecting', card: null, startIn: 0, endReason: null, me: 0, myIdx: 0, server: false, host: false,
  session: null, remote: {}, inbox: [], sendT: 0, evT: 0, inT: 0, prT: 0, evq: [], presses: [], tokens: 18, lastTok: 0, finished: false, snap: null, msgs: 0, bytesMax: 0,
  // ---------------------------------------------------------------- connect (a boot step)
  async boot(game, hub = (typeof window !== 'undefined' ? window.AIHub : null)) {
    this.hub = hub; this.game = game;
    const info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (!info) { this.hub = null; return; }
    this.info = info; this.me = info.me; this.server = !!info.server; this.host = !!info.isHost;
    this.round = info.round || 1; this.stage = ((this.round - 1) % 3) + 1;
    this.players = info.players.map((p, i) => ({ id: p.id, name: p.name, color: p.color, agent: TC.AGENTS[i % 4] }));
    this.myIdx = this.players.findIndex(p => p.id === this.me);
    hub.on('card', c => { this.card = c; });
    hub.on('start', s => { this.state = 'count'; this.startIn = s && s.in; });
    hub.on('message', (d, from) => this.onMessage(d, from));
    hub.on('leave', e => this.onLeave(e));
    hub.on('time-up', () => this.onTimeUp());
    hub.on('end', e => this.onEnd(e));
    this.state = 'card';
    this.build(game);
    hub.ready();
  },
  build(game) {
    const seed = Math.floor((this.hub.rng ? this.hub.rng('world')() : .5) * 1e6);
    const ps = this.players.map((p, i) => ({ input: !this.server && i === this.myIdx ? game.input : null, name: p.name, color: p.color, agent: p.agent }));
    this.session = new Session(game, { mode: this.host ? 'host' : 'replica', simMode: this.host ? 'host' : 'replica', stages: [this.stage], stage: this.stage, players: ps, seed, skipCuts: true, hub: true });
    this.session.localIndex = Math.max(0, this.myIdx);
    for (const h of this.session.huds) h.noPrompts = false;
    if (this.host) { this.session.remote = i => this.remoteCmd(i); this.session.onEvent = e => { if (EV_KEEP.has(e.type)) this.evq.push(e); }; }
  },
  // ---------------------------------------------------------------- messages
  send(data, reliable = true) {
    if (this.tokens < 1) return false; this.tokens--;
    this.msgs++; const n = JSON.stringify(data).length; if (!reliable) this.bytesMax = Math.max(this.bytesMax, n);
    return this.hub.send(data, { reliable });
  },
  onMessage(d, from) {
    if (!d || this.state === 'over') return;
    if (this.host) {
      const i = this.players.findIndex(p => p.id === from); if (i < 0) return;
      const R = this.remote[i] || (this.remote[i] = { aim: [0, 0], cover: false, fire: false, q: [] });
      if (d.t === 'in') { R.aim = [d.a[0] / 1000, d.a[1] / 1000]; R.cover = !!d.c; R.fire = !!d.f; }
      if (d.t === 'pr') for (const k of d.k) R.q.push(k);
    } else {
      if (d.t === 's') { if (!this.snap || d.n > this.snap.n) this.snap = d; }
      if (d.t === 'ev') for (const e of d.e) this.inbox.push(e);
      if (d.t === 'over') this.finishedAt = true;
    }
  },
  remoteCmd(i) {
    const R = this.remote[i] || { aim: [0, 0], cover: false, fire: false, q: [] }, has = k => { const j = R.q.indexOf(k); if (j < 0) return false; R.q.splice(j, 1); return true; };
    const sel = has('w1') ? 1 : has('w2') ? 2 : has('w3') ? 3 : has('w4') ? 4 : 0;
    return { aim: R.aim, fireDown: R.fire, fireP: has('fire'), cover: R.cover, next: has('next'), prev: has('prev'), sel, reload: has('reload'), advance: has('advance'), skip: false, autoFire: true };
  },
  onLeave(e) {
    const i = this.players.findIndex(p => p.id === e.id); if (i < 0 || !this.session) return;
    const p = this.session.sim.players[i]; if (p) { p.left = true; p.out = false; }
    if (this.host && this.session.sim.players.every(q => q.left)) this.finish();
  },
  onTimeUp() { if (this.host) this.finish(); },
  onEnd(e) {
    this.state = 'over'; this.endReason = e && e.reason;
    const g = this.game; g.input.clear(); if (g.audio) { g.audio.music && g.audio.music(null); g.audio.mute && g.audio.mute(true); } TC.Amb.stop(); TC.Voice.stopAll(); g.timeScale = 1;
  },
  // ---------------------------------------------------------------- the end of a round (host only, once)
  finish() {
    if (this.finished || !this.host) return; this.finished = true;
    const sim = this.session.sim, ps = sim.players.map((p, i) => ({ id: this.players[i].id, p })).filter(x => !x.p.left || x.p.score > 0);
    const sorted = ps.slice().sort((a, b) => b.p.score - a.p.score), standings = [];
    for (const x of sorted) { const last = standings[standings.length - 1]; if (last && sim.players[this.players.findIndex(q => q.id === last[0])].score === x.p.score) last.push(x.id); else standings.push([x.id]); }
    const scores = {}, stats = {}; for (const x of ps) { const s = x.p.stats; scores[x.id] = x.p.score; stats[x.id] = { Kills: s.kills, Accuracy: (s.shots ? Math.round(s.hits / s.shots * 100) : 0) + '%', Headshots: s.heads, 'Cover saves': s.saves, 'Lives lost': s.livesLost }; }
    const best = (f) => ps.slice().sort((a, b) => f(b.p) - f(a.p))[0];
    const awards = ps.length ? [{ id: best(p => p.stats.shots ? p.stats.hits / p.stats.shots : 0).id, title: 'Sharpshooter', detail: 'Best accuracy' }, { id: best(p => p.stats.kills).id, title: 'Pointman', detail: 'Most kills' }, { id: best(p => p.stats.saves).id, title: 'Iron Wall', detail: 'Most cover saves' }] : [];
    const won = !!(sim.boss && sim.boss.defeated) || sim.phase === 'results';
    this.hub.finish({ standings, scores, won, stats, awards });
    this.send({ t: 'over', won }, true);
  },
  // ---------------------------------------------------------------- snapshots
  encode(sim) {
    const types = EN_TYPES(), out = { t: 's', n: this.sn = (this.sn || 0) + 1, at: r0(this.hub.time()), ph: PH_CODES.indexOf(sim.phase), sc: sim.sceneIdx, tm: r1(sim.timer), td: r0(sim.travelD), cd: sim.carrier ? r0(sim.carrier.d) : 0, wa: r1(sim.water), sl: sim.slow ? 1 : 0 };
    out.p = sim.players.map(p => [p.score, p.lives, p.chain, TC.WEAPONS.indexOf(p.w), p.w === 'hg' ? p.mag : p.ammo[p.w], r0(p.c * 100), p.out ? r1(p.cont) : -1, p.left ? 1 : 0, r0(p.aim[0] * 100), r0(p.aim[1] * 100)]);
    const cam = sim.cameraFor(0), alive = sim.enemies.filter(e => !e.dead || e.deadT < 2.6).sort((a, b) => Math.hypot(a.x - cam.x, a.y - cam.y) - Math.hypot(b.x - cam.x, b.y - cam.y)).slice(0, 12);
    out.e = alive.map(e => [e.id, types.indexOf(e.type), r0(e.x), r0(e.y), r0(e.z), r0(e.facing * 100), Math.max(0, ST_CODES.indexOf(e.state)), r0(e.up * 10), r0(e.sinkNow), e.lookI, (e.dead ? 1 : 0) | (e.point ? 2 : 0) | (e.run ? 4 : 0) | (e.air ? 8 : 0) | (e.climb ? 16 : 0) | (e.hurtT > 0 ? 32 : 0) | (e.shieldDown > 0 ? 64 : 0) | (e.flashT > 0 ? 128 : 0), r1(e.deadT), r1(e.side), e.ski ? r0(e.ski.yaw * 100) : null, e.death ? e.death[0] : '', e.cover ? e.cover.h : 0, e.size === 1 ? undefined : e.size]);
    out.pr = sim.projectiles.filter(p => p.team !== 'fx').slice(0, 8).map(p => [p.id, PR_KINDS.indexOf(p.kind), r0(p.pos[0]), r0(p.pos[1]), r0(p.pos[2]), r0(p.vel[0]), r0(p.vel[1]), r0(p.vel[2])]);
    out.th = sim.threats.filter(t => !t.done).slice(0, 6).map(t => [t.id, t.target, r0(t.left * 100), r0(t.dur * 100), TH_KINDS.indexOf(t.kind), t.at ? r0(t.at[0]) : 0, t.at ? r0(t.at[1]) : 0, t.at ? r0(t.at[2]) : 0, t.unblockable ? 1 : 0]);
    out.od = sim.objects.filter(o => o.dead).map(o => o.id);
    const B = sim.boss; if (B) { const f = {}; for (const k of BOSS_F) if (B[k] !== undefined && B[k] !== null) f[k] = typeof B[k] === 'number' ? r1(B[k]) : B[k]; out.b = { id: B.id, f, p: B.parts.map(p => [r1(p.hp), (p.alive ? 1 : 0) | (p.hidden ? 2 : 0) | (p.armor ? 4 : 0) | (p.flashT > 0 ? 8 : 0), p.pos ? r0(p.pos[0]) : 0, p.pos ? r0(p.pos[1]) : 0, p.pos ? r0(p.pos[2]) : 0]) }; }
    if (sim.flags.passing) out.ps = sim.flags.passing.map(r0);
    // keep it under the budget: drop the farthest enemies first
    let s = JSON.stringify(out); while (s.length > 1100 && out.e.length) { out.e.pop(); s = JSON.stringify(out); }
    while (s.length > 1100 && out.pr.length) { out.pr.pop(); s = JSON.stringify(out); }
    return out;
  },
  apply(sim, S) {
    if (S.sc !== sim.sceneIdx && S.sc >= 0) { sim.enemies = []; sim.objects = []; sim.projectiles = []; sim.boss = null; sim.startScene(S.sc); }
    sim.phase = PH_CODES[S.ph] || sim.phase; sim.timer = S.tm; sim.travelD = S.td; if (sim.carrier) { sim.carrier.d = S.cd; sim._carrierUpdate(0); } sim.water = S.wa; sim.slow = !!S.sl;
    S.p.forEach((q, i) => { const p = sim.players[i]; if (!p) return; p.score = q[0]; p.lives = q[1]; p.chain = q[2]; p.w = TC.WEAPONS[q[3]] || 'hg'; if (p.w === 'hg') p.mag = q[4]; else { p.ammo[p.w] = q[4]; p.owned[p.w] = true; } p.out = q[6] >= 0; p.cont = Math.max(0, q[6]); p.left = !!q[7]; if (i !== this.myIdx) { p.c = q[5] / 100; p.aim = [q[8] / 100, q[9] / 100]; } });
    const types = EN_TYPES(), seen = new Set();
    for (const q of S.e) {
      seen.add(q[0]); let e = sim.enemies.find(x => x.id === q[0]);
      if (!e) { const A = get('enemy', types[q[1]]); e = { id: q[0], type: types[q[1]], A, look: A.looks ? A.looks[q[9]] || A.looks[0] : null, lookI: q[9], size: q[16] || 1, o: {}, vel: [0, 0, 0], x: q[2], y: q[3], z: q[4], cover: null, replica: true }; sim.enemies.push(e); }
      e.tx = q[2]; e.ty = q[3]; e.tz = q[4]; e.facing = q[5] / 100; e.state = ST_CODES[q[6]]; e.up = q[7] / 10; e.sinkNow = q[8];
      const f = q[10]; e.dead = !!(f & 1); e.point = !!(f & 2); e.run = f & 4 ? 1 : 0; e.air = !!(f & 8); e.climb = !!(f & 16); e.hurtT = f & 32 ? .1 : 0; e.shieldDown = f & 64 ? .5 : 0; e.flashT = f & 128 ? .06 : 0; e.deadT = q[11]; e.side = q[12];
      e.ski = q[13] !== null && q[13] !== undefined ? { yaw: q[13] / 100 } : null; e.death = { c: 'crumple', f: 'flyback', s: 'spin', h: 'head', d: 'drop', p: 'splash' }[q[14]] || (e.dead ? 'crumple' : null);
      if (q[15]) e.cover = { h: q[15], at: [e.x, e.y, e.z], peek: ['up'], ledge: false };
      if (e.target === undefined) e.target = 0;
      TC.updateVols(sim, e);
    }
    sim.enemies = sim.enemies.filter(e => seen.has(e.id));
    sim.projectiles = S.pr.map(q => ({ id: q[0], kind: PR_KINDS[q[1]], pos: [q[2], q[3], q[4]], vel: [q[5], q[6], q[7]], team: 'enemy', shootable: q[1] !== 6, r: 5, t: 0 }));
    sim.threats = S.th.map(q => ({ id: q[0], target: q[1], left: q[2] / 100, dur: q[3] / 100, kind: TH_KINDS[q[4]], at: [q[5], q[6], q[7]], done: false, unblockable: !!q[8] }));
    for (const o of sim.objects) o.dead = S.od.includes(o.id);
    if (S.b) {
      let B = sim.boss; const D = get('boss', S.b.id);
      if (!B || B.id !== S.b.id) { const sc = sim.scene; B = sim.boss = { id: S.b.id, D, parts: Object.keys(D.parts).map(k => Object.assign({ id: k, r: 8 }, D.parts[k], { pos: null })), t: 0, home: sc.bossAt || sc.scyllaAt || sc.seawolf, leverAt: sc.krake ? sc.krake.lever : null, drums: [], replica: true }; B.part = k => B.parts.find(p => p.id === k); }
      Object.assign(B, S.b.f); S.b.p.forEach((q, k) => { const p = B.parts[k]; if (!p) return; p.hp = q[0]; p.alive = !!(q[1] & 1); p.hidden = !!(q[1] & 2); p.armor = !!(q[1] & 4); p.flashT = q[1] & 8 ? .06 : 0; p.pos = [q[2], q[3], q[4]]; });
    } else sim.boss = null;
    sim.flags.passing = S.ps || (sim.scene && sim.scene.id === '2-3' && sim.flags.passing !== undefined ? null : sim.flags.passing);
  },
  // ---------------------------------------------------------------- the per-step work
  update(dt) {
    const s = this.session, sim = s.sim, g = this.game, I = g.input;
    this.tokens = Math.min(18, this.tokens + dt * 18);   // the rate limit: a token bucket of 18 messages a second
    if (this.state === 'over') return;
    if (this.state === 'card') {
      if (!this.server) { if (I.pressed('confirm') || I.pressed('start') || (I.clicked && I.clicked())) this.hub.answer('ready'); if (I.pressed('more')) this.hub.answer('more'); }
      return;
    }
    if (this.state === 'count') { if (this.hub.time() >= 0) { this.state = 'play'; s.huds.forEach(h => h.action = 1.2); } return; }
    // play
    if (this.host) {
      s.update(dt);
      this.sendT += dt; this.evT += dt;
      if (this.sendT >= .1) { this.sendT = 0; this.send(this.encode(sim), false); }
      if (this.evT >= .125 && this.evq.length) { this.evT = 0; const batch = this.evq.splice(0, 40).map(e => this.compactEv(e)); this.send({ t: 'ev', e: batch }, true); }
      if (sim.phase === 'results' || sim.phase === 'done' || sim.phase === 'gameover') this.finish();
    } else {
      // the replica: the host's world, our own cover and aim at once
      if (this.snap) { this.apply(sim, this.snap); this.snap = null; }
      const evs = this.inbox.splice(0).filter(e => !(e.type === 'shot' && e.p === this.myIdx));
      for (const e of sim.enemies) if (e.tx !== undefined) { const k = Math.min(1, dt * 12); e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; e.z += (e.tz - e.z) * k; }
      for (const t of sim.threats) t.left -= dt;
      for (const p of sim.projectiles) for (let k = 0; k < 3; k++) p.pos[k] += p.vel[k] * dt;
      const i = this.myIdx, A = s.aimers[i];
      if (A && !sim.players[i].out) {
        const vp = s.vps[0], cmd = A.build(dt, sim, vp, TC.assistTargets(sim, i), g.settings || {}), p = sim.players[i];
        p.aim = cmd.aim; const want = sim.phase === 'action' && cmd.cover; p.c = approach(p.c, want ? 1 : 0, dt / (want ? tune.player.coverIn : tune.player.coverOut));
        this.inT += dt; if (this.inT >= 1 / 15) { this.inT = 0; this.send({ t: 'in', a: [r0(cmd.aim[0] * 1000), r0(cmd.aim[1] * 1000)], c: cmd.cover ? 1 : 0, f: cmd.fireDown ? 1 : 0 }, false); }
        for (const k of ['fire', 'next', 'prev', 'reload', 'w1', 'w2', 'w3', 'w4']) if (k === 'fire' ? cmd.fireP : I.pressed(k)) this.presses.push(k);
        if (cmd.advance) this.presses.push('advance');
        if (cmd.fireP && p.c < .2) evs.push({ type: 'shot', p: i, w: p.w, aim: cmd.aim.slice() });
        this.prT += dt; if (this.presses.length && this.prT >= .3) { this.prT = 0; this.send({ t: 'pr', k: this.presses.splice(0, 12) }, true); }
      }
      s.handle(evs); s.view.updateRigs(sim, dt); FX.step(dt); for (const h of s.huds) h.step(dt); s.musicByPhase();
      g.timeScale = 1;
    }
  },
  compactEv(e) { const o = {}; for (const k in e) { const v = e[k]; if (k === 't') continue; o[k] = Array.isArray(v) ? v.map(x => typeof x === 'number' ? r0(x) : x) : typeof v === 'number' ? r1(v) : v; } return o; },
  // ---------------------------------------------------------------- drawing: the card, the countdown, the status screen, the end
  draw(r) {
    const g0 = this.game, s = this.session;
    if (this.state === 'play' || this.state === 'count' || (this.state === 'over' && s)) { if (!this.server) s.draw(r); }
    r.overlay(g => {
      if (this.state === 'connecting') { frame(g, r, 'TIDE CRISIS 3', g0.time); T(g, 'CONNECTING TO THE HUB…', r.W / 2, r.H / 2, '#ffffff', { align: 'center' }); return; }
      if (this.state === 'card') return this.drawCard(g, r);
      if (this.server && this.state !== 'over') { const sim = s.sim; frame(g, r, 'TIDE CRISIS 3', g0.time); T(g, 'HOSTING · ' + sim.players.filter(p => !p.left).length + ' AGENTS · AREA ' + (sim.sceneId || '-'), r.W / 2, r.H / 2 - 10, UI.gold, { align: 'center', scale: 1 }); T(g, 'TIME ' + Math.max(0, sim.timer).toFixed(1) + '  ·  ' + sim.phase.toUpperCase(), r.W / 2, r.H / 2 + 6, '#ffffff', { align: 'center' }); sim.players.forEach((p, k) => T(g, this.players[k].name.slice(0, 14) + '  ' + p.score, r.W / 2, r.H / 2 + 24 + k * 10, p.color, { align: 'center' })); }
      if (this.state === 'count') { const t = this.hub.time(), n = Math.ceil(-t / 1000); if (n > 0 && n <= 3) E.font.title(g, String(n), r.W / 2, r.H * .38, { scale: 6, colors: ['#ffffff', '#ffd36a', '#ff5a2a'], outline: '#000', align: 'center' }); }
      if (this.state === 'over') { E.px.blend(g, .6, 'multiply', () => E.px.rect(g, 0, 0, r.W, r.H, '#101830')); const msg = this.endReason === 'host-left' ? 'HOST LEFT — ROUND VOID' : this.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER'; E.font.title(g, msg, r.W / 2, r.H * .42, { scale: 2, colors: ['#ffffff', '#9fe3ff'], outline: '#000', align: 'center' }); }
    });
  },
  drawCard(g, r) {
    const st = get('stage', this.stage), c = this.card || {}, t = this.game.time;
    frame(g, r, null, t); logo(g, r, 6, t, 2);
    T(g, 'STAGE ' + st.id + ' · ' + st.name, r.W / 2, 32, UI.gold, { align: 'center', scale: 1 });
    const mw = Math.min(170, r.W * .4); islesMap(g, 10, 46, mw, mw * .6, st.id, t);
    T(g, 'GOAL', mw + 22, 48, UI.gold); E.font.wrap('Clear the stage together and beat the boss. Most points wins.', r.W - mw - 34).forEach((l, k) => T(g, l, mw + 22, 58 + k * 9, '#ffffff'));
    const I = this.game.input, L = a => TC.label(I, a);
    T(g, 'CONTROLS', mw + 22, 86, UI.gold);
    [I.lastDevice === 'gamepad' ? 'Aim: stick' : 'Aim: mouse', 'Fire: ' + L('fire'), 'Cover + reload: hold ' + L('cover'), 'Switch: ' + L('prev') + ' / ' + L('next')].forEach((l, k) => T(g, l, mw + 22, 96 + k * 9, '#cfe0ff'));
    const ready = c.ready || [];
    this.players.forEach((p, k) => { const x = 10 + k * ((r.W - 20) / 4), y = 150, w = (r.W - 20) / 4 - 6; E.ui.box(g, x, y, w, 36, { bg: ['#10244a', '#081428'], border: p.color }); const rig = TC.portrait(p.agent); if (rig) rig.drawPortrait(g, x + 3, y + 3, 30, { zoom: 2, turn: .5, bg: '#0a1426', frame: false }); T(g, p.name.slice(0, 10), x + 36, y + 6, p.color); T(g, ready.includes(p.id) ? 'READY ✓' : '…', x + 36, y + 18, ready.includes(p.id) ? '#8aff8a' : UI.dim, { font: 'tiny' }); });
    const left = c.left === null || c.left === undefined ? (c.starting ? 'STARTING' : c.paused ? 'PAUSED' : '') : Math.ceil(c.left / 1000) + ' s';
    T(g, left, r.W / 2, 196, '#ffffff', { align: 'center', scale: 2 });
    if (!this.server) T(g, '[' + L('confirm') + '] READY    [' + L('more') + '] ' + (c.asked ? 'TAKE BACK MORE TIME' : 'MORE TIME') + (c.asking ? '  (' + c.asking + ' asking)' : ''), r.W / 2, r.H - 12, '#cfe0ff', { align: 'center' });
  }
};
TC.Net = Net;
TC.netBoot = game => Net.boot(game).catch(err => { if (window.AIHub && window.AIHub.fail) window.AIHub.fail(String(err && err.message || err)); }).then(() => { Net.booted = true; });
TC.netScenes = game => ({ session: { camera: { zoom: false }, touch: [], pausable: false,
  enter() { if (!Net.hub && !HUB) game.go('title'); },
  update(dt) { if (Net.booted && !Net.hub) { game.go('title'); return; } if (Net.session || Net.state === 'over') Net.update(dt); },
  draw(r) { Net.draw(r); } } });

// ===== 90-main.js
// 90-main: new E.Game with the engine's standard features adjusted (pause menu items, our settings, control names),
// the scenes (title, menu, difficulty, select, coop join, play with its briefing / results / game over / initials /
// credits states, records, about, how to play, attract; the AI Hub's session and server scenes come from 62), the
// boot steps, and game.debug for the tests and tools. Reads: everything above.

const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active;
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, input: TC_INPUT, id: 'tidecrisis3', bg: '#000000',
  autoPause: !HUB, corner: !HUB, fullscreen: HUB ? false : undefined,
  menu: HUB ? false : {
    items: [['Restart area', () => TC.play && TC.play.restartScene()], ['Restart stage', () => TC.play && TC.play.restartStage()], ['How to play', () => { game.resume(); TC.play && (TC.play.howto = 0); }], ['Dev mode', () => { game.resume(); TC.dev.open(TC.play); }]],
    settings: [
      { key: 'difficulty', label: 'Difficulty (new runs)', options: ['Easy', 'Normal', 'Hard'], value: 'Normal' },
      { key: 'aimAssist', label: 'Aim assist (controller)', options: ['Off', 'Low', 'Medium', 'High'], value: 'Medium' },
      { key: 'padSpeed', label: 'Aim speed (controller)', type: 'slider', min: .5, max: 2, step: .1, value: 1 },
      { key: 'coverMode', label: 'Cover control', options: ['Hold', 'Toggle'], value: 'Hold' },
      { key: 'autoFire', label: 'Hold fire to repeat (handgun)', value: true },
      { key: 'reticle', label: 'Reticle', options: ['Cross', 'Ring', 'Dot'], value: 'Cross' },
      { key: 'reticleSize', label: 'Reticle size', options: ['S', 'M', 'L'], value: 'M' },
      { key: 'threatSize', label: 'Crisis rings', options: ['Normal', 'Large'], value: 'Normal' },
      { key: 'subtitles', label: 'Subtitles', value: true },
      { key: 'wobble', label: 'Retro texture wobble', value: false }],
    controls: TC.CONTROL_NAMES, quit: 'title' } });
TC.game = game;
TC.view = new WorldView(game);
TC.cab = E.Arcade ? new E.Arcade(game, { id: 'tidecrisis3', hud: false }) : null;
const portraits = new Map();
TC.portrait = id => { if (!has('speaker', id)) return null; let r = portraits.get(id); if (!r) { r = new E.Humanoid(Object.assign({}, get('speaker', id).rig, { size: 1 })); r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); portraits.set(id, r); } return r; };
const diffId = () => ({ Easy: 'easy', Normal: 'normal', Hard: 'hard' })[(game.settings && game.settings.difficulty) || 'Normal'] || 'normal';
const sfxUI = n => game.audio.sfx && game.audio.sfx('tc-' + n);
if (typeof window !== 'undefined') { window.addEventListener('keydown', () => { TC._keyed = true; }, { capture: true }); }

// ---------------------------------------------------------------- the title's flyover
let flySim = null;
const flyover = (g, r, t) => {
  if (!flySim) { flySim = new Sim({ mode: 'attract', stages: [1], stage: 1, scene: '1-1', skipCuts: true }); }
  const a = t * .06, cx = 200 + Math.cos(a) * 340, cy = 40 + Math.sin(a) * 260;
  if (fxRand() < .02) { const at = [300 + fxRand() * 600, -500 - fxRand() * 400, 200 + fxRand() * 150]; FX.burst(at, 30, { rgb: [[255, 90, 90], [255, 211, 74], [90, 209, 255]][(fxRand() * 3) | 0], size: 2.4, speed: 90, life: 1.2, g: 40, drag: 1.2, mode: 'add' }); }
  FX.step(1 / 60);
  TC.view.draw(g, flySim, 0, { x: 0, y: 0, w: r.W, h: r.H }, { cam: { x: cx, y: cy, z: 70 + Math.sin(t * .2) * 20, yaw: Math.atan2(-20 - cy, 300 - cx), pitch: -.1, roll: 0, fov: 55 } });
};

// ---------------------------------------------------------------- the menu flow
const menuScreen = { t: 0, list: null,
  enter() { this.t = 0; Attract.idle = 0; this.list = new ListMenu([
    { label: 'ARCADE', desc: 'All three stages, story and bosses', on: () => startRun({ mode: 'arcade', stages: [1, 2, 3] }) },
    { label: 'CO-OP', desc: 'Two agents, split screen (P2 on a controller)', on: () => game.go('coop') },
    { label: 'STAGE SELECT', desc: 'Any stage, any difficulty', on: () => game.go('select') },
    { label: 'TRAINING', desc: 'The CREST range: learn every move', on: () => startRun({ mode: 'range', stages: ['R'] }) },
    { label: 'RECORDS', desc: 'High scores, best times, intel found', on: () => game.go('records') },
    { label: 'HOW TO PLAY', desc: 'Controls for the device you are using', on: () => game.go('howto') },
    { label: 'SETTINGS', desc: 'Sound, display, controls, assists', on: () => game.menu('settings') },
    { label: 'ABOUT', desc: 'Credits, sources and feedback', on: () => game.go('about') }], { back: () => game.go('title') }); game.audio.music && game.audio.music(TC.song('theme'), { fade: .5 }); },
  update(dt) { this.t += dt; if (Attract.anyInput(game)) Attract.idle = 0; else Attract.idle += dt; if (Attract.idle > 10) { game.go('attract'); return; } this.list.update(dt, game); },
  draw(r) { r.overlay(g => { flyover(g, r, this.t + 40); E.px.blend(g, .55, 'multiply', () => E.px.rect(g, 0, 0, r.W, r.H, '#203050')); logo(g, r, 14, this.t, 3); this.list.draw(g, r, r.W / 2, 62, { rowH: 18 }); hintLine(g, r, game.input, [['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
function startRun(o) {
  const go = d => game.go('play', Object.assign({ difficulty: d }, o));
  if (o.mode === 'range') return go(diffId());
  game.go('difficulty', { next: go, arcade: o.mode === 'arcade' });
}
const difficultyScreen = { t: 0,
  enter(d) { this.t = 0; this.next = d.next; const cur = diffId(), offer = d.arcade && !E.store.get('tc3:seenTraining', false); this.list = new ListMenu([
    ...(offer ? [{ label: 'TRAINING FIRST', desc: 'New agent? The CREST range teaches every move in 3 minutes', on: () => { E.store.set('tc3:seenTraining', true); startRun({ mode: 'range', stages: ['R'] }); } }] : []),
    { label: 'EASY', desc: '7 lives · more time · fewer crisis shots', on: () => { game.settings.set && game.settings.set('difficulty', 'Easy'); this.next('easy'); } },
    { label: 'NORMAL', desc: '5 lives · the arcade experience', on: () => { game.settings.set && game.settings.set('difficulty', 'Normal'); this.next('normal'); } },
    { label: 'HARD', desc: '3 lives · less time · sharper shooters', on: () => { game.settings.set && game.settings.set('difficulty', 'Hard'); this.next('hard'); } }], { i: ['easy', 'normal', 'hard'].indexOf(cur) + (offer ? 1 : 0), back: () => game.go('menu') }); },
  update(dt) { this.t += dt; this.list.update(dt, game); },
  draw(r) { r.overlay(g => { frame(g, r, 'DIFFICULTY', this.t); this.list.draw(g, r, r.W / 2, 70, { rowH: 26 }); hintLine(g, r, game.input, [['confirm', 'START'], ['cancel', 'BACK']]); }); }
};
const selectScreen = { t: 0, i: 0,
  enter() { this.t = 0; this.rects = []; },
  update(dt) {
    this.t += dt; const I = game.input;
    if (I.repeat('right', .3, .12)) { this.i = (this.i + 1) % 3; sfxUI('ui'); } if (I.repeat('left', .3, .12)) { this.i = (this.i + 2) % 3; sfxUI('ui'); }
    const ptr = I.pointer && I.pointer(); if (ptr) { const k = this.rects.findIndex(q => ptr[0] >= q[0] && ptr[0] < q[0] + q[2] && ptr[1] >= q[1] && ptr[1] < q[1] + q[3]); if (k >= 0 && k !== this.i && (!this.lp || this.lp[0] !== ptr[0] || this.lp[1] !== ptr[1])) { this.i = k; sfxUI('ui'); } this.lp = ptr.slice(); }
    const cl = I.clicked && I.clicked(); const hit = cl ? this.rects.findIndex(q => cl[0] >= q[0] && cl[0] < q[0] + q[2] && cl[1] >= q[1] && cl[1] < q[1] + q[3]) : -1;
    if (I.pressed('confirm') || hit >= 0) { if (hit >= 0) this.i = hit; sfxUI('uiok'); I.consumeAll(); startRun({ mode: 'stage', stages: [this.i + 1] }); }
    if (I.pressed('cancel')) { sfxUI('uiback'); game.go('menu'); }
  },
  draw(r) { r.overlay(g => {
    frame(g, r, 'STAGE SELECT', this.t); this.rects = [];
    const w = Math.min(130, (r.W - 40) / 3), gap = 8, x0 = (r.W - (w * 3 + gap * 2)) / 2;
    for (let k = 0; k < 3; k++) { const st = get('stage', k + 1), x = x0 + k * (w + gap), y = 50, on = k === this.i, hi = TC.cab ? (TC.cab.table('stage' + (k + 1))[0] || { score: 0 }).score : 0; this.rects.push([x, y, w, 140]);
      E.ui.box(g, x, y, w, 140, { bg: on ? ['#2a5aa0', '#10305e'] : ['#10244a', '#081428'], border: on ? UI.gold : '#2a3a5a' });
      E.font.title(g, String(k + 1), x + w / 2, y + 8, { scale: 4, colors: on ? ['#fff3b0', '#ffb347', '#ff5a2a'] : ['#9fc3e8', '#3a6aa8'], outline: '#000', align: 'center' });
      E.font.wrap(st.name, w - 10).forEach((l, j) => T(g, l, x + w / 2, y + 50 + j * 10, '#ffffff', { align: 'center' })); T(g, st.place, x + w / 2, y + 76, '#9fc3e8', { align: 'center', font: 'tiny' }); T(g, st.clock, x + w / 2, y + 86, '#9fc3e8', { align: 'center', font: 'tiny' });
      T(g, 'BEST', x + w / 2, y + 108, UI.dim, { align: 'center', font: 'tiny' }); T(g, hi, x + w / 2, y + 118, UI.gold, { align: 'center' }); }
    hintLine(g, r, game.input, [['left', '◂▸'], ['confirm', 'SELECT'], ['cancel', 'BACK']]); }); }
};
const coopScreen = { t: 0,
  enter() { this.t = 0; this.p2 = null; game.allowJoin && game.allowJoin({ max: 2, keys: false, onJoin: (inp) => { this.p2 = inp; sfxUI('uiok'); } }); },
  exit() { game.allowJoin && game.allowJoin(false); },
  update(dt) { this.t += dt; const I = game.input; if (this.p2 && (I.pressed('confirm') || I.pressed('start') || this.p2.pressed('confirm'))) { I.consumeAll(); const p2 = this.p2; startRun({ mode: 'coop', stages: [1, 2, 3], players: [{ input: game.input, agent: 'kai' }, { input: p2, agent: 'rook' }] }); } if (I.pressed('cancel')) { if (this.p2 && game.removePlayer) { game.removePlayer(this.p2); this.p2 = null; } game.go('menu'); } },
  draw(r) { r.overlay(g => {
    frame(g, r, 'CO-OP', this.t);
    for (const [k, id, ok] of [[0, 'kai', true], [1, 'rook', !!this.p2]]) { const x = r.W / 2 + (k ? 20 : -150), y = 50; E.ui.box(g, x, y, 130, 120, { bg: ok ? ['#2a5aa0', '#10305e'] : ['#10244a', '#081428'], border: ok ? ['#e8443a', '#3b82f6'][k] : '#2a3a5a' }); const rig = TC.portrait(id); if (rig) rig.drawPortrait(g, x + 41, y + 10, 48, { zoom: 2.6, turn: .5, bg: '#0a1426', frame: true, tint: ok ? undefined : '#606070' }); T(g, 'PLAYER ' + (k + 1), x + 65, y + 66, ok ? '#ffffff' : '#7a8aa8', { align: 'center', scale: 2 }); T(g, get('speaker', id).name, x + 65, y + 84, get('speaker', id).color, { align: 'center' }); T(g, k === 0 ? 'KEYBOARD, MOUSE OR PAD' : ok ? 'READY' : ((this.t * 2 | 0) % 2 ? 'PRESS START ON A CONTROLLER' : ''), x + 65, y + 100, k === 0 || ok ? '#8aff8a' : UI.gold, { align: 'center', font: 'tiny' }); }
    hintLine(g, r, game.input, this.p2 ? [['confirm', 'START'], ['cancel', 'BACK']] : [['cancel', 'BACK']]); }); }
};
const recordsScreen = { t: 0, page: 0,
  enter() { this.t = 0; this.page = 0; },
  update(dt) { this.t += dt; const I = game.input, n = 6; if (I.pressed('right') || I.pressed('next')) { this.page = (this.page + 1) % n; sfxUI('ui'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + n - 1) % n; sfxUI('ui'); } const cl = I.clicked && I.clicked(); if (cl) { this.page = (this.page + (cl[0] > 213 ? 1 : 5)) % 6; sfxUI('ui'); } if (I.pressed('cancel') || I.pressed('confirm')) game.go('menu'); },
  draw(r) { r.overlay(g => {
    const pages = [['ARCADE', 'arcade'], ['CO-OP', 'coop'], ['STAGE 1', 'stage1'], ['STAGE 2', 'stage2'], ['STAGE 3', 'stage3'], ['RANGE & INTEL', null]], [title, mode] = pages[this.page];
    frame(g, r, 'RECORDS · ' + title, this.t);
    if (mode && TC.cab) { const tb = TC.cab.table(mode); for (let k = 0; k < 10; k++) { const e = tb[k]; T(g, (k + 1) + '.', r.W / 2 - 80, 40 + k * 15, UI.dim); T(g, e ? e.name : '---', r.W / 2 - 60, 40 + k * 15, e ? '#ffffff' : '#5a6078', { scale: 1 }); T(g, e ? e.score : 0, r.W / 2 + 80, 40 + k * 15, e ? UI.gold : '#5a6078', { align: 'right' }); } }
    else { const best = E.store.get('tc3:rangeBest', null); T(g, 'CREST RANGE BEST', 30, 40, UI.gold); T(g, best ? best.toFixed(2) + ' s' : '--', 30, 52, '#ffffff', { scale: 2 }); const got = E.store.get('tc3:intel', []); T(g, 'INTEL  ' + got.length + ' / 6', 30, 78, UI.gold); all('intel').forEach((it, k) => { const has1 = got.includes(it.id); E.font.wrap(has1 ? '▸ ' + it.note : '▸ (STAGE ' + it.stage + ': not found yet)', r.W - 60).slice(0, 2).forEach((l, j) => T(g, l, 30, 92 + k * 20 + j * 9, has1 ? '#ffffff' : '#5a6078')); }); }
    T(g, '◂ ' + (this.page + 1) + ' / 6 ▸', r.W / 2, r.H - 24, '#9fc3e8', { align: 'center' });
    hintLine(g, r, game.input, [['left', 'PAGE'], ['cancel', 'BACK']]); }); }
};
const aboutScreen = { t: 0, page: 0, scroll: 0,
  enter() { this.t = 0; this.page = 0; this.scroll = 0; },
  update(dt) { this.t += dt; const I = game.input, n = TC.about.pages().length; if (I.pressed('right') || I.pressed('next')) { this.page = (this.page + 1) % n; this.scroll = 0; sfxUI('ui'); } if (I.pressed('left') || I.pressed('prev')) { this.page = (this.page + n - 1) % n; this.scroll = 0; sfxUI('ui'); } if (I.down('down')) this.scroll += dt * 60; if (I.down('up')) this.scroll = Math.max(0, this.scroll - dt * 60); const cl = I.clicked && I.clicked(); if (cl) { this.page = (this.page + (cl[0] > 213 ? 1 : n - 1)) % n; this.scroll = 0; } if (I.pressed('cancel') || I.pressed('confirm')) game.go('menu'); },
  draw(r) { r.overlay(g => {
    const pages = TC.about.pages(), P = pages[this.page]; frame(g, r, P.title, this.t);
    let y = 34 - this.scroll; const maxY = r.H - 30;
    for (const [k, v] of P.rows) { const lines = E.font.wrap(TC.txt(v), r.W - (k ? 140 : 40)); if (y > 26 && y < maxY) T(g, k, 16, y, UI.gold, { font: 'tiny' }); lines.forEach((l, j) => { const yy = y + j * 9; if (yy > 26 && yy < maxY) T(g, l, k ? 120 : 20, yy, '#ffffff'); }); y += Math.max(1, lines.length) * 9 + 4; }
    if (y > maxY) this.scroll = Math.min(this.scroll, y + this.scroll - maxY + 6);
    T(g, '◂ ' + (this.page + 1) + ' / ' + pages.length + ' ▸', r.W / 2, r.H - 24, '#9fc3e8', { align: 'center' });
    hintLine(g, r, game.input, [['left', 'PAGE'], ['down', 'SCROLL'], ['cancel', 'BACK']]); }); }
};
const howtoScreen = { t: 0, enter() { this.t = 0; }, update(dt) { this.t += dt; const I = game.input; if (I.pressed('cancel') || I.pressed('confirm') || (I.clicked && I.clicked())) game.go('menu'); }, draw(r) { r.overlay(g => { drawHowto(g, r, game.input, this.t); hintLine(g, r, game.input, [['cancel', 'BACK']]); }); } };
const titleScreen = { t: 0,
  enter() { this.t = 0; Attract.idle = 0; game.audio.music && game.audio.music(TC.song('theme'), { fade: .5 }); },
  update(dt) {
    this.t += dt; const I = game.input, touch = TC.touchOnly(game);
    const cl = I.clicked && I.clicked();
    if (touch && cl && this.gear && cl[0] >= this.gear[0] && cl[0] < this.gear[0] + this.gear[2] && cl[1] >= this.gear[1] && cl[1] < this.gear[1] + this.gear[3]) { game.menu('settings'); return; }
    if (Attract.anyInput(game)) { Attract.idle = 0; if (!touch && (I.anyPressed() || cl)) { I.consumeAll(); sfxUI('uiok'); game.go('menu'); return; } } else Attract.idle += dt;
    if (Attract.idle > 10) game.go('attract');
  },
  draw(r) { r.overlay(g => {
    flyover(g, r, this.t); logo(g, r, r.H * .2, this.t, 4);
    T(g, 'C.R.E.S.T. · COVERT RESPONSE & EMERGENCY STRIKE TEAM', r.W / 2, r.H * .2 + 54, '#cfe0ff', { align: 'center', font: 'tiny' });
    const I = game.input, touch = TC.touchOnly(game);
    if (touch) { E.ui.box(g, r.W / 2 - 120, r.H * .62, 240, 26, { bg: UI.bg, border: UI.warn }); T(g, 'Controller or keyboard required', r.W / 2, r.H * .62 + 9, '#ffffff', { align: 'center' }); this.gear = [r.W / 2 - 22, r.H * .62 + 32, 44, 30]; E.ui.box(g, this.gear[0], this.gear[1], 44, 30, { bg: ['#2a5aa0', '#10305e'], border: UI.gold }); T(g, '⚙', r.W / 2, this.gear[1] + 8, '#ffffff', { align: 'center', scale: 2 }); T(g, 'SETTINGS', r.W / 2, this.gear[1] + 34, UI.dim, { align: 'center', font: 'tiny' }); }
    else if (((this.t * 1.6) | 0) % 2 === 0) { const pad = I.lastDevice === 'gamepad', any = !TC._keyed && I.lastDevice !== 'gamepad' && I.lastDevice !== 'mouse'; T(g, any ? 'PRESS ' + TC.label(I, 'confirm', 'gamepad') + ' OR ' + TC.label(I, 'confirm', 'keyboard') + ' OR CLICK' : pad ? 'PRESS ' + TC.label(I, 'confirm') : 'PRESS ' + TC.label(I, 'confirm', 'keyboard') + ' OR CLICK', r.W / 2, r.H * .66, '#ffffff', { align: 'center', scale: 2, outline: '#000' }); }
    T(g, E.versionLabel ? 'TC3 ' + TC.version + ' · ' + E.versionLabel() : 'TC3 ' + TC.version, r.W / 2, r.H - 10, '#6a7aa0', { align: 'center', font: 'tiny' });
    T(g, '© 2026 AN ORIGINAL GAME · INSPIRED BY TIME CRISIS 3', 6, 6, '#6a7aa0', { font: 'tiny' }); }); }
};
const attractScreen = { t: 0,
  enter() { this.t = 0; Attract.phase = 'demo'; this.s = Attract.startDemo(game); this.cycle = 0; },
  exit() { game.timeScale = 1; TC.Voice.stopAll(); },
  update(dt) {
    this.t += dt; const I = game.input;
    if (Attract.anyInput(game) && this.t > .3) { I.consumeAll(); game.go('title'); return; }
    if (Attract.phase === 'demo') {
      this.s.update(dt); this.s.sim.players[0].lives = Math.max(3, this.s.sim.players[0].lives);
      if (!Attract.progressed(this.s.sim)) Attract.watch.t += dt;
      const sp = this.s.sim.phase;
      if (this.t > Attract.len || Attract.watch.t > 8 || sp === 'results' || sp === 'done' || (sp === 'clear' && this.s.sim.sceneIdx + 1 >= this.s.sim.stage.scenes.length)) { this.cycle++; this.t = 0; Attract.phase = this.cycle % 2 ? 'scores' : 'title'; game.timeScale = 1; }
    } else if (Attract.phase === 'scores' && this.t > 6) { this.t = 0; Attract.phase = 'demo'; this.s = Attract.startDemo(game); }
    else if (Attract.phase === 'title' && this.t > 8) { this.t = 0; Attract.phase = 'demo'; this.s = Attract.startDemo(game); }
  },
  draw(r) {
    if (Attract.phase === 'demo') { this.s.draw(r); r.overlay(g => { E.ui.box(g, r.W / 2 - 64, r.H - 36, 128, 30, { bg: ['#10244a', '#081428'], border: UI.gold, alpha: .85 }); T(g, 'DEMO PLAY', r.W / 2, r.H - 32, UI.gold, { align: 'center' }); if (((this.t * 1.6) | 0) % 2 === 0) T(g, TC.touchOnly(game) ? 'TAP FOR THE TITLE' : 'PRESS START', r.W / 2, r.H - 20, '#ffffff', { align: 'center', scale: 1 }); }); return; }
    r.overlay(g => {
      if (Attract.phase === 'scores') { frame(g, r, 'HIGH SCORES', this.t); const tb = TC.cab ? TC.cab.table('arcade') : []; for (let k = 0; k < 10; k++) { const e = tb[k]; T(g, (k + 1) + '.', r.W / 2 - 80, 40 + k * 15, UI.dim); T(g, e ? e.name : '---', r.W / 2 - 60, 40 + k * 15, '#ffffff'); T(g, e ? e.score : 0, r.W / 2 + 80, 40 + k * 15, UI.gold, { align: 'right' }); } }
      else { flyover(g, r, this.t + 80); logo(g, r, r.H * .25, this.t, 4); if (((this.t * 1.6) | 0) % 2 === 0) T(g, 'PRESS START', r.W / 2, r.H * .66, '#ffffff', { align: 'center', scale: 2 }); }
    });
  }
};

// ---------------------------------------------------------------- play: the session and its states
const playScreen = { pausable: !HUB,
  enter(d) {
    TC.play = this; this.d = d; this.state = 'brief'; this.howto = -1; this.t = 0;
    const ps = d.players || [{ input: game.input, agent: 'kai' }];
    this.s = new Session(game, { mode: d.mode, stages: d.stages, difficulty: d.difficulty, players: ps, seed: d.seed, skipCuts: d.skipCuts });
    if (ps.length > 1 && game.splitScreen) game.splitScreen(0);
    if (d.mode === 'range') for (const p of this.s.sim.players) p.lives = 9;
    this.brief = d.mode !== 'range' && !d.noBrief ? new Briefing('b' + this.s.sim.stageId, TC.portrait) : null;
    if (!this.brief) this.state = 'run';
    if (this.brief) game.audio.music && game.audio.music(TC.song('briefing'), { fade: .5 });
    if (d.mode === 'arcade' && game.allowJoin) game.allowJoin({ max: 2, keys: false, onJoin: inp => { this.s.addPlayer(inp, 'rook'); } });
    this.s.onEvent = e => { if (e.type === 'out' && this.s.sim.players.length === 1) game.audio.music && game.audio.music(TC.song('continue'), { fade: .3 }); if (e.type === 'continue') this.s.music = null; };
  },
  exit() { TC.play = null; game.timeScale = 1; if (game.allowJoin) game.allowJoin(false); TC.Voice.stopAll(); TC.Amb.stop(); if (typeof document !== 'undefined' && game.canvas) game.canvas.style.cursor = ''; TC.dev.close(); },
  restartScene() { game.resume(); const sim = this.s.sim; sim.jump(sim.stageId, sim.sceneId); this.state = 'run'; },
  restartStage() { game.resume(); const sim = this.s.sim; sim.jump(sim.stageId, sim.stage.scenes[0]); this.state = 'run'; },
  update(dt) {
    this.t += dt; const sim = this.s.sim, I = game.input;
    if (typeof document !== 'undefined' && game.canvas) game.canvas.style.cursor = this.state === 'run' && sim.phase === 'action' && (I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') ? 'none' : '';
    if (TC.dev.isOpen) { TC.dev.update(dt); return; }
    if (this.howto >= 0) { this.howto += dt; if ((I.pressed('cancel') || I.pressed('confirm')) && this.howto > .2) { this.howto = -1; I.consumeAll(); } return; }
    if (this.state === 'brief') { this.brief.update(dt, game); if (this.brief.done) { this.state = 'run'; I.consumeAll(); this.s.music = null; if (this.pendingNext) { this.pendingNext = false; sim.nextStage(); } } return; }
    if (this.state === 'run') {
      this.s.update(dt);
      if (sim.phase === 'results') { if (sim.mode === 'range' || sim.stageId === 'R') { this.state = 'range'; this.rangeT = sim.stageT; const b = E.store.get('tc3:rangeBest', null); if (!b || this.rangeT < b) E.store.set('tc3:rangeBest', this.rangeT); E.store.set('tc3:seenTraining', true); this.t = 0; } else { this.state = 'results'; this.res = new Results(sim, sim.players[0]); game.audio.music && game.audio.music(TC.song('results'), { fade: .5 }); } }
      if (sim.phase === 'gameover') { this.state = 'over'; this.t = 0; game.audio.music && game.audio.music(TC.song('gameover'), { loop: false }); }
      if (sim.phase === 'done') { this.state = 'credits'; this.cred = new Credits(TC.portrait, sim.players[0].score); game.audio.music && game.audio.music(TC.song('ending'), { fade: 1 }); }
      return;
    }
    if (this.state === 'results') { if (this.res.update(dt, game, sim)) { I.consumeAll(); if (sim.stageIdx + 1 < sim.stageList.length) { this.brief = new Briefing('b' + sim.stageList[sim.stageIdx + 1], TC.portrait); this.state = 'brief'; this.pendingNext = true; game.audio.music && game.audio.music(TC.song('briefing'), { fade: .5 }); } else { sim.nextStage(); this.state = 'run'; this.s.music = null; } } return; }
    if (this.state === 'range') { if (this.t > 1 && (I.pressed('confirm') || I.pressed('fire'))) { I.consumeAll(); game.go('menu'); } return; }
    if (this.state === 'over') { if (this.t > 3 || (this.t > 1 && I.pressed('confirm'))) this.toInitials(); return; }
    if (this.state === 'credits') { if (this.cred.update(dt, game)) { I.consumeAll(); this.toInitials(); } return; }
    if (this.state === 'initials') { if (TC.cab) TC.cab.update(dt); if (!TC.cab || !TC.cab.entry) game.go('records'); }
  },
  toInitials() {
    const sim = this.s.sim, mode = this.d.mode === 'coop' ? 'coop' : this.d.mode === 'stage' ? 'stage' + sim.stageList[0] : 'arcade', score = Math.max(...sim.players.map(p => p.score));
    if (TC.cab && TC.cab.qualifies(score, mode)) { this.state = 'initials'; TC.cab.enter(score, mode, () => {}); } else game.go('records');
  },
  draw(r) {
    const sim = this.s.sim;
    if (this.state === 'brief') { r.overlay(g => this.brief.draw(g, r, game)); return; }
    if (this.state === 'results') { r.overlay(g => this.res.draw(g, r, game)); return; }
    if (this.state === 'credits') { r.overlay(g => this.cred.draw(g, r, game)); return; }
    if (this.state === 'initials') { r.overlay(g => { frame(g, r, 'NEW HIGH SCORE', this.t); T(g, 'ENTER YOUR INITIALS', r.W / 2, 34, UI.gold, { align: 'center' }); }); if (TC.cab) TC.cab.draw(r); return; }
    this.s.draw(r);
    r.overlay(g => {
      if (this.state === 'over') { E.px.blend(g, .6, 'multiply', () => E.px.rect(g, 0, 0, r.W, r.H, '#300808')); E.font.title(g, 'GAME OVER', r.W / 2, r.H * .4, { scale: 4, colors: ['#ffffff', '#ff8a80', '#ff3b30'], outline: '#000', align: 'center' }); }
      if (this.state === 'range') { E.ui.box(g, r.W / 2 - 110, r.H / 2 - 40, 220, 80, { bg: UI.bg, border: UI.gold }); E.font.title(g, 'TRAINING COMPLETE', r.W / 2, r.H / 2 - 32, { scale: 2, colors: ['#ffffff', '#ffd36a'], outline: '#000', align: 'center' }); T(g, 'TIME ' + this.rangeT.toFixed(2) + ' s', r.W / 2, r.H / 2 - 6, '#ffffff', { align: 'center', scale: 2 }); const b = E.store.get('tc3:rangeBest', null); T(g, 'BEST ' + (b ? b.toFixed(2) : '--') + ' s', r.W / 2, r.H / 2 + 14, UI.gold, { align: 'center' }); hintLine(g, r, game.input, [['confirm', 'MENU']]); }
      if (this.howto >= 0) drawHowto(g, r, game.input, this.howto);
      if (TC.dev.isOpen) TC.dev.draw(g, r);
    });
  }
};

const scenes = { title: titleScreen, menu: menuScreen, difficulty: difficultyScreen, select: selectScreen, coop: coopScreen, play: playScreen, records: recordsScreen, about: aboutScreen, howto: howtoScreen, attract: attractScreen };
for (const k in scenes) { scenes[k].camera = { zoom: false }; scenes[k].touch = []; }
if (TC.netScenes) Object.assign(scenes, TC.netScenes(game));
game.input.touchEnabled = false;
game.debug = {
  snapshot() { const s = TC.play && TC.play.s ? TC.play.s.sim : TC.Net && TC.Net.session ? TC.Net.session.sim : null; return { scene: game.sceneName || game.scene && game.scene.name, state: TC.play ? TC.play.state : null, phase: s && s.phase, stage: s && s.stageId, area: s && s.sceneId, timer: s && +s.timer.toFixed(2), players: s && s.players.map(p => ({ score: p.score, lives: p.lives, c: +p.c.toFixed(2), w: p.w, mag: p.mag, ammo: p.ammo })), enemies: s && s.enemies.filter(e => !e.dead).length, threats: s && s.threats.filter(t => !t.done).length, boss: s && s.boss && { id: s.boss.id, hp: s.boss.parts.map(p => +p.hp.toFixed(1)) }, errors: game.errors.length }; },
  get sim() { return TC.play && TC.play.s ? TC.play.s.sim : null; }, tune: () => tune, TC
};
// dev deep links for tools and screenshots: #play=1:1-2&bot  ·  #scene=menu
const LINK = typeof location !== 'undefined' && !HUB ? location.hash.slice(1) : '';
if (LINK) setTimeout(() => {
  const q = Object.fromEntries(LINK.split('&').map(kv => kv.split('=')));
  if (q.play) { const [st, sc] = q.play.split(':'); const stage = isNaN(+st) ? st : +st; game.go('play', { mode: 'stage', stages: [stage], difficulty: 'normal', noBrief: true, skipCuts: true, seed: 5 }); const go = () => { if (!TC.play) { setTimeout(go, 100); return; } const sim = TC.play.s.sim; if (sc) sim.jump(stage, sc); if ('bot' in q) TC.play.s.bots[0] = new TC.Autopilot(q.bot || 'showoff'); if ('god' in q) sim.cheats.god = true; if ('cut' in q) sim.startCut(q.cut, () => sim.startScene(0)); if ('p2' in q) TC.play.s.addPlayer(null, 'rook', new TC.Autopilot('fair')); if ('dev' in q) TC.dev.open(TC.play); if ('pause' in q) game.pause(); }; setTimeout(go, 200); }
  else if (q.scene) game.go(q.scene, {});
}, 400);
game.start({ scene: HUB ? 'session' : 'title', scenes, boot: { title: 'TIDE CRISIS 3', version: TC.version, steps: [
  ['Charting the Lumen Isles', () => { const errs = TC.validate(); if (errs.length) game.fail && game.fail('content', new Error(errs.join('; '))); }],
  ['Tuning the sirens', () => { TC.defineSfx(game.audio); }],
  ['Waking the night watch', () => { if (HUB && TC.netBoot) return TC.netBoot(game); }]], messages: ['Polishing the lantern lenses', 'Counting the floodgates', 'Checking the tide tables'] } });

// ===== 99-about.js
// 99-about: the About and credits data, one source for three places: the in-game About pages, exit-interview.json
// (tools/build.mjs writes it from TC.about.exit()) and the final chat reply.

const ABOUT = {
  sourceInformation: {
    date: '2026-11-03 18:32:13',
    source: 'Time Crisis 3 (Namco and Nextech; arcade 2003 on Namco System 246, PlayStation 2 2003)',
    plan: 'PLAN.md',
    genre: 'On-rails light-gun shooter with a cover system',
    perspective: 'First-person rail camera (cover pose and stand pose per player), with third-person cutscene cameras',
    tech: 'my-3D2dge handoff v0.85.2 full engine (patched: PlayStation glyphs, long guns, wheel codes, audio buses), a custom JS software 3D renderer (Rail3D: z-buffered, perspective-correct, banded light, dithered fog) inside the engine\'s pixel buffer, AI Hub session client 1.4.0; plain JavaScript, no other libraries',
    artDirection: 'The engine\'s native PS1-era pixel style in perspective 3D: the engine\'s own materials as banded textures, new procedural materials (corrugated containers, lanterns, hazard stripes, lit windows, water), engine Humanoid rigs as depth-tested billboards',
    animation: 'The engine\'s procedural Humanoid rigs (poses, run, crouch, die, flip, climb, attack moves) driven from the simulation, plus code-posed meshes for vehicles and mechs (gunboat, truck, helicopter, six-legged walker) and camera animation (cover duck, recoil, hit jolt, sway, whip-pan rails, slow motion)',
    audio: 'All in code: songs on the engine\'s chip tracker (theme, briefing, three stage themes with layers, boss, final boss, range, results, stings, continue, game over, ending ballad), synthesized sound effects, Web Audio ambience, and an Animalese-style formant gibberish voice synth for every speaker',
    online: 'AI Hub Session Protocol v1, shared-world co-op for 1–4 players (host-authoritative Sim, input and shot messages up, snapshots and events down); local split-screen co-op for two',
    testing: 'Headless Node suites through one command (node tests/run.mjs) using game.advance and game.debug, bot playthroughs of every stage, Playwright browser checks of the single HTML file, and the AI Hub harness',
    research: 'The handoff\'s engine docs (README, API card, guide, index) and engine source where needed, the AI Hub protocol README and harness, and the plan\'s notes on Time Crisis 3 (taken from Wikipedia at planning time); no new web research',
    environment: 'Claude Code CLI (headless); Linux; browser unknown',
    model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
    usage: 'unknown (no token or cost counter was available to me); session time about 1 h 25 min (18:32 to about 19:57)'
  },
  testingFeedback: [
    'About 25. The headless bot playthroughs and the content validators found most of them: areas that could never be cleared, targets nobody could see or shoot, and crashes. Screenshots found the rest: cover crates filling the stand view, glyphs missing from the font, and HUD overlaps in split screen.',
    'Eight were game breaking: grenade and rocket threats that never counted down (you could not take cover from them in time); the Bulldog parked behind a container (1-3 could not be won); canal-bridge and moored-boat enemies the boat left behind (1-4 stuck); a sluice lock hidden behind a catwalk barrier (3-2 stuck); a Training drill stuck on a civilian cut-out; a drone-entry crash; and a load-order crash in the cutscene data.',
    'A full ARCADE run by the fair Autopilot bot, headless, logging time, lives and the cause of every hit for each area. It showed exactly which area stalled and why, in seconds.',
    'The first smoke test, which only checked for errors after 200 s of play. It passed while the game sat frozen on a continue screen, so it told me nothing until I logged the state of each area.'],
  engineFeedback: [
    'The Humanoid rigs draw themselves from any View at any scale, so dropping them into my own perspective renderer as depth-tested billboards worked on the first try. E.materialTile and E.shapeMesh exist for exactly this kind of 3D renderer, and the headless game.advance made bot playthroughs of the whole game take seconds.',
    'Yes. Timers set with game.after before game.start are cleared by the first scene change; a scene change takes longer than 0.2 s because of the fade, so tests must wait; a crouching Humanoid\'s head (23.6 u) is taller than crouch-height cover; and input.label returns the PlayStation cross while the pixel font could not draw it.',
    'Rail3D, a JavaScript software renderer inside the engine\'s pixel buffer: perspective-correct textured triangles with near clipping, a z-buffer, the engine\'s banded light with ordered dither, quantized fog, a procedural sky, depth-tested particles and lines, and engine rigs composited as billboards.',
    'The handoff has no 3D engine, so a first-person light-gun game meant building perspective on a 2D engine. Rigs are drawn orthographically with one depth for the whole figure, so hiding behind cover needed care: enemies sink behind low cover and are clipped at the cover\'s base.',
    'Five small patches, logged in engine/PATCHES.md: PlayStation button symbols by default (with Xbox as the option); long guns for Humanoids (rifles with a stock, and gunLen); WheelUp and WheelDown as bindable codes; game.audio.bus() so my Web Audio voice synth and ambience follow the volume settings; and new font glyphs (the cross, circle, square and triangle, plus an em dash, an ellipsis, a middle dot, a gear, infinity and a left arrow).',
    'Add a perspective view for rigs and shapes: the same View API with a camera position and field of view, so first-person and rail games can use the engine\'s own queue, lighting and depth sorting instead of a separate renderer.'],
  promptFeedback: [
    'The clear contract: exact file names, the four feedback sections in three places, one test command that prints only failures, "TASK.md wins" over the plan, and a detailed plan to start from.',
    'The plan\'s folder and file names (claude-opus-5-5-max-20261103-174731) differ from the names in TASK.md (medium-20261103-183213), and the plan wants everything inlined while TASK.md allows CDN dependencies. "TASK.md wins" settled both. "Testing: testing parameters allowed" in Source Information was ambiguous.',
    'Scope. A three-stage light-gun game with six bosses, a software 3D renderer, AI Hub netcode, split-screen co-op, an attract mode, a dev panel and Training is a lot for one session, and every area had to be winnable and readable, not just present.',
    'Say how long the session may run and which plan items may be cut, and give TASK.md\'s required features as a numbered checklist the final reply can tick off.'],
  aiHub: { name: 'Tide Crisis 3', tagline: 'Duck. Pop. Shoot. Beat the tide.', description: 'An original arcade light-gun rail shooter in PS1-style pixel 3D: duck behind cover, switch between four weapons and race each area\'s clock to retake an island\'s tidal barrier before the dawn king tide. Play solo, couch co-op or AI Hub co-op for up to four.', type: 'Game', genre: 'Shooter', source: 'Time Crisis 3', series: 'Time Crisis', players: '1–4', controls: 'Mouse or stick aims · left click/R2 fires · hold right click/L2 for cover and reload · wheel/R1 switches weapons', tags: ['first-person', 'arcade', 'co-op', 'boss fights', 'pixel art', 'retro'] }
};
TC.ABOUT = ABOUT;
const SI_LABELS = [['date', 'Date'], ['source', 'Source'], ['plan', 'Plan'], ['genre', 'Genre'], ['perspective', 'Perspective'], ['tech', 'Tech'], ['artDirection', 'Art direction'], ['animation', 'Animation'], ['audio', 'Audio'], ['online', 'Online'], ['testing', 'Testing'], ['research', 'Research'], ['environment', 'Environment'], ['model', 'Model'], ['usage', 'Usage']];
const TQ = ['How many issues did testing catch?', 'How many were critical or game breaking?', 'The most helpful test', 'The least helpful test'];
const EQ = ['What I liked most about the engine', 'Did I get stuck or guess wrong?', 'The most important thing I built', 'The hardest part of using the engine', 'What I changed in the engine, and why', 'One thing I would change'];
const PQ = ['What I liked most about this prompt', 'What was confusing', 'The hardest thing to do', 'What I would change in this prompt'];
TC.about = {
  pages() {
    const A = ABOUT, qa = (qs, as) => qs.map((q, i) => ['', (i + 1) + '. ' + q + ' — ' + (as[i] || 'unknown')]);
    return [
      { title: 'ABOUT', rows: [['GAME', 'TIDE CRISIS 3, an original arcade light-gun rail shooter. C.R.E.S.T. agents retake Port Lumen and the Meridian Tidewall from Admiral Krake before the dawn king tide.'], ['MADE BY', 'Claude (Anthropic, claude-opus-5-5), from a plan written by claude-opus-5-5.'], ['ENGINE', 'my-3D2dge v0.85.2 by Michael Crosato (MIT License).'], ['ONLINE', 'AI Hub Session Protocol v1.'], ['THANKS', 'To everyone who stood up from behind a crate at exactly the wrong moment.'], ['NOTE', 'Inspired by Time Crisis 3 (Namco, 2003). The world, cast, story, art, music and code are original; no names, levels or assets from the source are used.']] },
      { title: 'SOURCE INFORMATION', rows: SI_LABELS.map(([k, l]) => [l.toUpperCase(), A.sourceInformation[k] || 'unknown']) },
      { title: 'TESTING FEEDBACK', rows: qa(TQ, A.testingFeedback) },
      { title: 'ENGINE FEEDBACK', rows: qa(EQ, A.engineFeedback) },
      { title: 'PROMPT FEEDBACK', rows: qa(PQ, A.promptFeedback) },
      { title: 'LICENSES', rows: [['ENGINE', 'my-3D2dge: MIT License.'], ['AI HUB', 'session.js client 1.4.0, pasted unmodified.'], ['ASSETS', 'None: every model, texture, sound and voice is generated by code.']] }];
  },
  exit() { const A = ABOUT; return { sourceInformation: A.sourceInformation, testingFeedback: A.testingFeedback, engineFeedback: A.engineFeedback, promptFeedback: A.promptFeedback, aiHub: A.aiHub }; }
};

})();
