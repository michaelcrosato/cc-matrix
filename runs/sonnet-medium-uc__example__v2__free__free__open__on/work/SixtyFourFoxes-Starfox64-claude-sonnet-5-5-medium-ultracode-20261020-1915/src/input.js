// Unified controller-first input. Keyboard/mouse emulate the DualSense model.
import { settings } from './settings.js';
import { clamp } from './util.js';

const KEYMAP = {
  fire: ['Space', 'KeyJ'], lock: ['KeyL', 'KeyC'], bomb: ['KeyK', 'KeyB'], rollL: ['KeyQ'], rollR: ['KeyE'],
  boost: ['ShiftLeft', 'ShiftRight'], brake: ['KeyX', 'ControlLeft'], somer: ['KeyF'], uturn: ['KeyR'],
  pause: ['Escape', 'KeyP'], confirm: ['Enter', 'Space', 'KeyJ'], back: ['Escape', 'Backspace', 'KeyK'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
  tabL: ['KeyQ', 'PageUp'], tabR: ['KeyE', 'PageDown'], skip: ['Tab', 'KeyT'],
};
// DualSense standard mapping
const PAD = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, create: 8, options: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 };

class InputSystem {
  constructor() {
    this.keys = new Set();
    this.prevKeys = new Set();
    this.mouse = { x: 0, y: 0, active: false, left: false, right: false, pl: false, pr: false, moved: 0 };
    this.device = 'kb';
    this.activity = false;
    this.padConnected = false;
    this.padName = '';
    this.state = this.blank();
    this.prevBtn = {};
    this.rollTap = { L: -9, R: -9 };
    this.navTimer = 0; this.navHeld = false;
    this.listeners = [];
    this.rumbleCooldown = 0;
    this.anyKeySeen = false;
    this.override = null; // AI / attract control
    addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!e.repeat) { this.keys.add(e.code); this.device = 'kb'; this.activity = true; this.anyKeySeen = true; this.justPressed.add(e.code); }
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX / innerWidth * 2 - 1; this.mouse.y = -(e.clientY / innerHeight * 2 - 1);
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) { this.mouse.moved = performance.now(); this.activity = true; if (this.device !== 'pad') this.device = 'kb'; }
      this.mouse.active = true;
    });
    addEventListener('mousedown', (e) => { if (e.button === 0) this.mouse.left = true; if (e.button === 2) this.mouse.right = true; this.activity = true; this.device = 'kb'; });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.left = false; if (e.button === 2) this.mouse.right = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('gamepadconnected', (e) => { this.padConnected = true; this.padName = e.gamepad.id; });
    addEventListener('gamepaddisconnected', () => { this.padConnected = !!this.getPad(); });
    this.justPressed = new Set();
  }
  blank() {
    return { mx: 0, my: 0, ax: 0, ay: 0, fire: false, firePressed: false, fireReleased: false, bomb: false, rollL: false, rollR: false,
      tiltL: false, tiltR: false, lock: false, boost: false, brake: false, somer: false, uturn: false, pause: false,
      confirm: false, back: false, navX: 0, navY: 0, tabL: false, tabR: false, skip: false, any: false, rawX: 0, rawY: 0 };
  }
  getPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }
  keyHeld(a) { return KEYMAP[a].some((k) => this.keys.has(k)); }
  keyPressed(a) { return KEYMAP[a].some((k) => this.justPressed.has(k)); }
  // Poll once per frame (call before consumers).
  poll(dt, now) {
    const s = this.blank();
    const pad = this.getPad();
    this.padConnected = !!pad;
    const dz = settings.deadzone;
    const pressedPad = {};
    let lx = 0, ly = 0, rx = 0, ry = 0, btn = {};
    if (pad) {
      this.padName = pad.id;
      const ax = pad.axes;
      lx = ax[0] || 0; ly = -(ax[1] || 0); rx = ax[2] || 0; ry = -(ax[3] || 0);
      const b = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
      for (const k in PAD) btn[k] = b(PAD[k]);
      btn.l2 = btn.l2 || (pad.buttons[6] && pad.buttons[6].value > 0.4);
      btn.r2 = btn.r2 || (pad.buttons[7] && pad.buttons[7].value > 0.4);
      for (const k in btn) { pressedPad[k] = btn[k] && !this.prevBtn[k]; }
      this.prevBtn = btn;
      const mag = (x, y) => Math.hypot(x, y);
      if (mag(lx, ly) > 0.5 || mag(rx, ry) > 0.5 || Object.values(pressedPad).some(Boolean)) { this.device = 'pad'; this.activity = true; }
    }
    const dead = (x, y) => {
      const m = Math.hypot(x, y);
      if (m < dz) return [0, 0];
      const k = (m - dz) / (1 - dz) / m;
      return [x * k, y * k];
    };
    [lx, ly] = dead(lx, ly); [rx, ry] = dead(rx, ry);
    // The known gamepad bug: intermittent inverted axes. Settings toggles correct it.
    const ih = settings.invertH ? -1 : 1, iv = settings.invertV ? -1 : 1;
    lx *= ih; rx *= ih; ly *= iv; ry *= iv;
    const dpx = (btn.right ? 1 : 0) - (btn.left ? 1 : 0), dpy = (btn.up ? 1 : 0) - (btn.down ? 1 : 0);
    const kx = (this.keyHeld('right') ? 1 : 0) - (this.keyHeld('left') ? 1 : 0);
    const ky = (this.keyHeld('up') ? 1 : 0) - (this.keyHeld('down') ? 1 : 0);
    let mx = lx + kx, my = ly + ky;
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    s.rawX = mx; s.rawY = my;
    const flight = settings.flightPitch ? -1 : 1;
    s.mx = mx * settings.sensitivity; s.my = my * settings.sensitivity * flight;
    s.mx = clamp(s.mx, -1, 1); s.my = clamp(s.my, -1, 1);
    // aim: right stick, or mouse when recently moved
    let ax = rx, ay = ry;
    if (this.device === 'kb' && now - this.mouse.moved < 4000 && this.mouse.active) { ax = this.mouse.x * 0.9; ay = this.mouse.y * 0.9; }
    s.ax = clamp(ax, -1, 1); s.ay = clamp(ay, -1, 1);
    const fireHeld = btn.cross || this.keyHeld('fire') || this.mouse.left;
    s.fire = !!fireHeld;
    s.firePressed = fireHeld && !this._fire; s.fireReleased = !fireHeld && this._fire; this._fire = fireHeld;
    s.bomb = !!(pressedPad.circle || this.keyPressed('bomb'));
    s.lock = !!(btn.r2 || this.keyHeld('lock') || this.mouse.right);
    // roll: tap L1/R1 -> barrel roll, hold -> tilt
    const l1 = btn.l1 || this.keyHeld('rollL'), r1 = btn.r1 || this.keyHeld('rollR');
    const l1p = pressedPad.l1 || this.keyPressed('rollL'), r1p = pressedPad.r1 || this.keyPressed('rollR');
    s.rollL = !!l1p; s.rollR = !!r1p; s.tiltL = !!l1; s.tiltR = !!r1;
    s.boost = !!(btn.square || this.keyHeld('boost'));
    s.brake = !!(btn.l2 || this.keyHeld('brake'));
    s.somer = this.keyPressed('somer') || !!pressedPad.l3;
    s.uturn = !!(pressedPad.triangle || this.keyPressed('uturn'));
    s.pause = !!(pressedPad.options || pressedPad.create || this.keyPressed('pause'));
    s.confirm = !!(pressedPad.cross || this.keyPressed('confirm'));
    s.back = !!(pressedPad.circle || this.keyPressed('back'));
    s.tabL = !!(pressedPad.l1 || this.keyPressed('tabL')); s.tabR = !!(pressedPad.r1 || this.keyPressed('tabR'));
    s.skip = !!(pressedPad.triangle || this.keyPressed('skip'));
    // menu navigation with repeat
    let nx = dpx || Math.round(lx * 1.2 > 0.6 ? 1 : lx * 1.2 < -0.6 ? -1 : 0), ny = dpy || Math.round(ly * 1.2 > 0.6 ? 1 : ly * 1.2 < -0.6 ? -1 : 0);
    if (!nx) nx = (this.keyPressed('right') ? 1 : 0) - (this.keyPressed('left') ? 1 : 0);
    if (!ny) ny = (this.keyPressed('up') ? 1 : 0) - (this.keyPressed('down') ? 1 : 0);
    const held = nx || ny;
    if (held) {
      if (!this.navHeld) { s.navX = nx; s.navY = ny; this.navTimer = 0.38; }
      else { this.navTimer -= dt; if (this.navTimer <= 0) { s.navX = nx; s.navY = ny; this.navTimer = 0.11; } }
    }
    this.navHeld = !!held;
    s.any = this.activity || s.confirm || s.back || s.pause;
    this.activity = false;
    this.justPressed.clear();
    this.state = this.override ? Object.assign(s, this.override) : s;
    this.real = s;
    if (this.rumbleCooldown > 0) this.rumbleCooldown -= dt;
    return this.state;
  }
  rumble(strong = 0.4, weak = 0.4, ms = 120) {
    if (!settings.rumble || this.rumbleCooldown > 0) return;
    const pad = this.getPad();
    if (!pad || !pad.vibrationActuator) return;
    this.rumbleCooldown = 0.05;
    try { pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }); } catch {}
  }
  // Button glyph text for the current device.
  glyph(action) {
    const pad = this.device === 'pad';
    const G = {
      fire: ['✕', 'Space'], lock: ['R2', 'L'], bomb: ['○', 'K'], boost: ['□', 'Shift'], brake: ['L2', 'X'], rollL: ['L1', 'Q'], rollR: ['R1', 'E'],
      uturn: ['△', 'R'], somer: ['L3', 'F'], pause: ['OPTIONS', 'Esc'], confirm: ['✕', 'Enter'], back: ['○', 'Esc'],
      move: ['L-STICK', 'WASD'], aim: ['R-STICK', 'Mouse'], skip: ['△', 'Tab'], tabs: ['L1/R1', 'Q/E'],
    };
    const g = G[action]; return g ? g[pad ? 0 : 1] : action;
  }
}
export const input = new InputSystem();
