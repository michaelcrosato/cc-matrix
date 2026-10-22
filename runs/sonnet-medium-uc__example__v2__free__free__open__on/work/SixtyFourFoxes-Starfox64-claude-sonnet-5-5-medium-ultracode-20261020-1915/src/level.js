// Rail paths, terrain generation and data-driven stage definitions (timelines).
import { THREE, toon, R } from './render.js';
import { mulberry32, clamp, lerp, smooth } from './util.js';
import { positionWorld, time, sin, mix, step, vec3, float, color as tslColor } from 'three/tsl';

const UP = new THREE.Vector3(0, 1, 0);
export class Rail {
  constructor(pts) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
    this.length = curve.getLength();
    const step = 2, n = Math.ceil(this.length / step) + 1;
    this.step = step; this.p = []; this.t = [];
    const pts2 = curve.getSpacedPoints(n - 1);
    for (let i = 0; i < n; i++) this.p.push(pts2[i]);
    for (let i = 0; i < n; i++) {
      const a = this.p[Math.max(0, i - 1)], b = this.p[Math.min(n - 1, i + 1)];
      this.t.push(b.clone().sub(a).normalize());
    }
    this.extendTan = this.t[n - 1].clone();
    this.endP = this.p[n - 1].clone(); this.startP = this.p[0].clone(); this.startT = this.t[0].clone();
    this._a = new THREE.Vector3();
  }
  // Fill frame {p,t,r,u} at arclength s (extrapolates linearly outside the path).
  at(s, f) {
    const n = this.p.length;
    if (s <= 0) { f.t.copy(this.startT); f.p.copy(this.startP).addScaledVector(this.startT, s); }
    else if (s >= (n - 1) * this.step) { f.t.copy(this.extendTan); f.p.copy(this.endP).addScaledVector(this.extendTan, s - (n - 1) * this.step); }
    else {
      const k = s / this.step, i = Math.floor(k), u = k - i;
      f.p.copy(this.p[i]).lerp(this.p[i + 1], u);
      f.t.copy(this.t[i]).lerp(this.t[i + 1], u).normalize();
    }
    f.r.crossVectors(f.t, UP).normalize();
    f.u.crossVectors(f.r, f.t).normalize();
    return f;
  }
}
export const mkFrame = () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() });

// ---- noise ----
function hash(ix, iy, seed) { let h = ix * 374761393 + iy * 668265263 + seed * 144665; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  const ux = smooth(fx), uy = smooth(fy);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm(x, y, seed = 0) { return vnoise(x, y, seed) * 0.55 + vnoise(x * 2.1, y * 2.1, seed + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, seed + 13) * 0.15; }

export const THEMES = {
  coast: {
    sky: [0x3b7fe0, 0x9fd8ff, 0xd8f0ff], fog: 0xbfe4ff, fogNear: 220, fogFar: 1100, sun: 0xfff0d0, sunDir: [-0.5, 0.9, 0.35], hemi: [0xcfe8ff, 0x6a5a62], water: 0x2c8fe0, waterY: -30,
    height(s, u) {
      const au = Math.abs(u);
      const canyon = smooth(clamp((Math.sin(s * 0.0011 + 0.6) + 1) / 2 * 1.4 - 0.2, 0, 1));
      const floor = lerp(-44, -26, canyon) + (fbm(s * 0.012, u * 0.012, 1) - 0.5) * 14;
      const wallH = (60 + fbm(s * 0.01, u * 0.01, 4) * 120) * lerp(0.45, 1.1, canyon);
      const wall = smooth(clamp((au - lerp(52, 38, canyon)) / 70, 0, 1)) * wallH;
      const isl = Math.max(0, fbm(s * 0.006 + 11, u * 0.006, 9) - 0.62) * 260 * (1 - canyon * 0.6);
      return floor + wall + isl;
    },
    color(h) { return h < -30 ? 0x3a7a8c : h < -20 ? 0xe9d79a : h < 14 ? 0x5fbf6b : h < 55 ? 0x9a8576 : 0xdcd4e6; },
  },
  rift: {
    sky: [0x1b1a4a, 0xe86a8a, 0xffc88a], fog: 0xf0a090, fogNear: 300, fogFar: 1600, sun: 0xffc690, sunDir: [0.6, 0.35, -0.5], hemi: [0xffd2c0, 0x4a3a7a], water: 0xffe0d0, waterY: -120,
  },
};

export function buildTerrain(rail, theme, s0 = -120, s1 = null) {
  s1 = s1 ?? rail.length + 500;
  const rows = Math.ceil((s1 - s0) / 6) + 1;
  const us = []; for (let i = -16; i <= 16; i++) us.push(Math.sign(i) * Math.pow(Math.abs(i) / 16, 1.6) * 330);
  const cols = us.length;
  const pos = new Float32Array(rows * cols * 3), col = new Float32Array(rows * cols * 3), idx = [];
  const f = mkFrame(), c = new THREE.Color(); const rng = mulberry32(5);
  for (let r = 0; r < rows; r++) {
    const s = s0 + r * 6; rail.at(s, f);
    for (let k = 0; k < cols; k++) {
      const u = us[k], h = theme.height(s, u);
      const i = (r * cols + k) * 3;
      pos[i] = f.p.x + f.r.x * u; pos[i + 1] = f.p.y + h; pos[i + 2] = f.p.z + f.r.z * u;
      c.setHex(theme.color(h));
      const j = 0.9 + rng() * 0.2; col[i] = c.r * j; col[i + 1] = c.g * j; col[i + 2] = c.b * j;
    }
  }
  for (let r = 0; r < rows - 1; r++) for (let k = 0; k < cols - 1; k++) {
    const a = r * cols + k, b = a + 1, d = a + cols, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  // flat-shaded look: expand non-indexed
  const flat = geo.toNonIndexed(); flat.computeVertexNormals();
  const m = new THREE.Mesh(flat, toon(0xffffff, { vc: true, flat: true, side: THREE.DoubleSide }));
  m.receiveShadow = true; m.castShadow = false; m.frustumCulled = false;
  return m;
}
export function makeWater(theme) {
  const geo = new THREE.PlaneGeometry(3200, 3200, 1, 1); geo.rotateX(-Math.PI / 2);
  const m = new THREE.MeshToonNodeMaterial({ color: theme.water, gradientMap: R.toon, transparent: true, opacity: 0.92 });
  const w = positionWorld;
  const stripes = sin(w.z.mul(0.11).add(time.mul(0.7)).add(sin(w.x.mul(0.045).add(time.mul(0.3))).mul(2.6)));
  m.colorNode = mix(tslColor(theme.water), tslColor(0xcdf0ff), step(float(0.93), stripes));
  const mesh = new THREE.Mesh(geo, m); mesh.position.y = theme.waterY; mesh.receiveShadow = true; mesh.frustumCulled = false;
  return mesh;
}

// ---- stage timelines ----
// Event: { s, ev: 'spawn'|'comm'|'hint'|'music'|'checkpoint'|'boss'|'speed'|'objective', ... }
function Stage1() {
  const rail = new Rail([[0, 0, 60], [0, 0, -500], [90, 0, -1100], [260, 0, -1800], [260, 0, -2600], [60, 0, -3500], [-160, 0, -4300], [-160, 0, -5200], [-20, 0, -6000], [20, 0, -6800], [20, 0, -7600], [20, 0, -9400], [20, 0, -12000]]);
  const T = []; const rng = mulberry32(64);
  const sp = (s, kind, x, y, o = {}) => T.push({ s, ev: 'spawn', kind, x, y, ...o });
  const comm = (s, who, text) => T.push({ s, ev: 'comm', who, text });
  const hint = (s, text, keys) => T.push({ s, ev: 'hint', text, keys });
  const line = (kind, s0, n, gap, fx, fy, o = {}) => { for (let i = 0; i < n; i++) sp(s0 + i * gap, kind, fx(i), fy(i), o); };
  const vee = (kind, s, cx, cy, n = 5, sp2 = 7) => { for (let i = 0; i < n; i++) { const k = Math.ceil(i / 2) * (i % 2 ? 1 : -1); sp(s + Math.abs(k) * 7, kind, cx + k * sp2, cy + Math.abs(k) * 1.2); } };
  T.push({ s: 0, ev: 'music', name: 'stage1' });
  T.push({ s: 0, ev: 'objective', text: 'Break through the coastal defence line' });
  comm(15, 'kit', 'Sixty-Four Foxes, rolling out! Stay sharp, squad.');
  comm(95, 'rook', 'Bogies ahead — I count a lot of them. Try to keep up, Kit!');
  hint(40, 'Fly with {move}. Stay inside the sky lanes.', ['move']);
  // opening rings
  for (let i = 0; i < 4; i++) sp(260 + i * 120, 'ring', Math.sin(i * 1.3) * 12, 2 + Math.cos(i * 1.7) * 5);
  hint(190, 'Hold {fire} to shoot. Hold longer to charge a lock-on volley.', ['fire']);
  line('scout', 520, 3, 90, (i) => (i - 1) * 12, () => 2, { vs: 40 });
  hint(640, 'Tap {rollL} or {rollR} for a Barrel Roll — it reflects enemy shots!', ['rollL']);
  vee('scout', 800, 0, 4, 5);
  sp(880, 'turret', -20, -999); sp(900, 'turret', 22, -999);
  sp(980, 'item_shield', 0, 6);
  vee('scout', 1080, -8, 6, 5);
  line('drone', 1200, 4, 40, (i) => -14 + i * 9, (i) => 8 - i, {});
  // canyon
  T.push({ s: 1300, ev: 'checkpoint' });
  sp(1350, 'pillar', -16, -999, { h: 55 }); sp(1420, 'pillar', 14, -999, { h: 55 }); sp(1500, 'arch', 0, 0); sp(1600, 'pillar', 0, -999, { h: 70, r: 4 });
  comm(1500, 'hazel', 'Pillars ahead! Hug the gap, Kit. You can take it.');
  sp(1560, 'turret', -34, -999); sp(1580, 'turret', 34, -999); sp(1640, 'tank', 10, -999); sp(1680, 'tank', -12, -999);
  hint(1480, 'Hold {boost} to boost, {brake} to brake. Boost burns the energy meter.', ['boost']);
  vee('scout', 1760, 0, 3, 7);
  T.push({ s: 1850, ev: 'chase', ally: 'rook', count: 3 });
  comm(1850, 'rook', 'Kit, I\'ve got three on my tail! Shake them off!');
  sp(2100, 'ring', -10, 6); sp(2180, 'ring', 8, 0);
  sp(2260, 'item_bomb', 6, 4);
  hint(2230, 'Pick up bombs. Press {bomb} to clear the screen.', ['bomb']);
  line('drone', 2400, 6, 25, (i) => Math.sin(i * 0.9) * 16, (i) => 6 + Math.cos(i) * 5);
  sp(2560, 'tower', -22, -999); sp(2580, 'tower', 20, -999); sp(2640, 'tower', 0, -999);
  comm(2480, 'dot', 'Those towers are rigged with cannons. Shoot them down — they collapse nicely!');
  T.push({ s: 2800, ev: 'checkpoint' });
  // open sea
  vee('scout', 2900, 0, 6, 7, 6); vee('scout', 3040, 0, -2, 5, 8);
  sp(3140, 'gunship', 0, 4, { vs: 24 });
  comm(3140, 'kit', 'Gunship inbound! Lock on and hit it hard.');
  sp(3300, 'item_laser', -6, 6);
  comm(3330, 'dot', 'Grab that laser upgrade. Twin lasers, courtesy of yours truly.');
  sp(3420, 'gold', 0, 4);
  line('drone', 3500, 7, 20, (i) => -18 + i * 6, (i) => 10 - Math.abs(i - 3) * 2);
  sp(3720, 'gunship', -16, 6, { vs: 24 }); sp(3760, 'gunship', 16, 6, { vs: 24 });
  sp(3900, 'ring', 0, 3);
  T.push({ s: 4000, ev: 'chase', ally: 'hazel', count: 3 });
  comm(4000, 'hazel', 'Help! They locked onto me! Kit, a little help here!');
  for (let i = 0; i < 6; i++) sp(4200 + i * 60, 'tank', (i % 2 ? 1 : -1) * (8 + i * 2), -999);
  for (let i = 0; i < 4; i++) sp(4250 + i * 80, 'turret', (i % 2 ? -1 : 1) * 36, -999);
  T.push({ s: 4650, ev: 'checkpoint' });
  comm(4700, 'rook', 'Big walker on the horizon! Aim for the glowing core.');
  sp(4900, 'walker', 0, -999, { vs: 0 });
  line('scout', 5000, 4, 90, (i) => (i - 1.5) * 12, () => 4, { vs: 40 });
  sp(5500, 'item_shield', -8, 6);
  vee('drone', 5600, 0, 4, 7, 6);
  sp(5800, 'bomber', 0, 8, { vs: 14 });
  comm(5800, 'kit', 'Bomber! Shoot out those twin pods on its wings.');
  sp(6150, 'bomber', 0, 8, { vs: 14 });
  sp(6300, 'item_bomb', 0, 6); sp(6380, 'gold', 0, 3);
  T.push({ s: 6450, ev: 'checkpoint' });
  comm(6500, 'dot', 'Heavy signal ahead. That\'s the Warden Carrier — end of the line!');
  vee('scout', 6600, 0, 4, 7, 6); vee('scout', 6720, 0, 4, 7, 6); line('drone', 6850, 8, 15, (i) => -20 + i * 5.5, (i) => 4 + (i % 2) * 6);
  sp(7100, 'item_shield', 0, 6); sp(7160, 'item_bomb', -6, 5);
  T.push({ s: 7300, ev: 'boss', kind: 'carrier' });
  // scenery (seeded)
  const scenery = [];
  for (let s = 100; s < 7600; s += 18 + rng() * 40) {
    const side = rng() < 0.5 ? -1 : 1;
    const u = side * (70 + rng() * 120);
    scenery.push({ s, u, kind: rng() < 0.55 ? 'rock' : 'spire', size: 6 + rng() * 14, seed: Math.floor(rng() * 1000) });
  }
  return { id: 1, name: 'MERIDIAN COAST', subtitle: 'Stage 1 — Coastal Defence Line', theme: THEMES.coast, themeKey: 'coast', mode: 'rail', rail, speed: 60, timeline: T.sort((a, b) => a.s - b.s), scenery, bossS: 7300, music: 'stage1', par: 120 };
}
function Stage2() {
  const T = [];
  const sp = (kind, o = {}) => T.push({ ev: 'spawn', kind, ...o });
  // wave table handled by game in all-range mode
  return { id: 2, name: 'GALE RIFT', subtitle: 'Stage 2 — Silver Jackal Ambush', theme: THEMES.rift, themeKey: 'rift', mode: 'allrange', speed: 70, timeline: T, music: 'stage2', arenaR: 520,
    waves: [
      { text: 'Wave 1 — Intercept the scouts', spawn: [['scout', 6]], comm: ['kit', 'Dogfight! This is all-range — turn on a dime, stay on their tail.'] },
      { text: 'Wave 2 — Drone swarm and gunships', spawn: [['drone', 8], ['gunship', 2]], comm: ['rook', 'More incoming! Use U-turn if one gets behind you!'] },
      { text: 'Wave 3 — Silver Jackals', spawn: [['ace', 3]], comm: ['dot', 'Silver Jackals! Their leader is the one with the red canopy. Take him down!'] },
    ] };
}
export const STAGES = { 1: Stage1, 2: Stage2 };
