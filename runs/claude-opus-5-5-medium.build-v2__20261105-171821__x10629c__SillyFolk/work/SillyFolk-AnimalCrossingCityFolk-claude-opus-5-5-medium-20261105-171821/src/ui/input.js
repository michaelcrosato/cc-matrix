// Named actions over the engine's input, the last device used, menu navigation with repeat, and the mouse in art pixels.
import { clamp } from '../core/util.js';
export const PAD_MAP = { 0: 'PadCross', 1: 'PadCircle', 2: 'PadSquare', 3: 'PadTriangle', 4: 'PadL1', 5: 'PadR1', 6: 'PadL2', 7: 'PadR2', 8: 'PadCreate', 9: 'PadOptions', 10: 'PadL3', 11: 'PadR3', 12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight', 16: 'PadPS', 17: 'PadTouch' };
export const ACTIONS = {
  confirm: ['PadCross', 'KeyE', 'Enter'], tool: ['PadSquare', 'Space', 'KeyF'], back: ['PadCircle', 'Escape', 'Backspace'], run: ['PadCircle', 'ShiftLeft', 'ShiftRight'], sneak: ['ControlLeft', 'ControlRight'],
  pockets: ['PadTriangle', 'Tab', 'KeyI'], prevTool: ['PadL1'], nextTool: ['PadR1'], camL: ['PadL2', 'KeyQ'], camR: ['PadR2', 'KeyR'], map: ['PadTouch', 'PadUp', 'KeyM'], almanac: ['PadDown', 'KeyJ'], emotes: ['PadLeft', 'KeyG'], pause: ['PadOptions', 'Escape'], zoomIn: ['Equal', 'NumpadAdd'], zoomOut: ['Minus', 'NumpadSubtract'],
  up: ['PadUp', 'ArrowUp', 'KeyW'], down: ['PadDown', 'ArrowDown', 'KeyS'], left: ['PadLeft', 'ArrowLeft', 'KeyA'], right: ['PadRight', 'ArrowRight', 'KeyD'], l1: ['PadL1', 'KeyQ'], r1: ['PadR1', 'KeyR'], alt: ['PadTriangle', 'KeyT'], square: ['PadSquare', 'Space'],
};
const ALL_KEYS = ['KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Space','Enter','Escape','Backspace','Tab','ShiftLeft','ShiftRight','ControlLeft','ControlRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Equal','Minus','NumpadAdd','NumpadSubtract','MouseLeft','MouseRight','MouseMiddle'];
const PAD_KEYS = Object.values(PAD_MAP);
export class Controls {
  constructor(ctx) { this.ctx = ctx; this.input = ctx.input; this.device = 'kb'; this.navT = 0; this.navDir = null; this.mx = 240; this.my = 135; this.lastPx = null; this.moved = false; this.anyInput = false; this.mouseVisible = false; this.typed = []; this.stickNav = null; this.rx = 0; this.ry = 0; this.rflick = 0; this.locked = 0;
    this.input.gamepadButtons = { ...PAD_MAP };
    for (const k of ['Tab', 'KeyF', 'Backspace', 'Enter', 'Escape', 'ControlLeft', 'KeyQ', 'KeyR', 'KeyG', 'KeyJ', 'KeyI', 'KeyM', 'Equal', 'Minus']) this.input.preventKeys.add(k);
  }
  begin(dt) {
    const i = this.input; this.anyInput = false; this.moved = false; this.keyInput = false;
    this.frame = (this.frame ?? 0) + 1; this.inFrame = true;
    for (const k of PAD_KEYS) if (i.wasPressed(k) || i.isDown(k)) { if (k !== 'PadCreate' || i.wasPressed(k)) { this.device = 'pad'; this.anyInput = true; this.keyInput = true; this.mouseVisible = false; } break; }
    if (Math.abs(i.padAxis.x) > 0.25 || Math.abs(i.padAxis.y) > 0.25) { this.device = 'pad'; this.anyInput = true; this.keyInput = true; this.mouseVisible = false; }
    for (const k of ALL_KEYS) if (i.wasPressed(k)) { this.device = k.startsWith('Mouse') ? 'mouse' : 'kb'; this.anyInput = true; if (!k.startsWith('Mouse')) { this.mouseVisible = false; this.keyInput = true; } break; }
    const p = i.pointer;
    if (this.lastPx && (Math.abs(p.x - this.lastPx[0]) > 1e-4 || Math.abs(p.y - this.lastPx[1]) > 1e-4)) { if (!p.touch) { this.moved = true; this.anyInput = true; this.device = this.device === 'pad' ? 'mouse' : this.device === 'kb' ? 'kb' : 'mouse'; this.mouseVisible = true; } else this.anyInput = true; }
    this.lastPx = [p.x, p.y];
    if (i.isDown('Touch') || i.wasPressed('Touch')) this.anyInput = true;
    if (i.wheel) { this.anyInput = true; this.mouseVisible = true; }
    if (p.touch) this.mouseVisible = false;
    this.mx = clamp((p.x + 1) * 240, 0, 479); this.my = clamp((1 - p.y) * 135, 0, 269);
    // right stick → look: reads mouseDelta which only pad feeds when no button is held
    const d = i.mouseDelta; this.rx = d.x; this.ry = d.y;
    // text typed arrives through commands so a replay sees it
    this.typed.length = 0; this.commands = i.commands;
    for (const c of i.commands) { if (c && c.t === 'key') { this.typed.push(c.key); this.anyInput = true; this.keyInput = true; } if (c && c.t === 'tap') this.anyInput = true; }
    // nav repeat
    const ax = i.moveAxis(); let dir = null;
    const down = (a) => i.anyDown(ACTIONS[a]);
    if (down('up') || ax.y > 0.55) dir = 'up'; else if (down('down') || ax.y < -0.55) dir = 'down'; else if (down('left') || ax.x < -0.55) dir = 'left'; else if (down('right') || ax.x > 0.55) dir = 'right';
    this.nav = null;
    const tapped = ['up', 'down', 'left', 'right'].find((a) => ACTIONS[a].some((k) => i.wasPressed(k)));
    if (tapped) { this.navDir = dir ?? null; this.navT = 0.34; this.nav = tapped; if (dir && dir !== tapped) this.navDir = tapped; } else if (dir !== this.navDir) { this.navDir = dir; this.navT = 0.34; this.nav = dir; } else if (dir) { this.navT -= dt; if (this.navT <= 0) { this.navT = 0.11; this.nav = dir; } }
  }
  /** Once per press, in `update`. */
  pressed(a) { if (this.lockFrame === this.frame) return false; const l = ACTIONS[a]; for (const k of l) if (this.input.wasPressed(k)) return true; return false; }
  held(a) { return this.input.anyDown(ACTIONS[a]); }
  clickL() { return this.lockFrame !== this.frame && this.input.wasPressed('MouseLeft'); }
  clickR() { return this.lockFrame !== this.frame && this.input.wasPressed('MouseRight'); }
  back() { return this.pressed('back') || this.clickR(); }
  confirm() { return this.pressed('confirm'); }
  /** A screen just opened or closed: this frame's press belongs to whatever caused that. Pushed between frames, nothing is swallowed. */
  lock() { if (this.inFrame) this.lockFrame = this.frame; }
  end() { this.inFrame = false; }
}
