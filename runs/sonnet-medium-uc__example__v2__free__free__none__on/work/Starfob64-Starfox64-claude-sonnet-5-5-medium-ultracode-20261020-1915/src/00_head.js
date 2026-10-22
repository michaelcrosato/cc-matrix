import * as THREE from 'three/webgpu';
import * as TSL from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';

// ===================================================================
//  STARFOB 64  -  core constants, math helpers, settings
// ===================================================================
const GAME_TITLE = 'STARFOB 64';
const V3 = THREE.Vector3, Q4 = THREE.Quaternion, E3 = THREE.Euler, M4 = THREE.Matrix4;
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sign = (x) => (x < 0 ? -1 : 1);
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

// physics collision groups (membership << 16 | filter)
const GRP = { PLAYER: 1, ENEMY: 2, PB: 4, EB: 8, OBST: 16, PICK: 32, DEBRIS: 64, GROUND: 128 };
const ig = (m, f) => ((m << 16) | f) >>> 0;

// ---------------------------------------------------------------- settings
const DEFAULTS = {
  master: 0.8, music: 0.6, sfx: 0.9, voice: 0.7,
  invH: false, invV: false, flightPitch: false, deadzone: 0.12,
  aimAssist: true, autoFire: true, rumble: true, mouse: false,
  shake: 1, fov: 65, bloom: true, outlines: true, shadows: true,
  radio: true, glyphs: 'auto', reduceFlash: false, hudScale: 1,
};
const S = Object.assign({}, DEFAULTS);
try { Object.assign(S, JSON.parse(localStorage.getItem('starfob64.settings') || '{}')); } catch (e) { /* ignore */ }
function saveSettings() { try { localStorage.setItem('starfob64.settings', JSON.stringify(S)); } catch (e) { /* ignore */ } }
const SAVE = { unlocked: { s1: true }, best: {}, medals: {} };
try { Object.assign(SAVE, JSON.parse(localStorage.getItem('starfob64.save') || '{}')); } catch (e) { /* ignore */ }
function saveGame() { try { localStorage.setItem('starfob64.save', JSON.stringify(SAVE)); } catch (e) { /* ignore */ } }

// ---------------------------------------------------------------- tween / spring utilities (procedural animation toolkit)
class Spring {
  constructor(value = 0, k = 140, d = 14) { this.x = value; this.v = 0; this.t = value; this.k = k; this.d = d; }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) { this.v += ((this.t - this.x) * this.k - this.v * this.d) * h; this.x += this.v * h; }
    return this.x;
  }
  kick(v) { this.v += v; }
}
const Tweens = {
  list: [],
  add(dur, fn, ease = (t) => t, done) { const tw = { t: 0, dur, fn, ease, done }; this.list.push(tw); return tw; },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      const k = clamp(tw.t / tw.dur, 0, 1);
      tw.fn(tw.ease(k), k);
      if (k >= 1) { this.list.splice(i, 1); if (tw.done) tw.done(); }
    }
  },
  clear() { this.list.length = 0; },
};
// keyframe track: [[t, value], ...] sampled with smooth interpolation
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      return lerp(a[1], b[1], smooth((t - a[0]) / (b[0] - a[0])));
    }
  }
  return keys[keys.length - 1][1];
}
