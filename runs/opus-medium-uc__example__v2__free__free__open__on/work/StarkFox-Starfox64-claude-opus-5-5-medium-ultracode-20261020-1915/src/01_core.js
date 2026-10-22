// ===== 01_core.js — imports, math utils, settings, save data =====
import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from 'rapier';

const GAME_TITLE = 'Stark Fox';
const BUILD_ID = 'StarkFox-Starfox64-claude-opus-5-5-medium-ultracode-20261020-1915';

// ---------- math helpers ----------
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const smooth = (t) => t * t * (3 - 2 * t);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _e1 = new THREE.Euler();
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// deterministic RNG (mulberry32) for level generation
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// value noise 2D (smooth) for terrain
const Noise = (() => {
  const perm = new Uint8Array(512);
  const r = makeRng(1337);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => { const u = h & 1 ? x : -x, v = h & 2 ? y : -y; return (h & 4 ? u + v : u - v) * 0.7; };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  function n2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u), lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v);
  }
  function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * n2(x * f, y * f); f *= 2; a *= 0.5; } return s; }
  return { n2, fbm };
})();

// ---------- settings (persisted) ----------
const DEFAULT_SETTINGS = {
  invertPadX: false,       // quick fix for intermittently inverted gamepad axes
  invertPadY: false,
  flightInvert: false,     // "pilot" style: push up = nose down
  musicVol: 0.7,
  sfxVol: 0.85,
  voiceVol: 0.8,
  rumble: true,
  shake: 1.0,
  difficulty: 1,           // 0 easy, 1 normal, 2 hard
  hints: true,
  subtitlesLarge: false,
};
const Save = {
  key: 'starkfox.v1',
  data: { settings: { ...DEFAULT_SETTINGS }, high: 0, unlocked: 1, medals: {} },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.key) || 'null');
      if (d) { this.data = { ...this.data, ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } }; }
    } catch (e) { /* storage unavailable: keep defaults */ }
  },
  store() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
};
Save.load();
const Settings = Save.data.settings;

// tiny event bus
const Bus = {
  h: {},
  on(n, f) { (this.h[n] ||= []).push(f); },
  emit(n, a) { (this.h[n] || []).forEach((f) => f(a)); },
};
