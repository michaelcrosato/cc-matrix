// Unified input: Gamepad API (standard mapping) + keyboard, exposed as actions.
// The controller is the primary device; the keyboard maps onto the same actions.
import { settings } from './settings.js';

// Standard-mapping button indices (PS5 layout: 0 Cross, 1 Circle, 2 Square, 3 Triangle).
const PAD = {
  confirm: [0],
  back: [1],
  fire: [7, 2],
  bomb: [1, 3],
  boost: [0],
  rollLeft: [4],
  rollRight: [5],
  pause: [9],
  dpadUp: [12],
  dpadDown: [13],
  dpadLeft: [14],
  dpadRight: [15],
};

const KEYS = {
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
  fire: ['Space', 'KeyZ'],
  bomb: ['KeyX', 'KeyB'],
  boost: ['ShiftLeft', 'ShiftRight'],
  rollLeft: ['KeyQ'],
  rollRight: ['KeyE'],
  pause: ['Escape', 'KeyP'],
  dpadUp: ['ArrowUp', 'KeyW'],
  dpadDown: ['ArrowDown', 'KeyS'],
  dpadLeft: ['ArrowLeft', 'KeyA'],
  dpadRight: ['ArrowRight', 'KeyD'],
};

// Brake is analog on L2 (button 6) or held Control.
const BRAKE_KEYS = ['ControlLeft', 'ControlRight'];
const BRAKE_TRIGGER = 0.35;

const NAV_FIRST = 0.42;
const NAV_REPEAT = 0.11;
const NAV_THRESHOLD = 0.55;
const ACTIONS = Object.keys(PAD);

export class Input {
  constructor() {
    this.keys = new Set();
    this.keyPressed = new Set(); // key codes that went down since the last update
    this.padNow = new Array(17).fill(false);
    this.padPrev = new Array(17).fill(false);
    this.padAxes = [0, 0, 0, 0];
    this.trigger = { l: 0, r: 0 };
    this.padPresent = false;
    this.lastDevice = 'keyboard';
    this.onDevice = null;
    this.everKey = false; // a physical key has been pressed (used by the touch-only gate)
    this.edges = new Set(); // actions that started this frame
    this.anyEdge = false;
    this.navDir = { x: 0, y: 0 };
    this.navHeld = { x: 0, y: 0 };
    this.navTimer = { x: 0, y: 0 };
    this.navOut = { x: 0, y: 0 };
    this.flightOut = { x: 0, y: 0 };

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.everKey = true;
      if (!this.keys.has(e.code)) this.keyPressed.add(e.code);
      this.keys.add(e.code);
      this.noteDevice('keyboard');
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('gamepadconnected', () => this.noteDevice('pad'));
    window.addEventListener('gamepaddisconnected', () => this.noteDevice('keyboard'));
  }

  noteDevice(kind) {
    if (this.lastDevice !== kind) {
      this.lastDevice = kind;
      if (this.onDevice) this.onDevice(kind);
    }
  }

  // Call once per frame before reading actions.
  update(dt) {
    this.readPad();
    this.edges.clear();
    for (const a of ACTIONS) {
      const padEdge = (PAD[a] || []).some((i) => this.padNow[i] && !this.padPrev[i]);
      const keyEdge = (KEYS[a] || []).some((k) => this.keyPressed.has(k));
      if (padEdge || keyEdge) this.edges.add(a);
    }
    this.anyEdge = this.edges.size > 0 || this.keyPressed.size > 0;
    this.keyPressed.clear();
    this.updateNav(dt);
  }

  readPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => p && p.connected);
    this.padPresent = !!pad;
    this.padPrev = this.padNow;
    this.padNow = new Array(17).fill(false);
    this.padAxes = [0, 0, 0, 0];
    this.trigger = { l: 0, r: 0 };
    if (!pad) return;
    pad.buttons.forEach((b, i) => {
      if (i < 17) this.padNow[i] = b.pressed || b.value > 0.5;
    });
    this.padAxes = [pad.axes[0] || 0, pad.axes[1] || 0, pad.axes[2] || 0, pad.axes[3] || 0];
    this.trigger = { l: pad.buttons[6]?.value || 0, r: pad.buttons[7]?.value || 0 };
    if (this.padNow.some(Boolean) || Math.abs(this.padAxes[0]) > 0.5 || Math.abs(this.padAxes[1]) > 0.5) {
      this.noteDevice('pad');
    }
  }

  pressed(action) {
    return this.edges.has(action);
  }

  held(action) {
    if (action === 'brake') {
      return this.trigger.l > BRAKE_TRIGGER || BRAKE_KEYS.some((k) => this.keys.has(k));
    }
    return (PAD[action] || []).some((i) => this.padNow[i]) || (KEYS[action] || []).some((k) => this.keys.has(k));
  }

  // Flight stick in [-1, 1]: deadzone, sensitivity and axis inversion applied, keyboard added.
  flight() {
    const dz = settings.deadzone;
    const shape = (v) => (Math.abs(v) < dz ? 0 : (v - Math.sign(v) * dz) / (1 - dz));
    let x = shape(this.padAxes[0]) * settings.sensitivity;
    let y = shape(-this.padAxes[1]) * settings.sensitivity;
    if (settings.invertX) x = -x;
    if (settings.invertY) y = -y;
    const kx = (this.held('dpadRight') ? 1 : 0) - (this.held('dpadLeft') ? 1 : 0);
    const ky = (this.held('dpadUp') ? 1 : 0) - (this.held('dpadDown') ? 1 : 0);
    this.flightOut.x = Math.max(-1, Math.min(1, x + kx));
    this.flightOut.y = Math.max(-1, Math.min(1, y + ky));
    return this.flightOut;
  }

  // Menu navigation with key repeat. The left stick follows the same inversion as flight.
  updateNav(dt) {
    let sx = this.padAxes[0];
    let sy = -this.padAxes[1];
    if (settings.invertX) sx = -sx;
    if (settings.invertY) sy = -sy;
    const stickX = Math.abs(sx) > NAV_THRESHOLD ? Math.sign(sx) : 0;
    const stickY = Math.abs(sy) > NAV_THRESHOLD ? Math.sign(sy) : 0;
    const keyX = (this.held('dpadRight') ? 1 : 0) - (this.held('dpadLeft') ? 1 : 0);
    const keyY = (this.held('dpadUp') ? 1 : 0) - (this.held('dpadDown') ? 1 : 0);
    this.navDir.x = keyX || stickX;
    this.navDir.y = keyY || stickY;
    this.navOut.x = 0;
    this.navOut.y = 0;
    for (const axis of ['x', 'y']) {
      const d = this.navDir[axis];
      if (d === 0) {
        this.navHeld[axis] = 0;
        this.navTimer[axis] = 0;
      } else if (this.navHeld[axis] !== d) {
        this.navHeld[axis] = d;
        this.navTimer[axis] = NAV_FIRST;
        this.navOut[axis] = d;
      } else {
        this.navTimer[axis] -= dt;
        if (this.navTimer[axis] <= 0) {
          this.navTimer[axis] = NAV_REPEAT;
          this.navOut[axis] = d;
        }
      }
    }
  }

  // Vertical/horizontal menu steps this frame, each -1, 0 or 1.
  nav() {
    return this.navOut;
  }

  // True when any button, key or stick deflection starts this frame (attract exit).
  anyInput() {
    return this.anyEdge || this.navOut.x !== 0 || this.navOut.y !== 0;
  }

  // Rumble when the pad supports it. Silent no-op otherwise.
  rumble(strength = 0.5, ms = 120) {
    if (!settings.shake) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => p && p.connected);
    if (!pad || !pad.vibrationActuator) return;
    pad.vibrationActuator
      .playEffect('dual-rumble', { startDelay: 0, duration: ms, weakMagnitude: strength * 0.6, strongMagnitude: strength })
      .catch(() => {});
  }
}
