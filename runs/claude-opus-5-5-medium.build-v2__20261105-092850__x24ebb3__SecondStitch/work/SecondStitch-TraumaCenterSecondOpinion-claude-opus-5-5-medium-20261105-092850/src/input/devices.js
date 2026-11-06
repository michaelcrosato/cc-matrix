// Pads polled per pad each frame; keys and mouse from the engine's Input. Tracks the last device used.
export const BTN = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const dz = (v, d = 0.18) => (Math.abs(v) < d ? 0 : (v - Math.sign(v) * d) / (1 - d));

export class Devices {
  pads = [null, null, null, null];
  last = 'kbm';
  idle = 0; // seconds with no input
  anyInput = false; // this frame
  anyPress = false; // a new press or click this frame
  pointerMoved = false;
  pointerX = 0; pointerY = 0; // art pixels
  rep = { t: 0, dir: null };
  lastPointer = { x: 9, y: 9 };
  nav = { up: false, down: false, left: false, right: false, confirm: false, back: false, tabL: false, tabR: false, pause: false, triangle: false };
  hasTouchOnly = false;
  lastPad = 0;
  hideCursor = false; cursorState = null;

  /** A new screen starts clean: nothing it reads depends on how long the last one ran. */
  resetCarry() { this.idle = 0; this.rep = { t: 0, dir: null }; this.lastPointer = { x: 9, y: 9 }; this.pointerMoved = false; }

  poll(ctx, dt) {
    const input = ctx.input, hud = ctx.hud;
    const raw = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    this.anyInput = false; this.anyPress = false;
    for (let i = 0; i < 4; i++) {
      const g = raw[i];
      if (!g || !g.connected) { this.pads[i] = null; continue; }
      const prev = this.pads[i];
      const buttons = Array.from(g.buttons, (b) => (typeof b === 'number' ? b : b.value || (b.pressed ? 1 : 0)));
      const pad = { index: i, gamepad: g, buttons, prev: prev ? prev.buttons : buttons.map(() => 0), axes: Array.from(g.axes ?? []), id: g.id };
      this.pads[i] = pad;
      let touched = false, pressed = false;
      buttons.forEach((v, b) => { if (v > 0.2) touched = true; if (v > 0.5 && !(pad.prev[b] > 0.5)) pressed = true; });
      if (pad.axes.some((a) => Math.abs(a) > 0.3)) touched = true;
      if (touched) { this.anyInput = true; this.last = 'pad'; this.lastPad = i; }
      if (pressed) this.anyPress = true;
    }
    // keys & mouse
    const p = input.pointer;
    this.pointerMoved = (p.x !== this.lastPointer.x || p.y !== this.lastPointer.y) && this.lastPointer.x !== 9;
    this.lastPointer.x = p.x; this.lastPointer.y = p.y;
    this.pointerX = ((p.x + 1) / 2) * hud.width;
    this.pointerY = ((1 - p.y) / 2) * hud.height;
    const held = input.state?.().keys ?? null;
    const keyActive = KEY_WATCH.some((k) => input.wasPressed(k));
    const clicked = input.wasPressed('MouseLeft', 'MouseRight', 'MouseMiddle');
    if (keyActive || clicked || this.pointerMoved || input.wheel) { this.anyInput = true; this.last = 'kbm'; }
    if (keyActive || clicked) this.anyPress = true;
    if (input.isDown('Touch') || input.wasPressed('Touch')) { this.anyInput = true; this.anyPress = true; }
    void held;
    this.idle = this.anyInput ? 0 : this.idle + dt;
    this.buildNav(input, dt);
    // The OS cursor: gone in surgery (we draw the reticle), and in menus unless the mouse was last.
    if (typeof document !== 'undefined') { const want = this.hideCursor || this.last === 'pad' ? 'none' : ''; if (want !== this.cursorState) { this.cursorState = want; document.body.style.cursor = want; if (hud.canvas) hud.canvas.style.cursor = want; } }
  }

  buildNav(input, dt) {
    const n = this.nav;
    let up = input.wasPressed('ArrowUp', 'KeyW'), down = input.wasPressed('ArrowDown', 'KeyS'), left = input.wasPressed('ArrowLeft', 'KeyA'), right = input.wasPressed('ArrowRight', 'KeyD');
    let confirm = input.wasPressed('Enter', 'Space', 'NumpadEnter'), back = input.wasPressed('Escape', 'Backspace');
    let tabL = input.wasPressed('KeyQ'), tabR = input.wasPressed('KeyE'), pause = input.wasPressed('Escape'), triangle = false;
    let dir = null;
    if (input.isDown('ArrowUp', 'KeyW')) dir = 'up'; else if (input.isDown('ArrowDown', 'KeyS')) dir = 'down'; else if (input.isDown('ArrowLeft', 'KeyA')) dir = 'left'; else if (input.isDown('ArrowRight', 'KeyD')) dir = 'right';
    for (const pad of this.pads) {
      if (!pad) continue;
      const hit = (b) => pad.buttons[b] > 0.5 && !(pad.prev[b] > 0.5);
      const on = (b) => pad.buttons[b] > 0.5;
      if (hit(BTN.UP)) up = true; if (hit(BTN.DOWN)) down = true; if (hit(BTN.LEFT)) left = true; if (hit(BTN.RIGHT)) right = true;
      if (hit(BTN.CROSS)) confirm = true; if (hit(BTN.CIRCLE)) back = true; if (hit(BTN.L1)) tabL = true; if (hit(BTN.R1)) tabR = true;
      if (hit(BTN.TRIANGLE)) triangle = true;
      if (hit(BTN.OPTIONS) && !on(BTN.CREATE)) pause = true;
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      if (on(BTN.UP) || ay < -0.5) dir = dir ?? 'up'; else if (on(BTN.DOWN) || ay > 0.5) dir = dir ?? 'down'; else if (on(BTN.LEFT) || ax < -0.5) dir = dir ?? 'left'; else if (on(BTN.RIGHT) || ax > 0.5) dir = dir ?? 'right';
      const was = pad.stickDir;
      void was;
    }
    // auto-repeat for held direction (stick edge counts as a press)
    if (dir !== this.rep.dir) {
      if (dir && !up && !down && !left && !right) { if (dir === 'up') up = true; if (dir === 'down') down = true; if (dir === 'left') left = true; if (dir === 'right') right = true; }
      this.rep.dir = dir; this.rep.t = 0.4;
    } else if (dir) {
      this.rep.t -= dt;
      if (this.rep.t <= 0) { this.rep.t = 0.12; if (dir === 'up') up = true; if (dir === 'down') down = true; if (dir === 'left') left = true; if (dir === 'right') right = true; }
    }
    Object.assign(n, { up, down, left, right, confirm, back, tabL, tabR, pause, triangle });
  }

  /** Mouse clicks this frame in art pixels. */
  click(input) {
    if (input.wasPressed('MouseLeft')) return { x: this.pointerX, y: this.pointerY, button: 0 };
    return null;
  }
  rightClick(input) { return input.wasPressed('MouseRight'); }

  rumble(index, strong, weak, ms, enabled) {
    if (!enabled) return;
    const pads = index == null ? this.pads : [this.pads[index]];
    for (const pad of pads) pad?.gamepad?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {});
  }
}
const KEY_WATCH = ['Enter', 'Space', 'Escape', 'Tab', 'Backspace', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyF', 'KeyJ', 'KeyK', 'KeyR', 'KeyM', 'ShiftLeft', 'ShiftRight', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'KeyX', 'KeyZ', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyL', 'KeyP', 'KeyO', 'KeyI', 'KeyU', 'KeyY', 'KeyT', 'KeyG', 'KeyH'];
export const deadzone = dz;
