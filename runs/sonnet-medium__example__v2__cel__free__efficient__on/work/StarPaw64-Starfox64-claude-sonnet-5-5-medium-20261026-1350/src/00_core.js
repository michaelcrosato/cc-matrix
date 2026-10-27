import * as THREE from 'three/webgpu';
import { positionLocal, normalLocal, positionWorld, uniform, float, vec3, mix, step, dot, normalize, smoothstep, fract, floor, sin, cos, max as tslMax, clamp as tslClamp } from 'three/tsl';
import RAPIER from 'rapier';

// ---------------------------------------------------------------- utilities
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sgn = (v) => (v < 0 ? -1 : 1);
const smooth = (t) => t * t * (3 - 2 * t);
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const wrapPi = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

// Small tween helper: tween(obj, {x:1}, seconds, easing) ; updated by Tweens.update(dt)
const Tweens = {
  list: [],
  to(obj, props, dur, ease = smooth, done) {
    const from = {}; for (const k in props) from[k] = obj[k];
    this.list.push({ obj, props, from, dur, t: 0, ease, done });
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i]; tw.t += dt; const k = clamp(tw.t / tw.dur, 0, 1), e = tw.ease(k);
      for (const p in tw.props) tw.obj[p] = lerp(tw.from[p], tw.props[p], e);
      if (k >= 1) { this.list.splice(i, 1); tw.done && tw.done(); }
    }
  },
  clear() { this.list.length = 0; }
};

// ---------------------------------------------------------------- project info (About screen + comment)
const INFO = {
  title: 'Star Paw 64',
  date: '2026-10-26 13:50',
  source: 'Starfox 64 for N64',
  tech: 'Three.js r180 (WebGPU renderer, TSL node materials, no fallback), Rapier 0.19.3 (rapier3d-compat) physics, Web Audio API (procedural synth + sequencer), Gamepad API, vanilla ES modules, Canvas 2D HUD, DOM menus',
  art: 'Stylized cel-shading: 3-band toon gradients, inverted-hull ink outlines, stepped sky gradients, flat-colour explosions',
  anim: 'Procedural, code-driven animation: spring/damped follow rigs, sine-based part rigs, tween timelines, data-driven flight patterns',
  testing: 'Lightweight only: syntax checks, headless WebGPU smoke tests via console-error capture and scripted state probes; no screenshots, visual review, judge/adversarial reviews or subagents',
  env: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium',
};

// ---------------------------------------------------------------- settings
const SETTINGS_DEFAULTS = { master: 0.8, music: 0.6, sfx: 0.9, invH: false, invV: false, pitchInv: false, sens: 1, deadzone: 0.15, rumble: true, shake: true, textSpeed: 1, assist: 1, reduceFlash: false, hints: true };
const Settings = Object.assign({}, SETTINGS_DEFAULTS);
try { Object.assign(Settings, JSON.parse(localStorage.getItem('starpaw64.settings') || '{}')); } catch (e) { /* ignore */ }
Settings.save = function () { const o = {}; for (const k in SETTINGS_DEFAULTS) o[k] = this[k]; try { localStorage.setItem('starpaw64.settings', JSON.stringify(o)); } catch (e) { /* ignore */ } };
Settings.reset = function () { Object.assign(this, SETTINGS_DEFAULTS); this.save(); };
const Save = {
  get() { try { return JSON.parse(localStorage.getItem('starpaw64.save') || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem('starpaw64.save', JSON.stringify(o)); } catch (e) { /* ignore */ } },
};
