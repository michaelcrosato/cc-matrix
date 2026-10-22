// Unified input: Gamepad API (PS5 "standard" mapping) + keyboard.
// Both feed the same logical actions. Stick values are up-positive and
// already inverted/dead-zoned according to Settings.
import { settings } from './settings.js';

const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  confirm: ['Enter', 'Space', 'KeyJ'],
  back: ['Escape', 'Backspace', 'KeyX'],
  pause: ['Escape', 'KeyP'],
  fire: ['Space', 'KeyJ'],
  missile: ['KeyK', 'KeyL'],
  roll: ['KeyQ', 'KeyE'],
  boost: ['ShiftLeft', 'ShiftRight'],
  brake: ['ControlLeft', 'ControlRight'],
  bomb: ['KeyB', 'KeyN'],
};

// PS5 standard mapping: 0 Cross, 1 Circle, 2 Square, 3 Triangle, 4 L1, 5 R1,
// 6 L2, 7 R2, 9 Options, 12-15 D-pad.
const PADS = {
  confirm: [0],
  back: [1],
  pause: [9],
  fire: [0, 7],
  missile: [2, 5],
  roll: [1],
  boost: [6],
  brake: [4],
  bomb: [3],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};

const ACTIONS = Object.keys(KEYS);
const keysDown = new Set();
// Keys pressed since the last update. Taps shorter than a frame still register.
let keysPressed = new Set();
let prevHeld = new Set();
let held = new Set();
let tapped = new Set();
let padConnected = false;

export const input = {
  stick: { x: 0, y: 0 },   // flight/menu stick, up-positive, dead-zoned, inverted per settings
  lastDevice: 'kb',        // 'kb' or 'pad', drives button prompts
  activity: false,         // any input this frame (used to leave attract mode)

  held(action) {
    return held.has(action);
  },
  tapped(action) {
    return tapped.has(action);
  },
  padConnected() {
    return padConnected;
  },
  update() {
    const pad = firstPad();
    padConnected = !!pad;
    prevHeld = held;
    held = new Set();

    for (const a of ACTIONS) {
      if (KEYS[a].some((k) => keysDown.has(k) || keysPressed.has(k))) held.add(a);
    }
    keysPressed = new Set();
    let padAny = false;
    let ax = 0;
    let ay = 0;
    if (pad) {
      const dz = settings.deadzone;
      const rx = applyDeadzone(pad.axes[0] ?? 0, dz);
      const ry = applyDeadzone(pad.axes[1] ?? 0, dz);
      ax = rx;
      ay = -ry; // gamepad +y is down; game uses up-positive
      for (const [a, idx] of Object.entries(PADS)) {
        if (idx.some((i) => pad.buttons[i]?.pressed)) {
          held.add(a);
          padAny = true;
        }
      }
      if (rx || ry) padAny = true;
      // Left stick also drives menu navigation edges.
      if (ay > 0.6) held.add('up');
      if (ay < -0.6) held.add('down');
      if (ax < -0.6) held.add('left');
      if (ax > 0.6) held.add('right');
    }
    if (settings.invertX) ax = -ax;
    if (settings.invertY) ay = -ay;

    // Keyboard arrows/WASD act as a digital stick, added to the pad stick.
    const kbHeld = (name) => KEYS[name].some((k) => keysDown.has(k));
    const kx = (kbHeld('right') ? 1 : 0) - (kbHeld('left') ? 1 : 0);
    const ky = (kbHeld('up') ? 1 : 0) - (kbHeld('down') ? 1 : 0);
    if (kx || ky) {
      ax += kx;
      ay += ky;
    }
    const mag = Math.hypot(ax, ay);
    const scale = mag > 1 ? 1 / mag : 1;
    this.stick.x = ax * scale;
    this.stick.y = ay * scale;

    tapped = new Set();
    for (const a of held) if (!prevHeld.has(a)) tapped.add(a);
    this.activity = tapped.size > 0 || padAny || keysDown.size > 0 || Math.abs(ax) + Math.abs(ay) > 0.3;
    if (padAny) this.lastDevice = 'pad';
    else if (keysDown.size) this.lastDevice = 'kb';
  },
};

function applyDeadzone(v, dz) {
  if (Math.abs(v) < dz) return 0;
  const s = (Math.abs(v) - dz) / (1 - dz);
  return Math.sign(v) * s;
}

function firstPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (ACTIONS.some((a) => KEYS[a].includes(e.code))) {
    e.preventDefault();
  }
  keysDown.add(e.code);
  keysPressed.add(e.code);
  // Let the audio context start from the first real gesture.
  window.dispatchEvent(new CustomEvent('starfock-gesture'));
});
window.addEventListener('keyup', (e) => keysDown.delete(e.code));
window.addEventListener('blur', () => keysDown.clear());
window.addEventListener('gamepadconnected', () => {
  padConnected = true;
  window.dispatchEvent(new CustomEvent('starfock-gamepad', { detail: true }));
});
window.addEventListener('gamepaddisconnected', () => {
  window.dispatchEvent(new CustomEvent('starfock-gamepad', { detail: false }));
});
window.addEventListener('pointerdown', () => window.dispatchEvent(new CustomEvent('starfock-gesture')));
