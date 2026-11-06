// Pixel-art button glyphs drawn as hud.sprite rows, about 11 x 11. Keys get a cap drawn around their letter.
const S = {
  CROSS: ['...ooooo...', '.oo.....oo.', '.o.x...x.o.', 'o...x.x...o', 'o....x....o', 'o...x.x...o', '.o.x...x.o.', '.oo.....oo.', '...ooooo...'],
  CIRCLE: ['...ooooo...', '.oo.....oo.', '.o..xxx..o.', 'o..x...x..o', 'o..x...x..o', 'o..x...x..o', '.o..xxx..o.', '.oo.....oo.', '...ooooo...'],
  SQUARE: ['...ooooo...', '.oo.....oo.', '.o.xxxxx.o.', 'o..x...x..o', 'o..x...x..o', 'o..x...x..o', '.o.xxxxx.o.', '.oo.....oo.', '...ooooo...'],
  TRIANGLE: ['...ooooo...', '.oo.....oo.', '.o...x...o.', 'o...x.x...o', 'o..x...x..o', 'o.xxxxxxx.o', '.o.......o.', '.oo.....oo.', '...ooooo...'],
  UP: ['....xxx....', '...xxxxx...', '...xxxxx...', 'ooo.....ooo', 'o.........o', 'o.........o', 'ooo.....ooo', '....o.o....', '....ooo....'],
  DOWN: ['....ooo....', '....o.o....', 'ooo.....ooo', 'o.........o', 'o.........o', 'ooo.....ooo', '...xxxxx...', '...xxxxx...', '....xxx....'],
  LEFT: ['....ooo....', '....o.o....', 'xxx.o.o.ooo', 'xxx.....o..', 'xxx.....o..', 'xxx.....o..', 'xxx.o.o.ooo', '....o.o....', '....ooo....'],
  RIGHT: ['....ooo....', '....o.o....', 'ooo.o.o.xxx', '..o.....xxx', '..o.....xxx', '..o.....xxx', 'ooo.o.o.xxx', '....o.o....', '....ooo....'],
  LMB: ['..ooooooo..', '.oxxxxoo.o.', '.oxxxxo..o.', '.oxxxxo..o.', '.ooooooooo.', '.o.......o.', '.o.......o.', '.o.......o.', '..ooooooo..'],
  RMB: ['..ooooooo..', '.o.ooxxxxo.', '.o..oxxxxo.', '.o..oxxxxo.', '.ooooooooo.', '.o.......o.', '.o.......o.', '.o.......o.', '..ooooooo..'],
  MMB: ['..ooooooo..', '.o..oxo..o.', '.o..oxo..o.', '.o..oxo..o.', '.ooooooooo.', '.o.......o.', '.o.......o.', '.o.......o.', '..ooooooo..'],
  WHEEL: ['..ooooooo..', '.o..oxo..o.', '.o..oxo..o.', '.o..oxo..o.', '.ooooooooo.', '.o...x...o.', '.o..xxx..o.', '.o...x...o.', '..ooooooo..'],
};
const COLORS = { CROSS: 'cyan', CIRCLE: 'red', SQUARE: 'orange', TRIANGLE: 'lime', A: 'lime', B: 'red', X: 'sky', Y: 'sand' };
// A 3 x 5 alphabet for what goes inside a pad button, so labels stay pixel art at 11 px wide.
const TINY = {
  A: ['.x.', 'x.x', 'xxx', 'x.x', 'x.x'], B: ['xx.', 'x.x', 'xx.', 'x.x', 'xx.'], L: ['x..', 'x..', 'x..', 'x..', 'xxx'], R: ['xx.', 'x.x', 'xx.', 'x.x', 'x.x'],
  S: ['.xx', 'x..', '.x.', '..x', 'xx.'], T: ['xxx', '.x.', '.x.', '.x.', '.x.'], X: ['x.x', 'x.x', '.x.', 'x.x', 'x.x'], Y: ['x.x', 'x.x', '.x.', '.x.', '.x.'],
  1: ['.x.', 'xx.', '.x.', '.x.', 'xxx'], 2: ['xx.', '..x', '.x.', 'x..', 'xxx'], 3: ['xx.', '..x', '.x.', '..x', 'xx.'],
};
/** The five rows of a label, padded to the width inside a frame. */
const inside = (label, w) => [0, 1, 2, 3, 4].map((r) => {
  const row = label.split('').map((c) => TINY[c][r]).join('.');
  const left = ((w - row.length) / 2) | 0;
  return '.'.repeat(left) + row + '.'.repeat(w - row.length - left);
});
// Bumpers are square-shouldered, triggers have a rounded top, sticks and Xbox's face buttons are round.
const bumper = (label) => ['.ooooooooo.', 'o.........o', ...inside(label, 9).map((r) => `o${r}o`), 'o.........o', '.ooooooooo.'];
const trigger = (label) => ['..ooooooo..', '.o.......o.', ...inside(label, 9).map((r) => `o${r}o`), 'o.........o', '.ooooooooo.'];
const round = (label) => { const m = inside(label, 7); return ['...ooooo...', '.oo.....oo.', `.o${m[0]}o.`, `o.${m[1]}.o`, `o.${m[2]}.o`, `o.${m[3]}.o`, `.o${m[4]}o.`, '.oo.....oo.', '...ooooo...']; };
const pill = (rows) => ['.ooooooooo.', 'o.........o', ...rows.map((r) => `o.${r}.o`), 'o.........o', '.ooooooooo.'];
Object.assign(S, {
  L1: bumper('L1'), R1: bumper('R1'), L2: trigger('L2'), R2: trigger('R2'), L3: round('L3'), R3: round('R3'),
  LB: bumper('LB'), RB: bumper('RB'), LT: trigger('LT'), RT: trigger('RT'), LS: round('LS'), RS: round('RS'),
  A: round('A'), B: round('B'), X: round('X'), Y: round('Y'),
  OPTIONS: pill(['xxxxxxx', '.......', 'xxxxxxx', '.......', 'xxxxxxx']),
  MENU: pill(['xxxxxxx', '.......', 'xxxxxxx', '.......', 'xxxxxxx']),
  CREATE: pill(['.....x.', '...xx..', '.xx....', '...xx..', '.....x.']),
  VIEW: pill(['xxxxx..', 'x...xx.', 'x...x.x', 'xxxxx.x', '..xxxxx']),
});
const SPRITES = { ...S };
export const CAP_WIDTH = (label) => Math.max(11, label.length * 6 + 5);
/** Draw one glyph. Returns its width in art pixels. */
/** The glyphs drawn this frame, for state() and the tests. */
export const drawnGlyphs = [];
export function drawGlyph(hud, x, y, name, { device, anchor = 'top-left' } = {}) {
  drawnGlyphs.push(name);
  const sp = SPRITES[name];
  if (sp) {
    hud.sprite(x, y, sp, { o: 'white', x: COLORS[name] ?? 'sand' }, { anchor });
    return 11;
  }
  // Keys: a cap drawn around the label.
  const w = CAP_WIDTH(name);
  hud.rect(x, y, w, 11, 'ink', anchor);
  hud.rect(x, y, w, 1, 'white', anchor); hud.rect(x, y + 10, w, 1, 'white', anchor);
  hud.rect(x, y, 1, 11, 'white', anchor); hud.rect(x + w - 1, y, 1, 11, 'white', anchor);
  hud.text(x + 3, y + 2, name, { color: 'white', shadow: false, anchor });
  return w;
}
export const glyphWidth = (name) => (SPRITES[name] ? 11 : CAP_WIDTH(name));
export const GLYPH_NAMES = Object.keys(SPRITES);
export const glyphSprite = (name) => SPRITES[name];
