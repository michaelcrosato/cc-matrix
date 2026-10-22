// Unified controller-first input: gamepad (standard mapping, PS5 layout primary) + keyboard/mouse mapped onto it.
import { settings } from './settings.js';

const ACTIONS = ['fire', 'bomb', 'boost', 'brake', 'bankL', 'bankR', 'loop', 'pause', 'confirm', 'back', 'up', 'down', 'left', 'right', 'tabL', 'tabR'];

const KEYMAP = {
  fire: ['Space', 'KeyJ'],
  bomb: ['KeyK', 'KeyB'],
  boost: ['ShiftLeft', 'ShiftRight', 'KeyI'],
  brake: ['ControlLeft', 'ControlRight', 'KeyC', 'KeyU'],
  bankL: ['KeyQ'],
  bankR: ['KeyE'],
  loop: ['KeyR', 'KeyL'],
  pause: ['Escape', 'KeyP', 'Tab'],
  confirm: ['Enter', 'Space', 'NumpadEnter'],
  back: ['Escape', 'Backspace'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  tabL: ['KeyQ', 'PageUp'],
  tabR: ['KeyE', 'PageDown'],
};
// Standard gamepad mapping indices
const PADMAP = {
  fire: [0], bomb: [2], boost: [7], brake: [6], bankL: [4], bankR: [5], loop: [3],
  pause: [9], confirm: [0], back: [1], up: [12], down: [13], left: [14], right: [15], tabL: [4], tabR: [5],
};

export class Input {
  constructor() {
    this.keys = new Set();
    this.down = {}; this.prev = {}; this.pressed = {}; this.released = {};
    for (const a of ACTIONS) { this.down[a] = false; this.prev[a] = false; this.pressed[a] = false; this.released[a] = false; }
    this.lx = 0; this.ly = 0;          // steering, +x right, +y up (stick pushed forward)
    this.boostAxis = 0; this.brakeAxis = 0;
    this.lastInput = performance.now();
    this.device = 'kb';               // 'ps' | 'xbox' | 'kb'
    this.padIndex = -1;
    this.padConnected = false;
    this.mouseFire = false; this.mouseBomb = false;
    this.anyPressed = false;
    this.lastTap = { bankL: -1, bankR: -1 };
    this.rollEvent = 0;               // -1 left, 1 right, 0 none (consumed per frame)
    this.navRepeat = { t: 0, dir: null };
    this.nav = { up: false, down: false, left: false, right: false };
    this.listeners = [];

    addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!e.repeat) this.keys.add(e.code);
      this.device = 'kb'; this.touch();
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); });
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', () => this.touch());
    addEventListener('mousedown', (e) => {
      this.touch();
      if (e.target && e.target.closest && e.target.closest('.ui-clickable')) return;
      if (e.button === 0) this.mouseFire = true;
      if (e.button === 2) this.mouseBomb = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseFire = false; if (e.button === 2) this.mouseBomb = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('gamepadconnected', (e) => { this.padConnected = true; this.padIndex = e.gamepad.index; this.device = this.detectPad(e.gamepad); this.touch(); this.emit('pad', true); });
    addEventListener('gamepaddisconnected', () => { this.padConnected = this.getPad() != null; this.emit('pad', this.padConnected); });
  }
  on(fn) { this.listeners.push(fn); }
  emit(type, v) { for (const f of this.listeners) f(type, v); }
  touch() { this.lastInput = performance.now(); }
  idleSeconds() { return (performance.now() - this.lastInput) / 1000; }
  detectPad(p) {
    const id = (p.id || '').toLowerCase();
    if (id.includes('054c') || id.includes('dualsense') || id.includes('dualshock') || id.includes('wireless controller') || id.includes('playstation')) return 'ps';
    return 'xbox';
  }
  getPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.padIndex >= 0 && pads[this.padIndex]) return pads[this.padIndex];
    for (const p of pads) if (p && p.connected) { this.padIndex = p.index; return p; }
    return null;
  }
  update(dt) {
    const pad = this.getPad();
    this.padConnected = !!pad;
    let ax = 0, ay = 0, padButtons = null, boostA = 0, brakeA = 0;
    if (pad) {
      const dz = settings.deadzone;
      let x = pad.axes[0] || 0, y = -(pad.axes[1] || 0);
      const m = Math.hypot(x, y);
      if (m < dz) { x = 0; y = 0; } else { const s = Math.min(1, (m - dz) / (1 - dz)) / m; x *= s; y *= s; }
      if (settings.invertPadX) x = -x;
      if (settings.invertPadY) y = -y;
      ax = x; ay = y;
      padButtons = pad.buttons;
      boostA = pad.buttons[7] ? pad.buttons[7].value : 0;
      brakeA = pad.buttons[6] ? pad.buttons[6].value : 0;
      let active = Math.abs(x) > 0.25 || Math.abs(y) > 0.25;
      for (const b of pad.buttons) if (b && b.pressed) { active = true; break; }
      if (active) { this.touch(); this.device = this.detectPad(pad); }
    }
    // keyboard axes
    let kx = 0, ky = 0;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) kx -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) kx += 1;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) ky += 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) ky -= 1;
    if (kx || ky) { const m = Math.hypot(kx, ky); kx /= m; ky /= m; }
    // keyboard steering eases in so it feels analog
    const kr = 1 - Math.exp(-dt * 10);
    this._kx = (this._kx || 0) + (kx - (this._kx || 0)) * kr;
    this._ky = (this._ky || 0) + (ky - (this._ky || 0)) * kr;
    this.lx = Math.abs(ax) > Math.abs(this._kx) ? ax : this._kx;
    this.ly = Math.abs(ay) > Math.abs(this._ky) ? ay : this._ky;

    this.anyPressed = false;
    for (const a of ACTIONS) {
      let d = false;
      for (const k of KEYMAP[a]) if (this.keys.has(k)) { d = true; break; }
      if (!d && padButtons) for (const i of PADMAP[a]) if (padButtons[i] && padButtons[i].pressed) { d = true; break; }
      if (a === 'fire' && this.mouseFire) d = true;
      if (a === 'bomb' && this.mouseBomb) d = true;
      this.prev[a] = this.down[a];
      this.down[a] = d;
      this.pressed[a] = d && !this.prev[a];
      this.released[a] = !d && this.prev[a];
      if (this.pressed[a]) this.anyPressed = true;
    }
    this.boostAxis = Math.max(boostA, this.down.boost ? 1 : 0);
    this.brakeAxis = Math.max(brakeA, this.down.brake ? 1 : 0);
    // stick-driven menu navigation with repeat
    const sx = pad ? ax : 0, sy = pad ? ay : 0;
    const dirs = {
      up: this.down.up || sy > 0.55, down: this.down.down || sy < -0.55,
      left: this.down.left || sx < -0.55, right: this.down.right || sx > 0.55,
    };
    for (const k in this.nav) this.nav[k] = false;
    const held = Object.keys(dirs).find((k) => dirs[k]) || null;
    if (held !== this.navRepeat.dir) { this.navRepeat.dir = held; this.navRepeat.t = 0.38; if (held) this.nav[held] = true; }
    else if (held) { this.navRepeat.t -= dt; if (this.navRepeat.t <= 0) { this.navRepeat.t = 0.11; this.nav[held] = true; } }
    if (held) this.anyPressed = this.anyPressed || this.nav[held];
    // double-tap bank -> barrel roll
    this.rollEvent = 0;
    const now = performance.now() / 1000;
    for (const [a, dir] of [['bankL', -1], ['bankR', 1]]) {
      if (this.pressed[a]) {
        if (now - this.lastTap[a] < 0.3) { this.rollEvent = dir; this.lastTap[a] = -1; }
        else this.lastTap[a] = now;
      }
    }
  }
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (!settings.vibration) return;
    const p = this.getPad();
    if (p && p.vibrationActuator && p.vibrationActuator.playEffect) {
      p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    }
  }
}

// Button glyphs per device family
export const GLYPHS = {
  ps:   { fire: '✕', confirm: '✕', back: '◯', bomb: '□', loop: '△', boost: 'R2', brake: 'L2', bankL: 'L1', bankR: 'R1', pause: 'OPTIONS', stick: 'L-Stick', tabs: 'L1/R1' },
  xbox: { fire: 'A', confirm: 'A', back: 'B', bomb: 'X', loop: 'Y', boost: 'RT', brake: 'LT', bankL: 'LB', bankR: 'RB', pause: 'MENU', stick: 'L-Stick', tabs: 'LB/RB' },
  kb:   { fire: 'Space', confirm: 'Enter', back: 'Esc', bomb: 'K', loop: 'R', boost: 'Shift', brake: 'Ctrl', bankL: 'Q', bankR: 'E', pause: 'Esc', stick: 'WASD', tabs: 'Q/E' },
};
