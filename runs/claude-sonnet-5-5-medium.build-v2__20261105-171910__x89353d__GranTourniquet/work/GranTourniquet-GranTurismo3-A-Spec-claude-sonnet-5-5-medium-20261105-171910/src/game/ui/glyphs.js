// Button glyphs drawn with hud sprites/rects. Prompts follow the last device used. Plan section 7.
const FACE = {
  cross: ['..xxxxxxx..', '.xx.....xx.', 'x..x...x..x', 'x...x.x...x', 'x....x....x', 'x...x.x...x', 'x..x...x..x', '.xx.....xx.', '..xxxxxxx..'],
  circle: ['..xxxxxxx..', '.xx.....xx.', 'xx.......xx', 'x..xxxxx..x', 'x.x.....x.x', 'x..xxxxx..x', 'xx.......xx', '.xx.....xx.', '..xxxxxxx..'],
  square: ['..xxxxxxx..', '.xx.....xx.', 'x..xxxxx..x', 'x..x...x..x', 'x..x...x..x', 'x..x...x..x', 'x..xxxxx..x', '.xx.....xx.', '..xxxxxxx..'],
  triangle: ['..xxxxxxx..', '.xx..x..xx.', 'x...x.x...x', 'x..x...x..x', 'x.x.....x.x', 'x.xxxxxxx.x', 'x.........x', '.xx.....xx.', '..xxxxxxx..'],
};
const FACE_COL = { cross: 'blue', circle: 'red', square: 'plum', triangle: 'green' };
const PS_NAME = { confirm: 'cross', back: 'circle', alt: 'square', info: 'triangle', camera: 'triangle', handbrake: 'square', lookBack: 'circle', recover: 'triangle' };
const XB_NAME = { cross: 'A', circle: 'B', square: 'X', triangle: 'Y' };
const XB_COL = { A: 'green', B: 'red', X: 'blue', Y: 'sand' };
const KEY_NAME = { confirm: 'ENTER', back: 'ESC', alt: 'SPACE', info: 'C', camera: 'C', pause: 'ESC', tabL: 'Q', tabR: 'E', tabs: 'Q E', handbrake: 'SPACE', lookBack: 'B', recover: 'R', up: 'E', down: 'Q', move: 'ARROWS', steer: 'A D', go: 'W', brake: 'S', slow: 'SHIFT', pick: 'CLICK', scrub: 'ARROWS', focusCar: 'Q E', hide: 'H', drag: 'DRAG', retry: 'R' };
const PAD_TEXT = { tabL: 'L1', tabR: 'R1', tabs: 'L1 R1', pause: 'OPT', up: 'R1', down: 'L1', move: 'D-PAD', steer: 'L STICK', go: 'R2', brake: 'L2', slow: 'R2', focusCar: 'L1 R1', scrub: 'D-PAD', look: 'R STICK', hide: 'L3', retry: 'SQ' };
const XB_TEXT = { tabL: 'LB', tabR: 'RB', tabs: 'LB RB', pause: 'MENU', up: 'RB', down: 'LB', move: 'D-PAD', steer: 'L STICK', go: 'RT', brake: 'LT', slow: 'RT', focusCar: 'LB RB', scrub: 'D-PAD', look: 'R STICK', hide: 'L3', retry: 'X' };
const MOUSE_TEXT = { confirm: 'CLICK', back: 'R CLICK', move: 'HOVER', pick: 'CLICK', drag: 'DRAG', scrub: 'WHEEL' };
// Draws a glyph at (x,y) for `action`; returns its width.
export function glyph(hud, x, y, action, device, xbox = false) {
  if (device === 'pad') {
    const face = PS_NAME[action];
    if (face) { if (xbox) { const l = XB_NAME[face]; hud.rect(x, y - 1, 11, 11, 'ink'); hud.rect(x + 1, y, 9, 9, XB_COL[l]); hud.text(x + 3, y + 1, l, { color: 'ink', shadow: XB_COL[l] }); return 12; } hud.sprite(x, y, FACE[face], { x: FACE_COL[face] }); return 12; }
    const t = (xbox ? XB_TEXT : PAD_TEXT)[action] ?? action.toUpperCase(); return pill(hud, x, y, t, 'slate');
  }
  if (device === 'mouse' && MOUSE_TEXT[action]) return pill(hud, x, y, MOUSE_TEXT[action], 'blue');
  const t = KEY_NAME[action] ?? action.toUpperCase(); return pill(hud, x, y, t, 'mist', true);
}
function pill(hud, x, y, text, colour, key = false) { const w = hud.measure(text).width + 5; hud.rect(x, y - 1, w, 10, 'ink'); hud.rect(x + 1, y, w - 2, key ? 8 : 8, colour); if (key) hud.rect(x + 1, y + 7, w - 2, 1, 'slate'); hud.text(x + 3, y + 1, text, { color: key ? 'ink' : 'white', shadow: colour }); return w + 1; }
export function promptWidth(hud, device, items, xbox) { let w = 0; for (const [a, l] of items) w += (device === 'pad' && PS_NAME[a] ? 12 : hud.measure((device === 'pad' ? (xbox ? XB_TEXT : PAD_TEXT) : device === 'mouse' && MOUSE_TEXT[a] ? MOUSE_TEXT : KEY_NAME)[a] ?? a.toUpperCase()).width + 6) + hud.measure(l).width + 10; return w; }
