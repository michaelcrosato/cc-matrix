// ===== 00_core.js — imports, math helpers, settings, input =====
import * as THREE from 'three/webgpu';
import { toonOutlinePass, uniform, color, mix, positionLocal, positionWorld, normalize, time, sin, step } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from '@dimforge/rapier3d-compat';


// ---------- math ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _v1 = V3(), _v2 = V3(), _v3 = V3(), _v4 = V3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _m1 = new THREE.Matrix4();
const _e1 = new THREE.Euler();
const UP = V3(0, 1, 0);
function angleWrap(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }

// deterministic hash noise for terrain
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x, y, oct = 4) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }
// seeded rng for level dressing so layouts are stable
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- settings ----------
const SETTINGS_KEY = 'sparfox64.settings.v1';
const DEFAULT_SETTINGS = {
  invertX: false, invertY: false, pilotPitch: false, sensitivity: 1.0, deadzone: 0.15,
  master: 0.8, music: 0.6, sfx: 0.8,
  difficulty: 1, aimAssist: true, rumble: true, shake: 1.0, hints: true, bigText: false, hudScale: 1.0,
};
const Settings = Object.assign({}, DEFAULT_SETTINGS);
try { Object.assign(Settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* corrupted storage: keep defaults */ }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); } catch (e) { /* storage unavailable */ } applySettings(); }
function applySettings() { document.body.classList.toggle('bigtext', !!Settings.bigText); if (typeof Audio_ !== 'undefined') Audio_.applyVolumes(); }
const DIFF = [
  { name: 'Cadet', dmg: 0.5, enemyFire: 0.6, shield: 1.25 },
  { name: 'Pilot', dmg: 1.0, enemyFire: 1.0, shield: 1.0 },
  { name: 'Ace', dmg: 1.5, enemyFire: 1.45, shield: 1.0 },
];
const diff = () => DIFF[Settings.difficulty] || DIFF[1];

// ---------- input ----------
// Controller-first: every keyboard binding maps onto a controller action.
const PAD = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const KEYMAP = {
  fire: ['Space', 'KeyJ'], bomb: ['KeyB', 'KeyK'], loop: ['KeyF', 'KeyI'], bankL: ['KeyQ'], bankR: ['KeyE'],
  boost: ['ShiftLeft', 'ShiftRight'], brake: ['KeyC', 'KeyL'], pause: ['Escape', 'KeyP'], skip: ['Tab'],
  confirm: ['Enter', 'Space', 'NumpadEnter'], back: ['Escape', 'Backspace'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
};
const PADMAP = {
  fire: [PAD.CROSS], bomb: [PAD.SQUARE], loop: [PAD.TRIANGLE], bankL: [PAD.L1], bankR: [PAD.R1],
  boost: [PAD.R2], brake: [PAD.L2, PAD.CIRCLE], pause: [PAD.OPTIONS], skip: [PAD.CREATE, 17],
  confirm: [PAD.CROSS], back: [PAD.CIRCLE],
  up: [PAD.UP], down: [PAD.DOWN], left: [PAD.LEFT], right: [PAD.RIGHT],
};
const Input = {
  keys: new Set(), mouseDown: false,
  device: 'kb', padName: '', padIndex: -1,
  cur: {}, prev: {}, mx: 0, my: 0, rawPadX: 0, rawPadY: 0,
  anyThisFrame: false, idle: 0,
  navRepeat: { up: 0, down: 0, left: 0, right: 0 }, navHeld: { up: false, down: false, left: false, right: false },
  nav: { up: false, down: false, left: false, right: false },
  lastTap: { bankL: -9, bankR: -9 }, doubleTap: { bankL: false, bankR: false },
  init() {
    addEventListener('keydown', e => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.anyThisFrame = true;
      this.keys.add(e.code); this.device = 'kb'; Audio_.unlock();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousedown', () => { this.anyThisFrame = true; this.mouseClickPending = true; Audio_.unlock(); });
    let lmx = 0, lmy = 0;
    addEventListener('mousemove', e => { if (Math.abs(e.clientX - lmx) + Math.abs(e.clientY - lmy) > 30) { this.anyThisFrame = true; lmx = e.clientX; lmy = e.clientY; } });
    addEventListener('touchstart', () => { this.anyThisFrame = true; Audio_.unlock(); }, { passive: true });
    addEventListener('gamepadconnected', e => { this.padIndex = e.gamepad.index; this.padName = e.gamepad.id; this.device = 'pad'; UI.onPadChange(); });
    addEventListener('gamepaddisconnected', () => { this.padIndex = -1; UI.onPadChange(); });
  },
  getPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.padIndex >= 0 && pads[this.padIndex]) return pads[this.padIndex];
    for (const p of pads) if (p && p.connected) { this.padIndex = p.index; this.padName = p.id; return p; }
    return null;
  },
  update(dt, now) {
    this.prev = this.cur; const c = {};
    const pad = this.getPad();
    let px = 0, py = 0;
    const dz = Settings.deadzone;
    if (pad) {
      let ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      const m = Math.hypot(ax, ay);
      if (m < dz) { ax = 0; ay = 0; } else { const s = (m - dz) / (1 - dz) / m; ax *= s; ay *= s; }
      // quick fix for controllers whose axes report inverted: user toggles in Settings
      if (Settings.invertX) ax = -ax;
      if (Settings.invertY) ay = -ay;
      px = clamp(ax, -1, 1); py = clamp(ay, -1, 1);
      const b = i => pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.35);
      for (const k in PADMAP) c[k] = PADMAP[k].some(b);
      if (pad.buttons.some(bt => bt && bt.pressed) || m > 0.5) { Audio_.unlock(); if (this.device !== 'pad') { this.device = 'pad'; UI.onPadChange(); } }
      c.trigBoost = pad.buttons[PAD.R2] ? pad.buttons[PAD.R2].value : 0;
      c.trigBrake = pad.buttons[PAD.L2] ? pad.buttons[PAD.L2].value : 0;
    }
    for (const k in KEYMAP) if (KEYMAP[k].some(code => this.keys.has(code))) c[k] = true;
    let kx = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let ky = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    this.rawPadX = px; this.rawPadY = py;
    this.mx = clamp(px + kx, -1, 1); this.my = clamp(py + ky, -1, 1);
    // menu nav: dpad / keys / stick, with auto repeat
    const stickNav = { up: py < -0.55, down: py > 0.55, left: px < -0.55, right: px > 0.55 };
    for (const d of ['up', 'down', 'left', 'right']) {
      const h = !!c[d] || stickNav[d];
      this.nav[d] = false;
      if (h) {
        if (!this.navHeld[d]) { this.nav[d] = true; this.navRepeat[d] = 0.38; this.navHeld[d] = true; }
        else { this.navRepeat[d] -= dt; if (this.navRepeat[d] <= 0) { this.nav[d] = true; this.navRepeat[d] = 0.11; } }
      } else this.navHeld[d] = false;
    }
    this.cur = c;
    for (const k of ['bankL', 'bankR']) {
      this.doubleTap[k] = false;
      if (this.pressed(k)) { if (now - this.lastTap[k] < 0.32) { this.doubleTap[k] = true; this.lastTap[k] = -9; } else this.lastTap[k] = now; }
    }
    const anyPad = pad && (pad.buttons.some(bt => bt && bt.pressed) || Math.abs(pad.axes[0] || 0) > 0.4 || Math.abs(pad.axes[1] || 0) > 0.4 || Math.abs(pad.axes[2] || 0) > 0.4 || Math.abs(pad.axes[3] || 0) > 0.4);
    let anyNew = this.anyThisFrame;
    for (const k in c) if (c[k] && !this.prev[k]) anyNew = true;
    this.any = anyNew || anyPad || this.keys.size > 0;
    this.anyNew = anyNew;
    this.anyThisFrame = false;
    this.mouseClicked = !!this.mouseClickPending; this.mouseClickPending = false;
    if (this.any) { this.idle = 0; } else this.idle += dt;
  },
  held(k) { return !!this.cur[k]; },
  pressed(k) { return !!this.cur[k] && !this.prev[k]; },
  released(k) { return !this.cur[k] && !!this.prev[k]; },
  rumble(strong, weak, ms) {
    if (!Settings.rumble) return;
    const pad = this.getPad();
    const act = pad && pad.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong, 0, 1), weakMagnitude: clamp(weak, 0, 1) }).catch(() => {});
  },
};
// Button glyphs follow the last used device
const GLYPHS = {
  pad: { fire: '<span class="glyph round x">✕</span>', bomb: '<span class="glyph round sq">□</span>', loop: '<span class="glyph round tri">△</span>', back: '<span class="glyph round o">○</span>', confirm: '<span class="glyph round x">✕</span>', bankL: '<span class="glyph">L1</span>', bankR: '<span class="glyph">R1</span>', boost: '<span class="glyph">R2</span>', brake: '<span class="glyph">L2</span>', pause: '<span class="glyph">OPTIONS</span>', move: '<span class="glyph">L-STICK</span>', nav: '<span class="glyph">D-PAD</span>', change: '<span class="glyph">◀ ▶</span>' },
  kb: { fire: '<span class="glyph">SPACE</span>', bomb: '<span class="glyph">B</span>', loop: '<span class="glyph">F</span>', back: '<span class="glyph">ESC</span>', confirm: '<span class="glyph">ENTER</span>', bankL: '<span class="glyph">Q</span>', bankR: '<span class="glyph">E</span>', boost: '<span class="glyph">SHIFT</span>', brake: '<span class="glyph">C</span>', pause: '<span class="glyph">ESC</span>', move: '<span class="glyph">WASD</span>', nav: '<span class="glyph">↑↓</span>', change: '<span class="glyph">←→</span>' },
};
const G = k => GLYPHS[Input.device === 'pad' ? 'pad' : 'kb'][k] || k;
