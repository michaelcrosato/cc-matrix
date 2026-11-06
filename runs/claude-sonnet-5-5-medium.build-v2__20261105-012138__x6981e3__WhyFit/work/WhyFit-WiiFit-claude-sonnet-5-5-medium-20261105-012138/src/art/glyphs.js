// Button glyph sprites, drawn by code: PlayStation shapes, Xbox letters, keycaps, a mouse.
import { say, widthOf } from '../ui/font.js';
const SYM = {
  cross: ['o.....o', '.o...o.', '..o.o..', '...o...', '..o.o..', '.o...o.', 'o.....o'],
  circle: ['..ooo..', '.o...o.', 'o.....o', 'o.....o', 'o.....o', '.o...o.', '..ooo..'],
  square: ['ooooooo', 'o.....o', 'o.....o', 'o.....o', 'o.....o', 'o.....o', 'ooooooo'],
  triangle: ['...o...', '..o.o..', '..o.o..', '.o...o.', '.o...o.', 'ooooooo', '.......'],
};
const disc = (r) => { const rows = []; for (let y = -r; y <= r; y++) { let s = ''; for (let x = -r; x <= r; x++) s += x * x + y * y <= r * r + r * 0.6 ? 'b' : '.'; rows.push(s); } return rows; };
const DISC = disc(6);
const PS_COL = { cross: 'blue', circle: 'red', square: 'plum', triangle: 'green' };
const XB_COL = { A: 'green', B: 'red', X: 'blue', Y: 'sand' };
export function drawDisc(hud, x, y, body, label, symbol, symColor = 'white') {
  hud.sprite(x, y, DISC, { b: body }, { shadow: 'ink' });
  if (symbol) hud.sprite(x + 3, y + 3, SYM[symbol], { o: symColor }, { shadow: false });
  else if (label) say(hud, x + 3, y + 3, label, { color: symColor, shadow: false });
  return 13;
}
function cap(hud, x, y, label, color = 'mist', ink = 'ink') {
  const w = Math.max(11, widthOf(label) + 5);
  hud.rect(x, y + 1, w, 12, 'ink'); hud.rect(x + 1, y, w - 2, 12, color);
  say(hud, x + 3, y + 2, label, { color: ink, shadow: false });
  return w;
}
function pill(hud, x, y, label, hi = false) {
  const w = widthOf(label) + 5;
  hud.rect(x, y + 2, w, 9, 'ink'); hud.rect(x + 1, y + 1, w - 2, 10, hi ? 'sky' : 'slate');
  say(hud, x + 3, y + 2, label, { color: 'white', shadow: false });
  return w;
}
function mouse(hud, x, y, btn) {
  const rows = ['.ooooooo.', 'o...o...o', 'o...o...o', 'o...o...o', 'ooooooooo', 'o.......o', 'o.......o', '.o.....o.', '..ooooo..'];
  hud.sprite(x, y, rows, { o: 'mist' }, { shadow: false });
  if (btn === 'left') hud.rect(x + 1, y + 1, 3, 3, 'orange');
  if (btn === 'right') hud.rect(x + 5, y + 1, 3, 3, 'orange');
  return 11;
}
/** Draw one glyph by device set: 'ps' | 'xbox' | 'kb' | 'mouse'. name: cross|circle|square|triangle|L1|R1|L2|R2|options|stick|dpad|key:<label>|mouse:left|mouse:right|mouse */
export function glyph(hud, set, name, x, y) {
  if (name.startsWith('key:')) return cap(hud, x, y, name.slice(4));
  if (name.startsWith('mouse')) return mouse(hud, x, y, name.split(':')[1]);
  if (set === 'ps' || set === 'xbox') {
    const xb = set === 'xbox';
    const map = { cross: 'A', circle: 'B', square: 'X', triangle: 'Y' };
    if (map[name]) return xb ? drawDisc(hud, x, y, XB_COL[map[name]], map[name], null, 'ink') : drawDisc(hud, x, y, 'mist', null, name, PS_COL[name]);
    if (name === 'options') return xb ? pill(hud, x, y, 'MENU') : pill(hud, x, y, 'OPTIONS');
    if (name === 'stick') return drawDisc(hud, x, y, 'slate', 'LS', null, 'white');
    if (name === 'dpad') return pill(hud, x, y, 'D-PAD');
    const L = { L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT' };
    return pill(hud, x, y, xb ? L[name] ?? name : name, true);
  }
  return cap(hud, x, y, name);
}
export const GLYPH_MAP = {
  confirm: { pad: 'cross', kb: 'key:Enter', mouse: 'mouse:left' },
  back: { pad: 'circle', kb: 'key:Esc', mouse: 'mouse:right' },
  pause: { pad: 'options', kb: 'key:Esc', mouse: 'key:Esc' },
  tabs: { pad: 'L1', kb: 'key:Q', mouse: 'mouse' },
  tabsR: { pad: 'R1', kb: 'key:E', mouse: 'mouse' },
  move: { pad: 'stick', kb: 'key:WASD', mouse: 'mouse' },
  lean: { pad: 'stick', kb: 'key:WASD', mouse: 'mouse' },
  breath: { pad: 'R2', kb: 'key:Space', mouse: 'mouse:left' },
  footL: { pad: 'L1', kb: 'key:F', mouse: 'mouse:left' },
  footR: { pad: 'R1', kb: 'key:J', mouse: 'mouse:right' },
  jump: { pad: 'cross', kb: 'key:Space', mouse: 'mouse:left' },
  wave: { pad: 'triangle', kb: 'key:V', mouse: 'key:V' },
  sit: { pad: 'square', kb: 'key:B', mouse: 'key:B' },
  ready: { pad: 'cross', kb: 'key:Enter', mouse: 'mouse:left' },
  more: { pad: 'triangle', kb: 'key:M', mouse: 'key:M' },
  triangle: { pad: 'triangle', kb: 'key:M', mouse: 'key:M' },
  select: { pad: 'stick', kb: 'key:Arrows', mouse: 'mouse' },
};
/** Draw "[glyph] verb" prompts in a row; returns end x. set: 'ps'|'xbox'|'kb'|'mouse'. */
export function promptRow(hud, set, items, x, y, opts = {}) {
  const dev = set === 'ps' || set === 'xbox' ? 'pad' : set;
  for (const [act, verb] of items) {
    const g = GLYPH_MAP[act]?.[dev] ?? act;
    x += glyph(hud, set, g, x, y) + 3;
    x = say(hud, x, y + 3, verb, { color: opts.color ?? 'white' }) + 9;
  }
  return x;
}
export function promptWidth(set, items) {
  const dev = set === 'ps' || set === 'xbox' ? 'pad' : set;
  let w = 0;
  for (const [act, verb] of items) {
    const g = GLYPH_MAP[act]?.[dev] ?? act;
    const gw = g.startsWith('key:') ? Math.max(11, widthOf(g.slice(4)) + 5) : g.startsWith('mouse') ? 11 : (set === 'ps' || set === 'xbox') && /^(cross|circle|square|triangle|stick)$/.test(g) ? 13 : widthOf(set === 'xbox' ? ({ L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', options: 'MENU' }[g] ?? g) : g.toUpperCase()) + 5;
    w += gw + 3 + widthOf(verb) + 9;
  }
  return w;
}
