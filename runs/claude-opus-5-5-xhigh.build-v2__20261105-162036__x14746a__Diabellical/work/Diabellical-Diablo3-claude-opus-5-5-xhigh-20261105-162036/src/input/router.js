// Everything the player touches. Pads are read per pad (the engine merges them), forwarded through
// input.send so recordings stay valid. Keyboard and mouse feel native on the same screens.
import { BTN, emptyIntent } from '../sim/intents.js';
import { usableObjects } from '../sim/objects.js';
import { RULES } from '../data/tuning.js';

const B = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
export const PAD = B;
const DEAD = 0.25;
const WALK_KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'] };
const ALL_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape', 'KeyQ', 'KeyE', 'KeyX', 'KeyV', 'KeyT', 'KeyF', 'KeyI', 'KeyC', 'KeyK', 'KeyL', 'KeyM', 'Tab', 'AltLeft', 'AltRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyZ', 'ShiftLeft', 'MouseLeft', 'MouseRight', 'F1', 'Backspace', 'KeyP', 'KeyO', 'KeyY', 'KeyU'];
// Screen right is (+0.71, -0.71) on the ground; screen up is (-0.71, -0.71).
const S = Math.SQRT1_2;
export const toWorld = (sx, sy) => [S * sx - S * sy, -S * sx - S * sy];

export class InputRouter {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.input = ctx.input;
    this.input.gamepadButtons = {};
    this.input.gamepadDeadzone = 0.25;
    for (const k of ['Tab', 'AltLeft', 'AltRight', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10']) this.input.preventKeys.add(k);
    this.lastDevice = 'kbm';
    this.pads = [];          // per pad state from the last delivered command
    this.prevPads = [];
    this.padEdges = [];      // per pad, buttons pressed since the last sim step
    this.padPressedFrame = [];
    this.seats = [{ kind: 'kbm', pad: null }]; // seat 0: keyboard/mouse and the first pad to press
    this.menu = this.emptyMenu();
    this.repeat = { dir: null, t: 0 };
    this.pointerPx = -1; this.pointerPy = -1;
    this.lastPoll = '';
    this.idleFrames = 0;
    this.heldFrames = new Map();
    this.anyInput = false;
    this.createHeld = [];
    this.createUsed = [];
    this.goalMouse = false;
    this.seenPads = new Set();
    this.mouseMovedAt = 0;
    this.leftDown = false;
  }

  emptyMenu() { return { up: false, down: false, left: false, right: false, confirm: false, back: false, ctxA: false, ctxB: false, tabL: false, tabR: false, pause: false, px: -1, py: -1, pointerMoved: false, click: false, rightClick: false, clickX: -1, clickY: -1, wheel: 0, anyPress: false, skipHeld: false, source: null }; }

  /** Page-side polling: forward pad state as a recorded command when it changes. */
  pollPads() {
    if (this.input.playing) return;
    let raw = null;
    try { raw = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null; } catch { raw = null; }
    if (!raw) return;
    const state = [];
    for (let i = 0; i < raw.length; i++) {
      const p = raw[i];
      if (!p || p.connected === false) { state[i] = null; continue; }
      const buttons = [];
      for (let b = 0; b < Math.min(17, p.buttons.length); b++) buttons.push(p.buttons[b].pressed || p.buttons[b].value > 0.4 ? 1 : 0);
      state[i] = { b: buttons, a: [p.axes[0] ?? 0, p.axes[1] ?? 0, p.axes[2] ?? 0, p.axes[3] ?? 0].map((v) => Math.round(v * 100) / 100) };
    }
    const key = JSON.stringify(state);
    if (key !== this.lastPoll) {
      this.lastPoll = key;
      this.input.send({ k: 'pads', pads: state });
    }
  }

  /** Once per rendered frame, before the UI. */
  beginFrame() {
    const input = this.input;
    this.pollPads();
    this.prevPads = this.pads;
    for (const c of input.commands) {
      if (c?.k === 'pads') this.pads = c.pads;
    }
    const m = this.emptyMenu();
    this.anyInput = false;
    // Pads.
    this.padPressedFrame = [];
    for (let i = 0; i < this.pads.length; i++) {
      const p = this.pads[i];
      if (!p) continue;
      if (!this.seenPads.has(i)) { this.seenPads.add(i); this.game.onPadSeen?.(i); }
      const prev = this.prevPads[i];
      const edges = [];
      for (let b = 0; b < p.b.length; b++) if (p.b[b] && !(prev?.b?.[b])) edges.push(b);
      this.padPressedFrame[i] = edges;
      this.padEdges[i] = [...(this.padEdges[i] ?? []), ...edges];
      if (edges.length) {
        this.lastDevice = 'pad';
        this.anyInput = true;
        this.game.audioSys?.audio.unlock?.();
      }
      const stick = Math.hypot(p.a[0], p.a[1]);
      const stick2 = Math.hypot(p.a[2], p.a[3]);
      if (stick > DEAD || stick2 > DEAD || p.b.some((v) => v)) {
        this.lastDevice = 'pad';
        this.anyInput = true;
        // Seat one is the keyboard and the first pad to speak.
        if (this.seats[0] && this.seats[0].kind === 'kbm' && this.seats[0].pad === null && this.seatOfPad(i) < 0) this.seats[0].pad = i;
      }
    }
    // Keyboard.
    let kbPressed = false;
    for (const k of ALL_KEYS) if (input.wasPressed(k)) { kbPressed = true; break; }
    let keyDown = false;
    for (const k of ALL_KEYS) if (input.isDown(k)) { keyDown = true; break; }
    if (kbPressed || keyDown) { this.lastDevice = 'kbm'; this.anyInput = true; }
    // Pointer, in art pixels.
    const hud = this.ctx.hud;
    const px = ((input.pointer.x + 1) / 2) * hud.width, py = ((1 - input.pointer.y) / 2) * hud.height;
    const moved = input.pointer.over && (this.pointerPx < 0 || Math.hypot(px - this.pointerPx, py - this.pointerPy) * (this.game.pxScale ?? 4) > 2);
    if (moved) { this.pointerPx = px; this.pointerPy = py; this.lastDevice = 'kbm'; this.anyInput = true; }
    m.px = px; m.py = py; m.pointerMoved = moved;
    for (const be of input.buttonEvents) {
      if (!be.down) continue;
      const bx = ((be.x + 1) / 2) * hud.width, by = ((1 - be.y) / 2) * hud.height;
      if (be.code === 'MouseLeft') m.click = true;
      else if (be.code === 'MouseRight') m.rightClick = true;
      m.clickX = bx; m.clickY = by;
      this.lastDevice = 'kbm';
      this.anyInput = true;
    }
    if (input.wasPressed('MouseLeft') && !m.click) { m.click = true; m.clickX = px; m.clickY = py; this.anyInput = true; }
    if (input.wasPressed('MouseRight') && !m.rightClick) { m.rightClick = true; m.clickX = px; m.clickY = py; this.anyInput = true; }
    m.wheel = input.wheel;
    if (m.wheel) { this.anyInput = true; }
    // The game owns the wheel: it zooms only when the Settings range says so.
    this.wheelNow = input.wheel;
    input.wheel = 0;

    // Menus: from the keyboard and from whichever pads are allowed.
    const dirs = { up: false, down: false, left: false, right: false };
    if (input.wasPressed('ArrowUp', 'KeyW')) dirs.up = true;
    if (input.wasPressed('ArrowDown', 'KeyS')) dirs.down = true;
    if (input.wasPressed('ArrowLeft', 'KeyA')) dirs.left = true;
    if (input.wasPressed('ArrowRight', 'KeyD')) dirs.right = true;
    if (input.wasPressed('Enter') || input.wasPressed('Space')) m.confirm = true;
    if (input.wasPressed('Escape')) m.back = true;
    if (input.wasPressed('KeyX')) m.ctxA = true;
    if (input.wasPressed('KeyV')) m.ctxB = true;
    if (input.wasPressed('KeyQ')) m.tabL = true;
    if (input.wasPressed('KeyE')) m.tabR = true;
    if (input.wasPressed('Escape')) m.pause = true;
    if (kbPressed) m.anyPress = true;
    if (m.click || m.rightClick) m.anyPress = true;

    const menuPads = this.menuPads();
    let heldDir = null;
    for (const i of menuPads) {
      const p = this.pads[i];
      if (!p) continue;
      const edges = this.padPressedFrame[i] ?? [];
      if (edges.includes(B.UP)) dirs.up = true;
      if (edges.includes(B.DOWN)) dirs.down = true;
      if (edges.includes(B.LEFT)) dirs.left = true;
      if (edges.includes(B.RIGHT)) dirs.right = true;
      if (edges.includes(B.CROSS)) m.confirm = true;
      if (edges.includes(B.CIRCLE)) m.back = true;
      if (edges.includes(B.SQUARE)) m.ctxA = true;
      if (edges.includes(B.TRIANGLE)) m.ctxB = true;
      if (edges.includes(B.L1)) m.tabL = true;
      if (edges.includes(B.R1)) m.tabR = true;
      if (edges.includes(B.OPTIONS) && !p.b[B.CREATE]) m.pause = true;
      if (edges.length) m.anyPress = true;
      const ax = p.a[0], ay = p.a[1];
      if (Math.abs(ay) > 0.6 && Math.abs(ay) >= Math.abs(ax)) heldDir = ay < 0 ? 'up' : 'down';
      else if (Math.abs(ax) > 0.6) heldDir = ax < 0 ? 'left' : 'right';
      if (p.b[B.UP]) heldDir = 'up';
      if (p.b[B.DOWN]) heldDir = 'down';
      if (p.b[B.LEFT]) heldDir = 'left';
      if (p.b[B.RIGHT]) heldDir = 'right';
      if (p.b[B.CROSS] || p.b[B.CIRCLE]) m.skipHeld = true;
    }
    if (input.isDown('Enter') || input.isDown('Space') || input.isDown('Escape')) m.skipHeld = true;
    if (!heldDir) {
      for (const [d, keys] of Object.entries(WALK_KEYS)) if (input.isDown(...keys)) heldDir = d;
    }
    // Stick and key repeat.
    if (heldDir !== this.repeat.dir) {
      this.repeat.dir = heldDir;
      this.repeat.t = 0;
      if (heldDir && !dirs[heldDir]) dirs[heldDir] = true;
    } else if (heldDir) {
      this.repeat.t += 1;
      if (this.repeat.t > 18 && (this.repeat.t - 18) % 7 === 0) dirs[heldDir] = true;
    }
    Object.assign(m, dirs);
    m.anyPress = m.anyPress || dirs.up || dirs.down || dirs.left || dirs.right;
    this.menu = m;
    this.idleFrames = this.anyInput ? 0 : this.idleFrames + 1;
  }

  menuPads() {
    const out = [];
    const owner = this.game.menuSeat ?? null;
    for (let i = 0; i < this.pads.length; i++) {
      if (!this.pads[i]) continue;
      const seat = this.seatOfPad(i);
      if (this.game.joinPad === i) { out.push(i); continue; }
      if (owner === null) { if (seat === 0 || seat === -1) out.push(i); }
      else if (seat === owner || (seat === -1 && owner === 0)) out.push(i);
    }
    return out;
  }

  seatOfPad(i) { return this.seats.findIndex((s) => s.pad === i); }

  freePadPressedOptions() {
    for (let i = 0; i < this.pads.length; i++) {
      if (!this.pads[i] || this.seatOfPad(i) >= 0) continue;
      if ((this.padPressedFrame[i] ?? []).includes(B.OPTIONS)) return i;
    }
    return -1;
  }

  // ---- Intents ------------------------------------------------------------------------------
  /** Build the intent for a seat. Called from fixedUpdate. */
  intentFor(seat, world) {
    const s = this.seats[seat];
    const it = emptyIntent();
    if (!s) return it;
    const h = world.heroes.find((o) => o.seat === seat);
    if (!h) return it;
    if (seat === 0) this.kbmIntent(it, h, world);
    if (s.pad !== null && this.pads[s.pad]) this.padIntent(it, h, world, s.pad);
    return it;
  }

  /** A session: this copy's one player, whatever seat the hub gave them. */
  intentForHero(h, world) {
    const it = emptyIntent();
    const s = this.seats[0];
    this.kbmIntent(it, h, world);
    if (s.pad !== null && this.pads[s.pad]) this.padIntent(it, h, world, s.pad);
    return it;
  }

  kbmIntent(it, h, world) {
    const input = this.input;
    const view = this.game.view;
    let sx = 0, sy = 0;
    if (input.isDown('KeyD', 'ArrowRight')) sx += 1;
    if (input.isDown('KeyA', 'ArrowLeft')) sx -= 1;
    if (input.isDown('KeyW', 'ArrowUp')) sy += 1;
    if (input.isDown('KeyS', 'ArrowDown')) sy -= 1;
    if (sx || sy) {
      const l = Math.hypot(sx, sy);
      const [mx, mz] = toWorld(sx / l, sy / l);
      it.mx = mx; it.mz = mz;
    }
    // Aim at the pointer whenever it is the last thing used.
    const usePointer = this.lastDevice === 'kbm' && input.pointer.over;
    let hoverM = null, hoverO = null;
    if (usePointer && view) {
      const g = view.groundAt(input.pointer.x, input.pointer.y);
      if (g) { it.ax = g[0]; it.az = g[1]; it.aimed = 2; }
      hoverM = this.game.hudSys?.hover?.monster ?? null;
      hoverO = this.game.hudSys?.hover?.object ?? null;
      if (hoverM) it.tgt = hoverM.id;
    }
    // Keys.
    const pressed = (k) => input.consumePress(k);
    const shift = input.isDown('ShiftLeft', 'ShiftRight');
    const hold = (code, bit) => { if (input.isDown(code)) it.held |= bit; if (pressed(code)) it.pressed |= bit; };
    hold('Digit1', BTN.S2); hold('Digit2', BTN.S3); hold('Digit3', BTN.S4); hold('Digit4', BTN.S5);
    hold('MouseRight', BTN.S1);
    if (pressed('Space')) it.pressed |= BTN.DODGE;
    if (pressed('KeyQ')) it.pressed |= BTN.POTION;
    if (pressed('KeyE')) { it.pressed |= BTN.INTERACT; }
    if (input.isDown('KeyE')) it.held |= BTN.INTERACT;
    if (input.isDown('KeyT')) it.held |= BTN.BELL;
    // Left mouse: on a monster attack it, on a thing use it, on the ground walk. Shift attacks in place.
    if (input.isDown('MouseLeft')) {
      if (shift) { it.held |= BTN.S0; }
      else if (input.consumePress('MouseLeft') || this.leftDown) {
        this.leftDown = true;
        if (hoverM && !this.leftWalking) { it.goal = { k: 'attack', id: hoverM.id, slot: 0 }; }
        else if (hoverO && !this.leftWalking) { it.goal = { k: 'use', id: hoverO.id }; this.leftWalking = false; }
        else if (it.aimed === 2) {
          if (!this.leftGoalT || this.leftGoalT < world.t) { it.goal = { k: 'walk', x: it.ax, z: it.az }; this.leftGoalT = world.t + 6; this.leftWalking = true; }
        }
      }
    } else { this.leftDown = false; this.leftWalking = false; }
  }

  padIntent(it, h, world, i) {
    const p = this.pads[i];
    const edges = this.padEdges[i] ?? [];
    this.padEdges[i] = [];
    const ax = p.a[0], ay = p.a[1];
    const mag = Math.hypot(ax, ay);
    if (mag > DEAD) {
      const f = Math.min(1, (mag - DEAD) / (1 - DEAD)) / mag;
      const [mx, mz] = toWorld(ax * f, -ay * f);
      it.mx = mx; it.mz = mz;
    }
    const rx = p.a[2], ry = p.a[3];
    const rmag = Math.hypot(rx, ry);
    if (rmag > 0.3) {
      const [dx, dz] = toWorld(rx, -ry);
      it.ax = dx; it.az = dz; it.aimed = 1;
    } else if (this.lastDevice === 'pad') { it.aimed = 0; it.tgt = 0; }
    const press = (b, bit) => { if (p.b[b]) it.held |= bit; if (edges.includes(b)) it.pressed |= bit; };
    // Cross: interact if there is something to use and nothing to hit, else the first skill.
    const near = usableObjects(world, h);
    const hostile = world.monsters.some((m) => !m.dead && (m.x - h.x) ** 2 + (m.z - h.z) ** 2 < RULES.hostileNear ** 2);
    const seatKey = i;
    if (edges.includes(B.CROSS)) {
      this.crossT = this.crossT ?? [];
      this.crossT[seatKey] = 0;
      if (near.length && !hostile) { it.pressed |= BTN.INTERACT; this.crossUse = this.crossUse ?? []; this.crossUse[seatKey] = true; }
      else if (this.crossUse) this.crossUse[seatKey] = false;
    }
    if (p.b[B.CROSS]) {
      this.crossT = this.crossT ?? [];
      this.crossT[seatKey] = (this.crossT[seatKey] ?? 0) + 1 / 60;
      if (this.crossT[seatKey] >= 0.4) {
        it.held |= BTN.INTERACT;
        if (near.length && !this.crossFired?.[seatKey]) { it.pressed |= BTN.INTERACT; this.crossFired = this.crossFired ?? []; this.crossFired[seatKey] = true; }
      }
      if (!this.crossUse?.[seatKey]) press(B.CROSS, BTN.S0);
    } else if (this.crossFired) this.crossFired[seatKey] = false;
    press(B.SQUARE, BTN.S1); press(B.TRIANGLE, BTN.S2); press(B.CIRCLE, BTN.S3); press(B.R1, BTN.S4); press(B.R2, BTN.S5);
    if (edges.includes(B.L2)) it.pressed |= BTN.DODGE;
    if (edges.includes(B.L1)) it.pressed |= BTN.POTION;
    if (p.b[B.DOWN]) it.held |= BTN.BELL;
  }

  /** Non-sim button actions for a seat, from update. Returns list of action names. */
  frameActions(seat) {
    const input = this.input;
    const out = [];
    if (seat === 0) {
      if (input.wasPressed('Escape')) out.push('pause');
      if (input.wasPressed('KeyI', 'KeyC')) out.push('hero_gear');
      if (input.wasPressed('KeyK')) out.push('hero_skills');
      if (input.wasPressed('KeyL')) out.push('hero_quests');
      if (input.wasPressed('KeyM', 'Tab')) out.push('map');
      if (input.wasPressed('KeyF')) out.push('equip');
      if (input.isDown('AltLeft', 'AltRight')) out.push('labels');
    }
    const s = this.seats[seat];
    if (s?.pad !== null && s?.pad !== undefined && this.pads[s.pad]) {
      const i = s.pad;
      const p = this.pads[i];
      const edges = this.padPressedFrame[i] ?? [];
      const prev = this.prevPads[i];
      if (edges.includes(B.OPTIONS) && !p.b[B.CREATE]) out.push('pause');
      if (p.b[B.CREATE]) { if (edges.includes(B.OPTIONS)) { this.createUsed[i] = true; } }
      if (prev?.b?.[B.CREATE] && !p.b[B.CREATE]) { if (!this.createUsed[i]) out.push('hero_gear'); this.createUsed[i] = false; }
      if (edges.includes(B.UP)) out.push('map');
      if (edges.includes(B.LEFT)) out.push('equip');
      if (edges.includes(B.RIGHT)) out.push('cycle');
      if (p.b[B.R3]) out.push('labels');
    }
    return out;
  }
}
