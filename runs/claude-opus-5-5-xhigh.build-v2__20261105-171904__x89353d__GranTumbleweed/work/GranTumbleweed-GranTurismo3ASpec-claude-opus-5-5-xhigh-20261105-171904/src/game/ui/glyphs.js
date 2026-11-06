// Button glyphs as pixel sprites. PlayStation and Xbox sets, keycaps and mouse icons. prompt() picks by the last device used.
const SHAPE = {
  cross: ['.........', '.x.....x.', '..x...x..', '...x.x...', '....x....', '...x.x...', '..x...x..', '.x.....x.', '.........'],
  circle: ['.........', '...xxx...', '..x...x..', '.x.....x.', '.x.....x.', '.x.....x.', '..x...x..', '...xxx...', '.........'],
  square: ['.........', '.xxxxxxx.', '.x.....x.', '.x.....x.', '.x.....x.', '.x.....x.', '.x.....x.', '.xxxxxxx.', '.........'],
  triangle: ['.........', '....x....', '....x....', '...x.x...', '...x.x...', '..x...x..', '..x...x..', '.xxxxxxx.', '.........'],
};
const COLOURS = { cross: 'sky', circle: 'red', square: 'orange', triangle: 'lime' };
const XBOX = { cross: ['A', 'lime'], circle: ['B', 'red'], square: ['X', 'sky'], triangle: ['Y', 'sand'] };
const DISC = ['...xxxxx...', '..xxxxxxx..', '.xxxxxxxxx.', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', '.xxxxxxxxx.', '..xxxxxxx..', '...xxxxx...'];
const DPAD = ['....xxx....', '....xxx....', '....xxx....', 'xxxxxxxxxxx', 'xxxxxxxxxxx', 'xxxxxxxxxxx', '....xxx....', '....xxx....', '....xxx....'];
const STICK = ['...xxxxx...', '..x.....x..', '.x..xxx..x.', 'x..xxxxx..x', 'x..xxxxx..x', 'x..xxxxx..x', '.x..xxx..x.', '..x.....x..', '...xxxxx...'];
const MOUSE_L = ['..xxxxx..', '.xoox.xx.', '.xoox.xx.', '.xoox.xx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '..xxxxx..'];
const MOUSE_R = ['..xxxxx..', '.xx.xoox.', '.xx.xoox.', '.xx.xoox.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '..xxxxx..'];
const MOUSE_W = ['..xxxxx..', '.xx.o.xx.', '.xx.o.xx.', '.xx.o.xx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '.xxxxxxx.', '..xxxxx..'];
const XBOX_NAMES = { L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', 'L1 R1': 'LB RB', 'R1 L1': 'RB LB' };
export function glyphWidth(hud, spec, xbox) {
  if (['cross', 'circle', 'square', 'triangle', 'dpad', 'stick', 'stickR', 'options'].includes(spec)) return 11;
  if (spec === 'lmb' || spec === 'rmb' || spec === 'mouse' || spec === 'wheel') return 9;
  const txt = spec.startsWith('key:') ? spec.slice(4) : xbox && XBOX_NAMES[spec] ? XBOX_NAMES[spec] : spec;
  return hud.measure(txt).width + 6;
}
// Draws a glyph with top-left at (x, y). Returns its width.
export function drawGlyph(hud, x, y, spec, xbox = false) {
  const col = { x: 'white', o: 'sand' };
  if (SHAPE[spec]) {
    hud.sprite(x, y, DISC, { x: 'night' });
    if (xbox) { const [l, c] = XBOX[spec]; hud.text(x + 3, y + 2, l, { color: c, shadow: false }); }
    else hud.sprite(x + 1, y + 1, SHAPE[spec], { x: COLOURS[spec] });
    return 11;
  }
  if (spec === 'dpad') { hud.sprite(x, y + 1, DPAD, { x: 'mist' }); return 11; }
  if (spec === 'stick' || spec === 'stickR') { hud.sprite(x, y + 1, STICK, { x: spec === 'stickR' ? 'sky' : 'mist' }); return 11; }
  if (spec === 'options') { hud.sprite(x, y, DISC, { x: 'night' }); for (const k of [3, 5, 7]) hud.rect(x + 3, y + k, 5, 1, 'white'); return 11; }
  if (spec === 'lmb') { hud.sprite(x, y + 1, MOUSE_L, col); return 9; }
  if (spec === 'rmb') { hud.sprite(x, y + 1, MOUSE_R, col); return 9; }
  if (spec === 'mouse') { hud.sprite(x, y + 1, MOUSE_W.map((r) => r.replace(/o/g, 'x')), col); return 9; }
  if (spec === 'wheel') { hud.sprite(x, y + 1, MOUSE_W, col); return 9; }
  const txt = spec.startsWith('key:') ? spec.slice(4) : xbox && XBOX_NAMES[spec] ? XBOX_NAMES[spec] : spec, w = hud.measure(txt).width + 6;
  hud.rect(x, y, w, 11, 'mist'); hud.rect(x + 1, y + 1, w - 2, 9, 'night'); hud.rect(x + 1, y + 8, w - 2, 2, 'ink');
  hud.text(x + 3, y + 2, txt, { color: 'white', shadow: false });
  return w;
}
export { ACTION_GLYPHS, specFor } from '../input/prompts.js';
