/* 02-glyphs: button icons drawn by code (the pixel font has no ✕ ○ □ △): PlayStation shapes (the default) or Xbox
 * letters for a pad, keycaps for the keyboard, a mouse with its button lit. EF.prompt draws an action's icon for the
 * player's own binding on the device they used last, then its label. */
const PAD_PS = { Pad0: ['x', '#6aa0ff'], Pad1: ['o', '#ff5a5a'], Pad2: ['s', '#ff7ad0'], Pad3: ['t', '#3ad6a0'], Pad4: ['L1'], Pad5: ['R1'], Pad6: ['L2'], Pad7: ['R2'], Pad8: ['CREATE'], Pad9: ['OPTIONS'], Pad10: ['L3'], Pad11: ['R3'], Pad12: ['d', 'up'], Pad13: ['d', 'down'], Pad14: ['d', 'left'], Pad15: ['d', 'right'] };
const PAD_XB = { Pad0: ['A', '#3ac060'], Pad1: ['B', '#e84a4a'], Pad2: ['X', '#3a8af0'], Pad3: ['Y', '#f0c030'], Pad4: ['LB'], Pad5: ['RB'], Pad6: ['LT'], Pad7: ['RT'], Pad8: ['VIEW'], Pad9: ['MENU'], Pad10: ['LS'], Pad11: ['RS'], Pad12: ['d', 'up'], Pad13: ['d', 'down'], Pad14: ['d', 'left'], Pad15: ['d', 'right'] };
const MOUSE_OF = { pass: 0, shoot: 2, lob: 1, confirm: 0, cancel: 2 };
EF.Glyphs = { PAD_PS, PAD_XB };
const isPad = c => /^Pad\d+$/.test(c);
/** the code an action's prompt shows for an input on a device */
function promptCode(input, action, device) {
  const m = (input.map && input.map[action]) || EF.KEYS[action] || [];
  if (device === 'gamepad') return m.find(isPad) || null;
  if (device === 'mouse' && MOUSE_OF[action] != null) return 'Mouse' + MOUSE_OF[action];
  return m.find(c => !isPad(c) && !c.startsWith('Mouse') && !c.startsWith('PadAxis')) || null;
}
EF.promptCode = promptCode;
function glyphStyle(input) { const v = (input && input.glyphs) || game.settings.glyphs || 'playstation'; return v === 'xbox' ? 'xbox' : 'playstation'; }
EF.glyphStyle = glyphStyle;
/** draw one icon for a code at (x, y) (top-left), s = scale; returns its width */
function drawIcon(g, code, x, y, s = 1, style = 'playstation', input = game.input) {
  const S = 11 * s, cx = x + S / 2, cy = y + S / 2;
  if (!code) return 0;
  if (isPad(code)) {
    const def = (style === 'xbox' ? PAD_XB : PAD_PS)[code] || ['?'];
    const [k, col] = def;
    if (k.length === 1 && col) {   // a face button: a disc with its symbol
      px.disc(g, Math.round(cx), Math.round(cy), Math.round(S / 2), '#14141c'); px.disc(g, Math.round(cx), Math.round(cy), Math.round(S / 2) - s, '#2a2a36');
      const r = 3 * s;
      if (style === 'xbox') E.font.text(g, k, Math.round(cx), Math.round(cy - 3.5 * Math.max(1, s * .9)), col, { align: 'center', scale: Math.max(1, Math.round(s)), outline: false });
      else if (k === 'x') { px.line(g, cx - r, cy - r, cx + r, cy + r, col, Math.max(1, s)); px.line(g, cx - r, cy + r, cx + r, cy - r, col, Math.max(1, s)); }
      else if (k === 'o') { px.disc(g, Math.round(cx), Math.round(cy), Math.round(r + .5), col); px.disc(g, Math.round(cx), Math.round(cy), Math.max(1, Math.round(r + .5) - Math.max(1, s)), '#2a2a36'); }
      else if (k === 's') { px.rect(g, Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.max(1, s), col); px.rect(g, Math.round(cx - r), Math.round(cy + r - Math.max(1, s) + 1), Math.round(r * 2), Math.max(1, s), col); px.rect(g, Math.round(cx - r), Math.round(cy - r), Math.max(1, s), Math.round(r * 2), col); px.rect(g, Math.round(cx + r - Math.max(1, s) + 1), Math.round(cy - r), Math.max(1, s), Math.round(r * 2), col); }
      else if (k === 't') { const t = [[cx, cy - r - s * .5], [cx + r + s * .5, cy + r], [cx - r - s * .5, cy + r]]; for (let i = 0; i < 3; i++) px.line(g, t[i][0], t[i][1], t[(i + 1) % 3][0], t[(i + 1) % 3][1], col, Math.max(1, s)); }
      return S;
    }
    if (k === 'd') {   // the d-pad: a cross with one arm lit
      px.rect(g, Math.round(cx - 1.5 * s), Math.round(y), Math.round(3 * s), Math.round(S), '#3a3a48'); px.rect(g, Math.round(x), Math.round(cy - 1.5 * s), Math.round(S), Math.round(3 * s), '#3a3a48');
      const lit = { up: [cx - 1.5 * s, y, 3 * s, 4 * s], down: [cx - 1.5 * s, y + S - 4 * s, 3 * s, 4 * s], left: [x, cy - 1.5 * s, 4 * s, 3 * s], right: [x + S - 4 * s, cy - 1.5 * s, 4 * s, 3 * s] }[col];
      if (lit) px.rect(g, Math.round(lit[0]), Math.round(lit[1]), Math.round(lit[2]), Math.round(lit[3]), '#f4f4f0');
      return S;
    }
    // a shoulder, trigger or system button: a pill with its name
    const fs = Math.max(1, Math.round(s)), w = E.font.width(k, { scale: fs }) + 6 * s;
    px.rect(g, Math.round(x + s), Math.round(y), Math.round(w - 2 * s), Math.round(S), '#14141c'); px.rect(g, Math.round(x), Math.round(y + s), Math.round(w), Math.round(S - 2 * s), '#14141c');
    px.rect(g, Math.round(x + s), Math.round(y + s), Math.round(w - 2 * s), Math.round(S - 2 * s), '#3a3a4c');
    E.font.text(g, k, Math.round(x + w / 2), Math.round(y + (S - 7 * fs) / 2), '#f4f4f0', { align: 'center', scale: fs, outline: false });
    return w;
  }
  if (code.startsWith('Mouse')) {   // a mouse, the button lit
    const b = +code.slice(5), w = 8 * s, h = S;
    px.rect(g, Math.round(x + s), Math.round(y), Math.round(w - 2 * s), Math.round(h), '#e8e8f0'); px.rect(g, Math.round(x), Math.round(y + 2 * s), Math.round(w), Math.round(h - 4 * s), '#e8e8f0');
    px.rect(g, Math.round(x + s), Math.round(y + s), Math.round(w - 2 * s), Math.round(h - 2 * s), '#30303c');
    const lit = b === 0 ? [x + s, y + s, w / 2 - s, h * .45] : b === 2 ? [x + w / 2, y + s, w / 2 - s, h * .45] : [x + w / 2 - s, y + 2 * s, 2 * s, h * .3];
    px.rect(g, Math.round(lit[0]), Math.round(lit[1]), Math.max(1, Math.round(lit[2])), Math.round(lit[3]), '#ffc83a');
    px.rect(g, Math.round(x + w / 2 - s * .5), Math.round(y + s), Math.max(1, Math.round(s)), Math.round(h * .45), '#14141c');
    return w;
  }
  // a keycap with the key's name
  const lab = input.codeLabel ? input.codeLabel(code) : code.replace(/^Key|^Digit/, '');
  const fs = Math.max(1, Math.round(s)), tw = E.font.width(lab, { scale: fs }), w = Math.max(S, tw + 6 * s);
  px.rect(g, Math.round(x), Math.round(y), Math.round(w), Math.round(S), '#14141c');
  px.rect(g, Math.round(x + s), Math.round(y + s), Math.round(w - 2 * s), Math.round(S - 3 * s), '#e8e4d8');
  px.rect(g, Math.round(x + s), Math.round(y + S - 2 * s), Math.round(w - 2 * s), Math.round(s), '#8a8478');
  E.font.text(g, lab, Math.round(x + w / 2), Math.round(y + s + (S - 3 * s - 7 * fs) / 2), '#1a1a22', { align: 'center', scale: fs, outline: false });
  return w;
}
EF.drawIcon = drawIcon;
const deviceOf = input => (input && input.lastDevice === 'gamepad') ? 'gamepad' : input && input.lastDevice === 'mouse' ? 'mouse' : 'keyboard';
EF.deviceOf = deviceOf;
/** the icon for an action plus its label; o: { input, scale, color, device, shadow }. Returns the width drawn */
EF.prompt = (g, x, y, action, label, o = {}) => {
  const input = o.input || game.input, dev = o.device || deviceOf(input), s = o.scale || 1, codes = [].concat(action);
  let w = 0;
  codes.forEach((a, i) => { if (i) { E.font.text(g, o.sep || '+', Math.round(x + w + 1), Math.round(y + 2 * s), o.color || '#fff6e0', { scale: Math.max(1, Math.round(s)), shadow: '#000', outline: false }); w += 7 * s; } w += drawIcon(g, promptCode(input, a, dev), x + w, y, s, glyphStyle(input), input) + 2 * s; });
  if (label) { E.font.text(g, label, Math.round(x + w + 1), Math.round(y + (11 * s - 7 * Math.max(1, Math.round(s))) / 2), o.color || '#fff6e0', { scale: Math.max(1, Math.round(s)), shadow: '#000', outline: false }); w += E.font.width(label, { scale: Math.max(1, Math.round(s)) }) + 3; }
  return w;
};
EF.promptWidth = (action, label, o = {}) => {
  const input = o.input || game.input, dev = o.device || deviceOf(input), s = o.scale || 1, codes = [].concat(action);
  let w = 0;
  for (const [i, a] of codes.entries()) { if (i) w += 7 * s; const c = promptCode(input, a, dev); w += (c ? (isPad(c) ? ((style => { const d = (style === 'xbox' ? PAD_XB : PAD_PS)[c] || ['?']; return d[0].length === 1 ? 11 * s : E.font.width(d[0], { scale: Math.max(1, Math.round(s)) }) + 6 * s; })(glyphStyle(input))) : c.startsWith('Mouse') ? 8 * s : Math.max(11 * s, E.font.width(input.codeLabel ? input.codeLabel(c) : c, { scale: Math.max(1, Math.round(s)) }) + 6 * s)) : 0) + 2 * s; }
  if (label) w += E.font.width(label, { scale: Math.max(1, Math.round(s)) }) + 4;
  return w;
};
/** a row of prompts centred at x: [[action, label], ...] */
EF.promptRow = (g, cx, y, list, o = {}) => {
  const gap = 10 * (o.scale || 1), widths = list.map(([a, l]) => EF.promptWidth(a, l, o)), total = widths.reduce((a, b) => a + b, 0) + gap * (list.length - 1);
  let x = Math.round(cx - total / 2);
  list.forEach(([a, l, oo], i) => { EF.prompt(g, x, y, a, l, oo ? Object.assign({}, o, oo) : o); x += widths[i] + gap; });
  return total;
};
