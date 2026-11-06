// Button glyphs: PlayStation (default), Xbox, keyboard and mouse. Prompts follow the last input device.
import { PALETTE } from '../../pixel-engine.js';

const D = (c) => [
  '...ooooo...', '..ooooooo..', '.ooooooooo.', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', 'ooooooooooo', '.ooooooooo.', '..ooooooo..', '...ooooo...',
].map((r) => r);
const SYM = {
  cross: ['...........', '...........', '..w.....w..', '...w...w...', '....w.w....', '.....w.....', '....w.w....', '...w...w...', '..w.....w..', '...........', '...........'],
  circle: ['...........', '...........', '....www....', '...w...w...', '...w...w...', '...w...w...', '...w...w...', '....www....', '...........', '...........', '...........'],
  square: ['...........', '...........', '...wwwww...', '...w...w...', '...w...w...', '...w...w...', '...w...w...', '...wwwww...', '...........', '...........', '...........'],
  triangle: ['...........', '.....w.....', '....w.w....', '....w.w....', '...w...w...', '...w...w...', '..wwwwwww..', '...........', '...........', '...........', '...........'],
};
const sprite = (sym, color) => {
  const base = D(); const s = SYM[sym];
  return base.map((row, y) => [...row].map((ch, x) => (ch === 'o' ? (s[y][x] === 'w' ? 'w' : 'o') : '.')).join(''));
};
const PS = { cross: ['cross', 'sky'], circle: ['circle', 'red'], square: ['square', 'plum'], triangle: ['triangle', 'lime'] };
const XB = { cross: ['A', 'lime'], circle: ['B', 'red'], square: ['X', 'sky'], triangle: ['Y', 'sand'] };
const PADLABEL_PS = { l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', options: 'OPT', create: 'CRT', dpadUp: 'UP', dpadDown: 'DN', dpadLeft: 'LT', dpadRight: 'RT', lstick: 'LS', rstick: 'RS', r3: 'R3' };
const PADLABEL_XB = { l1: 'LB', r1: 'RB', l2: 'LT', r2: 'RT', options: 'MNU', create: 'VW', dpadUp: 'UP', dpadDown: 'DN', dpadLeft: 'LT', dpadRight: 'RT', lstick: 'LS', rstick: 'RS', r3: 'RS' };

// action -> { pad: padKey, key: label }
export const ACTIONS = {
  skill1: { pad: 'cross', key: 'LMB' }, skill2: { pad: 'square', key: 'RMB' }, skill3: { pad: 'triangle', key: '1' }, skill4: { pad: 'circle', key: '2' }, skill5: { pad: 'r1', key: '3' }, skill6: { pad: 'r2', key: '4' },
  dodge: { pad: 'l2', key: 'SPACE' }, potion: { pad: 'l1', key: 'Q' }, interact: { pad: 'cross', key: 'E' }, hero: { pad: 'create', key: 'I' }, pause: { pad: 'options', key: 'ESC' }, map: { pad: 'dpadUp', key: 'M' },
  equip: { pad: 'dpadLeft', key: 'F' }, bell: { pad: 'dpadDown', key: 'T' }, labels: { pad: 'r3', key: 'ALT' }, move: { pad: 'lstick', key: 'WASD' }, aim: { pad: 'rstick', key: 'MOUSE' },
  ok: { pad: 'cross', key: 'ENTER' }, back: { pad: 'circle', key: 'ESC' }, alt1: { pad: 'square', key: 'X' }, alt2: { pad: 'triangle', key: 'V' }, tabPrev: { pad: 'l1', key: 'Q' }, tabNext: { pad: 'r1', key: 'E' }, nav: { pad: 'lstick', key: 'ARROWS' },
  cycle: { pad: 'dpadRight', key: 'TAB' }, skip: { pad: 'cross', key: 'ENTER' }, join: { pad: 'options', key: '' },
};

export class Glyphs {
  constructor() { this.device = 'kbm'; this.set = 'ps'; }
  width(hud, action) {
    const a = ACTIONS[action]; if (!a) return 0;
    if (this.device === 'pad') { const p = (this.set === 'ps' ? PS : XB)[a.pad]; return p ? 12 : hud.measure((this.set === 'ps' ? PADLABEL_PS : PADLABEL_XB)[a.pad] || a.pad).width + 6; }
    return hud.measure(a.key).width + 6;
  }
  /** Draw a glyph at (x, y) (top-left); returns its width. */
  draw(hud, x, y, action, opts = {}) {
    const a = ACTIONS[action]; if (!a) return 0;
    if (this.device === 'pad') {
      const p = (this.set === 'ps' ? PS : XB)[a.pad];
      if (p) {
        if (this.set === 'ps') hud.sprite(x, y, sprite(p[0]), { o: p[1], w: 'white' });
        else { hud.sprite(x, y, sprite('square').map((r) => r.replace(/w/g, 'o')), { o: p[1] }); hud.text(x + 3, y + 2, p[0], { color: 'ink', shadow: false }); }
        this.record && this.record(action, 'pad:' + this.set + ':' + a.pad);
        return 12;
      }
      const lab = (this.set === 'ps' ? PADLABEL_PS : PADLABEL_XB)[a.pad] || a.pad; const w = hud.measure(lab).width + 6;
      hud.rect(x, y, w, 11, 'slate'); hud.rect(x + 1, y + 1, w - 2, 9, 'night'); hud.text(x + 3, y + 2, lab, { color: 'white', shadow: false });
      this.record && this.record(action, 'pad:' + this.set + ':' + a.pad);
      return w + 1;
    }
    const lab = a.key; const w = hud.measure(lab).width + 6;
    hud.rect(x, y, w, 11, 'mist'); hud.rect(x + 1, y + 1, w - 2, 9, 'slate'); hud.text(x + 3, y + 2, lab, { color: 'white', shadow: false });
    this.record && this.record(action, 'key:' + lab);
    return w + 1;
  }
}
