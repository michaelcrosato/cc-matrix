/* ---- GLYPHS: button icons drawn in game pixels for the device used last (PlayStation symbols by default, Xbox letters
 * in Settings, keycaps for the keyboard, a mouse with its button lit). Canvas text can embed {a:attack}, which draws that
 * action's icon inline. HTML text (the Shell) uses input.label() ---- */
const Glyph = {};
Glyph.device = () => { const d = typeof game !== 'undefined' ? game.input.lastDevice : 'keyboard'; return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'keys'; };
Glyph.code = (a, dev = Glyph.device()) => {
  const codes = (game.input.map[a] || []).filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  if (dev === 'pad') return codes.find(c => /^Pad\d/.test(c)) || codes[0];
  if (dev === 'mouse') return codes.find(c => /^Mouse/.test(c)) || codes.find(c => !/^(Pad|Mouse)/.test(c)) || codes[0];
  return codes.find(c => !/^(Pad|Mouse)/.test(c)) || codes.find(c => /^Mouse/.test(c)) || codes[0];
};
Glyph.family = () => (game.input.padStyle && game.input.padStyle() === 'xbox') || game.settings.glyphs === 'xbox' ? 'xbox' : 'ps';
const PS_FACE = [['#7ab4ff', 'x'], ['#ff6a6a', 'o'], ['#ff8ad8', 'sq'], ['#5ae0a0', 'tri']];
const XB_FACE = [['#5ad05a', 'A'], ['#ff5a4a', 'B'], ['#4a9aff', 'X'], ['#f0c83a', 'Y']];
const PAD_NAMES = { ps: ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3'], xbox: ['', '', '', '', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] };
const tinyW = s => E.font.width(s, { font: 'tiny' });
const tinyT = (g, s, x, y, c) => E.font.text(g, s, x, y, c, { font: 'tiny', outline: false });
/** draw one code's icon with its top-left at (x, y), height 10; returns its width (dry: measure only) */
Glyph.drawCode = (g, code, x, y, dry = false) => {
  x = Math.round(x); y = Math.round(y);
  if (!code) return 0;
  const pm = /^Pad(\d+)$/.exec(code);
  if (pm) {
    const n = +pm[1], fam = Glyph.family();
    if (n <= 3) {   // a face button: a dark disc with its symbol
      if (dry) return 10;
      px.disc(g, x + 5, y + 5, 5, '#101018'); px.disc(g, x + 5, y + 5, 4, '#26263a');
      if (fam === 'xbox') { const [c, l] = XB_FACE[n]; px.disc(g, x + 5, y + 5, 4, c); tinyT(g, l, x + 4, y + 3, '#101018'); return 10; }
      const [c, s] = PS_FACE[n];
      if (s === 'x') { px.line(g, x + 3, y + 3, x + 7, y + 7, c); px.line(g, x + 7, y + 3, x + 3, y + 7, c); }
      else if (s === 'o') { px.disc(g, x + 5, y + 5, 3, c); px.disc(g, x + 5, y + 5, 2, '#26263a'); }
      else if (s === 'sq') { px.rect(g, x + 3, y + 3, 5, 5, c); px.rect(g, x + 4, y + 4, 3, 3, '#26263a'); }
      else { px.line(g, x + 5, y + 2, x + 2, y + 7, c); px.line(g, x + 5, y + 2, x + 8, y + 7, c); px.line(g, x + 2, y + 7, x + 8, y + 7, c); }
      return 10;
    }
    if (n >= 12 && n <= 15) {   // the d-pad: a cross with the used arm lit
      if (dry) return 10;
      px.rect(g, x + 3, y, 4, 10, '#101018'); px.rect(g, x, y + 3, 10, 4, '#101018'); px.rect(g, x + 4, y + 1, 2, 8, '#4a4a60'); px.rect(g, x + 1, y + 4, 8, 2, '#4a4a60');
      const lit = '#f4ead5'; if (n === 12) px.rect(g, x + 4, y + 1, 2, 3, lit); if (n === 13) px.rect(g, x + 4, y + 6, 2, 3, lit); if (n === 14) px.rect(g, x + 1, y + 4, 3, 2, lit); if (n === 15) px.rect(g, x + 6, y + 4, 3, 2, lit);
      return 10;
    }
    const name = (PAD_NAMES[fam] || PAD_NAMES.ps)[n] || 'PS', w = tinyW(name) + (n >= 8 && n <= 9 ? 8 : 6);
    if (dry) return w;
    if (n >= 10) { px.disc(g, x + w / 2, y + 5, 5, '#101018'); px.disc(g, x + w / 2, y + 5, 4, '#3a3a50'); tinyT(g, name, x + 3, y + 3, '#f4ead5'); return w; }   // a stick press: a ring
    px.rect(g, x + 1, y + 1, w - 2, 8, '#101018'); px.rect(g, x, y + 2, w, 6, '#101018'); px.rect(g, x + 1, y + 2, w - 2, 6, n >= 8 ? '#3a3a50' : '#4a4a62');
    tinyT(g, name, x + (n >= 8 ? 4 : 3), y + 3, '#f4ead5'); return w;
  }
  const mm = /^Mouse(\d)$/.exec(code);
  if (mm) {   // a mouse with its button lit
    if (dry) return 8;
    const b = +mm[1]; px.rect(g, x + 1, y, 6, 10, '#101018'); px.rect(g, x + 2, y + 1, 4, 8, '#d8d0c0'); px.rect(g, x + 2, y + 4, 4, 1, '#101018'); px.rect(g, x + 4, y + 1, 0 + 1, 3, '#101018');
    const lit = '#e8b04a'; if (b === 0) px.rect(g, x + 2, y + 1, 2, 3, lit); else if (b === 2) px.rect(g, x + 5, y + 1, 1, 3, lit); else px.rect(g, x + 4, y + 1, 1, 3, lit);
    return 8;
  }
  let label = String(game.input.codeLabel(code) || code).toUpperCase().replace('LEFT ', 'L').replace('RIGHT ', 'R');
  if (label.length > 6) label = label.slice(0, 6);
  const w = Math.max(10, tinyW(label) + 6);
  if (dry) return w;
  px.rect(g, x, y, w, 10, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 8, '#e8e0cc'); px.rect(g, x + 1, y + 7, w - 2, 2, '#a8a090');
  tinyT(g, label, x + Math.round((w - tinyW(label)) / 2), y + 2, '#1a1418'); return w;
};
/** an action's icon on the current device (or o.dev): returns its width */
Glyph.draw = (g, a, x, y, o = {}) => Glyph.drawCode(g, Glyph.code(a, o.dev), x, y, o.dry);
Glyph.width = (a, o = {}) => Glyph.drawCode(null, Glyph.code(a, o.dev), 0, 0, true);
/** canvas text with inline {a:action} icons: returns its width. o: { align: 'left' | 'center' | 'right', scale, shadow } */
Glyph.text = (g, str, x, y, color = '#f4ead5', o = {}) => {
  const parts = String(str).split(/(\{a:[a-zA-Z0-9]+\})/).filter(s => s.length), sc = o.scale || 1, opt = { shadow: o.shadow === undefined ? '#000' : o.shadow, outline: false, scale: sc };
  const meas = p => { const m = /^\{a:(\w+)\}$/.exec(p); return m ? Glyph.width(m[1], o) + 2 : E.font.width(p, opt); };
  const W = parts.reduce((s, p) => s + meas(p), 0);
  if (o.dry) return W;
  let cx = Math.round(o.align === 'center' ? x - W / 2 : o.align === 'right' ? x - W : x);
  for (const p of parts) {
    const m = /^\{a:(\w+)\}$/.exec(p);
    if (m) { cx += Glyph.draw(g, m[1], cx, y - 2 + (sc - 1) * 3, o) + 2; }
    else { E.font.text(g, p, cx, y, color, opt); cx += E.font.width(p, opt); }
  }
  return W;
};
/** the HTML (Shell) label of an action for the device used last: 'Space', '✕', 'Left click' */
Glyph.label = a => { const c = Glyph.code(a); return c ? game.input.codeLabel(c) : game.input.label(a); };
B.Glyph = Glyph;
