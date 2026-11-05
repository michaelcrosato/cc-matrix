/* 05-glyphs: prompt badges that follow the device used last: PlayStation shapes (or Xbox letters, a Settings choice)
 * for a controller, keycaps for the keyboard, a mouse with the button lit for the mouse. DH.Glyph.draw(g, action, x, y)
 * draws one and returns its width; DH.Glyph.row(g, [[action, 'TEXT'], ...], x, y, o) a prompt line. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game;
const PS = { 0: ['x', '#5aa8ff'], 1: ['o', '#ff6a6a'], 2: ['sq', '#ff8ad8'], 3: ['tri', '#4ae0a0'] };
const XB = { 0: ['A', '#4ac850'], 1: ['B', '#e84a3a'], 2: ['X', '#3a8ae8'], 3: ['Y', '#f0c020'] };
const PILL = { 4: ['L1', 'LB'], 5: ['R1', 'RB'], 6: ['L2', 'LT'], 7: ['R2', 'RT'], 8: ['CREATE', 'VIEW'], 9: ['OPTIONS', 'MENU'], 10: ['L3', 'LS'], 11: ['R3', 'RS'] };
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false }, o));
const W = (s, o) => E.font.width(s, o || {});
// a face button: a dark disc with the symbol in its colour
function face(g, i, x, y, fam) {
  const r = 6, cx = x + r, cy = y + r;
  px.disc(g, cx, cy, r, '#101018'); px.disc(g, cx, cy, r - 1, '#2a2a38');
  if (fam === 'xbox') { const [ch, c] = XB[i]; px.disc(g, cx, cy, r - 1, c); T(g, ch, cx - W(ch) / 2 + .5, cy - 3, '#101018'); return r * 2 + 1; }
  const [k, c] = PS[i];
  if (k === 'x') { px.line(g, cx - 3, cy - 3, cx + 3, cy + 3, c); px.line(g, cx - 3, cy + 3, cx + 3, cy - 3, c); px.line(g, cx - 2, cy - 3, cx + 3, cy + 2, c); px.line(g, cx - 3, cy + 2, cx + 2, cy - 3, c); }
  else if (k === 'o') { for (let a = 0; a < 24; a++) px.dot(g, cx + Math.cos(a / 24 * Math.PI * 2) * 3.4, cy + Math.sin(a / 24 * Math.PI * 2) * 3.4, c); }
  else if (k === 'sq') { px.rect(g, cx - 3, cy - 3, 7, 1, c); px.rect(g, cx - 3, cy + 3, 7, 1, c); px.rect(g, cx - 3, cy - 3, 1, 7, c); px.rect(g, cx + 3, cy - 3, 1, 7, c); }
  else { px.line(g, cx, cy - 4, cx - 4, cy + 3, c); px.line(g, cx, cy - 4, cx + 4, cy + 3, c); px.rect(g, cx - 4, cy + 3, 9, 1, c); }
  return r * 2 + 1;
}
function pill(g, txt, x, y, col = '#d8d8e8') { const w = W(txt, { font: 'tiny' }) + 6; px.rect(g, x + 1, y, w - 2, 12, '#101018'); px.rect(g, x, y + 1, w, 10, '#101018'); px.rect(g, x + 1, y + 1, w - 2, 10, '#3a3a4c'); T(g, txt, x + 3, y + 4, col, { font: 'tiny' }); return w + 1; }
function keycap(g, txt, x, y) { const w = Math.max(11, W(txt) + 6); px.rect(g, x, y, w, 12, '#101018'); px.rect(g, x + 1, y, w - 2, 11, '#e8e4dc'); px.rect(g, x + 1, y + 9, w - 2, 2, '#a8a49c'); T(g, txt, x + (w - W(txt)) / 2, y + 2, '#202028'); return w + 1; }
function mouse(g, btn, x, y) {   // btn: 0 left, 2 right, 'wheel'
  px.rect(g, x + 1, y, 8, 13, '#101018'); px.rect(g, x, y + 1, 10, 11, '#101018'); px.rect(g, x + 1, y + 1, 8, 11, '#e8e4dc');
  px.rect(g, x + 5, y + 1, 1, 5, '#606068');
  if (btn === 0) px.rect(g, x + 1, y + 1, 4, 5, '#f2c230'); else if (btn === 2) px.rect(g, x + 6, y + 1, 3, 5, '#f2c230'); else if (btn === 'wheel') px.rect(g, x + 4, y + 2, 3, 3, '#f2c230');
  return 11;
}
function dpad(g, dir, x, y) {
  px.rect(g, x + 4, y, 5, 13, '#101018'); px.rect(g, x, y + 4, 13, 5, '#101018'); px.rect(g, x + 5, y + 1, 3, 11, '#3a3a4c'); px.rect(g, x + 1, y + 5, 11, 3, '#3a3a4c');
  const c = '#f2c230'; if (dir === 'up') px.rect(g, x + 5, y + 1, 3, 4, c); else if (dir === 'down') px.rect(g, x + 5, y + 8, 3, 4, c); else if (dir === 'left') px.rect(g, x + 1, y + 5, 4, 3, c); else if (dir === 'right') px.rect(g, x + 8, y + 5, 4, 3, c); else if (dir === 'lr') { px.rect(g, x + 1, y + 5, 4, 3, c); px.rect(g, x + 8, y + 5, 4, 3, c); } else { px.rect(g, x + 5, y + 1, 3, 4, c); px.rect(g, x + 5, y + 8, 3, 4, c); }
  return 14;
}
/** which device family the prompts show for an input (player): 'playstation' | 'xbox' | 'keyboard' | 'mouse' */
const fam = (I = game.input) => DH.device(I);
/** the first code of an action for the device */
function code(a, device, I = game.input) {
  const m = I.map[a] || [], real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
  if (device === 'pad') return real.find(c => c.startsWith('Pad'));
  if (device === 'mouse') return real.find(c => c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad'));
  return real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad'));
}
/** draw the badge for action a at (x, y) (12 px tall), for the device used last; returns its width */
function draw(g, a, x, y, I = game.input) {
  const f = fam(I);
  // the lever: the triggers on a pad, W / S on keys, the wheel with a mouse (up/down follow the setting)
  if (a === 'arrows' || a === 'updown') { if (f === 'playstation' || f === 'xbox') return dpad(g, a === 'arrows' ? 'lr' : 'ud', x, y); return keycap(g, a === 'arrows' ? '← →' : '↑ ↓', x, y); }
  if (a === 'lever') { if (f === 'playstation' || f === 'xbox') { let w = pill(g, f === 'xbox' ? 'RT' : 'R2', x, y); w += pill(g, f === 'xbox' ? 'LT' : 'L2', x + w, y); return w; } if (f === 'mouse') return mouse(g, 'wheel', x, y); let w = keycap(g, I.codeLabel(code('up', 'keys', I)) || 'W', x, y); return w + keycap(g, I.codeLabel(code('down', 'keys', I)) || 'S', x + w, y); }
  if (f === 'playstation' || f === 'xbox') {
    if (a === 'up' || a === 'down' || a === 'left' || a === 'right' || a === 'move') return dpad(g, a, x, y);
    const c = code(a, 'pad', I); if (!c) return 0; const n = +c.slice(3);
    if (n <= 3) return face(g, n, x, y, f === 'xbox' ? 'xbox' : 'ps');
    if (PILL[n]) return pill(g, PILL[n][f === 'xbox' ? 1 : 0], x, y);
    if (n >= 12 && n <= 15) return dpad(g, ['up', 'down', 'left', 'right'][n - 12], x, y);
    return pill(g, I.codeLabel(c), x, y);
  }
  if (f === 'mouse') { const c = code(a, 'mouse', I); if (c && c.startsWith('Mouse')) return mouse(g, +c.slice(5), x, y); }
  const c = code(a, 'keys', I); if (!c) return 0;
  const L = { Space: 'SPACE', Backspace: 'BKSP', Enter: 'ENTER', Escape: 'ESC', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Backquote: '`' }[c] || I.codeLabel(c).toUpperCase().replace('LEFT CLICK', 'CLICK');
  return keycap(g, L, x, y);
}
/** a badge's width without drawing */
const NULLG = new Proxy({}, { get: (t, k) => k in t ? t[k] : typeof k === 'string' && k[0] === '_' ? undefined : () => {}, set: (t, k, v) => { t[k] = v; return true; } });
function width(a, I) { try { return draw(NULLG, a, 0, 0, I); } catch (e) { return 14; } }
/** a prompt line: [[action, 'TEXT'], ...] -> badges and words; o: { align: 'left' | 'center' | 'right', col, shadow } */
function row(g, items, x, y, o = {}) {
  const gap = 8, parts = items.map(([a, t]) => ({ a, t, w: width(a, o.I) + 3 + (t ? W(t) : 0) }));
  const total = parts.reduce((s, p) => s + p.w, 0) + gap * (parts.length - 1);
  let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  if (o.box) { E.ui.box(g, Math.round(cx) - 5, y - 3, total + 10, 18, { alpha: .7, bg: '#0a0c18', border: '#4a4a6a' }); }
  for (const p of parts) { const w = draw(g, p.a, Math.round(cx), y, o.I); if (p.t) T(g, p.t, Math.round(cx) + w + 3, y + 2, o.col || '#fff8e0', { shadow: o.shadow === false ? undefined : '#000' }); cx += p.w + gap; }
  return total;
}
/** a text label for an action on the device (for strings: tips, How to Drive) */
function label(a, I = game.input) {
  const f = fam(I);
  if (a === 'lever') return f === 'playstation' ? 'R2 / L2' : f === 'xbox' ? 'RT / LT' : f === 'mouse' ? 'the wheel' : (I.codeLabel(code('up', 'keys', I)) + ' / ' + I.codeLabel(code('down', 'keys', I)));
  if (f === 'playstation' || f === 'xbox') { const c = code(a, 'pad', I); if (!c) return a.toUpperCase(); const n = +c.slice(3); if (n <= 3) return f === 'xbox' ? XB[n][0] : ['Cross', 'Circle', 'Square', 'Triangle'][n]; return PILL[n] ? PILL[n][f === 'xbox' ? 1 : 0] : I.codeLabel(c); }
  if (f === 'mouse') { const c = code(a, 'mouse', I); if (c && c.startsWith('Mouse')) return ['Left click', 'Middle click', 'Right click'][+c.slice(5)] || 'Mouse'; }
  const c = code(a, 'keys', I); return c ? I.codeLabel(c) : a.toUpperCase();
}
DH.Glyph = { draw, row, label, width, fam, keycap, pill, face, mouse, dpad };
})();
