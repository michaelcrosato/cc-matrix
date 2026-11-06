// On-screen prompts follow the last input: PlayStation glyphs, Xbox on request, keys and mouse for keyboard.
const c = (rows, colors) => ({ rows, colors });
const CIRCLE = (sym) => [
  '...bbbbb...',
  '..bbbbbbb..',
  '.bbbbbbbbb.',
  ...sym,
  '.bbbbbbbbb.',
  '..bbbbbbb..',
  '...bbbbb...',
];
const padRow = (s) => s;
const PS_CROSS = ['bbb.bbb.bbb', 'bbbb...bbbb', 'bbbbb.bbbbb', 'bbbb...bbbb', 'bbb.bbb.bbb'].map((r) => r.replace(/\./g, 'x').replace(/x/g, 'w'));
const PS_CIRCLE = ['bbbwwwwwbbb', 'bbwbbbbbwbb', 'bbwbbbbbwbb', 'bbwbbbbbwbb', 'bbbwwwwwbbb'];
const PS_SQUARE = ['bbwwwwwwwbb', 'bbwbbbbbwbb', 'bbwbbbbbwbb', 'bbwbbbbbwbb', 'bbwwwwwwwbb'];
const PS_TRI = ['bbbbbwbbbbb', 'bbbbwbwbbbb', 'bbbwbbbwbbb', 'bbwbbbbbwbb', 'bwwwwwwwwwb'];
const ps = (sym, color) => c(CIRCLE(sym), { b: color, w: 'white' });
export const PS = { cross: ps(PS_CROSS, 'sky'), circle: ps(PS_CIRCLE, 'red'), square: ps(PS_SQUARE, 'plum'), triangle: ps(PS_TRI, 'lime') };
const LET = {
  A: ['bbbbwwwbbbb', 'bbbwbbbwbbb', 'bbbwwwwwbbb', 'bbbwbbbwbbb', 'bbbwbbbwbbb'], B: ['bbbwwwwbbbb', 'bbbwbbbwbbb', 'bbbwwwwbbbb', 'bbbwbbbwbbb', 'bbbwwwwbbbb'],
  X: ['bbbwbbbwbbb', 'bbbbwbwbbbb', 'bbbbbwbbbbb', 'bbbbwbwbbbb', 'bbbwbbbwbbb'], Y: ['bbbwbbbwbbb', 'bbbbwbwbbbb', 'bbbbbwbbbbb', 'bbbbbwbbbbb', 'bbbbbwbbbbb'],
};
export const XB = { cross: ps(LET.A, 'green'), circle: ps(LET.B, 'red'), square: ps(LET.X, 'blue'), triangle: ps(LET.Y, 'orange') };
const MOUSE_L = c(['..wwwww..', '.rrrwwww.', '.rrrwwww.', '.rrrwwww.', '.wwwwwww.', '.wwwwwww.', '.wwwwwww.', '.wwwwwww.', '..wwwww..'], { w: 'mist', r: 'sand' });
const MOUSE_R = c(['..wwwww..', '.wwwwrrr.', '.wwwwrrr.', '.wwwwrrr.', '.wwwwwww.', '.wwwwwww.', '.wwwwwww.', '.wwwwwww.', '..wwwww..'], { w: 'mist', r: 'sand' });
const DPAD = (dir) => { const on = { up: [0, 1, 2], down: [6, 7, 8], left: [], right: [] }; const rows = ['...www...', '...www...', '...www...', 'wwwwwwwww', 'wwwwwwwww', 'wwwwwwwww', '...www...', '...www...', '...www...'].map((r, y) => [...r].map((ch, x) => { if (ch === '.') return '.'; const hit = (dir === 'up' && y < 3) || (dir === 'down' && y > 5) || (dir === 'left' && x < 3) || (dir === 'right' && x > 5); return hit ? 'r' : 'w'; }).join('')); return c(rows, { w: 'mist', r: 'sand' }); };

// action -> pad key, keyboard label.
export const ACTIONS = {
  confirm: { pad: 'cross', kbm: 'ENTER' }, back: { pad: 'circle', kbm: 'ESC' }, x: { pad: 'square', kbm: 'X' }, y: { pad: 'triangle', kbm: 'V' },
  tabL: { pad: 'L1', kbm: 'Q' }, tabR: { pad: 'R1', kbm: 'E' }, pause: { pad: 'OPT', xb: 'MENU', kbm: 'ESC' }, hero: { pad: 'CRT', xb: 'VIEW', kbm: 'I' }, map: { pad: 'dup', kbm: 'M' }, bell: { pad: 'ddown', kbm: 'T' }, equip: { pad: 'dleft', kbm: 'F' }, cycle: { pad: 'dright', kbm: 'CLICK' },
  skill0: { pad: 'cross', kbm: 'mouseL' }, skill1: { pad: 'square', kbm: 'mouseR' }, skill2: { pad: 'triangle', kbm: '1' }, skill3: { pad: 'circle', kbm: '2' }, skill4: { pad: 'R1', kbm: '3' }, skill5: { pad: 'R2', kbm: '4' },
  dodge: { pad: 'L2', kbm: 'SPC' }, potion: { pad: 'L1', kbm: 'Q' }, interact: { pad: 'cross', kbm: 'E' }, labels: { pad: 'R3', kbm: 'ALT' }, move: { pad: 'LS', kbm: 'WASD' }, aim: { pad: 'RS', kbm: 'mouse' }, skills: { pad: 'CRT', xb: 'VIEW', kbm: 'K' }, more: { pad: 'triangle', kbm: 'M' },
};
const XB_TEXT = { L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', R3: 'RS', LS: 'LS', RS: 'RS', OPT: 'MENU', CRT: 'VIEW' };
// Draws a prompt; returns its width.
export function prompt(ui, x, y, action, device) {
  const a = ACTIONS[action]; if (!a) return 0;
  const dev = device ?? (ui.router.lastDevice === 'pad' ? 'pad' : 'kbm');
  if (dev === 'kbm') {
    const k = a.kbm;
    if (k === 'mouseL' || k === 'mouseR') { const s = k === 'mouseL' ? MOUSE_L : MOUSE_R; ui.sprite(x, y, s.rows, s.colors); ui.lastPromptKind = 'mouse'; return 9; }
    if (k === 'mouse') { ui.sprite(x, y, MOUSE_L.rows, { w: 'mist', r: 'mist' }); return 9; }
    const w = ui.measure(k) + 5; ui.frame(x, y, w, 11, 'mist', 'night'); ui.text(x + 3, y + 2, k, { color: 'white', shadow: false }); ui.lastPromptKind = 'key'; return w;
  }
  const xb = ui.glyphs === 'xbox';
  const k = a.pad;
  if (PS[k]) { const s = (xb ? XB : PS)[k]; ui.sprite(x, y, s.rows, s.colors); ui.lastPromptKind = xb ? 'xbox' : 'playstation'; return 11; }
  if (k.startsWith('d') && k !== 'dup' || k === 'dup') { const dir = k.slice(1); const s = DPAD(dir); ui.sprite(x, y + 1, s.rows, s.colors); return 9; }
  const label = xb ? (XB_TEXT[k] ?? k) : k;
  const w = ui.measure(label) + 5; ui.frame(x, y, w, 11, 'sky', 'navy'); ui.text(x + 3, y + 2, label, { color: 'white', shadow: false }); ui.lastPromptKind = xb ? 'xbox' : 'playstation'; return w;
}
export function promptLine(ui, x, y, parts, o = {}) {
  // parts: [[action, label], ...]; draws left to right from x, or fitted to the right edge with o.right.
  let cx = x;
  for (const [action, label] of parts) { const w = prompt(ui, cx, y, action); cx += w + 3; cx += ui.text(cx, y + 2, label, { color: o.color ?? 'mist' }) + 9; }
  return cx - x;
}
export const footer = (ui, parts) => {
  const y = ui.H - 16; let total = 0; for (const [, label] of parts) total += ui.measure(label) + 26;
  promptLine(ui, Math.max(12, ui.W / 2 - total / 2), y, parts);
};
