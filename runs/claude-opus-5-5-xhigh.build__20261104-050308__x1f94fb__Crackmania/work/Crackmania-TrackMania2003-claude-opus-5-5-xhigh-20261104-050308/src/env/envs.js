// CRACKMANIA environments (PLAN §6.2): DUSTBOWL (desert), HEDGEROW (countryside), FROSTPEAK (alpine). Each is one
// E.World3D for the whole session: a terrain round the 1 km grid (dunes and mesas, farmland, mountains), its sky, fog,
// sun, the palette its track and UI use, its car and its music
import { GX, GY, CELL, GRID } from '../track/blocks.js';
const E = globalThis.My3D2dge;
const U = 16, G0 = GX, G1 = GX + CELL * GRID;
const n2 = (x, y) => E.noise2(x, y);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** how far outside the grid a point is (metres; 0 inside) */
const outside = (x, y) => Math.hypot(Math.max(0, G0 - x, x - G1), Math.max(0, G0 - y, y - G1));
const inside = (x, y) => x > G0 && x < G1 && y > G0 && y < G1;
const CX = (G0 + G1) / 2;
// mesas round the Dustbowl: [angle, distance from the grid's centre, radius, height]
const MESAS = [[.3, 1050, 110, 95], [1.2, 1250, 160, 120], [2.1, 980, 80, 60], [2.9, 1300, 140, 110], [3.8, 1120, 95, 75], [4.6, 1380, 180, 125], [5.5, 1000, 70, 45]];
const mesaH = (x, y) => { let h = 0; for (const [a, d, r, H] of MESAS) { const mx = CX + Math.cos(a) * d, my = CX + Math.sin(a) * d, q = Math.hypot(x - mx, y - my) + n2(x / 40, y / 40) * 18; h = Math.max(h, H * (1 - sstep(r * .82, r, q))); } return h; };
const ridged = (x, y) => { let v = 0, a = 1, f = 1 / 600; for (let o = 0; o < 4; o++) { v += a * (1 - Math.abs(n2(x * f, y * f) * 2 - 1)); a *= .5; f *= 2.1; } return v / 1.875; };

export const ENVS = {
  dustbowl: {
    id: 'dustbowl', name: 'DUSTBOWL', tagline: 'Hot asphalt, big air', car: 'coyote', accent: '#ff9a2a', accent2: '#ffd060', music: 'heat', off: 'sand',
    sky: { top: '#3a7fd8', horizon: '#f6d29a', ground: '#d8a870', haze: .35 }, fog: { color: '#f2d6a6', near: 9600, far: 30000 },
    sun: { color: '#ffe2b0', intensity: 3.1, dir: [.62, -.28, -.42], area: 1100, map: 2048 }, ambient: ['#bcd8ff', '#c8905a', 1.7],
    height(x, y) { if (inside(x, y)) return -60; const o = outside(x, y), k = sstep(0, 70, o); return -.4 + k * (6 * n2(x / 80, y / 80) + 3 * n2(x / 23, y / 23)) + mesaH(x, y); },
    color(x, y, z, nz) { const n = n2(x / 50, y / 50), r = n2(x / 9, y / 9); if (z < -20) return [168, 92, 60]; return [218 + n * 20 - r * 14, 172 + n * 18 - r * 12, 112 + n * 10 - r * 10]; },
    rock: { colors: ['#c8582e', '#e08a4a', '#f0c890', '#b8462a', '#e8a062', '#f4dcb0'], band: 6 },
    plate: ['#e3b673', '#d49a55', '#f0c888'], curb: ['#e8402a', '#f4f0e8'], rail: '#c8ccd4', railAlt: '#e84a2a', pillar: '#c8bca8', under: '#8a7a6a', road: 'asphalt', line: '#ffd23a', edge: '#f8f8f0', boundary: ['#f4f0e8', '#e8642a'],
    lights: false, palette: { warm: '#ff9a2a', cool: '#40a8d8' }
  },
  hedgerow: {
    id: 'hedgerow', name: 'HEDGEROW', tagline: 'Tight lanes, loose gravel', car: 'pebble', accent: '#6ad04a', accent2: '#f0e070', music: 'hedge', off: 'grass',
    sky: { top: '#4aa0f0', horizon: '#d8ecff', ground: '#8ab070', haze: .25 }, fog: { color: '#d8ecff', near: 8000, far: 26000 },
    sun: { color: '#fff8e8', intensity: 3.0, dir: [.3, .45, -.84], area: 1100, map: 2048 }, ambient: ['#d8ecff', '#6a8a4a', 1.8],
    height(x, y) { if (inside(x, y)) return -60; const o = outside(x, y), k = sstep(0, 90, o); return -.4 + k * (25 * n2(x / 300, y / 300) + 6 * n2(x / 60, y / 60)) * (1 + o / 900); },
    color(x, y, z, nz) {
      if (z < -20) return [110, 92, 70];
      const fx = Math.floor(x / 60), fy = Math.floor(y / 60), h = E.hash2(fx, fy), edge = Math.min(x / 60 - fx, fx + 1 - x / 60, y / 60 - fy, fy + 1 - y / 60) < .05;
      if (edge) return [58, 92, 40];
      const r = n2(x / 7, y / 7) * 14;
      return h < .4 ? [92 + r, 156 + r, 62] : h < .65 ? [214 + r, 190 + r, 96] : h < .8 ? [132 + r, 98 + r, 64] : [70 + r, 130 + r, 52];
    },
    rock: { colors: ['#7a6a58', '#8a7a68', '#6a5a4a'], band: 4 },
    plate: ['#5a9a3a', '#6aaa4a', '#f0e070'], curb: ['#f4f4ec', '#3a9a3a'], rail: '#a8a090', railAlt: '#8a8070', pillar: '#a89880', under: '#6a5a48', road: 'tarmac', line: '#f4f4ec', edge: '#f4f4ec', boundary: ['#9a9080', '#7a7060'],
    lights: false, palette: { warm: '#f0e070', cool: '#6ad04a' }
  },
  frostpeak: {
    id: 'frostpeak', name: 'FROSTPEAK', tagline: 'Thin air, thin ice', car: 'moose', accent: '#6ad8ff', accent2: '#ffd0e8', music: 'ice', off: 'snow',
    sky: { top: '#2a5aa8', horizon: '#f0d8e8', ground: '#c8d6ea', haze: .3 }, fog: { color: '#e6eef8', near: 6400, far: 33000 },
    sun: { color: '#ffc8a8', intensity: 2.2, dir: [-.7, .35, -.3], area: 1100, map: 2048 }, ambient: ['#b8c8ff', '#e8e0f0', 1.5],
    height(x, y) { if (inside(x, y)) return -60; const o = outside(x, y), k = sstep(0, 80, o); return -.4 + k * (8 * n2(x / 70, y / 70)) + Math.pow(sstep(250, 1400, o), 1.4) * ridged(x, y) * 420; },
    color(x, y, z, nz) { if (z < -20) return [120, 130, 150]; const s = n2(x / 30, y / 30) * 10; return nz > .8 ? [236 + s * .5, 242 + s * .4, 250] : [200 + s, 214 + s, 236]; },
    rock: { colors: ['#6a6e7a', '#828694', '#5a5e6a', '#9ea2ae'], band: 7, slope: [.35, .6] },
    plate: ['#eef3fa', '#c8d6ea', '#ffffff'], curb: ['#2a7ae8', '#f4f8ff'], rail: '#f4f8ff', railAlt: '#e84a2a', pillar: '#8a92a0', under: '#5a6070', road: 'snowroad', line: '#ffb03a', edge: '#ffffff', boundary: ['#e84a2a', '#f4f4f4'],
    lights: true, palette: { warm: '#ffb860', cool: '#6ad8ff' }
  }
};
export const ENV_IDS = ['dustbowl', 'hedgerow', 'frostpeak'];
/** the World3D options for an environment (engine units) */
export function worldOptions(env, onDraw) {
  const e = ENVS[env];
  return {
    terrain: { size: 65536, height: (x, y) => e.height(x / U, y / U) * U, color: (x, y, z, nz, out) => e.color(x / U, y / U, z / U, nz), rock: e.rock, far: 42000, cell: 32, detail: 1.6 },
    sky: Object.assign({ sun: true }, e.sky), fog: e.fog, sun: Object.assign({ shadow: true }, e.sun), ambient: e.ambient,
    camera: { mode: 'fixed', far: 46000, near: 2 }, lights: e.lights ? 8 : 2, glowLights: 4, torchLights: 0, onDraw, outlines: true
  };
}
