/* GLYPHS AND PROMPTS (section 2.3): the pad's buttons drawn by code (the pixel font has no ✕ ○ □ △): PlayStation
 * shapes by default, Xbox letters in Settings; keycaps for the keyboard, a mouse with its button lit. Prompts follow the
 * device each player used last. EF.prompt(g, x, y, action, label, { input, scale, color }) returns its width. */
const PS = { 0: ['cross', '#6aa0ff'], 1: ['circle', '#ff5a5a'], 2: ['square', '#ff7ad0'], 3: ['triangle', '#3ad6a0'] };
const XB = { 0: ['A', '#4ac84a'], 1: ['B', '#e84a4a'], 2: ['X', '#4a8ae8'], 3: ['Y', '#e8c83a'] };
const PILLS = { playstation: { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 16: 'PS' }, xbox: { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS', 16: 'XBOX' } };
EF.Glyphs = {
  style(input) { const g = (input && input.glyphs) || game.settings.glyphs; return g === 'xbox' ? 'xbox' : 'playstation'; },
  /** the code an action is bound to on a device (the logic of input.label) */
  code(input, a, device) {
    const m = input && input.map && input.map[a]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis')), pads = real.filter(c => /^Pad\d+$/.test(c)), keys = real.filter(c => !/^Pad\d+$/.test(c));
    return device === 'gamepad' ? pads[0] || keys[0] : keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  },
  /** width in pixels of a glyph for a code at scale s */
  width(input, code, s = 1) {
    if (!code) return 0;
    if (/^Pad\d+$/.test(code)) { const i = +code.slice(3), st = this.style(input); if (i <= 3) return 11 * s; if (i >= 12 && i <= 15) return 11 * s; const t = PILLS[st][i] || '?'; return (E.font.width(t, { font: 'tiny' }) + 6) * s; }
    if (code.startsWith('Mouse')) return 9 * s;
    const t = input && input.codeLabel ? input.codeLabel(code) : code; return Math.max(11, E.font.width(String(t).toUpperCase(), { font: t.length > 2 ? 'tiny' : 'normal' }) + 6) * s;
  },
  /** draw a glyph for a code with its top-left at (x, y), scale s; returns its width */
  draw(g, input, code, x, y, s = 1, dim = false) {
    if (!code) return 0;
    x = Math.round(x); y = Math.round(y);
    const S = v => Math.round(v * s);
    if (/^Pad\d+$/.test(code)) {
      const i = +code.slice(3), st = this.style(input);
      if (i <= 3) {
        const [k, col] = (st === 'xbox' ? XB : PS)[i], cx = x + S(5.5), cy = y + S(5.5), rr = S(5.5);
        px.disc(g, cx, cy, rr, dim ? '#2a2a34' : '#14141c'); px.disc(g, cx, cy, rr - Math.max(1, s), dim ? '#3a3a48' : '#2a2c3a');
        const c = dim ? '#6a6a78' : col;
        if (st === 'xbox') { px.disc(g, cx, cy, rr - Math.max(1, s), dim ? '#3a3a48' : col); E.font.text(g, k, cx, cy - S(3.5), '#ffffff', { align: 'center', scale: s, outline: false }); }
        else if (k === 'cross') { px.line(g, cx - S(2.5), cy - S(2.5), cx + S(2.5), cy + S(2.5), c, Math.max(1, s)); px.line(g, cx + S(2.5), cy - S(2.5), cx - S(2.5), cy + S(2.5), c, Math.max(1, s)); }
        else if (k === 'circle') { px.disc(g, cx, cy, S(3), c); px.disc(g, cx, cy, S(3) - Math.max(1, s), '#2a2c3a'); }
        else if (k === 'square') { px.rect(g, cx - S(2.5), cy - S(2.5), S(5), S(5), c); px.rect(g, cx - S(2.5) + Math.max(1, s), cy - S(2.5) + Math.max(1, s), S(5) - 2 * Math.max(1, s), S(5) - 2 * Math.max(1, s), '#2a2c3a'); }
        else { const p = [[cx, cy - S(3)], [cx + S(3), cy + S(2.5)], [cx - S(3), cy + S(2.5)]]; px.poly(g, p, c); const q = [[cx, cy - S(1.2)], [cx + S(1.4), cy + S(1.5)], [cx - S(1.4), cy + S(1.5)]]; px.poly(g, q, '#2a2c3a'); }
        return 11 * s;
      }
      if (i >= 12 && i <= 15) { const cx = x + S(5.5), cy = y + S(5.5); px.rect(g, cx - S(1.5), y, S(3), S(11), '#3a3c48'); px.rect(g, x, cy - S(1.5), S(11), S(3), '#3a3c48'); const d = [[0, -1], [0, 1], [-1, 0], [1, 0]][i - 12]; px.rect(g, cx - S(1.5) + d[0] * S(4), cy - S(1.5) + d[1] * S(4), S(3), S(3), '#ffffff'); return 11 * s; }
      const t = PILLS[st][i] || '?', w = (E.font.width(t, { font: 'tiny' }) + 6) * s;
      E.ui.box(g, x, y + S(1), w, S(9), { bg: dim ? '#2a2a34' : '#22242e', border: dim ? '#4a4a58' : '#8a90a8' });
      E.font.text(g, t, x + S(3), y + S(3), dim ? '#8a8a98' : '#ffffff', { font: 'tiny', scale: s, outline: false });
      return w;
    }
    if (code.startsWith('Mouse')) {
      const b = +code.slice(5) || 0, w = S(9);
      px.rect(g, x + S(1), y, S(7), S(11), '#d8dce8'); px.rect(g, x + S(2), y + S(1), S(5), S(9), '#2a2c3a');
      const lit = '#ffc83a'; if (b === 0) px.rect(g, x + S(2), y + S(1), S(2), S(4), lit); else if (b === 2) px.rect(g, x + S(5), y + S(1), S(2), S(4), lit); else px.rect(g, x + S(4), y + S(1), S(1), S(4), lit);
      px.rect(g, x + S(4), y + S(1), S(1), S(4), b === 1 ? lit : '#8a8ea0');
      return w;
    }
    const raw = input && input.codeLabel ? input.codeLabel(code) : code, t = String(raw).toUpperCase(), small = t.length > 2, w = this.width(input, code, s);
    px.rect(g, x, y + S(1), w, S(10), dim ? '#4a4a58' : '#a8acbc'); px.rect(g, x + Math.max(1, s), y + S(1), w - 2 * Math.max(1, s), S(8), dim ? '#3a3a48' : '#e8eaf2');
    E.font.text(g, t, x + w / 2, y + S(small ? 3 : 2), dim ? '#8a8a98' : '#1a1c28', { align: 'center', font: small ? 'tiny' : 'normal', scale: s, outline: false });
    return w;
  }
};
/** the device a prompt shows for a player */
EF.deviceOf = input => (input && input.lastDevice) || 'keyboard';
EF.promptCode = (input, a) => {
  const dev = EF.deviceOf(input);
  if (dev === 'mouse' && (a === 'pass' || a === 'shoot' || a === 'lob')) return { pass: 'Mouse0', shoot: 'Mouse2', lob: 'Mouse1' }[a];
  if (a === 'euphoria' && dev === 'gamepad') return null;   // the chord: drawn as two pills
  return EF.Glyphs.code(input, a, dev === 'gamepad' ? 'gamepad' : 'keyboard');
};
EF.promptWidth = (a, label, o = {}) => {
  const I = o.input || game.input, s = o.scale || 1, dev = EF.deviceOf(I);
  let w = 0;
  if (a === 'euphoria' && dev === 'gamepad') w = EF.Glyphs.width(I, 'Pad4', s) + EF.Glyphs.width(I, 'Pad5', s) + 2 * s + E.font.width('+', { scale: s }) + 2 * s;
  else w = EF.Glyphs.width(I, EF.promptCode(I, a), s);
  return w + (label ? 3 * s + E.font.width(label, { scale: o.textScale || s }) : 0);
};
/** draw a prompt: the action's glyph on this player's device, then the label; returns its width */
EF.prompt = (g, x, y, a, label, o = {}) => {
  const I = o.input || game.input, s = o.scale || 1, dev = EF.deviceOf(I), ts = o.textScale || s;
  let w = 0;
  if (Array.isArray(a)) { for (const one of a) { w += EF.Glyphs.draw(g, I, EF.promptCode(I, one), x + w, y, s) + 2 * s; } w -= 2 * s; }
  else if (a === 'euphoria' && dev === 'gamepad') { w += EF.Glyphs.draw(g, I, 'Pad4', x, y, s); E.font.text(g, '+', x + w + s, y + 2 * s, '#ffffff', { scale: s, outline: '#000' }); w += E.font.width('+', { scale: s }) + 2 * s; w += EF.Glyphs.draw(g, I, 'Pad5', x + w, y, s); }
  else if (/^Pad\d+$|^Mouse\d$|^Key|^Digit|^Enter$|^Escape$|^Space$/.test(a)) w += EF.Glyphs.draw(g, I, a, x, y, s, o.dim);
  else w += EF.Glyphs.draw(g, I, EF.promptCode(I, a), x, y, s, o.dim);
  if (label) { E.font.text(g, label, x + w + 3 * s, y + Math.round((11 * s - 7 * ts) / 2), o.color || '#ffffff', { scale: ts, outline: o.outline === undefined ? '#0b0814' : o.outline, shadow: o.shadow }); w += 3 * s + E.font.width(label, { scale: ts }); }
  return w;
};
/** a row of prompts, centred at x: [[action, label], ...] */
EF.prompts = (g, x, y, list, o = {}) => {
  const gap = 10 * (o.scale || 1), ws = list.map(([a, l]) => EF.promptWidth(a, l, o)), total = ws.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : Math.round(x - total / 2);
  list.forEach(([a, l], i) => { EF.prompt(g, cx, y, a, l, o); cx += ws[i] + gap; });
  return total;
};
