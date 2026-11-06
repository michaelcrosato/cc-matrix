// Prompts follow the last input used. Text in data uses tokens resolved at draw time.
import { TOOLS } from '../sim/tools.js';

const SPR = {
  cross: { rows: ['.........', '.x.....x.', '..x...x..', '...x.x...', '....x....', '...x.x...', '..x...x..', '.x.....x.', '.........'], colors: { x: 0x7fb4ff } },
  circle: { rows: ['..xxxxx..', '.x.....x.', 'x.......x', 'x.......x', 'x.......x', 'x.......x', 'x.......x', '.x.....x.', '..xxxxx..'], colors: { x: 0xff6b6b } },
  square: { rows: ['.........', '.xxxxxxx.', '.x.....x.', '.x.....x.', '.x.....x.', '.x.....x.', '.x.....x.', '.xxxxxxx.', '.........'], colors: { x: 0xf08ad0 } },
  triangle: { rows: ['....x....', '...x.x...', '...x.x...', '..x...x..', '..x...x..', '.x.....x.', '.x.....x.', 'xxxxxxxxx', '.........'], colors: { x: 0x6be0b0 } },
  mouseL: { rows: ['.xxxxxx.', 'xoooxxxx', 'xoooxxxx', 'xoooxxxx', 'xxxxxxxx', 'x......x', 'x......x', 'x......x', '.xxxxxx.'], colors: { x: 0xffffff, o: 0xffd24d } },
  mouseR: { rows: ['.xxxxxx.', 'xxxxooox', 'xxxxooox', 'xxxxooox', 'xxxxxxxx', 'x......x', 'x......x', 'x......x', '.xxxxxx.'], colors: { x: 0xffffff, o: 0xffd24d } },
  mouseW: { rows: ['.xxxxxx.', 'xxxooxxx', 'xxxooxxx', 'xxxooxxx', 'xxxxxxxx', 'x......x', 'x......x', 'x......x', '.xxxxxx.'], colors: { x: 0xffffff, o: 0xffd24d } },
  stick: { rows: ['..xxxxx..', '.x.....x.', 'x..xxx..x', 'x.xxxxx.x', 'x.xxxxx.x', 'x.xxxxx.x', 'x..xxx..x', '.x.....x.', '..xxxxx..'], colors: { x: 0xbfc8d8 } },
};
const XB = { cross: ['A', 0x6be07b], circle: ['B', 0xff6b6b], square: ['X', 0x7fb4ff], triangle: ['Y', 0xffd24d] };

// token -> by device: a list of glyph specs. Strings are key names; {s:'name'} sprites; {pad:'L2'} shoulder labels; {face:'cross'} faces.
const pad = (name) => ({ pad: name }), face = (name) => ({ face: name }), key = (name) => ({ key: name }), mouse = (name) => ({ s: name });
const TOKENS = {
  use: { pad: [pad('R2')], kbm: [mouse('mouseL')] },
  back: { pad: [face('circle')], kbm: [key('ESC')] },
  confirm: { pad: [face('cross')], kbm: [key('ENTER')] },
  gift: { pad: [pad('L2')], kbm: [key('SPACE')] },
  steady: { pad: [pad('L1')], kbm: [key('SHIFT')] },
  quick: { pad: [face('square')], kbm: [key('F')] },
  drop: { pad: [face('circle')], kbm: [mouse('mouseR')] },
  rotate: { pad: [{ s: 'stick' }], kbm: [key('Q'), key('E')] },
  table: { pad: [pad('DPAD')], kbm: [key('TAB')] },
  tag: { pad: [face('triangle')], kbm: [key('E')] },
  paddles: { pad: [pad('L2'), pad('R2')], kbm: [mouse('mouseL'), mouse('mouseR')] },
  squeeze: { pad: [pad('L2'), pad('R2')], kbm: [mouse('mouseL'), mouse('mouseR')] },
  more: { pad: [face('triangle')], kbm: [key('M')] },
  pause: { pad: [pad('OPT')], kbm: [key('ESC')] },
  last: { pad: [pad('R1')], kbm: [key('Q')] },
  remind: { pad: [face('triangle')], kbm: [key('E')] },
  move: { pad: [{ s: 'stick' }], kbm: [{ text: 'MOUSE' }] },
  tabl: { pad: [pad('L1')], kbm: [key('Q')] },
  tabr: { pad: [pad('R1')], kbm: [key('E')] },
  skipScene: { pad: [face('triangle')], kbm: [key('ESC')] },
};

export class Prompts {
  constructor(app) { this.app = app; }
  get device() { return this.app.devices.last === 'pad' ? 'pad' : 'kbm'; }
  specs(token) {
    if (token.startsWith('tool:')) {
      const n = +token.slice(5);
      return this.device === 'pad' ? [{ s: 'stick' }, { text: wheelDir(n) }] : [key(String(n))];
    }
    return TOKENS[token]?.[this.device] ?? [{ text: token.toUpperCase() }];
  }
  glyphWidth(spec, hud) {
    if (spec.s) return (SPR[spec.s].rows[0].length) + 1;
    if (spec.face) return 10;
    if (spec.pad) return this.xbName(spec.pad).length * 6 + 5;
    if (spec.key) return spec.key.length * 6 + 5;
    if (spec.text) return hud.measure(spec.text).width + 2;
    return 0;
  }
  xbName(name) { if (this.app.settings.glyphs !== 'xbox') return name; return { L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT', OPT: 'MENU' }[name] ?? name; }
  drawGlyph(hud, x, y, spec) {
    if (spec.s) { const s = SPR[spec.s]; hud.sprite(x, y - 1, s.rows, s.colors); return; }
    if (spec.face) {
      if (this.app.settings.glyphs === 'xbox') { const [ch, col] = XB[spec.face]; hud.rect(x, y - 1, 9, 9, 0x1a1f2b); hud.text(x + 2, y, ch, { color: col, shadow: false }); return; }
      const s = SPR[spec.face]; hud.sprite(x, y - 1, s.rows, s.colors); return;
    }
    if (spec.pad || spec.key) {
      const name = spec.pad ? this.xbName(spec.pad) : spec.key, w = name.length * 6 + 3;
      hud.rect(x, y - 1, w, 9, spec.pad ? 0x2a3142 : 0xe8e8e8);
      hud.text(x + 2, y, name, { color: spec.pad ? 0xffffff : 0x14161e, shadow: false });
      return;
    }
    if (spec.text) hud.text(x, y, spec.text, { color: 0xffd24d });
  }
  /** Break text into word items with glyphs and highlights. */
  items(text, hud, baseColor) {
    const out = [];
    let hl = false;
    const parts = text.split(/(\{[a-z:0-9]+\}|\*)/gi);
    for (const part of parts) {
      if (!part) continue;
      if (part === '*') { hl = !hl; continue; }
      const m = part.match(/^\{([a-z:0-9]+)\}$/i);
      if (m) { for (const spec of this.specs(m[1])) out.push({ spec, w: this.glyphWidth(spec, hud) }); continue; }
      for (const tok of part.split(/(\s+)/)) {
        if (!tok) continue;
        if (/^\s+$/.test(tok)) out.push({ space: true, w: 6 });
        else out.push({ word: tok, color: hl ? 0xffd24d : baseColor, w: hud.measure(tok).width + 1 });
      }
    }
    return out;
  }
  /** Wrapped rich text; returns the number of lines. `limit` reveals only so many characters. */
  draw(hud, x, y, text, { width = 300, color = 0xffffff, lineH = 11, limit = Infinity, center = false, scale = 1 } = {}) {
    const items = this.items(text, hud, color);
    const lines = [[]]; let w = 0;
    for (const it of items) {
      if (it.space && lines[lines.length - 1].length === 0) continue;
      if (!it.space && w + it.w > width && lines[lines.length - 1].length) { lines.push([]); w = 0; }
      lines[lines.length - 1].push(it); w += it.w;
    }
    let shown = 0;
    lines.forEach((ln, i) => {
      let cx = x;
      const lw = ln.reduce((n, q) => n + q.w, 0);
      if (center) cx = x + (width - lw) / 2;
      for (const it of ln) {
        if (it.word) {
          const left = limit - shown;
          if (left > 0) hud.text(Math.round(cx), y + i * lineH, it.word.slice(0, left), { color: it.color, scale });
          shown += it.word.length;
        } else if (it.spec && shown < limit) this.drawGlyph(hud, Math.round(cx), y + i * lineH, it.spec);
        cx += it.w;
      }
    });
    return lines.length;
  }
  lineCount(text, hud, width) {
    const items = this.items(text, hud, 0); let n = 1, w = 0, empty = true;
    for (const it of items) { if (it.space && empty) continue; if (!it.space && w + it.w > width && !empty) { n++; w = 0; empty = true; } w += it.w; empty = false; }
    return n;
  }
  /** A short prompt strip: [glyph] LABEL pairs, bottom-left. */
  strip(hud, x, y, pairs) {
    let cx = x;
    for (const [tok, label] of pairs) {
      for (const spec of this.specs(tok)) { this.drawGlyph(hud, cx, y, spec); cx += this.glyphWidth(spec, hud); }
      cx += 2;
      hud.text(cx, y, label, { color: 0xd8dde8 });
      cx += hud.measure(label).width + 9;
    }
    return cx - x;
  }
}
const DIRS = ['UP', 'UR', 'RIGHT', 'DR', 'DOWN', 'DL', 'LEFT', 'UL'];
const wheelDir = (n) => DIRS[(n - 1) % 8];
export const toolLabel = (id) => id.toUpperCase();
export const toolIndex = (id) => TOOLS.indexOf(id);
