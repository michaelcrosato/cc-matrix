// CRACKMANIA prompts (PLAN §3.3, §7.6): PlayStation glyphs (✕ ○ □ △ in their colours), Xbox letters (A B X Y in
// coloured circles) when the Settings say so, keycaps for the keyboard, mouse icons for the mouse; prompt bars that
// follow the device used last
import { ctx, E } from '../ctx.js';
const px = () => E.px, F = () => E.font;
const PS = { '✕': ['cross', '#7aa8ff'], '○': ['circle', '#ff6a6a'], '□': ['square', '#ff8ad8'], '△': ['triangle', '#4ae0b0'] };
const XB = { A: '#3ac850', B: '#e8402a', X: '#2a7ae8', Y: '#ffc21a' };
/** the width a glyph for this label takes (scale 1) */
export function glyphW(label, dev) {
  if (dev === 'gamepad') { if (PS[label] || XB[label]) return 13; return F().width(label) + 8; }
  if (dev === 'mouse' && /click/.test(label)) return 11;
  return Math.max(11, F().width(label) + 7);
}
/** draw a glyph at (x, y) (its top left), 12 px tall; returns its width */
export function glyph(g, x, y, label, dev) {
  const P = px(), f = F();
  x = Math.round(x); y = Math.round(y);
  if (dev === 'gamepad') {
    const ps = PS[label];
    if (ps) {
      P.disc(g, x + 6, y + 6, 6, '#1a1a24'); P.disc(g, x + 6, y + 6, 5, '#2a2a38');
      const c = ps[1];
      if (ps[0] === 'cross') { P.line(g, x + 3, y + 3, x + 9, y + 9, c, 2); P.line(g, x + 9, y + 3, x + 3, y + 9, c, 2); }
      else if (ps[0] === 'circle') { P.disc(g, x + 6, y + 6, 3.5, c); P.disc(g, x + 6, y + 6, 2, '#2a2a38'); }
      else if (ps[0] === 'square') { P.rect(g, x + 3, y + 3, 7, 7, c); P.rect(g, x + 5, y + 5, 3, 3, '#2a2a38'); }
      else { P.poly(g, [[x + 6, y + 2], [x + 10, y + 9], [x + 2, y + 9]], c); P.poly(g, [[x + 6, y + 5], [x + 8, y + 8], [x + 4, y + 8]], '#2a2a38'); }
      return 13;
    }
    if (XB[label]) { P.disc(g, x + 6, y + 6, 6, '#1a1a24'); P.disc(g, x + 6, y + 6, 5, XB[label]); f.text(g, label, x + 6, y + 3, '#ffffff', { align: 'center', outline: false }); return 13; }
    // shoulders, triggers, sticks, Options: a rounded pill
    const w = f.width(label) + 8; P.rect(g, x, y + 1, w, 10, '#1a1a24'); P.rect(g, x + 1, y + 2, w - 2, 8, '#3a3a4c'); f.text(g, label, x + w / 2, y + 3, '#ffffff', { align: 'center', outline: false }); return w;
  }
  if (dev === 'mouse' && /click/i.test(label)) {
    const right = /Right/.test(label), mid = /Middle/.test(label);
    P.rect(g, x + 1, y, 9, 12, '#1a1a24'); P.rect(g, x + 2, y + 1, 7, 10, '#e8e8f0'); P.rect(g, x + 5, y + 1, 1, 5, '#1a1a24');
    P.rect(g, right ? x + 6 : mid ? x + 5 : x + 2, y + 1, mid ? 1 : 3, 5, '#ff8a2a');
    return 11;
  }
  const w = Math.max(11, f.width(label) + 7);
  P.rect(g, x, y, w, 12, '#1a1a24'); P.rect(g, x + 1, y + 1, w - 2, 9, '#e8e4d8'); P.rect(g, x + 1, y + 10, w - 2, 1, '#9a968c');
  f.text(g, label, x + w / 2, y + 2, '#1a1a24', { align: 'center', outline: false });
  return w;
}
/** the device prompts should show for an input */
export function devOf(I) { const d = (I || ctx.game.input).lastDevice; return d === 'touch' ? 'keyboard' : d; }
/** the label for an action on the device (mouse: its mouse button if it has one, else its key) */
export function labelOf(action, I = ctx.game.input, dev = devOf(I)) {
  if (dev === 'mouse') { const m = I.map[action] || []; const mb = m.find(c => c.startsWith('Mouse')); if (mb) return I.codeLabel(mb); return I.label(action, 'keyboard'); }
  return I.label(action, dev === 'gamepad' ? 'gamepad' : 'keyboard');
}
/** [glyph] word pairs in a row: items [[action | label-override, word]]; align 'center' | 'left' | 'right'; returns its width */
export function promptRow(g, x, y, items, o = {}) {
  const I = o.input || ctx.game.input, dev = o.dev || devOf(I), sc = o.scale || 1, gap = 10;
  const parts = items.filter(Boolean).map(([a, word]) => { const lab = typeof a === 'string' && a.startsWith('=') ? a.slice(1) : labelOf(a, I, dev); return { lab, word, w: glyphW(lab, dev) + 4 + F().width(word) }; });
  const W = parts.reduce((s, p) => s + p.w, 0) + gap * Math.max(0, parts.length - 1);
  let cx = o.align === 'center' ? x - W / 2 : o.align === 'right' ? x - W : x;
  for (const p of parts) { const gw = glyph(g, cx, y, p.lab, dev); F().text(g, p.word, cx + gw + 4, y + 2, o.color || '#ffffff', { shadow: '#000', outline: false }); cx += p.w + gap; }
  return W;
}
/** the bar along the bottom of a screen */
export function promptBar(g, r, items, o = {}) {
  const y = r.H - 18;
  E.px.blend(g, .55, 'normal', () => E.px.rect(g, 0, y - 4, r.W, 22, '#05040a'));
  promptRow(g, r.W / 2, y, items, Object.assign({ align: 'center' }, o));
}
