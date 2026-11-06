// Input layer: virtual actions over keyboard / mouse / pad, last-device tracking, menu navigation, pointer in HUD pixels.
export const W = 480, H = 270;
export const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight', 16: 'PadPS', 17: 'PadTouch' };
const PADCODES = Object.values(PAD_MAP);
export const ACTIONS = {
  confirm: ['PadCross', 'KeyE', 'Enter'], back: ['PadCircle', 'Escape', 'Backspace'], tool: ['PadSquare', 'Space', 'KeyF'],
  pockets: ['PadTriangle', 'Tab', 'KeyI'], prevTool: ['PadL1'], nextTool: ['PadR1'], camL: ['PadL2', 'KeyQ'], camR: ['PadR2', 'KeyR'],
  map: ['PadTouch', 'PadUp', 'KeyM'], almanac: ['PadDown', 'KeyJ'], emote: ['PadLeft', 'KeyG'], pause: ['PadOptions', 'Escape'],
  zoomIn: ['Equal', 'NumpadAdd'], zoomOut: ['Minus', 'NumpadSubtract'],
  navUp: ['ArrowUp', 'KeyW', 'PadUp'], navDown: ['ArrowDown', 'KeyS', 'PadDown'], navLeft: ['ArrowLeft', 'KeyA', 'PadLeft'], navRight: ['ArrowRight', 'KeyD', 'PadRight'],
  alt: ['PadTriangle', 'KeyX'], pageL: ['PadL1', 'KeyQ'], pageR: ['PadR1', 'KeyE'],
};
export class Controls {
  constructor(input) {
    this.input = input; this.device = 'kb'; this.glyphs = 'ps'; this.anyInput = 0; this._nav = { x: 0, y: 0, t: 0, held: false };
    this.ptr = { x: W / 2, y: H / 2, moved: false, left: false, right: false, over: false };
    this._lastPtr = [0, 0]; this.enabled = true; this._seq = 0;
    input.gamepadButtons = { ...PAD_MAP };
    for (const k of ['Tab', 'Space', 'Escape', 'Backspace', 'F1', 'F2', 'F3', 'F4']) input.preventKeys.add(k);
    if (typeof window !== 'undefined') {
      const bump = (dev) => () => { this.anyInput++; if (dev) this.device = dev; };
      window.addEventListener('keydown', (e) => { if (e.isTrusted === false && !this.trustSynthetic) { /* synthetic keys still count */ } this.anyInput++; this.device = 'kb'; this.lastKey = e.key; });
      window.addEventListener('mousedown', bump('kb')); window.addEventListener('touchstart', () => { this.anyInput++; this.touched = true; });
      window.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; const d = Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); if (d > 0 || e.movementX === undefined) { this.anyInput++; this.device = 'kb'; } });
    }
  }
  /** Call once per frame at the start of update. */
  poll(dt) {
    const i = this.input;
    for (const c of PADCODES) if (i.isDown(c)) { this.device = 'pad'; this.anyInput++; break; }
    const a = i.padAxis; if (Math.hypot(a.x, a.y) > 0.4) { this.device = 'pad'; this.anyInput++; }
    const p = i.pointer; const nx = (p.x + 1) / 2 * W, ny = (1 - p.y) / 2 * H;
    this.ptr.moved = Math.abs(nx - this._lastPtr[0]) + Math.abs(ny - this._lastPtr[1]) > 0.5 && p.over;
    this._lastPtr[0] = nx; this._lastPtr[1] = ny; this.ptr.x = nx; this.ptr.y = ny; this.ptr.over = p.over;
    this.ptr.left = i.wasPressed('MouseLeft'); this.ptr.right = i.wasPressed('MouseRight'); this.ptr.leftDown = i.isDown('MouseLeft');
    if (this.ptr.left || this.ptr.right) this.device = 'kb';
    // menu navigation with repeat: stick, d-pad, arrows, wasd
    const ax = i.moveAxis(); const nav = this._nav; let x = 0, y = 0;
    if (ax.x > 0.6) x = 1; else if (ax.x < -0.6) x = -1; if (ax.y > 0.6) y = -1; else if (ax.y < -0.6) y = 1;
    if (i.isDown('ArrowRight', 'PadRight')) x = 1; if (i.isDown('ArrowLeft', 'PadLeft')) x = -1; if (i.isDown('ArrowDown', 'PadDown')) y = 1; if (i.isDown('ArrowUp', 'PadUp')) y = -1;
    this.nav = { x: 0, y: 0 };
    if (x || y) { nav.t -= dt; if (!nav.held || nav.t <= 0) { this.nav = { x, y }; nav.t = nav.held ? 0.12 : 0.35; nav.held = true; } } else { nav.held = false; nav.t = 0; }
    this.dt = dt;
  }
  pressed(a) { const c = ACTIONS[a]; for (const k of c) if (this.input.wasPressed(k)) return true; return false; }
  down(a) { const c = ACTIONS[a]; for (const k of c) if (this.input.isDown(k)) return true; return false; }
  /** A press that is not also a movement key (so E is confirm but WASD is not). */
  confirmPressed() { return this.pressed('confirm') || this.ptr.left; }
  backPressed() { return this.pressed('back') || this.ptr.right; }
  sample() { return { device: this.device, any: this.anyInput }; }
}
