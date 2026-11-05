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
