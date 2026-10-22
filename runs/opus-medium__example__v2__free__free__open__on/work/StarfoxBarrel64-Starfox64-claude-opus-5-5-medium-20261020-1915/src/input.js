// Unified controller-first input. Gamepad (PS5 standard mapping) is primary;
// keyboard + mouse map onto the same virtual controller.
import { settings } from './config.js';

const BTN = ['fire', 'bomb', 'boost', 'brake', 'rollL', 'rollR', 'loop', 'uturn', 'pause',
  'confirm', 'back', 'up', 'down', 'left', 'right', 'tabL', 'tabR'];

// standard gamepad indices
const PAD_MAP = {
  fire: [0], bomb: [2], boost: [7], brake: [6], rollL: [4], rollR: [5], loop: [3], uturn: [1],
  pause: [9], confirm: [0], back: [1], up: [12], down: [13], left: [14], right: [15], tabL: [4], tabR: [5],
};
const KEY_MAP = {
  fire: ['Space', 'KeyJ'], bomb: ['KeyB', 'KeyK'], boost: ['ShiftLeft', 'ShiftRight', 'KeyI'],
  brake: ['KeyC', 'KeyU'], rollL: ['KeyQ'], rollR: ['KeyE'], loop: ['KeyF'], uturn: ['KeyR'],
  pause: ['Escape', 'KeyP'], confirm: ['Enter', 'Space', 'NumpadEnter'], back: ['Escape', 'Backspace'],
  up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
  tabL: ['KeyQ'], tabR: ['KeyE'],
};

class Input {
  constructor() {
    this.keys = new Set();
    this.tapped = new Set(); // keys pressed since the last update (so quick taps are never missed)
    this.mouse = { left: false, right: false };
    this.held = {}; this.prev = {}; this.pressedMap = {};
    BTN.forEach((b) => { this.held[b] = false; this.prev[b] = false; });
    this.lx = 0; this.ly = 0; // gameplay stick, +x right, +y up (after inversion settings)
    this.menuX = 0; this.menuY = 0;
    this.lastInputTime = performance.now();
    this.anyPressed = false;
    this.padIndex = -1;
    this.padName = '';
    this.device = 'keyboard'; // last used: keyboard | gamepad
    this.repeat = {}; // menu repeat timers
    this.onDevice = null;

    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.tapped.add(e.code); this._touch('keyboard'); }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouse.left = this.mouse.right = false; });
    addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('.ui-clickable')) return;
      if (e.button === 0) { this.mouse.left = true; this.tapped.add('Mouse0'); }
      if (e.button === 2) { this.mouse.right = true; this.tapped.add('Mouse2'); }
      this._touch('keyboard');
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', () => { this.lastInputTime = performance.now(); });
    addEventListener('gamepadconnected', (e) => { this.padIndex = e.gamepad.index; this.padName = e.gamepad.id; this._touch('gamepad'); });
    addEventListener('gamepaddisconnected', (e) => { if (e.gamepad.index === this.padIndex) this.padIndex = -1; });
  }
  _touch(dev) {
    this.lastInputTime = performance.now();
    this.anyPressed = true;
    if (dev !== this.device) { this.device = dev; this.onDevice && this.onDevice(dev); }
  }
  getPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (this.padIndex >= 0 && pads[this.padIndex]) return pads[this.padIndex];
    for (const p of pads) if (p && p.connected) { this.padIndex = p.index; this.padName = p.id; return p; }
    return null;
  }
  update(dt) {
    this.anyPressed = false;
    const pad = this.getPad();
    for (const b of BTN) this.prev[b] = this.held[b];
    let ax = 0, ay = 0;
    const cur = {};
    for (const b of BTN) cur[b] = KEY_MAP[b].some((k) => this.keys.has(k) || this.tapped.has(k));
    const tappedNow = this.tapped; this.tapped = new Set();
    const kHas = (k) => this.keys.has(k) || tappedNow.has(k);
    if (this.mouse.left || tappedNow.has('Mouse0')) cur.fire = true;
    if (this.mouse.right || tappedNow.has('Mouse2')) cur.bomb = true;
    let kx = (kHas('KeyD') || kHas('ArrowRight') ? 1 : 0) - (kHas('KeyA') || kHas('ArrowLeft') ? 1 : 0);
    let ky = (kHas('KeyW') || kHas('ArrowUp') ? 1 : 0) - (kHas('KeyS') || kHas('ArrowDown') ? 1 : 0);
    let padActive = false;
    if (pad) {
      const dz = 0.18;
      let px = pad.axes[0] || 0, py = -(pad.axes[1] || 0);
      const mag = Math.hypot(px, py);
      if (mag < dz) { px = 0; py = 0; } else { const s = (mag - dz) / (1 - dz) / mag; px *= s; py *= s; }
      for (const b of BTN) {
        for (const i of PAD_MAP[b]) {
          const btn = pad.buttons[i];
          if (btn && (btn.pressed || btn.value > 0.35)) { cur[b] = true; }
        }
      }
      // dpad as stick too
      const db = (i) => pad.buttons[i] && pad.buttons[i].pressed;
      if (db(12)) py = 1; if (db(13)) py = -1; if (db(14)) px = -1; if (db(15)) px = 1;
      if (px || py || pad.buttons.some((b) => b && b.pressed)) padActive = true;
      ax = px; ay = py;
      // menu stick also accepts the stick
      if (py > 0.55) cur.up = true; if (py < -0.55) cur.down = true;
      if (px < -0.55) cur.left = true; if (px > 0.55) cur.right = true;
      this.padTriggers = { l2: pad.buttons[6] ? pad.buttons[6].value : 0, r2: pad.buttons[7] ? pad.buttons[7].value : 0 };
    }
    if (padActive) this._touch('gamepad');
    // keyboard contributes if larger
    if (Math.abs(kx) > Math.abs(ax)) ax = kx;
    if (Math.abs(ky) > Math.abs(ay)) ay = ky;
    if (settings.invertX) ax = -ax;
    if (settings.invertY) ay = -ay;
    this.lx = ax; this.ly = ay;
    for (const b of BTN) {
      this.held[b] = cur[b];
      if (cur[b] && !this.prev[b]) this.anyPressed = true;
    }
    if (this.anyPressed) this.lastInputTime = performance.now();
    // menu repeat
    this.nav = { up: false, down: false, left: false, right: false };
    for (const d of ['up', 'down', 'left', 'right']) {
      if (this.held[d]) {
        if (!this.prev[d]) { this.nav[d] = true; this.repeat[d] = 0.38; }
        else { this.repeat[d] -= dt; if (this.repeat[d] <= 0) { this.nav[d] = true; this.repeat[d] = 0.11; } }
      }
    }
  }
  pressed(b) { return this.held[b] && !this.prev[b]; }
  released(b) { return !this.held[b] && this.prev[b]; }
  down(b) { return this.held[b]; }
  // swallow current presses (used on state transitions)
  consume() { for (const b of BTN) this.prev[b] = this.held[b]; this.anyPressed = false; this.nav = { up: false, down: false, left: false, right: false }; }
  idleSeconds() { return (performance.now() - this.lastInputTime) / 1000; }
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (!settings.rumble) return;
    const pad = this.getPad();
    const act = pad && pad.vibrationActuator;
    if (act && act.playEffect) {
      act.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {});
    }
  }
}

export const input = new Input();
