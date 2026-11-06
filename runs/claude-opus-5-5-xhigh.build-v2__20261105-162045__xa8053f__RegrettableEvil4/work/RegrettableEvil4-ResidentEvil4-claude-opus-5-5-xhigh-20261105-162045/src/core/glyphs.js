// Button glyphs as pixel data: PlayStation, Xbox, keycaps and a mouse. drawGlyph returns the width drawn.
const DISC = [
  '...kkkkk...',
  '.kkkkkkkkk.',
  '.kkkkkkkkk.',
  'kkkkkkkkkkk',
  'kkkkkkkkkkk',
  'kkkkkkkkkkk',
  'kkkkkkkkkkk',
  'kkkkkkkkkkk',
  '.kkkkkkkkk.',
  '.kkkkkkkkk.',
  '...kkkkk...',
];
const over = (base, rows, dy = 2, dx = 2) => base.map((r, y) => r.split('').map((c, x) => {
  const row = rows[y - dy];
  const ch = row ? row[x - dx] : undefined;
  return ch && ch !== '.' ? ch : c;
}).join(''));

const SHAPES = {
  cross: { rows: over(DISC, ['o.....o', '.o...o.', '..o.o..', '...o...', '..o.o..', '.o...o.', 'o.....o']), colors: { k: 'ink', o: 'sky' } },
  circle: { rows: over(DISC, ['..ooo..', '.o...o.', 'o.....o', 'o.....o', 'o.....o', '.o...o.', '..ooo..']), colors: { k: 'ink', o: 'orange' } },
  square: { rows: over(DISC, ['ooooooo', 'o.....o', 'o.....o', 'o.....o', 'o.....o', 'o.....o', 'ooooooo']), colors: { k: 'ink', o: 0xd070c0 } },
  triangle: { rows: over(DISC, ['...o...', '...o...', '..o.o..', '..o.o..', '.o...o.', '.o...o.', 'ooooooo']), colors: { k: 'ink', o: 'lime' } },
  a: { rows: over(DISC, ['...o...', '..o.o..', '..o.o..', '.o...o.', '.ooooo.', 'o.....o', 'o.....o']), colors: { k: 'green', o: 'white' } },
  b: { rows: over(DISC, ['ooooo..', 'o....o.', 'o....o.', 'ooooo..', 'o....o.', 'o....o.', 'ooooo..']), colors: { k: 'red', o: 'white' } },
  x: { rows: over(DISC, ['o.....o', '.o...o.', '..o.o..', '...o...', '..o.o..', '.o...o.', 'o.....o']), colors: { k: 'blue', o: 'white' } },
  y: { rows: over(DISC, ['o.....o', '.o...o.', '..o.o..', '...o...', '...o...', '...o...', '...o...']), colors: { k: 'orange', o: 'ink' } },
  stick: { rows: over(DISC, ['..ooo..', '.ooooo.', 'ooooooo', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..']), colors: { k: 'ink', o: 'slate' } },
  dpad: { rows: ['....ooo....', '....ooo....', '....ooo....', '....ooo....', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', '....ooo....', '....ooo....', '....ooo....', '....ooo....'], colors: { o: 'mist' } },
  dpadUp: { rows: ['....hhh....', '....hhh....', '....hhh....', '....hhh....', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', '....ooo....', '....ooo....', '....ooo....', '....ooo....'], colors: { o: 'slate', h: 'white' } },
  dpadDown: { rows: ['....ooo....', '....ooo....', '....ooo....', '....ooo....', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', '....hhh....', '....hhh....', '....hhh....', '....hhh....'], colors: { o: 'slate', h: 'white' } },
  dpadLeft: { rows: ['....ooo....', '....ooo....', '....ooo....', '....ooo....', 'hhhhooooooo', 'hhhhooooooo', 'hhhhooooooo', '....ooo....', '....ooo....', '....ooo....', '....ooo....'], colors: { o: 'slate', h: 'white' } },
  dpadRight: { rows: ['....ooo....', '....ooo....', '....ooo....', '....ooo....', 'oooooooohhh', 'oooooooohhh', 'oooooooohhh', '....ooo....', '....ooo....', '....ooo....', '....ooo....'], colors: { o: 'slate', h: 'white' } },
  mouse: { rows: ['..ooooooo..', '.oLLLoRRRo.', '.oLLLoRRRo.', '.oLLLoRRRo.', '.ooooooooo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '..ooooooo..'], colors: { o: 'white', L: 'slate', R: 'slate', b: 'night' } },
  mouseL: { rows: ['..ooooooo..', '.oLLLoRRRo.', '.oLLLoRRRo.', '.oLLLoRRRo.', '.ooooooooo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '..ooooooo..'], colors: { o: 'white', L: 'orange', R: 'slate', b: 'night' } },
  mouseR: { rows: ['..ooooooo..', '.oLLLoRRRo.', '.oLLLoRRRo.', '.oLLLoRRRo.', '.ooooooooo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '..ooooooo..'], colors: { o: 'white', L: 'slate', R: 'orange', b: 'night' } },
  mouseW: { rows: ['..ooooooo..', '.oLLLWRRRo.', '.oLLLWRRRo.', '.oLLLWRRRo.', '.ooooooooo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '.obbbbbbbo.', '..ooooooo..'], colors: { o: 'white', L: 'slate', R: 'slate', W: 'orange', b: 'night' } },
};

/** Which glyph each action shows, by scheme. Strings starting with `key:` are keycaps, `pill:` shoulder pills. */
export const PROMPTS = {
  confirm: { ps: 'cross', xb: 'a', kbm: 'key:ENTER' },
  back: { ps: 'circle', xb: 'b', kbm: 'key:ESC' },
  secondary: { ps: 'square', xb: 'x', kbm: 'mouseR' },
  tertiary: { ps: 'triangle', xb: 'y', kbm: 'key:X' },
  tabPrev: { ps: 'pill:L1', xb: 'pill:LB', kbm: 'key:Q' },
  tabNext: { ps: 'pill:R1', xb: 'pill:RB', kbm: 'key:E' },
  arrange: { ps: 'pill:R1', xb: 'pill:RB', kbm: 'key:F' },
  action: { ps: 'cross', xb: 'a', kbm: 'key:E' },
  qte1: { ps: 'cross', xb: 'a', kbm: 'key:E' },
  qte2: { ps: 'circle', xb: 'b', kbm: 'key:SPACE' },
  run: { ps: 'circle', xb: 'b', kbm: 'key:SHIFT' },
  turn: { ps: 'circle', xb: 'b', kbm: 'key:Q' },
  reload: { ps: 'square', xb: 'x', kbm: 'key:R' },
  case: { ps: 'triangle', xb: 'y', kbm: 'key:TAB' },
  pause: { ps: 'pill:OPTIONS', xb: 'pill:MENU', kbm: 'key:ESC' },
  map: { ps: 'pill:CREATE', xb: 'pill:VIEW', kbm: 'key:M' },
  aim: { ps: 'pill:L2', xb: 'pill:LT', kbm: 'mouseR' },
  fire: { ps: 'pill:R2', xb: 'pill:RT', kbm: 'mouseL' },
  knife: { ps: 'pill:R1', xb: 'pill:RB', kbm: 'mouseL' },
  throw: { ps: 'pill:L1', xb: 'pill:LB', kbm: 'key:G' },
  weapon: { ps: 'dpadUp', xb: 'dpadUp', kbm: 'mouseW' },
  heal: { ps: 'dpadLeft', xb: 'dpadLeft', kbm: 'key:H' },
  command: { ps: 'dpadRight', xb: 'dpadRight', kbm: 'key:C' },
  swap: { ps: 'pill:R3', xb: 'pill:R3', kbm: 'key:T' },
  move: { ps: 'stick', xb: 'stick', kbm: 'key:WASD' },
  look: { ps: 'stick', xb: 'stick', kbm: 'mouse' },
  skip: { ps: 'cross', xb: 'a', kbm: 'key:SPACE' },
};

export function glyphName(action, device, settings) {
  const p = PROMPTS[action];
  if (!p) return `key:${action}`;
  if (device.kind === 'pad') return settings.glyphs === 'xbox' ? p.xb : p.ps;
  return p.kbm;
}

function pill(hud, x, y, label, scale, outline) {
  const w = hud.measure(label).width * scale + 5 * scale;
  const h = 11 * scale;
  hud.rect(x + scale, y, w - 2 * scale, h, outline);
  hud.rect(x, y + scale, w, h - 2 * scale, outline);
  hud.rect(x + scale, y + scale, w - 2 * scale, h - 2 * scale, 'ink');
  hud.text(x + 3 * scale, y + 2 * scale, label, { color: 'white', scale, shadow: false });
  return w;
}

export function drawGlyph(hud, x, y, name, scale = 1) {
  if (name.startsWith('key:')) return pill(hud, x, y, name.slice(4), scale, 'white');
  if (name.startsWith('pill:')) return pill(hud, x, y, name.slice(5), scale, 'mist');
  const g = SHAPES[name] ?? SHAPES.stick;
  hud.sprite(x, y, g.rows, g.colors, { scale, shadow: false });
  return g.rows[0].length * scale;
}

export function glyphWidth(hud, name, scale = 1) {
  if (name.startsWith('key:')) return hud.measure(name.slice(4)).width * scale + 5 * scale;
  if (name.startsWith('pill:')) return hud.measure(name.slice(5)).width * scale + 5 * scale;
  return (SHAPES[name] ?? SHAPES.stick).rows[0].length * scale;
}
