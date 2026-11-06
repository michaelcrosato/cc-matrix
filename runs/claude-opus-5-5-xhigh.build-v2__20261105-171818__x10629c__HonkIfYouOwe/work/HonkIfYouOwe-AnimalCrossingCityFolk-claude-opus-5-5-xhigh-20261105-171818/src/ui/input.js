// One view of the three devices: named actions, last device, art-pixel mouse, menu repeats.
export const PAD_BUTTONS = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight', 16: 'PadPS', 17: 'PadTouch' };
const PAD_CODES = Object.values(PAD_BUTTONS);
const KB_WATCH = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT', 'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'Space', 'Enter', 'Escape', 'Backspace', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'NumpadAdd', 'NumpadSubtract'];
const MOUSE = ['MouseLeft', 'MouseRight', 'MouseMiddle'];
const NAV = {
  up: ['PadUp', 'ArrowUp', 'KeyW'], down: ['PadDown', 'ArrowDown', 'KeyS'],
  left: ['PadLeft', 'ArrowLeft', 'KeyA'], right: ['PadRight', 'ArrowRight', 'KeyD'],
};
const REPEAT_FIRST = 0.34, REPEAT_NEXT = 0.11;

export class GameInput {
  constructor() {
    this.device = 'kbm';
    this.nav = { up: false, down: false, left: false, right: false };
    this.held = { up: 0, down: 0, left: 0, right: 0 };
    this.any = false;
    this.mouse = { x: 240, y: 135, moved: false, over: false, down: false, click: false, rclick: false, used: false, seen: false };
    this.lastPointer = { x: null, y: null };
    this.keysTyped = [];
    this.stickFlick = 0;
    this.axisX = 0; this.axisY = 0;
    this.padTilt = 0;
    this.hudW = 480; this.hudH = 270;
  }
  /** Called once per rendered frame before anything reads it. */
  begin(ctx, dt) {
    const i = ctx.input;
    this.i = i;
    const axis = i.moveAxis();
    this.axisX = axis.x; this.axisY = axis.y;
    this.padTilt = Math.hypot(i.padAxis.x, i.padAxis.y);
    // Any input, and which device
    let padPress = false;
    for (const c of PAD_CODES) if (i.wasPressed(c)) { padPress = true; break; }
    if (padPress || this.padTilt > 0.25) this.device = 'pad';
    let kbPress = false;
    for (const c of KB_WATCH) if (i.wasPressed(c)) { kbPress = true; break; }
    const p = i.pointer;
    const moved = this.lastPointer.x !== null && (Math.abs(p.x - this.lastPointer.x) > 1e-3 || Math.abs(p.y - this.lastPointer.y) > 1e-3);
    this.lastPointer.x = p.x; this.lastPointer.y = p.y;
    const m = this.mouse;
    m.moved = moved;
    m.over = p.over;
    m.x = Math.floor((p.x + 1) / 2 * this.hudW);
    m.y = Math.floor((1 - p.y) / 2 * this.hudH);
    m.click = i.wasPressed('MouseLeft');
    m.rclick = i.wasPressed('MouseRight');
    m.down = i.isDown('MouseLeft');
    const mousePress = m.click || m.rclick || i.wasPressed('MouseMiddle');
    if (kbPress || moved || mousePress || i.wheel !== 0) this.device = 'kbm';
    this.any = padPress || this.padTilt > 0.25 || kbPress || moved || mousePress || i.wheel !== 0 || i.isDown('Touch') || i.wasPressed('Touch');
    if (moved || mousePress) { m.used = true; m.seen = true; }
    if (kbPress || padPress) m.used = false;
    // Menu navigation with repeats; the stick and WASD count
    const stick = { up: i.padAxis.y > 0.5, down: i.padAxis.y < -0.5, left: i.padAxis.x < -0.5, right: i.padAxis.x > 0.5 };
    for (const dir of ['up', 'down', 'left', 'right']) {
      // A press shorter than a frame still counts: slow frames must not eat key taps.
      const down = stick[dir] || i.anyDown(NAV[dir]) || i.wasPressed(...NAV[dir]);
      this.nav[dir] = false;
      if (down) {
        if (this.held[dir] === 0) this.nav[dir] = true;
        this.held[dir] += dt;
        if (this.held[dir] > REPEAT_FIRST) { this.nav[dir] = true; this.held[dir] = REPEAT_FIRST - REPEAT_NEXT; }
      } else this.held[dir] = 0;
    }
    // Right stick arrives as pointer movement with no button held
    this.stickFlick = 0;
    this.stickVert = 0;
    if (!m.down) {
      // A flick is one turn or one zoom step: the stick has to come back before it counts again.
      const dx = i.mouseDelta.x, dy = i.mouseDelta.y;
      if (Math.abs(dx) < 0.8 && Math.abs(dy) < 0.8) this.flickArmed = true;
      if (this.device === 'pad' && this.flickArmed !== false) {
        const big = Math.abs(dx) > Math.abs(dy);
        if (big && Math.abs(dx) > 2) { this.stickFlick = Math.sign(dx); this.flickArmed = false; }
        else if (!big && Math.abs(dy) > 2) { this.stickVert = Math.sign(dy); this.flickArmed = false; }
      }
    }
    // Typed characters come through input.send
    this.keysTyped.length = 0;
    for (const c of i.commands) {
      if (c?.t === 'key') this.keysTyped.push(c.key);
      if (c?.t === 'tap') this.any = true;
    }
    const createHeld = i.isDown('PadCreate');
    this.confirm = i.wasPressed('PadCross', 'KeyE', 'Enter');
    this.back = i.wasPressed('PadCircle', 'Escape', 'Backspace');
    this.useTool = i.wasPressed('PadSquare', 'Space', 'KeyF');
    this.toolHeld = i.isDown('PadSquare', 'Space', 'KeyF', 'MouseRight');
    this.pockets = i.wasPressed('PadTriangle', 'Tab', 'KeyI');
    this.prevTool = i.wasPressed('PadL1') || i.wheel < 0;
    this.nextTool = i.wasPressed('PadR1') || i.wheel > 0;
    this.camL = i.wasPressed('PadL2', 'KeyQ') || this.stickFlick < 0;
    this.camR = i.wasPressed('PadR2', 'KeyR') || this.stickFlick > 0;
    this.map = i.wasPressed('PadTouch', 'PadUp', 'KeyM');
    this.almanac = i.wasPressed('PadDown', 'KeyJ');
    this.emote = i.wasPressed('PadLeft', 'KeyG');
    this.pause = !createHeld && i.wasPressed('PadOptions', 'Escape');
    this.running = i.isDown('PadCircle', 'ShiftLeft', 'ShiftRight');
    this.sneaking = i.isDown('ControlLeft', 'ControlRight');
    this.triangle = i.wasPressed('PadTriangle');
    this.square = i.wasPressed('PadSquare');
    this.tabPrev = i.wasPressed('PadL1', 'KeyQ');
    this.tabNext = i.wasPressed('PadR1', 'KeyR');
    this.digit = 0;
    for (let d = 1; d <= 6; d++) if (i.wasPressed(`Digit${d}`)) this.digit = d;
    this.zoomIn = i.wasPressed('Equal', 'NumpadAdd') || this.stickVert < 0;
    this.zoomOut = i.wasPressed('Minus', 'NumpadSubtract') || this.stickVert > 0;
  }
  anyAction() { return this.confirm || this.back; }
}
