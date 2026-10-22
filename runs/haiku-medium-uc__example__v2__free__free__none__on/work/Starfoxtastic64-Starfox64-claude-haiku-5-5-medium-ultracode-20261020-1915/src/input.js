// Unified input: keyboard and standard-mapped (PS5-style) gamepads feed one set of actions.
// Flight and menus both read the same axes, so the invert toggles fix both.
import { settings } from './settings.js';

const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  fire: ['Space', 'KeyJ', 'KeyZ'],
  bomb: ['KeyK', 'KeyX'],
  boost: ['ShiftLeft', 'ShiftRight'],
  brake: ['ControlLeft', 'ControlRight'],
  rollL: ['KeyQ'],
  rollR: ['KeyE'],
  pause: ['Escape', 'KeyP', 'Enter'],
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
};

// Standard gamepad indices: 0 Cross, 1 Circle, 3 Triangle, 4 L1, 5 R1, 6 L2, 7 R2, 9 Options, 12-15 D-pad.
const PADS = {
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  fire: [0, 7],
  bomb: [1],
  boost: [5],
  brake: [4],
  rollL: [6],
  rollR: [3],
  pause: [9],
  confirm: [0, 9],
  back: [1],
};

const GAME_KEYS = new Set(Object.values(KEYS).flat());
const ACTIONS = Object.keys(KEYS);
const NAV_DIRS = ['up', 'down', 'left', 'right'];
const REPEAT_DELAY = 0.42;
const REPEAT_RATE = 0.12;

function deadzone(v, dz) {
  const a = Math.abs(v);
  if (a < dz) return 0;
  return Math.sign(v) * (a - dz) / (1 - dz);
}

function strongest(...vals) {
  let best = 0;
  for (const v of vals) if (Math.abs(v) > Math.abs(best)) best = v;
  return best;
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.keyEdges = new Set();
    this.pointerEdge = false;
    this.held = {};
    this.edge = {};
    this.prevHeld = {};
    this.ax = 0; // flight/menu horizontal, positive = right, after invert + deadzone
    this.ay = 0; // positive = up
    this.nav = null; // 'up' | 'down' | 'left' | 'right' for this frame (menu auto-repeat included)
    this.navTimer = 0;
    this.navDir = null;
    this.idle = 0;
    this.activeThisFrame = false;
    this.padConnected = false;
    this.pad = null;
    this.pointerCoarse = matchMedia('(pointer: coarse)').matches;
    this.anyFinePointer = matchMedia('(any-pointer: fine)').matches;
    this.touchOnly = this.pointerCoarse && !this.anyFinePointer;

    addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) this.keyEdges.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('pointerdown', () => { this.pointerEdge = true; });
  }

  update(dt) {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    this.pad = pads[0] || null;
    this.padConnected = pads.length > 0;
    const pad = this.pad;
    const padBtn = (i) => !!(pad && pad.buttons[i] && pad.buttons[i].pressed);

    // Held state per action, from keyboard, D-pad and buttons.
    for (const action of ACTIONS) {
      const down = KEYS[action].some((k) => this.keys.has(k)) || PADS[action].some(padBtn);
      this.prevHeld[action] = this.held[action] || false;
      this.held[action] = down;
      this.edge[action] = (down && !this.prevHeld[action]) || KEYS[action].some((k) => this.keyEdges.has(k));
    }

    // Axes: stick and keyboard, deadzoned, then the invert toggles applied.
    const dz = settings.deadzone;
    const stickX = pad ? deadzone(pad.axes[0] || 0, dz) : 0;
    const stickY = pad ? deadzone(-(pad.axes[1] || 0), dz) : 0; // up = positive
    const keyOn = (action) => KEYS[action].some((k) => this.keys.has(k));
    const kbX = (keyOn('right') ? 1 : 0) - (keyOn('left') ? 1 : 0);
    const kbY = (keyOn('up') ? 1 : 0) - (keyOn('down') ? 1 : 0);
    const dpadX = (padBtn(15) ? 1 : 0) - (padBtn(14) ? 1 : 0);
    const dpadY = (padBtn(12) ? 1 : 0) - (padBtn(13) ? 1 : 0);
    let ax = strongest(stickX, dpadX, kbX);
    let ay = strongest(stickY, dpadY, kbY);
    if (settings.invertX) ax = -ax;
    if (settings.invertY) ay = -ay;
    this.ax = ax;
    this.ay = ay;

    // Menu navigation: direction edges plus auto-repeat while held.
    const navNow = {
      up: ay > 0.5 || this.held.up,
      down: ay < -0.5 || this.held.down,
      left: ax < -0.5 || this.held.left,
      right: ax > 0.5 || this.held.right,
    };
    this.nav = null;
    let dir = NAV_DIRS.find((d) => navNow[d]) || null;
    if (dir !== this.navDir) {
      this.navDir = dir;
      this.navTimer = REPEAT_DELAY;
      if (dir) this.nav = dir;
    } else if (dir) {
      this.navTimer -= dt;
      if (this.navTimer <= 0) {
        this.nav = dir;
        this.navTimer = REPEAT_RATE;
      }
    }

    // Activity for attract mode: any press, click, or stick deflection.
    const anyEdge = ACTIONS.some((a) => this.edge[a]) || this.pointerEdge
      || Math.abs(ax) > 0.3 || Math.abs(ay) > 0.3;
    this.activeThisFrame = anyEdge;
    this.idle = anyEdge ? 0 : this.idle + dt;

    this.keyEdges.clear();
    this.pointerEdge = false;
  }

  // Flight controls for the game loop. Attract mode supplies the same shape.
  gameControls() {
    return {
      ax: this.ax,
      ay: this.ay,
      fire: this.held.fire,
      fireEdge: this.edge.fire,
      bomb: this.edge.bomb,
      boost: this.held.boost,
      brake: this.held.brake,
      rollL: this.edge.rollL,
      rollR: this.edge.rollR,
      pause: this.edge.pause,
    };
  }

  rumble(strength = 0.5, ms = 140) {
    const pad = this.pad;
    if (!settings.rumble || !pad || !pad.vibrationActuator) return;
    pad.vibrationActuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: ms,
      weakMagnitude: strength,
      strongMagnitude: strength * 0.8,
    }).catch(() => {});
  }
}

export const input = new Input();
