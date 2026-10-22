// Controller-first input. Gamepad (Standard mapping), keyboard and mouse all
// feed the same virtual controls, so every screen works with any device.

import { settings } from './settings.js';

const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['Space', 'KeyJ'],
  lock: ['KeyX'],
  bomb: ['KeyB'],
  boost: ['ShiftLeft', 'ShiftRight'],
  brake: ['ControlLeft', 'ControlRight'],
  rollL: ['KeyQ'],
  rollR: ['KeyE'],
  confirm: ['Enter', 'KeyZ', 'Space'],
  back: ['Escape', 'Backspace'],
  pause: ['Escape', 'KeyP'],
};

// Standard Gamepad mapping. Cross/Circle/Square/Triangle = buttons 0-3.
const PAD = {
  fire: [0, 7],
  confirm: [0],
  bomb: [1],
  back: [1],
  lock: [2],
  boost: [3],
  rollL: [4],
  rollR: [5],
  pause: [9],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
};

const DEADZONE = 0.16;
const MENU_REPEAT_FIRST = 0.4;
const MENU_REPEAT = 0.16;

function radialDeadzone(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEADZONE) return [0, 0];
  const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
  return [x * k, y * k];
}

export class Input {
  constructor() {
    this.keysDown = new Set();
    this.mouseDown = new Set();
    // Taps shorter than a frame are counted here so none are lost, even several in one frame.
    this.taps = new Map();
    this.prev = {};
    this.cur = {};
    this.padConnected = false;
    this.keyboardUsed = false;
    this.mouseUsed = false;
    this.lastActivity = performance.now();
    this.onDevice = null; // callback when a device first becomes active
    this.repeatTimer = 0;
    this.lastMenuDir = null;
    this.flight = {};
    this.menu = {};
    this.any = false;
    this.attachListeners();
  }

  attachListeners() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.taps.set(e.code, (this.taps.get(e.code) || 0) + 1);
      this.keysDown.add(e.code);
      if (!this.keyboardUsed) { this.keyboardUsed = true; this.notifyDevice(); }
    });
    window.addEventListener('keyup', (e) => this.keysDown.delete(e.code));
    window.addEventListener('blur', () => { this.keysDown.clear(); this.mouseDown.clear(); });
    window.addEventListener('mousedown', (e) => {
      this.mouseDown.add(e.button);
      this.taps.set(`mouse${e.button}`, (this.taps.get(`mouse${e.button}`) || 0) + 1);
      if (!this.mouseUsed) { this.mouseUsed = true; this.notifyDevice(); }
    });
    window.addEventListener('mouseup', (e) => this.mouseDown.delete(e.button));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('gamepadconnected', () => { this.padConnected = true; this.notifyDevice(); });
    window.addEventListener('gamepaddisconnected', () => { this.padConnected = this.connectedPads().length > 0; });
  }

  notifyDevice() {
    if (this.onDevice) this.onDevice();
  }

  connectedPads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    return [...pads].filter((p) => p && p.connected);
  }

  // Reads all devices once per frame and produces this.flight / this.menu.
  poll(dt, now) {
    const pads = this.connectedPads();
    if (pads.length) this.padConnected = true;

    let sx = 0;
    let sy = 0;
    const cur = {};
    const held = (name) => cur[name] === true;

    for (const pad of pads) {
      const [ax, ay] = radialDeadzone(pad.axes[0] || 0, -(pad.axes[1] || 0));
      if (Math.hypot(ax, ay) > Math.hypot(sx, sy)) { sx = ax; sy = ay; }
      for (const [name, idxs] of Object.entries(PAD)) {
        if (idxs.some((i) => pad.buttons[i] && pad.buttons[i].pressed)) cur[name] = true;
      }
      if (pad.buttons[6] && pad.buttons[6].value > 0.2) cur.brake = true;
    }
    if (settings.invertX) sx = -sx;
    if (settings.invertY) sy = -sy;

    const taps = this.taps;
    this.taps = new Map();
    const keyOn = (c) => this.keysDown.has(c) || taps.has(c);
    for (const [name, codes] of Object.entries(KEYS)) {
      if (codes.some(keyOn)) cur[name] = true;
    }
    if (keyOn('KeyX') || this.mouseDown.has(2) || taps.has('mouse2')) cur.lock = true;
    if (this.mouseDown.has(0) || taps.has('mouse0')) cur.fire = true;

    const kx = (cur.right ? 1 : 0) - (cur.left ? 1 : 0);
    const ky = (cur.up ? 1 : 0) - (cur.down ? 1 : 0);
    const fx = Math.max(-1, Math.min(1, sx + kx));
    const fy = Math.max(-1, Math.min(1, sy + ky));

    // Edge detection: "pressed" means down this frame but not last frame.
    const pressed = (n) => cur[n] && !this.prev[n];
    const released = (n) => !cur[n] && this.prev[n];

    // Menu navigation with auto-repeat for stick and held d-pad/keys.
    // Each tap moves one step, so several presses in a single frame all count.
    const tapCount = (name) => (KEYS[name] || []).reduce((n, c) => n + (taps.get(c) || 0), 0);
    const navCount = (name) => tapCount(name) || (pressed(name) ? 1 : 0);
    let mdx = navCount('right') - navCount('left');
    let mdy = navCount('down') - navCount('up');
    if (!mdx && !mdy) {
      const stickDir = Math.abs(sx) > 0.55 || Math.abs(sy) > 0.55
        ? `${Math.sign(Math.round(sx))}:${Math.sign(Math.round(-sy))}`
        : null;
      if (stickDir && stickDir !== this.lastMenuDir) {
        this.repeatTimer = MENU_REPEAT_FIRST;
        mdx = Math.sign(Math.round(sx));
        mdy = Math.sign(Math.round(-sy));
      } else if (stickDir) {
        this.repeatTimer -= dt;
        if (this.repeatTimer <= 0) {
          this.repeatTimer = MENU_REPEAT;
          mdx = Math.sign(Math.round(sx));
          mdy = Math.sign(Math.round(-sy));
        }
      }
      this.lastMenuDir = stickDir;
    }

    const activity = Object.values(cur).some(Boolean) || Math.hypot(sx, sy) > 0.35 || mdx !== 0 || mdy !== 0;
    if (activity) this.lastActivity = now;
    this.any = activity;

    this.flight = {
      x: fx,
      y: fy,
      fire: held('fire'),
      lock: held('lock'),
      lockReleased: released('lock'),
      bomb: pressed('bomb'),
      boost: held('boost'),
      brake: held('brake'),
      rollL: pressed('rollL'),
      rollR: pressed('rollR'),
      pause: pressed('pause'),
    };
    this.menu = {
      dx: mdx,
      dy: mdy,
      confirm: pressed('confirm'),
      back: pressed('back'),
      // Stick-only hint used by scrolling text panels.
      scroll: Math.abs(sy) > 0.2 ? sy : 0,
    };

    this.prev = cur;
    this.cur = cur;
  }

  // Idle time since the last input from any device, in seconds.
  idleSeconds(now) {
    return (now - this.lastActivity) / 1000;
  }

  resetIdle(now) {
    this.lastActivity = now;
  }

  // Button glyph label for the chosen glyph style.
  label(action) {
    const table = {
      fire: ['Cross', 'A', 'Space'],
      confirm: ['Cross', 'A', 'Enter'],
      back: ['Circle', 'B', 'Esc'],
      bomb: ['Circle', 'B', 'B'],
      lock: ['Square', 'X', 'X'],
      boost: ['Triangle', 'Y', 'Shift'],
      brake: ['L2', 'LT', 'Ctrl'],
      rollL: ['L1', 'LB', 'Q'],
      rollR: ['R1', 'RB', 'E'],
      pause: ['Options', 'Menu', 'Esc'],
      move: ['Left Stick', 'Left Stick', 'Arrows / WASD'],
    };
    const row = table[action] || [action, action, action];
    const idx = { ps: 0, xbox: 1, keys: 2 }[settings.glyphs] ?? 0;
    return row[idx];
  }

  rumble(strong, weak, ms) {
    if (!settings.rumble) return;
    for (const pad of this.connectedPads()) {
      const act = pad.vibrationActuator;
      if (!act || !act.playEffect) continue;
      act.playEffect('dual-rumble', {
        startDelay: 0,
        duration: ms,
        strongMagnitude: Math.min(1, strong),
        weakMagnitude: Math.min(1, weak),
      }).catch(() => {});
    }
  }
}
