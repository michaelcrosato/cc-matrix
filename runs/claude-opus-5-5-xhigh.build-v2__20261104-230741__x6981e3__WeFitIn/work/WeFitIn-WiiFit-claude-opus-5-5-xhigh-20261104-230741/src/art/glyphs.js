// Button prompts, drawn here: PlayStation shapes, Xbox letters, keycaps, a mouse with the used button lit.
import { say } from '../ui/font.js';
import { disc } from '../ui/widgets.js';

const PINK = 0xe58fd0;
const SHAPES = {
  cross: { color: 'sky', rows: ['o...o', '.o.o.', '..o..', '.o.o.', 'o...o'] },
  circle: { color: 'red', rows: ['.ooo.', 'o...o', 'o...o', 'o...o', '.ooo.'] },
  square: { color: PINK, rows: ['ooooo', 'o...o', 'o...o', 'o...o', 'ooooo'] },
  triangle: { color: 'lime', rows: ['..o..', '..o..', '.o.o.', '.o.o.', 'ooooo'] },
  a: { color: 'lime', rows: ['.ooo.', 'o...o', 'ooooo', 'o...o', 'o...o'] },
  b: { color: 'red', rows: ['oooo.', 'o...o', 'oooo.', 'o...o', 'oooo.'] },
  x: { color: 'sky', rows: ['o...o', '.o.o.', '..o..', '.o.o.', 'o...o'] },
  y: { color: 'sand', rows: ['o...o', '.o.o.', '..o..', '..o..', '..o..'] },
};
const PILLS = { l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT' };

export const GLYPH_NAMES = [...Object.keys(SHAPES), ...Object.keys(PILLS), 'options', 'menu', 'stickL', 'dpad', 'mouse', 'mouseL', 'mouseR', 'wheel', 'pauseIcon'];

const MOUSE = ['..ooo..', '.obbbo.', 'oLLoRRo', 'oLLoRRo', 'oLLoRRo', 'ooooooo', 'obbbbbo', 'obbbbbo', 'obbbbbo', '.obbbo.', '..ooo..'];

function drawMouse(hud, x, y, left, right, wheel = false) {
  hud.sprite(x, y, MOUSE, { o: 'ink', b: 'white', L: left ? 'red' : 'white', R: right ? 'red' : 'white' }, { shadow: false });
  if (wheel) hud.rect(x + 3, y + 1, 1, 4, 'red');
  return 7;
}

export function glyphWidth(name) {
  if (SHAPES[name]) return 11;
  if (PILLS[name]) return 15;
  if (name === 'options' || name === 'menu' || name === 'dpad' || name === 'stickL' || name === 'pauseIcon') return 11;
  if (name === 'mouse' || name === 'mouseL' || name === 'mouseR' || name === 'wheel') return 7;
  return name.length * 6 + 5; // a keycap
}

export function drawGlyph(hud, x, y, name) {
  const shape = SHAPES[name];
  if (shape) {
    disc(hud, x + 5, y + 5, 5.5, 'ink');
    hud.sprite(x + 3, y + 3, shape.rows, { o: shape.color }, { shadow: false });
    return 11;
  }
  if (PILLS[name]) {
    hud.rect(x, y + 1, 15, 9, 'ink');
    hud.rect(x + 1, y, 13, 11, 'ink');
    say(hud, x + 2, y + 2, PILLS[name], { color: 'white', shadow: false, name: 'glyph' });
    return 15;
  }
  switch (name) {
    case 'options':
    case 'menu':
      disc(hud, x + 5, y + 5, 5.5, 'ink');
      for (const dy of [3, 5, 7]) hud.rect(x + 3, y + dy, 5, 1, 'white');
      return 11;
    case 'pauseIcon':
      hud.rect(x, y, 11, 11, 'ink');
      hud.rect(x + 3, y + 2, 2, 7, 'white');
      hud.rect(x + 6, y + 2, 2, 7, 'white');
      return 11;
    case 'stickL':
      disc(hud, x + 5, y + 5, 5.5, 'ink');
      disc(hud, x + 5, y + 5, 3, 'mist');
      hud.rect(x + 4, y + 4, 3, 3, 'white');
      return 11;
    case 'dpad':
      hud.rect(x + 3, y, 5, 11, 'ink');
      hud.rect(x, y + 3, 11, 5, 'ink');
      hud.rect(x + 4, y + 1, 3, 9, 'white');
      hud.rect(x + 1, y + 4, 9, 3, 'white');
      return 11;
    case 'mouse': return drawMouse(hud, x, y, false, false);
    case 'mouseL': return drawMouse(hud, x, y, true, false);
    case 'mouseR': return drawMouse(hud, x, y, false, true);
    case 'wheel': return drawMouse(hud, x, y, false, false, true);
    default: {
      const w = name.length * 6 + 5;
      hud.rect(x, y, w, 11, 'ink');
      hud.rect(x + 1, y + 1, w - 2, 9, 'white');
      hud.rect(x + 1, y + 9, w - 2, 1, 'mist');
      say(hud, x + 3, y + 2, name.toUpperCase(), { color: 'ink', shadow: false, name: 'glyph' });
      return w;
    }
  }
}
