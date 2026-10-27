// ============================================================================
// STAR LOCKS 64 — core: imports, utilities, settings, input
// ============================================================================
import * as THREE from 'three/webgpu';
import {
  Fn, uniform, vec2, vec3, vec4, float, color, mix, step, smoothstep, sin, cos, fract, floor, abs, max, min, clamp, dot, normalize,
  positionLocal, positionWorld, normalLocal, normalWorld, cameraPosition, uv, time, mx_noise_float, attribute, instanceIndex, length, pow, modelScale
} from 'three/tsl';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import RAPIER from 'rapier';

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const approach = (v, target, rate) => v < target ? Math.min(target, v + rate) : Math.max(target, v - rate);
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const tmpV = new V3(), tmpV2 = new V3(), tmpV3 = new V3(), tmpQ = new Q(), tmpQ2 = new Q(), tmpM = new THREE.Matrix4(), tmpE = new THREE.Euler();
const UP = new V3(0, 1, 0), FWD = new V3(0, 0, -1), RIGHT = new V3(1, 0, 0);

// ---------------------------------------------------------------------------
// Settings (persisted)
// ---------------------------------------------------------------------------
const Settings = {
  data: { invertX: false, invertY: false, pilotY: false, music: 0.6, sfx: 0.8, voice: true, shake: true, difficulty: 1, camera: 0, hudScale: 1, rumble: true },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem('starlocks64.settings') || '{}')); } catch (e) { /* first run */ } },
  save() { try { localStorage.setItem('starlocks64.settings', JSON.stringify(this.data)); } catch (e) { /* private mode */ } },
};
Settings.load();
const SaveData = {
  data: { best: {}, medals: {}, totalPlays: 0 },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem('starlocks64.save') || '{}')); } catch (e) { /* first run */ } },
  save() { try { localStorage.setItem('starlocks64.save', JSON.stringify(this.data)); } catch (e) { /* private mode */ } },
};
SaveData.load();
const DIFF = [
  { name: 'EASY', dmgTaken: 0.6, enemyFire: 0.6, enemyHp: 0.8 },
  { name: 'NORMAL', dmgTaken: 1, enemyFire: 1, enemyHp: 1 },
  { name: 'HARD', dmgTaken: 1.5, enemyFire: 1.5, enemyHp: 1.3 },
];
const diff = () => DIFF[Settings.data.difficulty];

// ---------------------------------------------------------------------------
// Input — every device maps onto one controller-shaped "pad" model
// PS5 standard mapping: 0 Cross 1 Circle 2 Square 3 Triangle 4 L1 5 R1 6 L2 7 R2 8 Create 9 Options 12-15 D-pad
// ---------------------------------------------------------------------------
const BTN = ['fire', 'bomb', 'boost', 'brake', 'l1', 'r1', 'loop', 'uturn', 'pause', 'confirm', 'back', 'up', 'down', 'left', 'right', 'cam', 'any'];
class Pad {
  constructor(id, kind, index) {
    this.id = id; this.kind = kind; this.index = index;
    this.lx = 0; this.ly = 0; this.cur = {}; this.prev = {}; this.repeat = {};
    for (const b of BTN) { this.cur[b] = false; this.prev[b] = false; this.repeat[b] = 0; }
    this.connected = true; this.lastActive = 0;
  }
  down(b) { return this.cur[b]; }
  pressed(b) { return this.cur[b] && !this.prev[b]; }
  released(b) { return !this.cur[b] && this.prev[b]; }
  // menu navigation with auto-repeat
  nav(b, dt) {
    if (this.pressed(b)) { this.repeat[b] = 0.38; return true; }
    if (this.cur[b]) { this.repeat[b] -= dt; if (this.repeat[b] <= 0) { this.repeat[b] = 0.11; return true; } }
    return false;
  }
}

const Input = {
  keys: new Set(), mouseDown: false, pads: new Map(), keyboard: null, lastInputTime: performance.now(), anyEdge: false,
  init() {
    this.keyboard = new Pad('kb', 'keyboard', -1);
    this.pads.set('kb', this.keyboard);
    addEventListener('keydown', e => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
      this.keys.add(e.code); this.touch();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousedown', e => { if (e.button === 0) this.mouseDown = true; this.touch(); });
    addEventListener('mouseup', () => this.mouseDown = false);
    addEventListener('mousemove', () => { this.lastInputTime = performance.now(); });
    addEventListener('gamepadconnected', e => { Game.onPadConnected && Game.onPadConnected(e.gamepad); });
    addEventListener('gamepaddisconnected', e => { const p = this.pads.get('gp' + e.gamepad.index); if (p) p.connected = false; Game.onPadDisconnected && Game.onPadDisconnected(p); });
  },
  touch() { this.lastInputTime = performance.now(); this.anyEdge = true; },
  update() {
    const k = this.keys, kb = this.keyboard;
    kb.prev = { ...kb.cur };
    const kd = (...c) => c.some(x => k.has(x));
    kb.lx = (kd('KeyD', 'ArrowRight') ? 1 : 0) - (kd('KeyA', 'ArrowLeft') ? 1 : 0);
    kb.ly = (kd('KeyS', 'ArrowDown') ? 1 : 0) - (kd('KeyW', 'ArrowUp') ? 1 : 0);
    if (Settings.data.pilotY) kb.ly = -kb.ly;
    Object.assign(kb.cur, {
      fire: kd('Space', 'KeyJ') || this.mouseDown, bomb: kd('KeyK', 'KeyB'), boost: kd('ShiftLeft', 'ShiftRight'), brake: kd('ControlLeft', 'KeyC', 'ControlRight'),
      l1: kd('KeyQ'), r1: kd('KeyE'), loop: kd('KeyF'), uturn: kd('KeyR'), pause: kd('Escape', 'KeyP'), confirm: kd('Enter', 'Space', 'KeyJ'), back: kd('Escape', 'Backspace'),
      up: kd('ArrowUp', 'KeyW'), down: kd('ArrowDown', 'KeyS'), left: kd('ArrowLeft', 'KeyA'), right: kd('ArrowRight', 'KeyD'), cam: kd('KeyV'),
    });
    kb.cur.any = k.size > 0 || this.mouseDown;
    if (kb.cur.any) kb.lastActive = performance.now();
    // gamepads
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (!gp) continue;
      const id = 'gp' + gp.index;
      let p = this.pads.get(id);
      if (!p) { p = new Pad(id, 'gamepad', gp.index); p.name = gp.id; this.pads.set(id, p); }
      p.connected = gp.connected;
      p.prev = { ...p.cur };
      const ax = i => { const v = gp.axes[i] || 0; return Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82; };
      const b = i => { const x = gp.buttons[i]; return !!x && (x.pressed || x.value > 0.4); };
      let lx = ax(0), ly = ax(1);
      if (Settings.data.invertX) lx = -lx;
      if (Settings.data.invertY) ly = -ly;
      if (Settings.data.pilotY) ly = -ly;
      // d-pad also steers
      if (b(14)) lx = -1; if (b(15)) lx = 1; if (b(12)) ly = -1; if (b(13)) ly = 1;
      p.lx = lx; p.ly = ly;
      const rawY = Settings.data.invertY ? -ax(1) : ax(1), rawX = Settings.data.invertX ? -ax(0) : ax(0);
      Object.assign(p.cur, {
        fire: b(0), bomb: b(1), uturn: b(2), loop: b(3), l1: b(4), r1: b(5), brake: b(6), boost: b(7), cam: b(8), pause: b(9),
        confirm: b(0), back: b(1),
        up: b(12) || rawY < -0.55, down: b(13) || rawY > 0.55, left: b(14) || rawX < -0.55, right: b(15) || rawX > 0.55,
      });
      p.cur.any = gp.buttons.some(x => x && x.pressed) || gp.axes.some(a => Math.abs(a) > 0.5);
      if (p.cur.any) { p.lastActive = performance.now(); if (!p.prev.any) this.touch(); }
    }
  },
  endFrame() { this.anyEdge = false; },
  // aggregate of every device — for single-player and menus
  anyPressed(b) { for (const p of this.pads.values()) if (p.connected && p.pressed(b)) return true; return false; },
  anyNav(b, dt) { let r = false; for (const p of this.pads.values()) if (p.connected && p.nav(b, dt)) r = true; return r; },
  gamepadCount() { let n = 0; for (const p of this.pads.values()) if (p.kind === 'gamepad' && p.connected) n++; return n; },
  rumble(pad, strong = 0.5, weak = 0.5, ms = 150) {
    if (!Settings.data.rumble || !pad) return;
    const list = pad === 'all' ? [...this.pads.values()] : [pad];
    for (const p of list) {
      if (p.kind !== 'gamepad') continue;
      const gp = navigator.getGamepads()[p.index];
      const act = gp && gp.vibrationActuator;
      if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    }
  },
};

// Merged pad: reads from all devices (single-player / attract exit)
class MergedPad extends Pad {
  constructor() { super('merged', 'merged', -2); }
  sync() {
    this.prev = { ...this.cur };
    let lx = 0, ly = 0;
    for (const b of BTN) this.cur[b] = false;
    for (const p of Input.pads.values()) {
      if (!p.connected) continue;
      if (Math.abs(p.lx) > Math.abs(lx)) lx = p.lx;
      if (Math.abs(p.ly) > Math.abs(ly)) ly = p.ly;
      for (const b of BTN) if (p.cur[b]) this.cur[b] = true;
    }
    this.lx = lx; this.ly = ly;
  }
}
// Pad used by AI pilots (attract mode / CPU)
class AIPad extends Pad {
  constructor() { super('ai', 'ai', -3); }
  set(state) { this.prev = { ...this.cur }; for (const b of BTN) this.cur[b] = !!state[b]; this.lx = state.lx || 0; this.ly = state.ly || 0; }
}
