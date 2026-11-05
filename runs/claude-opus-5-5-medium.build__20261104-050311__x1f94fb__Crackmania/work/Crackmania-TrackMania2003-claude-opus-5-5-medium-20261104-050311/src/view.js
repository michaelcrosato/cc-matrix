// The picture: one E.World3D per environment (terrain, sky, sun, fog), pixel textures baked by code, the track's
// meshes (made from src/geometry.js), scenery, gates, boost chevrons and the cars, all drawn with the 3D engine.
// Simulation metres -> engine units (x16) for the pen and camera; -> three.js metres (x, z, y) for meshes.
import { ORIGIN, GRID } from './track.js';
import { CELL } from './blocks.js';
import { U, hash01, clamp } from './v3.js';
import { CARS } from './config.js';

const E = globalThis.My3D2dge;
const GMID = ORIGIN + GRID * CELL / 2, GHALF = GRID * CELL / 2;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const n2 = (x, y) => E.noise2(x, y);
const hexRGB = h => { const v = parseInt(h.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---- the three environments ----
function outside(xm, ym) { const dx = Math.max(0, Math.abs(xm - GMID) - GHALF), dy = Math.max(0, Math.abs(ym - GMID) - GHALF); return Math.hypot(dx, dy); }
const MESAS = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2 + hash01(i * 7 + 1) * .6, d = 900 + hash01(i * 13 + 5) * 600; return [GMID + Math.cos(a) * d, GMID + Math.sin(a) * d, 70 + hash01(i * 3 + 9) * 110, 45 + hash01(i * 5 + 2) * 90, 40 + hash01(i * 11) * 80]; });
export const ENVS = {
  dustbowl: {
    height(xm, ym) {
      const d = outside(xm, ym); if (d <= 0) return -60;
      let h = 6 * n2(xm / 80, ym / 80) + 3 * n2(xm / 23, ym / 23) - 4;
      for (const [mx, my, r, hgt] of MESAS) { const q = Math.hypot(xm - mx, ym - my); h = Math.max(h, hgt * sm(r + 25, r - 5, q + 8 * n2(xm / 30, ym / 30))); }
      return h * sm(0, 120, d) - .4;
    },
    color(z, nz, xm, ym) {
      const sand = hexRGB('#e0b070'), dark = hexRGB('#c88a50'), k = n2(xm / 40, ym / 40);
      if (nz < .75 || z > 25) { const band = Math.floor(z / 6 + n2(xm / 50, ym / 50) * 2) % 4; return hexRGB(['#b8643c', '#d48a52', '#e8b47a', '#a4502e'][(band + 4) % 4]); }
      return mix(sand, dark, k * .6);
    },
    sky: { top: '#3a7fd8', horizon: '#f6d29a', ground: '#c89a6a', sun: '#fff0c8', haze: .35 }, fog: { color: '#f2d6a6', near: 9000, far: 30000 },
    ambient: ['#d4dcf0', '#a07040', 1.7], sun: { color: '#ffe6c0', intensity: 3.2, dir: [.65, .35, -.55] },
    road: 'asphalt', curb: ['#e8402a', '#f4f4f0'], rail: '#b8c0c8', under: '#c8b8a0', plate: 'sand', accent: '#ff9a2a', water: '#3a8ac8'
  },
  hedgerow: {
    height(xm, ym) {
      const d = outside(xm, ym); if (d <= 0) return -60;
      return (25 * n2(xm / 300, ym / 300) + 6 * n2(xm / 60, ym / 60) - 8) * sm(0, 160, d) - .4;
    },
    color(z, nz, xm, ym) {
      const fx = Math.floor(xm / 60), fy = Math.floor(ym / 60), k = hash01(fx * 7919 + fy * 104729), e = Math.min((xm / 60 - fx), 1 - (xm / 60 - fx), (ym / 60 - fy), 1 - (ym / 60 - fy));
      if (e < .04) return hexRGB('#2e5a24');   // hedges between fields
      if (nz < .8) return hexRGB('#6a7a4a');
      const base = k < .5 ? '#5aa03a' : k < .7 ? '#d8c060' : k < .85 ? '#8a6a3a' : '#7ab84a';
      const stripes = Math.floor((xm + ym) / 3) % 2 ? 1 : .94;
      return hexRGB(base).map(v => v * stripes);
    },
    sky: { top: '#4aa0f0', horizon: '#d8ecff', ground: '#6a8a4a', sun: '#fffbe0', haze: .25 }, fog: { color: '#d8ecff', near: 8000, far: 26000 },
    ambient: ['#e0ecff', '#5a7040', 1.8], sun: { color: '#fff8e8', intensity: 3.0, dir: [-.3, .45, -.84] },
    road: 'tarmac', curb: ['#f4f4f0', '#3aa04a'], rail: '#a89a88', under: '#8a7a68', plate: 'grass', accent: '#6ad04a', water: '#4a90b8'
  },
  frostpeak: {
    height(xm, ym) {
      const d = outside(xm, ym); if (d <= 0) return -60;
      const ridge = 1 - Math.abs(n2(xm / 260, ym / 260) * 2 - 1), far = sm(200, 1400, d);
      return (8 * n2(xm / 70, ym / 70) + far * (380 * ridge * ridge + 60 * n2(xm / 90, ym / 90))) * sm(0, 140, d) - .4;
    },
    color(z, nz, xm, ym) {
      if (nz < .6 && z > 20) return mix(hexRGB('#6a6a78'), hexRGB('#8a8a98'), n2(xm / 20, z / 8));
      return mix(hexRGB('#f0f4fa'), hexRGB('#c4d4ea'), (1 - nz) * 2 + n2(xm / 30, ym / 30) * .3);
    },
    sky: { top: '#2a5aa8', horizon: '#f0d8e8', ground: '#c8d4ea', sun: '#ffd8c0', haze: .3 }, fog: { color: '#e6eef8', near: 7000, far: 24000 },
    ambient: ['#c8d8ff', '#8a90a8', 1.9], sun: { color: '#ffd8c8', intensity: 2.8, dir: [.5, -.6, -.45] },
    road: 'snowroad', curb: ['#3a7ae8', '#f4f4f0'], rail: '#e8f0f8', under: '#9aa4b8', plate: 'snow', accent: '#6ad8ff', water: '#5aa0d0'
  }
};

// ---- pixel textures ----
function bake(w, h, fn, THREE) {
  const cv = E.mkCanvas(w, h), g = cv.getContext && cv.getContext('2d');
  if (g && g.createImageData) {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true;
  return t;
}
const H = (x, y) => E.hash2(x, y);
const TEX = {
  asphalt: (x, y) => {   // 64 across 14 m, 64 along 8 m; edge lines and a dashed yellow centre
    let c = 52 + H(x, y) * 18 + (H(x >> 2, y >> 2) > .93 ? -14 : 0);
    if (x <= 2 || x >= 61) return [230, 230, 224];
    if ((x === 31 || x === 32) && (y % 32) < 14) return [240, 196, 40];
    return [c, c * .98, c * 1.02];
  },
  tarmac: (x, y) => { const c = 82 + H(x, y) * 20 + (H(x >> 3, y >> 3) > .85 ? 10 : 0); if (x <= 2 || x >= 61) return [236, 236, 232]; if ((x === 31 || x === 32) && (y % 32) < 12) return [236, 236, 232]; return [c, c, c * 1.03]; },
  snowroad: (x, y) => { const c = 200 + H(x, y) * 30, track = Math.abs(((x + 6) % 22) - 11) < 3 ? -24 : 0; if (x <= 2 || x >= 61) return [255, 140, 40]; return [c + track - 10, c + track, c + track + 18]; },
  dirt: (x, y) => { const k = H(x, y), rut = Math.abs(((x + 8) % 24) - 12) < 3 ? -18 : 0; return [128 + k * 30 + rut, 88 + k * 20 + rut, 52 + k * 14 + rut * .6].map(v => v + (H(x >> 2, y >> 2) > .9 ? 26 : 0)); },
  ice: (x, y) => { const k = H(x, y), st = (x + y * 2) % 19 < 2 ? 30 : 0; return [150 + k * 20 + st, 200 + k * 20 + st, 236 + st * .3]; },
  under: (x, y) => { const k = H(x, y) * 20; return [150 + k, 146 + k, 140 + k]; },
  sand: (x, y) => { const rip = Math.sin((y + Math.sin(x / 9) * 4) / 2.6) * 10, k = H(x, y) * 14; const sp = H(x * 3, y * 5) > .985 ? -50 : 0; return [222 + rip + k + sp, 178 + rip + k + sp, 112 + rip * .6 + k + sp]; },
  grass: (x, y) => { const stripe = (x >> 4) % 2 ? 8 : -6, k = H(x, y) * 20, fl = H(x * 7, y * 3) > .992; return fl ? [250, 240, 120] : [84 + stripe + k * .4, 150 + stripe + k, 60 + stripe + k * .3]; },
  snow: (x, y) => { const k = H(x, y) * 12, sp = H(x * 5, y * 3) > .985 ? 30 : 0; return [232 + k + sp, 238 + k + sp, 248 + k * .4]; },
  rock: (x, y) => { const band = Math.floor((y + n2(x / 7, y / 9) * 8) / 7) % 4; const c = hexRGB(['#b8643c', '#d48a52', '#e8b47a', '#9a4a2a'][band]); const k = H(x, y) * 20 - 10; return c.map(v => v + k); },
  water: (x, y) => { const w = Math.sin(x / 3 + y / 5) * 12; return [40 + w, 110 + w, 180 + w]; },
  support: (x, y) => { const k = H(x, y) * 18; return [176 + k, 172 + k, 164 + k]; }
};
function curbTex(a, b) { const A = hexRGB(a), B = hexRGB(b); return (x, y) => { const c = (y >> 3) % 2 ? A : B, k = H(x, y) * 10; return [c[0] - k, c[1] - k, c[2] - k]; }; }
function railTex(env, col) {
  const C = hexRGB(col);
  if (env === 'dustbowl') return (x, y) => { const k = H(x, y) * 14, band = (x > 8 && x < 12) || (x > 20 && x < 24); return band ? [C[0] - 40 + k, C[1] - 40 + k, C[2] - 30 + k] : [C[0] + k - 7, C[1] + k - 7, C[2] + k - 7]; };
  if (env === 'hedgerow') return (x, y) => { const row = (y >> 2), off = (row % 2) * 4, edge = ((x + off) % 8) === 0 || (y % 4) === 0, k = H(x >> 2, y >> 2) * 30; return edge ? [90, 84, 74] : [C[0] - 15 + k, C[1] - 15 + k, C[2] - 15 + k]; };
  return (x, y) => { const k = H(x, y) * 10; return [C[0] - k, C[1] - k, C[2] - k * .3]; };
}

// ---- the world for one environment ----
export class EnvView {
  constructor(game, envId, o = {}) {
    const W3 = E.World3D, THREE = E.THREE, EV = ENVS[envId];
    this.game = game; this.env = envId; this.EV = EV; this.THREE = THREE;
    this.world = new W3(game, {
      terrain: { size: 65536, cell: 32, chunk: 32, far: 26000, physics: 64, detail: 1.5,
        height: (x, y) => EV.height(x / U, y / U) * U,
        color: (x, y, z, nz) => EV.color(z / U, nz, x / U, y / U),
        rock: envId === 'dustbowl' ? { colors: ['#b8643c', '#d48a52', '#e8b47a', '#9a4a2a', '#c87a48'], band: 90, slope: [.3, .5] } : envId === 'frostpeak' ? { colors: ['#6a6a78', '#7a7a88', '#5a5a68', '#8a8a96'], band: 70, slope: [.35, .55] } : { colors: ['#7a6a4a', '#6a5a3a'], band: 60, slope: [.4, .6] },
        speckle: .15, mottle: .25 },
      sky: EV.sky, fog: EV.fog, ambient: EV.ambient, sun: Object.assign({ area: 1100, map: 2048 }, EV.sun),
      torchLights: 0, glowLights: 4, lights: 3, camera: { mode: 'fixed', far: 26000, near: 2, mouseLook: false },
      overlay: { fov: 80, on: false }, onDraw: (w, r) => this.onDraw && this.onDraw(w, r)
    });
    this.world.camera.mouseLook = false;
    this.world.camera.fixed = { x: GMID * U, y: GMID * U, z: 400, yaw: 0, pitch: -.3, fov: 70 };
    this.world.camera.target = { x: GMID * U, y: GMID * U, z: 0 };
    this.lamps = [this.world.light({ color: '#ffd8a0', reach: 900, power: 0 }), this.world.light({ color: '#ffd8a0', reach: 900, power: 0 }), this.world.light({ color: '#ffd8a0', reach: 900, power: 0 })];
    // materials, made once with the world
    const lam = (tex, o2) => new THREE.MeshLambertNodeMaterial(Object.assign({ map: tex, side: THREE.DoubleSide }, o2));
    const toon = (tex) => new THREE.MeshToonNodeMaterial({ map: tex, gradientMap: W3.TOON_BANDS, side: THREE.DoubleSide });
    const T = (fn, w = 64, h = 64) => bake(w, h, fn, THREE);
    const road = T(TEX[EV.road]);
    this.mats = {
      asphalt: lam(road), tarmac: lam(road), snowroad: lam(road), dirt: lam(T(TEX.dirt)), ice: lam(T(TEX.ice)),
      curb: lam(T(curbTex(EV.curb[0], EV.curb[1]), 16, 16)), rail: toon(T(railTex(envId, EV.rail), 32, 16)), lip: toon(T(curbTex(EV.curb[0], '#ffffff'), 16, 16)),
      under: toon(T(TEX.under, 32, 32)), plate: lam(T(TEX[EV.plate])), canyon: lam(T(TEX.rock, 32, 64)), water: lam(T(TEX.water, 32, 32), { transparent: true, opacity: .85 }),
      support: toon(T(TEX.support, 16, 16))
    };
    for (const k of ['asphalt', 'tarmac', 'snowroad', 'dirt', 'ice']) this.mats[k + 'X'] = this.mats[k];
    this.meshes = []; this.track = null; this.deco = []; this.time = 0;
  }
  /** build the meshes of a track (geo from buildTrack) */
  load(track, geo, deco) {
    const THREE = this.THREE, sc = this.world.scene;
    for (const m of this.meshes) { sc.remove(m); m.geometry.dispose(); }
    this.meshes = [];
    const add = (mesh, matName) => {
      if (!mesh || !mesh.idx.length) return;
      const P = mesh.pos, pos = new Float32Array(P.length);
      for (let i = 0; i < P.length; i += 3) { pos[i] = P[i]; pos[i + 1] = P[i + 2]; pos[i + 2] = P[i + 1]; }
      const idx = new Uint32Array(mesh.idx.length); for (let i = 0; i < mesh.idx.length; i += 3) { idx[i] = mesh.idx[i]; idx[i + 1] = mesh.idx[i + 2]; idx[i + 2] = mesh.idx[i + 1]; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(mesh.uv), 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
      const m = new THREE.Mesh(g, this.mats[matName] || this.mats.under); m.castShadow = matName !== 'plate' && matName !== 'water'; m.receiveShadow = true; sc.add(m); this.meshes.push(m);
    };
    // merge each material over all blocks
    const merged = {};
    for (const id in geo.blocks) for (const k in geo.blocks[id].render) {
      const src = geo.blocks[id].render[k], dst = merged[k] || (merged[k] = { pos: [], uv: [], idx: [] }), base = dst.pos.length / 3;
      for (const v of src.pos) dst.pos.push(v); for (const v of src.uv) dst.uv.push(v); for (const i of src.idx) dst.idx.push(i + base);
    }
    for (const k in merged) add(merged[k], k);
    add(geo.plate, 'plate'); add(geo.chasmWalls, 'canyon'); add(geo.water, 'water');
    // supports: concrete pillars (a box each, merged)
    const sp = { pos: [], uv: [], idx: [] };
    const box = (x, y, z0, z1, w) => {
      const b = sp.pos.length / 3, c = [[-w, -w], [w, -w], [w, w], [-w, w]];
      for (const [dx, dy] of c) { sp.pos.push(x + dx, y + dy, z0); sp.uv.push((dx + dy) * .3, z0 / 2); }
      for (const [dx, dy] of c) { sp.pos.push(x + dx, y + dy, z1); sp.uv.push((dx + dy) * .3, z1 / 2); }
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; sp.idx.push(b + i, b + j, b + 4 + i, b + j, b + 4 + j, b + 4 + i); }
    };
    for (const s of geo.supports) { if (s[3] === 'loop') continue; box(s[0], s[1], -.2, s[2], .7); }
    add(sp, 'support');
    this.track = track; this.geo = geo; this.deco = deco;
    this.gates = geo.gates; this.pads = geo.pads;
    this.loopSup = geo.supports.filter(s => s[3] === 'loop');
  }
  /** per frame: gates, pads, scenery (drawn with the pen); the race draws cars after */
  drawTrack(time, o = {}) {
    const pen = this.world.pen, EV = this.EV;
    this.time = time;
    // gates: arches with banners; the start's lights; checkpoints flash when passed
    for (const g of this.gates) {
      const kind = g.kind, hw = g.hw + .6, x = g.p[0] * U, y = g.p[1] * U, z = g.p[2] * U;
      pen.frame(x, y, z, g.t, g.r, g.u, U);
      const col = kind === 'CP' ? '#2a8af0' : kind === 'ST' ? '#30c050' : '#e8402a', lit = o.cpFlash && o.cpFlash.has && o.cpFlash.has(g) ? o.cpFlash.get(g) : 0;
      for (const sd of [-1, 1]) { pen.box(0, sd * hw, 3.5, .9, .9, 7, col); pen.box(0, sd * hw, .2, 1.6, 1.6, .4, '#3a3a40'); }
      pen.box(0, 0, 7.4, 1, hw * 2 + .9, 1.2, col);
      // banner: chequered for start/finish, a stripe for checkpoints
      if (kind === 'CP') { pen.box(0, 0, 6.3, .3, hw * 2 - .6, .9, lit > 0 ? '#ffffff' : '#a8d8ff'); for (let i = -2; i <= 2; i++) pen.box(-.2, i * 2.2, 6.3, .3, .6, .6, '#103060'); }
      else for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) pen.box(-.2, -hw + .9 + i * (hw * 2 - 1.8) / 9, 6.0 + j * .6, .3, (hw * 2 - 1.8) / 9, .6, (i + j) % 2 ? '#111111' : '#f8f8f8');
      if (lit > 0) pen.glow(0, 0, 7.4, 1.6 * lit, '#bfe4ff');
      // start lights: five lamps red, then green
      if (kind === 'ST' || (kind === 'FN' && false)) {}
    }
    // the start arch (the spawn's gate) with its lights
    if (o.startGate) {
      const g = o.startGate, hw = 8.6; pen.frame(g.p[0] * U, g.p[1] * U, g.p[2] * U, g.t, g.r, g.u, U);
      for (const sd of [-1, 1]) pen.box(0, sd * hw, 3.5, .9, .9, 7, '#30c050');
      pen.box(0, 0, 7.4, 1, hw * 2 + .9, 1.2, '#30c050');
      for (let i = 0; i < 10; i++) pen.box(-.2, -hw + 1 + i * 1.73, 6.2, .3, 1.73, .7, i % 2 ? '#111111' : '#f8f8f8');
      const lights = o.lights ?? 0;   // 0..5 red lamps, 6 green
      for (let i = 0; i < 5; i++) { const on = lights === 6 ? '#40ff60' : i < lights ? '#ff3020' : '#401010'; pen.ball(-.6, -3.2 + i * 1.6, 8.6, .55, .55, .55, '#202020'); if (on !== '#401010') pen.glow(-.8, -3.2 + i * 1.6, 8.6, .5, on); else pen.ball(-.8, -3.2 + i * 1.6, 8.6, .45, .45, .45, on); }
    }
    // boost pads: chevrons lit in sequence
    for (const p of this.pads) {
      pen.frame(p.p[0] * U, p.p[1] * U, p.p[2] * U, p.t, p.r, p.u, U);
      for (let i = 0; i < 4; i++) {
        const ph = ((time * 3 - i * .25) % 1 + 1) % 1, c = ph < .3 ? '#fff6a0' : '#ff8a1a', s = 1 + i * 3;
        pen.slab(s, -4, .05, s + 2.2, 0, .05, 0, 0, 1, .7, .08, c); pen.slab(s + 2.2, 0, .05, s, 4, .05, 0, 0, 1, .7, .08, c);
      }
      pen.box(p.len / 2, -p.hw + .4, .04, p.len, .5, .06, '#ff8a1a'); pen.box(p.len / 2, p.hw - .4, .04, p.len, .5, .06, '#ff8a1a');
    }
    // loop supports: an A-frame of steel each side
    for (const d of this.deco) drawDeco(pen, d, time, this.env, o);
  }
}

// ---- scenery drawn with the pen (metres via k = 16) ----
export function drawDeco(pen, d, t, env, o = {}) {
  const z = (d.z || 0) * U, s = d.s || 1;
  pen.at(d.x * U, d.y * U, z, d.yaw || 0, U * s);
  switch (d.kind) {
    case 'cactus': pen.tube(0, 0, 0, 0, 0, 4.2, .45, '#3a8a3a').tube(0, 0, 1.8, .9, 0, 2.2, .3, '#3a8a3a').tube(.9, 0, 2.2, .9, 0, 3.2, .3, '#4a9a4a').tube(0, 0, 2.4, -.8, 0, 2.6, .28, '#3a8a3a').tube(-.8, 0, 2.6, -.8, 0, 3.6, .28, '#4a9a4a').ball(0, 0, 4.2, .45, .45, .3, '#e86a8a'); break;
    case 'barrelcactus': for (let i = 0; i < 3; i++) pen.ball(Math.cos(i * 2.1) * .8, Math.sin(i * 2.1) * .8, .5, .6, .6, .7, i ? '#4a9a3a' : '#5aaa4a').ball(Math.cos(i * 2.1) * .8, Math.sin(i * 2.1) * .8, 1.15, .2, .2, .15, '#ffd23a'); break;
    case 'rock': pen.ball(0, 0, .5, 1.6, 1.2, 1.1, env === 'frostpeak' ? '#7a7a88' : env === 'dustbowl' ? '#b8784a' : '#8a8a80').ball(.8, .5, 1.1, .8, .7, .6, env === 'frostpeak' ? '#f0f4fa' : env === 'dustbowl' ? '#c88a5a' : '#9a9a90'); break;
    case 'tumbleweed': { const ph = t * .6 + d.seed, dx = ((ph * 7) % 40) - 20, b = Math.abs(Math.sin(ph * 3)) * 1.2; pen.ball(dx, 0, .7 + b, .8, .8, .8, '#b89a5a').ball(dx + .2, .2, .9 + b, .6, .6, .6, '#a08040'); break; }
    case 'pumpjack': { const a = Math.sin(t * 1.4 + d.seed) * .35; pen.box(0, 0, .3, 4, 2, .6, '#4a4a50').tube(0, 0, .6, 0, 0, 3.4, .3, '#8a8a90'); const ca = Math.cos(a), sa = Math.sin(a); pen.slab(-2.6 * ca, 0, 3.6 - 2.6 * sa, 2.6 * ca, 0, 3.6 + 2.6 * sa, 0, 1, 0, .6, .5, '#e8b030'); pen.box(2.8 * ca, 0, 3.6 + 2.8 * sa - .6, .8, .9, 1.4, '#e8b030'); break; }
    case 'billboard': { pen.tube(-2.5, 0, 0, -2.5, 0, 4, .2, '#6a6a70').tube(2.5, 0, 0, 2.5, 0, 4, .2, '#6a6a70'); const cs = [['#e8402a', '#ffd23a'], ['#2a7ae8', '#ffffff'], ['#ff8a2a', '#2a2a30']][d.seed % 3]; pen.box(0, 0, 5, 7, .3, 3, cs[0]).box(0, -.2, 5, 5, .1, 1, cs[1]).box(-2.2, -.2, 5.8, 1.2, .1, .5, cs[1]); break; }
    case 'tree': pen.tube(0, 0, 0, 0, 0, 3, .35, '#7a5030').ball(0, 0, 4.2, 2.4, 2.4, 2.2, '#3a8a2a').ball(.8, .6, 5.2, 1.6, 1.6, 1.4, '#4a9a3a'); break;
    case 'bush': pen.ball(0, 0, .7, 1.4, 1.2, .9, '#3a7a2a').ball(.6, .3, 1, .8, .8, .7, '#4a8a3a'); break;
    case 'hay': pen.tube(-.9, 0, .9, .9, 0, .9, .9, '#e0c060').tube(-.95, 0, .9, -.85, 0, .9, .7, '#c8a040'); break;
    case 'fence': for (let i = -2; i <= 2; i++) pen.box(i * 2, 0, .6, .2, .2, 1.2, '#8a6a4a'); pen.box(0, 0, 1, 8.4, .12, .2, '#a07a5a').box(0, 0, .5, 8.4, .12, .2, '#a07a5a'); break;
    case 'cow': { const bob = Math.sin(t * 1.2 + d.seed) * .15; pen.box(0, 0, 1.3, 2.4, 1, 1, '#f4f4f0').box(.4, 0, 1.6, .8, 1.02, .5, '#2a2a2a').ball(1.5, 0, 1.4 + bob - .3, .4, .35, .4, '#f4f4f0').ball(1.85, 0, 1.25 + bob - .3, .2, .25, .2, '#e8a0a0'); for (const [a, b] of [[.8, .35], [.8, -.35], [-.8, .35], [-.8, -.35]]) pen.tube(a, b, .8, a, b, 0, .15, '#e8e8e0'); pen.tube(-1.2, 0, 1.6, -1.4, Math.sin(t * 3 + d.seed) * .3, .8, .07, '#2a2a2a'); break; }
    case 'barn': pen.box(0, 0, 3, 10, 7, 6, '#b8302a').box(0, 0, 6.6, 10.4, 7.4, .4, '#f4f0e8').cone(0, 0, 6.2, 0, 0, 9, 5.6, '#5a3a2a').box(-5.02, 0, 2, .1, 3, 4, '#f4f0e8'); break;
    case 'windmill': { pen.tube(0, 0, 0, 0, 0, 9, 1.4, '#e8e0d0').cone(0, 0, 9, 0, 0, 11, 1.8, '#8a4a2a'); const a = t * 1.5 + d.seed; for (let i = 0; i < 4; i++) { const b = a + i * Math.PI / 2; pen.slab(1.6, 0, 8.6, 1.6, Math.cos(b) * 5.5, 8.6 + Math.sin(b) * 5.5, 1, 0, 0, 1.2, .1, '#f0e8d8'); } break; }
    case 'pine': pen.tube(0, 0, 0, 0, 0, 1.4, .3, '#6a4a30').cone(0, 0, 1, 0, 0, 4.2, 2.2, '#2a6a4a').cone(0, 0, 2.8, 0, 0, 5.8, 1.6, '#3a7a5a').cone(0, 0, 4.4, 0, 0, 7, 1, '#f0f4fa'); break;
    case 'chalet': pen.box(0, 0, 2.5, 8, 6, 5, '#9a6a3a').cone(0, 0, 5, 0, 0, 8, 5.2, '#f4f8fc').box(-4.02, 0, 2.5, .1, 1.6, 1.6, '#ffd890').box(0, -3.02, 2.6, 1.4, .1, 2.2, '#5a3a20'); if (env === 'frostpeak') pen.glow(-4.2, 0, 2.5, .5, '#ffd890'); break;
    case 'snowman': pen.ball(0, 0, .8, .9, .9, .8, '#f8fcff').ball(0, 0, 2, .65, .65, .6, '#f8fcff').ball(0, 0, 2.9, .45, .45, .42, '#f8fcff').cone(.4, 0, 2.95, .9, 0, 2.95, .1, '#ff8a2a').box(0, 0, 3.4, .5, .5, .5, '#202024').tube(0, -.6, 2.1, .3, -1.3, 2.6, .06, '#6a4a30'); break;
    case 'iceblock': pen.box(0, 0, .9, 1.8, 1.8, 1.8, '#a8e0ff').box(.6, .7, .5, 1, 1, 1, '#c8f0ff'); break;
    case 'lamp': pen.tube(0, 0, 0, 0, 0, 6, .12, '#4a4a50').tube(0, 0, 6, .8, 0, 6.2, .1, '#4a4a50').glow(.9, 0, 6, .35, '#ffe0a0'); break;
    case 'tyres': for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) pen.tube(i * 1.1 - 1.1, 0, j * .5, i * 1.1 - 1.1, 0, j * .5 + .45, .5, j % 2 ? '#e8402a' : '#1e1e22'); break;
    case 'cones': for (let i = 0; i < 3; i++) pen.cone(i * 1.2 - 1.2, 0, 0, i * 1.2 - 1.2, 0, .8, .3, '#ff7a1a'); break;
    case 'snowbank': pen.ball(0, 0, .3, 2.6, 1.2, .9, '#f0f6fc'); break;
    case 'chevron': { pen.tube(0, -2, 0, 0, -2, 1.5, .12, '#5a5a60').tube(0, 2, 0, 0, 2, 1.5, .12, '#5a5a60').box(0, 0, 2.2, .2, 5, 1.4, '#f4f4f0'); const sd = d.side || 1; for (let i = -1; i <= 1; i++) { pen.slab(-.12, i * 1.5 - .4 * sd, 1.7, -.12, i * 1.5 + .4 * sd, 2.2, 1, 0, 0, .3, .1, '#e8402a'); pen.slab(-.12, i * 1.5 + .4 * sd, 2.2, -.12, i * 1.5 - .4 * sd, 2.7, 1, 0, 0, .3, .1, '#e8402a'); } break; }
    case 'grandstand': {
      for (let row = 0; row < 4; row++) pen.box(-row * 1.6 - 1, 0, row * 1.1 + .5, 1.6, 16, 1, '#8a8a90');
      pen.box(-7.2, 0, 4, .4, 16.4, 8, '#5a5a62').box(-3.2, 0, 7.6, 8, 17, .3, env === 'dustbowl' ? '#ff9a2a' : env === 'hedgerow' ? '#3aa04a' : '#3a7ae8');
      // the crowd: heads and arms that bob and wave (louder after a gate)
      const ex = o.cheer || 0;
      for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) {
        const k = hash01((d.seed || 7) * 131 + row * 17 + i), ph = t * (3 + ex * 4) + k * 6, h = Math.max(0, Math.sin(ph)) * (.25 + ex * .4);
        const x = -row * 1.6 - 1.2, y = -7 + i * 1.75 + (row % 2) * .4, zz = row * 1.1 + 1.1;
        const shirt = ['#e8402a', '#2a7ae8', '#ffd23a', '#3aa04a', '#f4f4f0', '#9a5ae8'][Math.floor(k * 6)];
        pen.box(x, y, zz + .45 + h * .5, .5, .7, .8, shirt).ball(x, y, zz + 1.1 + h * .5, .28, .28, .3, ['#f0c8a0', '#c89870', '#8a5a3a'][Math.floor(k * 3)]);
        if (k > .5) pen.tube(x, y + .35, zz + .9 + h * .5, x - .1, y + .55, zz + 1.6 + h * 1.5, .1, shirt);
      }
      break;
    }
  }
}

// ---- cars (the pen in the car's own frame, metres) ----
const DIG = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
function digit(pen, n, x, y, z, sz, col, side) {   // a 3 x 5 digit of tiny boxes on a door (side: -1 left, +1 right) or the roof (0)
  const D = DIG[n % 10];
  for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (D[j * 3 + i] === '1') {
    if (side) pen.box(x + (side < 0 ? (1 - i) : (i - 1)) * sz * -1, y, z + (2 - j) * sz, sz, .04, sz, col);
    else pen.box(x + (2 - j) * sz, y + (i - 1) * sz, z, sz, sz, .04, col);
  }
}
export const defaultPaint = carId => ({ body: CARS[carId].color, accent: CARS[carId].accent, pattern: carId === 'coyote' ? 1 : carId === 'pebble' ? 2 : 0, pcol: '#ffffff', number: carId === 'coyote' ? 7 : carId === 'pebble' ? 21 : 44, rims: '#c8c8d0', helmet: '#ffd23a' });

/** draw a car: s = { p, f, r, u (frame), steer (rad), wheelSpin, wd: [4 wheel drops], brake, boost, lights } */
export function drawCar(pen, carId, s, paint, o = {}) {
  const C = CARS[carId], P = paint || defaultPaint(carId), ghost = !!o.ghost;
  const tint = c => ghost && o.tint ? o.tint : c;
  pen.ghost = ghost;
  const lean = s.lean || [0, 0], scale = o.scale || 1;
  // the body leans a little (pitch from acceleration, roll from cornering) on top of the physics frame
  const u = [s.u[0] + s.f[0] * lean[0] + s.r[0] * lean[1], s.u[1] + s.f[1] * lean[0] + s.r[1] * lean[1], s.u[2] + s.f[2] * lean[0] + s.r[2] * lean[1]], ul = Math.hypot(...u);
  const uu = u.map(v => v / ul), ride = C.ride;
  pen.frame(s.p[0] * U, s.p[1] * U, s.p[2] * U, s.f, s.r, uu, U * scale);
  const L = C.L, W = C.W, Hh = C.H, wb = C.wheelbase / 2, tr = C.track / 2, wr = C.wheelR, body = tint(P.body), acc = tint(P.accent);
  const zb = -ride + wr + .15;   // body bottom over the road
  // wheels: at each probe's drop, spinning, the front ones steered
  const W4 = [[wb, -tr], [wb, tr], [-wb, -tr], [-wb, tr]];
  for (let i = 0; i < 4; i++) {
    const [lx, ly] = W4[i], d = s.wd ? clamp(s.wd[i], ride - .25, ride + .3) : ride, zc = -d + wr, steer = i < 2 ? (s.steer || 0) : 0;
    const ca = Math.cos(steer), sa = Math.sin(steer), wx = .26 * (carId === 'moose' ? 1.4 : 1), yo = ly + Math.sign(ly) * .05;
    pen.tube(lx - sa * 0, yo - wx, zc, lx + sa * 0, yo + wx, zc, wr, tint('#1c1c20'));
    pen.tube(lx, yo + Math.sign(ly) * (wx + .01), zc, lx, yo + Math.sign(ly) * (wx + .03), zc, wr * .6, tint(P.rims));
    const sp = (s.wheelSpin || 0) + i; pen.box(lx + Math.cos(sp) * wr * .4, yo + Math.sign(ly) * (wx + .04), zc + Math.sin(sp) * wr * .4, .12, .04, .12, tint('#505058'));
    if (steer) pen.box(lx, yo, zc + wr + .02, .3 * ca, .05, .02, tint('#1c1c20'));
  }
  if (carId === 'coyote') {
    pen.box(0, 0, zb + .3, L, W, .6, body);                    // the long low body
    pen.box(.9, 0, zb + .66, 1.9, W * .92, .16, body);           // the bonnet
    pen.box(1.0, 0, zb + .8, .9, .5, .18, tint('#2a2a30'));       // the scoop
    pen.slab(-.2, 0, zb + .62, -1.4, 0, zb + 1.18, 0, 1, 0, W * .8, .18, tint('#1a2030'));   // fastback glass
    pen.box(-.55, 0, zb + 1.08, 1.2, W * .8, .22, body);         // the roof
    pen.slab(.15, 0, zb + .62, -.1, 0, zb + 1.08, 0, 1, 0, W * .78, .1, tint('#5a88b8'));      // windscreen
    pen.box(L / 2 + .02, 0, zb + .2, .14, W * 1.02, .2, tint('#d8d8e0')).box(-L / 2 - .02, 0, zb + .2, .14, W * 1.02, .2, tint('#d8d8e0'));
    for (const sd of [-1, 1]) pen.tube(-.6, sd * (W / 2 + .05), zb + .05, .6, sd * (W / 2 + .05), zb + .05, .07, tint('#c8c8d0'));
    pen.box(-L / 2 + .2, 0, zb + .62, .3, W, .08, acc);          // a ducktail spoiler
  } else if (carId === 'pebble') {
    pen.box(0, 0, zb + .35, L, W, .7, body);
    pen.box(-.35, 0, zb + 1.05, 2.1, W * .9, .7, body);
    pen.slab(.75, 0, zb + .72, .45, 0, zb + 1.35, 0, 1, 0, W * .84, .08, tint('#5a88b8'));
    pen.box(-.35, 0, zb + 1.44, 1.2, .8, .1, tint('#2a2a30'));   // roof vent
    pen.box(-L / 2 + .15, 0, zb + 1.5, .5, W * 1.05, .08, acc).box(-L / 2 + .2, -.6, zb + 1.3, .1, .1, .3, acc).box(-L / 2 + .2, .6, zb + 1.3, .1, .1, .3, acc);   // the wing
    for (let i = 0; i < 4; i++) pen.ball(L / 2 - .25, -.6 + i * .4, zb + .78, .14, .14, .14, tint('#fff6c0'));   // the lamp pod
    for (const sd of [-1, 1]) pen.box(-wb - .45, sd * tr, zb + .05, .05, .4, .35, tint('#202024'));   // mud flaps
  } else {
    pen.box(0, 0, zb + .45, L, W, .9, body);
    pen.box(-.2, 0, zb + 1.35, 2.6, W * .94, .9, body);
    pen.slab(1.1, 0, zb + .92, 1.0, 0, zb + 1.75, 0, 1, 0, W * .86, .08, tint('#5a88b8'));
    pen.tube(.2, -W / 2 + .1, zb + 1.85, .2, W / 2 - .1, zb + 1.85, .06, tint('#3a3a40')).tube(-1.3, -W / 2 + .1, zb + 1.85, -1.3, W / 2 - .1, zb + 1.85, .06, tint('#3a3a40'));
    for (let i = 0; i < 3; i++) pen.ball(.2, -.5 + i * .5, zb + 1.98, .13, .13, .13, tint('#fff6c0'));   // roof lamps
    pen.tube(-L / 2 - .15, 0, zb + .9, -L / 2 - .15, 0, zb + .9 + .01, .5, tint('#1c1c20'));            // spare wheel
    pen.tube(.9, W / 2 + .05, zb + .6, .9, W / 2 + .05, zb + 2.0, .07, tint('#2a2a30'));                // snorkel
    pen.box(L / 2 + .05, 0, zb + .3, .2, W * 1.05, .3, tint('#3a3a40'));
  }
  // paint patterns
  const topZ = carId === 'coyote' ? zb + 1.2 : carId === 'pebble' ? zb + 1.41 : zb + 1.81, pc = tint(P.pcol), sideZ = carId === 'coyote' ? zb + .3 : carId === 'pebble' ? zb + .4 : zb + .55;
  switch (P.pattern) {
    case 1: for (const o2 of [-.25, .25]) pen.box(0, o2, carId === 'coyote' ? zb + .62 : topZ - .02, L * .98, .22, .05, pc); if (carId !== 'coyote') {} else pen.box(-.55, -.25, zb + 1.2, 1.2, .22, .04, pc).box(-.55, .25, zb + 1.2, 1.2, .22, .04, pc); break;
    case 2: for (const sd of [-1, 1]) pen.box(0, sd * (W / 2 + .01), sideZ, L * .9, .04, .18, pc); break;
    case 3: for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2) pen.box(-.55 + (i - 1.5) * .3, (j - 1) * .3, topZ, .3, .3, .04, pc); break;
    case 4: for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) pen.slab(L / 2 - .3 - i * .4, sd * (W / 2 + .01), sideZ - .15, L / 2 - 1.4 - i * .3, sd * (W / 2 + .01), sideZ + .15 - i * .05, 1, 0, 0, .25, .04, i % 2 ? '#ffd23a' : '#ff6a1a'); break;
    case 5: for (const sd of [-1, 1]) { pen.slab(1.2, sd * (W / 2 + .01), sideZ + .15, .3, sd * (W / 2 + .01), sideZ - .1, 0, 0, 1, .14, .04, pc); pen.slab(.3, sd * (W / 2 + .01), sideZ - .1, -.2, sd * (W / 2 + .01), sideZ + .12, 0, 0, 1, .14, .04, pc); pen.slab(-.2, sd * (W / 2 + .01), sideZ + .12, -1.2, sd * (W / 2 + .01), sideZ - .15, 0, 0, 1, .14, .04, pc); } break;
    case 6: for (const sd of [-1, 1]) pen.box(0, sd * (W / 2 + .01), sideZ + .02, .9, .04, .7 * (carId === 'coyote' ? .6 : 1), '#f8f8f8'); break;
    case 7: pen.box(-L / 4, 0, sideZ - .05, L / 2, W + .02, .3, pc); break;
  }
  // the number on both doors and the roof
  if (P.number !== undefined && P.number !== null && !ghost) {
    const n = P.number, d1 = Math.floor(n / 10) % 10, d0 = n % 10, sz = .1, nc = P.pattern === 6 ? '#1a1a1a' : '#f8f8f8';
    for (const sd of [-1, 1]) { const y = sd * (W / 2 + .03); digit(pen, d1, sd * -.2 + (sd < 0 ? .2 : -.2), y, sideZ + .05, sz, nc, sd); digit(pen, d0, sd * .2 + (sd < 0 ? -.2 : .2), y, sideZ + .05, sz, nc, sd); }
    digit(pen, d1, -.55, -.2, topZ + .03, sz, nc, 0); digit(pen, d0, -.55, .2, topZ + .03, sz, nc, 0);
  }
  // the driver's helmet through the glass
  const hz = carId === 'coyote' ? zb + .85 : carId === 'pebble' ? zb + 1.05 : zb + 1.4;
  pen.ball(-.3, -.3, hz, .24, .24, .26, tint(P.helmet)).box(-.12, -.3, hz, .1, .3, .1, tint('#202830'));
  // lights: brake lights glow while braking, headlights in the dark, the boost flame
  for (const sd of [-1, 1]) {
    if (s.brake) pen.glow(-L / 2 - .05, sd * (W / 2 - .25), zb + .4, .2, '#ff2020'); else pen.box(-L / 2 - .02, sd * (W / 2 - .25), zb + .4, .06, .3, .14, tint('#901818'));
    if (s.lights) pen.glow(L / 2 + .05, sd * (W / 2 - .3), zb + .35, .22, '#fff6d0'); else pen.box(L / 2 + .02, sd * (W / 2 - .3), zb + .35, .06, .3, .14, tint('#f0f0d0'));
  }
  if (s.boost > 0) { const fl = .5 + Math.sin(s.time * 60) * .2; pen.glow(-L / 2 - .4, .5, zb + .15, .35 * fl + .1, '#ffb030').glow(-L / 2 - .8 * fl, .5, zb + .15, .2, '#fff0a0'); pen.glow(-L / 2 - .4, -.5, zb + .15, .35 * fl + .1, '#ffb030'); }
  pen.ghost = false;
}
export { GMID };
