// Drawing helpers on the engine HUD (480x270 art pixels): text, panels, glyph prompts.
import { textRows, textWidth, wrapText, LINE } from './font.js';
export { textWidth, wrapText, LINE };
const DISC = ['..#####..', '.#######.', '#########', '#########', '#########', '#########', '#########', '.#######.', '..#####..'];
const SYM = {
  cross: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], circle: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  square: ['#####', '#...#', '#...#', '#...#', '#####'], triangle: ['..#..', '.#.#.', '.#.#.', '#...#', '#####'],
};
export const PS_COL = { cross: 'sky', circle: 'red', square: 'plum', triangle: 'lime' };
export const XB_COL = { A: 'lime', B: 'red', X: 'sky', Y: 'sand' };
export class Draw {
  constructor(hud) { this.hud = hud; this.W = 480; this.H = 270; }
  begin() { this.hud.clear(); }
  rect(x, y, w, h, c) { this.hud.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), c); }
  text(x, y, s, color = 'ink', o = {}) {
    s = String(s); const t = textRows(s); let px = x;
    if (o.align === 'center') px = x - Math.floor(t.w / 2); else if (o.align === 'right') px = x - t.w;
    px = Math.round(px); y = Math.round(y);
    if (o.shadow) this.hud.sprite(px + 1, y + 1, t.rows, { '#': o.shadow }, { shadow: false });
    this.hud.sprite(px, y, t.rows, { '#': color }, { shadow: false });
    return t.w;
  }
  /** Wrapped paragraph; returns height. Optional maxLines. */
  para(x, y, s, w, color = 'ink', o = {}) {
    const lines = wrapText(s, w); const n = o.maxLines ? Math.min(lines.length, o.maxLines) : lines.length;
    for (let i = 0; i < n; i++) this.text(x, y + i * LINE, lines[i], color, o);
    return n * LINE;
  }
  panel(x, y, w, h, o = {}) {
    const fill = o.fill ?? 'white', trim = o.trim ?? 'sand';
    this.rect(x + 2, y + 2, w, h, o.shadow ?? 'night');
    this.rect(x, y, w, h, 'ink'); this.rect(x + 1, y + 1, w - 2, h - 2, trim); this.rect(x + 3, y + 3, w - 6, h - 6, fill);
  }
  disc(x, y, col, sym, symCol = 'white') {
    this.hud.sprite(x, y, DISC, { '#': col }, { shadow: false });
    if (SYM[sym]) this.hud.sprite(x + 2, y + 2, SYM[sym], { '#': symCol }, { shadow: false });
    return 9;
  }
  /** A prompt glyph for an action label. dev: 'pad' | 'kb'; glyphs: 'ps' | 'xbox'. Returns width. */
  glyph(x, y, spec, dev, glyphs) {
    // spec: { ps: 'cross'|'L1'..., xb: 'A', kb: 'E' }
    if (dev === 'pad') {
      if (glyphs === 'xbox') {
        const a = spec.xb ?? spec.ps; const col = XB_COL[a];
        if (col) { this.hud.sprite(x, y, DISC, { '#': col }, { shadow: false }); this.text(x + 2, y + 1, a, 'ink'); return 9; }
        return this.cap(x, y, a);
      }
      const p = spec.ps; if (SYM[p]) return this.disc(x, y, PS_COL[p], p);
      return this.cap(x, y, p, 'night', 'white');
    }
    return this.cap(x, y, spec.kb ?? '?');
  }
  cap(x, y, label, fill = 'white', ink = 'ink') {
    const w = textWidth(label) + 5; this.rect(x, y + 1, w, 10, 'ink'); this.rect(x + 1, y + 2, w - 2, 8, fill); this.rect(x + 1, y + 10, w - 2, 1, 'mist');
    this.text(x + 3, y + 2, label, ink); return w;
  }
}
