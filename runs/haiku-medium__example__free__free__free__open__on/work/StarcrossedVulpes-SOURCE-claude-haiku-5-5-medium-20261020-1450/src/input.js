// One action layer for keyboard and gamepad. Gamepad sticks are corrected here
// (deadzone + invert toggles), so every consumer sees the same axes.
import { settings } from './settings.js';

const KEY_MAP = {
  Space: ['fire', 'confirm'], Enter: ['confirm'],
  KeyB: ['bomb'], KeyQ: ['rollL'], KeyE: ['rollR'],
  ShiftLeft: ['boost'], ShiftRight: ['boost'], KeyC: ['brake'], KeyV: ['camera'],
  Escape: ['pause'], KeyP: ['pause'], Backspace: ['back'],
  ArrowUp: ['up'], KeyW: ['up'], ArrowDown: ['down'], KeyS: ['down'],
  ArrowLeft: ['left'], KeyA: ['left'], ArrowRight: ['right'], KeyD: ['right'],
};
// Standard gamepad mapping (Xbox / PlayStation layouts share these indices).
const PAD_MAP = {
  0: ['fire', 'confirm'], 1: ['back'], 2: ['bomb'], 3: ['camera'],
  4: ['rollL'], 5: ['rollR'], 9: ['pause'],
  12: ['up'], 13: ['down'], 14: ['left'], 15: ['right'],
};
const PAD_TRIGGERS = { 6: 'brake', 7: 'boost' };   // LT / RT, analog
const NAV = new Set(['up', 'down', 'left', 'right']);

const keysDown = new Set();
const kbHeld = new Set();
const padHeld = new Set();
const pressedNow = new Set();
const listeners = new Set();
const anyListeners = new Set();   // fires on any key, button or stick movement
let padAnyPrev = false;
const padPrev = new Map();
const stickLatch = { up: false, down: false, left: false, right: false };
const stickTimer = { up: 0, down: 0, left: 0, right: 0 };

export const input = {
  device: 'kb',                       // last device used: 'kb' | 'pad'
  move: { x: 0, y: 0 },               // flight stick: x right, y up, each -1..1
  padConnected: false,
  down(action) { return kbHeld.has(action) || padHeld.has(action); },
  hit(action) { return pressedNow.has(action); },
  onPress(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  onAny(fn) { anyListeners.add(fn); return () => anyListeners.delete(fn); },
  endFrame() { pressedNow.clear(); },
};

function notifyAny() {
  for (const fn of anyListeners) fn();
}

function emit(action, source) {
  pressedNow.add(action);
  for (const fn of listeners) fn(action, source);
}

function refreshKeyboardHeld() {
  kbHeld.clear();
  for (const code of keysDown) for (const a of KEY_MAP[code] || []) kbHeld.add(a);
}

addEventListener('keydown', (e) => {
  notifyAny();
  const actions = KEY_MAP[e.code];
  if (!actions) return;
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  input.device = 'kb';
  keysDown.add(e.code);
  refreshKeyboardHeld();
  for (const a of actions) {
    if (e.repeat && !NAV.has(a)) continue;   // only menu navigation auto-repeats
    emit(a, 'kb');
  }
});

addEventListener('keyup', (e) => {
  keysDown.delete(e.code);
  refreshKeyboardHeld();
});

addEventListener('blur', () => { keysDown.clear(); refreshKeyboardHeld(); });

function applyDeadzone(x, y, dz) {
  const mag = Math.hypot(x, y);
  if (mag < dz) return [0, 0];
  const scaled = Math.min(1, (mag - dz) / (1 - dz));
  return [(x / mag) * scaled, (y / mag) * scaled];
}

// Call once per frame before consumers read input.
export function pollGamepad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of pads) if (p && p.connected) { gp = p; break; }
  input.padConnected = !!gp;
  padHeld.clear();
  if (!gp) {
    input.move.x = (kbHeld.has('right') ? 1 : 0) - (kbHeld.has('left') ? 1 : 0);
    input.move.y = (kbHeld.has('up') ? 1 : 0) - (kbHeld.has('down') ? 1 : 0);
    return;
  }

  for (const [idx, actions] of Object.entries(PAD_MAP)) {
    const b = gp.buttons[idx];
    const pressed = !!(b && b.pressed);
    if (pressed) for (const a of actions) padHeld.add(a);
    if (pressed && !padPrev.get(idx)) {
      input.device = 'pad';
      for (const a of actions) emit(a, 'pad');
    }
    padPrev.set(idx, pressed);
  }
  let anyNow = false;
  for (const b of gp.buttons) if (b && b.pressed) anyNow = true;
  if (Math.hypot(gp.axes[0] || 0, gp.axes[1] || 0) > settings.deadzone) anyNow = true;
  if (anyNow && !padAnyPrev) notifyAny();
  padAnyPrev = anyNow;

  for (const [idx, action] of Object.entries(PAD_TRIGGERS)) {
    const b = gp.buttons[idx];
    if (b && b.value > 0.25) {
      padHeld.add(action);
      input.device = 'pad';
    }
  }

  // Invert toggles fix the ~10% of pads that report flipped axes.
  let [sx, sy] = applyDeadzone(gp.axes[0] || 0, -(gp.axes[1] || 0), settings.deadzone);
  if (settings.invertX) sx = -sx;
  if (settings.invertY) sy = -sy;

  let kx = (padHeld.has('right') || kbHeld.has('right') ? 1 : 0) - (padHeld.has('left') || kbHeld.has('left') ? 1 : 0);
  let ky = (padHeld.has('up') || kbHeld.has('up') ? 1 : 0) - (padHeld.has('down') || kbHeld.has('down') ? 1 : 0);
  input.move.x = Math.max(-1, Math.min(1, sx + kx));
  input.move.y = Math.max(-1, Math.min(1, sy + ky));

  // Left stick also acts as a d-pad for menus, with key-repeat timing.
  const dirs = { up: sy > 0.6, down: sy < -0.6, left: sx < -0.6, right: sx > 0.6 };
  for (const a of Object.keys(dirs)) {
    if (dirs[a]) {
      if (!stickLatch[a]) {
        stickLatch[a] = true; stickTimer[a] = 0.4; input.device = 'pad'; emit(a, 'stick');
      } else {
        stickTimer[a] -= dt;
        if (stickTimer[a] <= 0) { stickTimer[a] = 0.12; emit(a, 'stick'); }
      }
    } else {
      stickLatch[a] = false;
    }
  }
}
