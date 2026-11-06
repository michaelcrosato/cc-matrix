// Button glyphs drawn in art pixels: PlayStation and Xbox sets, key caps, mouse buttons. Returns the width drawn.
import { codes } from '../core/actions.js';

const disc = (r) => { const rows = []; for (let y = -r; y <= r; y++) { let row = ''; for (let x = -r; x <= r; x++) row += x * x + y * y <= r * r + 1 ? 'o' : '.'; rows.push(row); } return rows; };
const DISC = disc(5);
const PS = { PadCross: ['blue', 'X'], PadCircle: ['red', 'O'], PadSquare: ['plum', '#'], PadTriangle: ['green', '^'] };
const XB = { PadCross: ['green', 'A'], PadCircle: ['red', 'B'], PadSquare: ['blue', 'X'], PadTriangle: ['orange', 'Y'] };
const PAD_TEXT = {
  ps: { PadL1: 'L1', PadR1: 'R1', PadL2: 'L2', PadR2: 'R2', PadL3: 'L3', PadR3: 'R3', PadUp: 'UP', PadDown: 'DN', PadLeft: 'LT', PadRight: 'RT', PadOptions: 'OPT', PadCreate: 'CRE' },
  xbox: { PadL1: 'LB', PadR1: 'RB', PadL2: 'LT', PadR2: 'RT', PadL3: 'LS', PadR3: 'RS', PadUp: 'UP', PadDown: 'DN', PadLeft: 'LT', PadRight: 'RT', PadOptions: 'MNU', PadCreate: 'VW' },
};
export const KEY_LABEL = { Space: 'SPC', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', Backspace: 'BKSP', ArrowUp: 'UP', ArrowDown: 'DN', ArrowLeft: 'LT', ArrowRight: 'RT', MouseLeft: 'LMB', MouseRight: 'RMB', MouseMiddle: 'MMB', Wheel: 'WHEEL', CapsLock: 'CAPS' };
export const labelOf = (code) => KEY_LABEL[code] || code.replace(/^Key/, '').replace(/^Digit/, '');
/** the code an action shows for the current device */
export function codeFor(action, device) { const c = codes(action); return device === 'pad' ? c.find((x) => x.startsWith('Pad')) : c.find((x) => !x.startsWith('Pad')); }
export function glyphWidth(hud, code, set) {
  if (code.startsWith('Pad')) return PS[code] || XB[code] ? 12 : Math.max(13, hud.measure((PAD_TEXT[set] || PAD_TEXT.ps)[code] || code).width + 5);
  return Math.max(11, hud.measure(labelOf(code)).width + 5);
}
export function drawGlyph(hud, x, y, code, set = 'ps', alpha = 1) {
  if (code.startsWith('Pad')) {
    const face = (set === 'xbox' ? XB : PS)[code];
    if (face) {
      hud.sprite(x, y, DISC, { o: face[0] });
      const ch = face[1] === '#' ? '' : face[1];
      if (face[1] === '#') hud.rect(x + 3, y + 3, 5, 5, 'white'); else hud.text(x + 3, y + 2, ch, { color: 'white', shadow: false });
      return 12;
    }
    const t = (PAD_TEXT[set] || PAD_TEXT.ps)[code] || code; const w = hud.measure(t).width + 5;
    hud.rect(x, y, w, 11, 'slate'); hud.rect(x, y, w, 1, 'mist'); hud.text(x + 3, y + 2, t, { color: 'white', shadow: false });
    return w;
  }
  const t = labelOf(code); const w = Math.max(11, hud.measure(t).width + 5);
  hud.rect(x, y, w, 11, 'mist'); hud.rect(x, y + 10, w, 1, 'slate'); hud.rect(x + 1, y + 1, w - 2, 8, 'white'); hud.text(x + (w - hud.measure(t).width) / 2, y + 2, t, { color: 'ink', shadow: false });
  return w;
}
/** "[glyph] VERB" at (x,y): returns the width */
export function drawPrompt(hud, x, y, action, verb, device, set, opts = {}) {
  const code = typeof action === 'string' && action.startsWith('@') ? action.slice(1) : codeFor(action, device) || 'Enter';
  const w = drawGlyph(hud, x, y, code, set);
  hud.text(x + w + 3, y + 2, verb, { color: opts.color || 'white', shadow: 'ink' });
  return w + 3 + hud.measure(verb).width;
}
export function promptWidth(hud, action, verb, device, set) { const code = codeFor(action, device) || 'Enter'; return glyphWidth(hud, code, set) + 3 + hud.measure(verb).width; }
