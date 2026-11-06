// Prompts: PlayStation, Xbox, keycaps and mouse icons as hud.sprite rows, about 11×11 art pixels.
const pad = (rows, c = 'white') => ({ rows, colors: { '#': c, o: 'ink' } });
const CIRCLE_BASE = ['...#####...', '..#ooooo#..', '.#ooooooo#.', '#ooooooooo#', '#ooooooooo#', '#ooooooooo#', '#ooooooooo#', '#ooooooooo#', '.#ooooooo#.', '..#ooooo#..', '...#####...'];
function stamp(inner, ic) { const r = CIRCLE_BASE.map((s) => s.split('')); inner.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') r[y + 2][x + 2] = 'i'; })); return { rows: r.map((a) => a.join('')), colors: { '#': 'mist', o: 'ink', i: ic } }; }
const PS = {
  cross: stamp(['x.....x', '.x...x.', '..x.x..', '...x...', '..x.x..', '.x...x.', 'x.....x'], 'sky'),
  circle: stamp(['..xxx..', '.x...x.', 'x.....x', 'x.....x', 'x.....x', '.x...x.', '..xxx..'], 'red'),
  square: stamp(['xxxxxxx', 'x.....x', 'x.....x', 'x.....x', 'x.....x', 'x.....x', 'xxxxxxx'], 'orange'),
  triangle: stamp(['...x...', '...x...', '..x.x..', '..x.x..', '.x...x.', '.x...x.', 'xxxxxxx'], 'lime'),
};
const LETTER = { A: ['..x..', '.x.x.', 'x...x', 'x...x', 'xxxxx', 'x...x', 'x...x'], B: ['xxxx.', 'x...x', 'x...x', 'xxxx.', 'x...x', 'x...x', 'xxxx.'], X: ['x...x', 'x...x', '.x.x.', '..x..', '.x.x.', 'x...x', 'x...x'], Y: ['x...x', 'x...x', '.x.x.', '..x..', '..x..', '..x..', '..x..'] };
const pad1 = (rows) => rows.map((r) => `.${r}.`);
const XB = { cross: stamp(pad1(LETTER.A), 'lime'), circle: stamp(pad1(LETTER.B), 'red'), square: stamp(pad1(LETTER.X), 'sky'), triangle: stamp(pad1(LETTER.Y), 'sand') };
export const MOUSE = {
  left: { rows: ['..#####..', '.#xx#oo#.', '#xxx#ooo#', '#xxx#ooo#', '#########', '#ooooooo#', '#ooooooo#', '#ooooooo#', '#ooooooo#', '.#ooooo#.', '..#####..'], colors: { '#': 'mist', o: 'ink', x: 'sand' } },
  right: { rows: ['..#####..', '.#oo#xx#.', '#ooo#xxx#', '#ooo#xxx#', '#########', '#ooooooo#', '#ooooooo#', '#ooooooo#', '#ooooooo#', '.#ooooo#.', '..#####..'], colors: { '#': 'mist', o: 'ink', x: 'sand' } },
  wheel: { rows: ['..#####..', '.#oo#oo#.', '#ooxxxoo#', '#ooxxxoo#', '#ooxxxoo#', '#########', '#ooooooo#', '#ooooooo#', '#ooooooo#', '.#ooooo#.', '..#####..'], colors: { '#': 'mist', o: 'ink', x: 'sand' } },
};
/** action → how each device shows it. */
const MAP = {
  confirm: { pad: 'cross', key: 'ENTER', mouse: 'left' }, back: { pad: 'circle', key: 'ESC', mouse: 'right' }, alt: { pad: 'square', key: 'T' }, info: { pad: 'triangle', key: 'I' },
  tabL: { pad: 'L1', xb: 'LB', key: 'Q' }, tabR: { pad: 'R1', xb: 'RB', key: 'E' }, tabs: { pad: 'L1/R1', xb: 'LB/RB', key: 'Q/E' }, pause: { pad: 'OPTIONS', xb: 'MENU', key: 'ESC' }, move: { pad: 'DPAD', key: 'ARROWS' }, lr: { pad: '</>', key: '</>' }, updown: { pad: 'UP/DN', key: 'UP/DN' },
  more: { pad: 'triangle', key: 'M' }, slow: { pad: 'R2', xb: 'RT', key: 'SHIFT' }, hide: { pad: 'square', key: 'H' }, camera: { pad: 'triangle', key: 'C' }, recover: { pad: 'triangle', key: 'R' }, retire: { pad: 'circle', key: 'ESC' },
  steer: { pad: 'L STICK', key: 'A D' }, go: { pad: 'R2', xb: 'RT', key: 'W' }, brake: { pad: 'L2', xb: 'LT', key: 'S' }, hand: { pad: 'square', key: 'SPACE' }, shift: { pad: 'L1 R1', xb: 'LB RB', key: 'Q E' },
};
const ICONS = { cross: 1, circle: 1, square: 1, triangle: 1 };
/** Draw one glyph; returns its width. */
export function drawGlyph(hud, x, y, action, device, xbox = false) {
  const m = MAP[action] ?? { key: action, pad: action }, dev = device === 'pad' ? 'pad' : device === 'mouse' && m.mouse ? 'mouse' : 'key';
  if (dev === 'mouse') { const g = MOUSE[m.mouse]; hud.sprite(x, y, g.rows, g.colors); return 9; }
  let name = dev === 'pad' ? (xbox && m.xb ? m.xb : m.pad) : m.key;
  if (dev === 'pad' && ICONS[name]) { const g = (xbox ? XB : PS)[name]; hud.sprite(x, y, g.rows, g.colors); return 11; }
  const w = name.length * 6 + 5;
  hud.rect(x, y, w, 11, 'mist'); hud.rect(x + 1, y + 1, w - 2, 9, 'ink'); hud.text(x + 3, y + 2, name, { color: 'white', shadow: false });
  return w;
}
export const glyphWidth = (action, device, xbox = false) => { const m = MAP[action] ?? { key: action, pad: action }, dev = device === 'pad' ? 'pad' : device === 'mouse' && m.mouse ? 'mouse' : 'key'; if (dev === 'mouse') return 9; const n = dev === 'pad' ? (xbox && m.xb ? m.xb : m.pad) : m.key; if (dev === 'pad' && ICONS[n]) return 11; return n.length * 6 + 5; };
void pad;
