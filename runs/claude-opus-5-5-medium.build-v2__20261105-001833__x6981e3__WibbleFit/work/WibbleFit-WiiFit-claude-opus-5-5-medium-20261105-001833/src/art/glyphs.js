// Button glyphs, drawn here. PlayStation shapes, Xbox letters, keycaps and a mouse.
import { say, textWidth } from '../ui/font.js';
const CIRCLE11 = ['...ooooo...', '..ooooooo..', '.ooooooooo.', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', '.ooooooooo.', '..ooooooo..', '...ooooo...'];
const CROSS = ['x.....x', '.x...x.', '..x.x..', '...x...', '..x.x..', '.x...x.', 'x.....x'];
const RING = ['..xxx..', '.x...x.', 'x.....x', 'x.....x', 'x.....x', '.x...x.', '..xxx..'];
const SQUARE = ['xxxxxxx', 'x.....x', 'x.....x', 'x.....x', 'x.....x', 'x.....x', 'xxxxxxx'];
const TRI = ['...x...', '...x...', '..x.x..', '..x.x..', '.x...x.', '.x...x.', 'xxxxxxx'];
const shapes = { cross: [CROSS, 'sky'], circle: [RING, 'red'], square: [SQUARE, 'orange'], triangle: [TRI, 'lime'] };
const MOUSE = (l, r) => ['..ooooo..', '.o' + (l ? 'LLL' : '...') + 'o' + (r ? 'RR' : '..') + 'o.', 'o.' + (l ? 'LLL' : '...') + 'o' + (r ? 'RR' : '..') + '.o', 'o.' + (l ? 'LLL' : '...') + 'o' + (r ? 'RR' : '..') + '.o', 'ooooooooo', 'o.......o', 'o.......o', 'o.......o', 'o.......o', '.o.....o.', '..ooooo..'];
const STICK = ['...ooooo...', '..o.....o..', '.o..ooo..o.', 'o..ooooo..o', 'o.ooooooo.o', 'o.ooooooo.o', 'o.ooooooo.o', 'o..ooooo..o', '.o..ooo..o.', '..o.....o..', '...ooooo...'];
const XB = { cross: ['A', 'green'], circle: ['B', 'red'], square: ['X', 'blue'], triangle: ['Y', 'sand'] };
export const XB_NAMES = { L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', Options: 'Menu', Create: 'View' };

const round = (hud, x, y, c) => hud.sprite(x, y, CIRCLE11, { o: c }, { shadow: 'ink' });
function cap(hud, x, y, text, fill = 'white', ink = 'ink') {
  const w = Math.max(11, textWidth(text) + 6);
  hud.rect(x + 1, y + 1, w - 1, 11, 'ink');
  hud.rect(x, y, w - 1, 10, fill); hud.rect(x, y + 10, w - 1, 1, 'mist');
  say(hud, x + 3, y + 1, text, { color: ink, shadow: false });
  return w;
}
// Draws a glyph; returns its width. kind: pad buttons by PlayStation name, 'key:Enter', 'mouse:L'.
export function drawGlyph(hud, x, y, kind, glyphSet = 'ps') {
  x = Math.round(x); y = Math.round(y);
  if (kind.startsWith('key:')) return cap(hud, x, y, kind.slice(4));
  if (kind === 'mouse:move') { hud.sprite(x, y, MOUSE(false, false), { o: 'white' }, { shadow: 'ink' }); return 9; }
  if (kind.startsWith('mouse:')) {
    const b = kind.slice(6);
    hud.sprite(x, y, MOUSE(b === 'L', b === 'R'), { o: 'white', L: 'red', R: 'red' }, { shadow: 'ink' });
    if (b === 'wheel') hud.rect(x + 4, y + 2, 1, 3, 'red');
    return 9;
  }
  if (kind === 'stick') { hud.sprite(x, y, STICK, { o: 'white' }, { shadow: 'ink' }); return 11; }
  if (shapes[kind]) {
    if (glyphSet === 'xb') { const [l, c] = XB[kind]; round(hud, x, y, c); say(hud, x + 3, y + 2, l, { color: 'white', shadow: false }); return 11; }
    const [rows, c] = shapes[kind]; round(hud, x, y, 'ink');
    hud.sprite(x + 2, y + 2, rows, { x: c }, { shadow: false }); return 11;
  }
  const name = glyphSet === 'xb' ? XB_NAMES[kind] ?? kind : kind;
  return cap(hud, x, y, name, 'night', 'white');
}
const A = (pad, key, mouse) => ({ pad, key, mouse: mouse ?? key });
export const PROMPTS = {
  confirm: A(['cross'], ['key:Enter'], ['mouse:L']),
  back: A(['circle'], ['key:Esc'], ['mouse:R']),
  pause: A(['Options'], ['key:Esc']),
  lean: A(['stick'], ['key:WASD'], ['mouse:move']),
  breath: A(['R2'], ['key:Space'], ['mouse:L']),
  stepL: A(['L1'], ['key:F'], ['mouse:L']),
  stepR: A(['R1'], ['key:J'], ['mouse:R']),
  feet: A(['L1', 'R1'], ['key:F', 'key:J'], ['mouse:L', 'mouse:R']),
  tabs: A(['L1', 'R1'], ['key:Q', 'key:E'], ['mouse:wheel']),
  jump: A(['cross'], ['key:Space'], ['key:Space']),
  wave: A(['triangle'], ['key:V'], ['key:V']),
  sit: A(['square'], ['key:B'], ['key:B']),
  press: A(['cross'], ['key:Space'], ['mouse:L']),
  more: A(['triangle'], ['key:M'], ['key:M']),
  alt: A(['square'], ['key:R'], ['key:R']),
  walk: A(['stick'], ['key:WASD'], ['mouse:L']),
  adjust: A(['stick'], ['key:A', 'key:D'], ['mouse:L']),
  half: A(['stick'], ['key:Shift'], ['mouse:move']),
};
export const glyphsFor = (action, device) => { const p = PROMPTS[action]; return device === 'pad' ? p.pad : device === 'mouse' ? p.mouse : p.key; };
