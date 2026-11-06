// Prompts follow the input used last. PlayStation shapes, Xbox letters, key caps and mouse buttons, as pixel art.
import { ACTIONS } from '../core/actions.js';
const R = (s) => s.trim().split('\n').map((l) => l.trim());
export const SPRITES = {
  cross: R(`
...ooooo...
..o.....o..
.o.w...w.o.
o...w.w...o
o....w....o
o...w.w...o
.o.w...w.o.
..o.....o..
...ooooo...`),
  circle: R(`
...ooooo...
..o.....o..
.o..rrr..o.
o..r...r..o
o..r...r..o
o..r...r..o
.o..rrr..o.
..o.....o..
...ooooo...`),
  square: R(`
...ooooo...
..o.....o..
.o.sssss.o.
o..s...s..o
o..s...s..o
o..s...s..o
.o.sssss.o.
..o.....o..
...ooooo...`),
  triangle: R(`
...ooooo...
..o..g..o..
.o..g.g..o.
o...g.g...o
o..g...g..o
o..g...g..o
.o.ggggg.o.
..o.....o..
...ooooo...`),
  dpadU: R(`
...www...
...www...
...www...
.ooo.ooo.
.ooo.ooo.
.ooo.ooo.
...ooo...
...ooo...
...ooo...`),
  dpadD: R(`
...ooo...
...ooo...
...ooo...
.ooo.ooo.
.ooo.ooo.
.ooo.ooo.
...www...
...www...
...www...`),
  dpadL: R(`
...ooo...
...ooo...
...ooo...
.www.ooo.
.www.ooo.
.www.ooo.
...ooo...
...ooo...
...ooo...`),
  dpadR: R(`
...ooo...
...ooo...
...ooo...
.ooo.www.
.ooo.www.
.ooo.www.
...ooo...
...ooo...
...ooo...`),
  options: R(`
.ooooooo.
.o.www.o.
.o.....o.
.o.www.o.
.o.....o.
.o.www.o.
.ooooooo.`),
  create: R(`
.ooooooo.
.o..w..o.
.o.www.o.
.o..w..o.
.o..w..o.
.ooooooo.`),
  lmb: R(`
..ooooo..
.owwoooo.
.owwo..o.
.owwo..o.
.ooooooo.
.o.....o.
.o.....o.
.o.....o.
..ooooo..`),
  rmb: R(`
..ooooo..
.oooowwo.
.o..owwo.
.o..owwo.
.ooooooo.
.o.....o.
.o.....o.
.o.....o.
..ooooo..`),
  mmb: R(`
..ooooo..
.o..w..o.
.o..w..o.
.o..w..o.
.ooooooo.
.o.....o.
.o.....o.
.o.....o.
..ooooo..`),
  wheel: R(`
..ooooo..
.o.www.o.
.o.www.o.
.o.www.o.
.ooooooo.
.o.....o.
.o.....o.
.o.....o.
..ooooo..`),
};
const COLORS = { o: 'mist', w: 'white', r: 'red', s: 'orange', g: 'lime' };
const PS = { PadCross: 'cross', PadCircle: 'circle', PadSquare: 'square', PadTriangle: 'triangle', PadUp: 'dpadU', PadDown: 'dpadD', PadLeft: 'dpadL', PadRight: 'dpadR', PadOptions: 'options', PadCreate: 'create' };
const PS_CAP = { PadL1: 'L1', PadR1: 'R1', PadL2: 'L2', PadR2: 'R2', PadL3: 'L3', PadR3: 'R3' };
const XB_CAP = { PadCross: 'A', PadCircle: 'B', PadSquare: 'X', PadTriangle: 'Y', PadL1: 'LB', PadR1: 'RB', PadL2: 'LT', PadR2: 'RT', PadL3: 'LS', PadR3: 'RS', PadOptions: 'MENU', PadCreate: 'VIEW' };
const KEY = { MouseLeft: 'lmb', MouseRight: 'rmb', MouseMiddle: 'mmb' };
const KEY_TEXT = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', CapsLock: 'CAPS', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };
const XB_COLOR = { A: 'lime', B: 'red', X: 'sky', Y: 'sand' };
/** What to draw for an action: { sprite } or { cap, color }, and a name tests can read. */
export function glyphOf(action, device, xbox) {
  const a = ACTIONS[action]; if (!a) return { cap: '?', name: '?' };
  if (device === 'pad' && a.pad) {
    if (xbox) { const c = XB_CAP[a.pad]; if (c) return { cap: c, color: XB_COLOR[c] ?? 'white', name: c }; }
    if (PS[a.pad]) return { sprite: PS[a.pad], name: PS[a.pad].toUpperCase() };
    return { cap: PS_CAP[a.pad] ?? a.pad.replace('Pad', ''), color: 'white', name: PS_CAP[a.pad] ?? a.pad };
  }
  const code = a.kbm?.[0] ?? a.pad;
  if (KEY[code]) return { sprite: KEY[code], name: KEY[code].toUpperCase() };
  const text = KEY_TEXT[code] ?? String(code).replace('Key', '').replace('Digit', '');
  return { cap: text, color: 'white', name: text };
}
export function glyphWidth(g) { if (g.sprite) return SPRITES[g.sprite][0].length; return g.cap.length * 6 + 3; }
/** Draw at (x, y) top-left. */
export function drawGlyph(hud, x, y, g) {
  if (g.sprite) { hud.sprite(x, y, SPRITES[g.sprite], COLORS); return glyphWidth(g); }
  const w = glyphWidth(g);
  hud.rect(x, y, w, 10, 'ink'); hud.rect(x, y, w, 1, 'mist'); hud.rect(x, y + 9, w, 1, 'mist'); hud.rect(x, y, 1, 10, 'mist'); hud.rect(x + w - 1, y, 1, 10, 'mist');
  hud.text(x + 2, y + 2, g.cap, { color: g.color ?? 'white', shadow: false });
  return w;
}
