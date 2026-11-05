// Button prompts (§3.9): PlayStation glyphs (the default) or Xbox (Settings), keycaps for the keyboard, a mouse with the
// button lit; always from the player's actual bindings and the device they used last
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const PS = { 0: ['✕', '#7cb2e8'], 1: ['○', '#ff6b6b'], 2: ['□', '#ff79c6'], 3: ['△', '#3fd8a6'] };
const XB = { 0: ['A', '#5ac85a'], 1: ['B', '#ff5a5a'], 2: ['X', '#4a8aff'], 3: ['Y', '#ffd23f'] };
const TABS = { playstation: { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3' }, xbox: { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS' } };
const font = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: false }, o));
const fw = (s, o = {}) => E.font.width(s, o);

/** the device a player's prompts follow: 'gamepad' | 'keyboard' | 'mouse' */
SN.deviceOf = I => { const d = I && I.lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };
SN.padStyle = () => (SN.game && SN.game.settings.glyphs) === 'xbox' ? 'xbox' : 'playstation';
/** pseudo actions: steer (stick or A/D), menu (d-pad or arrows), noseDown/noseUp */
const PSEUDO = { steer: { pad: 'LSTICK', keys: ['steerL', 'steerR'] }, menu: { pad: 'DPAD', keys: ['up', 'down'] }, pitch: { pad: 'LSTICK', keys: ['noseDown', 'noseUp'] } };
function codes(I, a) { const m = I && I.map && I.map[a]; return m || []; }
/** what to draw for an action on a device: { kind: 'face'|'tab'|'key'|'mouse'|'stick'|'dpad', label, color, btn } */
function spec(I, a, device) {
  device = device || SN.deviceOf(I);
  const P = PSEUDO[a];
  if (P) { if (device === 'gamepad') return { kind: P.pad === 'DPAD' ? 'dpad' : 'stick', label: P.pad === 'DPAD' ? '' : 'L' }; return { kind: 'keys', labels: P.keys.map(k => I.label(k, 'keyboard')) }; }
  const cs = codes(I, a);
  if (device === 'gamepad') {
    const pc = cs.find(c => /^Pad\d+$/.test(c));
    if (pc) { const n = +pc.slice(3), st = SN.padStyle(); if (n <= 3) { const [l, c] = (st === 'xbox' ? XB : PS)[n]; return { kind: 'face', label: l, color: c, n, st }; } if (n >= 12) return { kind: 'dpad', dir: n - 12 }; return { kind: 'tab', label: TABS[st][n] || ('B' + n) }; }
  }
  if (device === 'mouse') { const mc = cs.find(c => c === 'Mouse0' || c === 'Mouse2'); if (mc) return { kind: 'mouse', btn: mc === 'Mouse0' ? 0 : 2 }; }
  const kc = cs.find(c => !/^Pad|^Mouse|^Act:|^PadAxis/.test(c)) || cs[0];
  if (!kc) return { kind: 'key', label: '?' };
  if (/^Mouse/.test(kc)) return { kind: 'mouse', btn: kc === 'Mouse0' ? 0 : 2 };
  return { kind: 'key', label: I.codeLabel ? I.codeLabel(kc).toUpperCase() : kc };
}
/** draw an action's prompt at (x, y) (top-left, 11 px tall); returns the width drawn */
function draw(g, I, a, x, y, o = {}) {
  const s = spec(I, a, o.device), H = 11;
  if (s.kind === 'face') {
    px.disc(g, x + 5, y + 5, 6, '#101018'); px.disc(g, x + 5, y + 5, 5, '#24242e');
    if (s.st === 'xbox') { px.disc(g, x + 5, y + 5, 5, s.color); font(g, s.label, x + 6, y + 2, '#101018', { font: 'tiny', align: 'center' }); }
    else glyphPS(g, s.n, x + 5, y + 5, s.color);
    return 12;
  }
  if (s.kind === 'tab') { const w = fw(s.label, { font: 'tiny' }) + 6; px.rect(g, x, y + 1, w, H - 2, '#101018'); px.rect(g, x + 1, y + 2, w - 2, H - 4, '#3a3a4a'); font(g, s.label, x + 3, y + 3, '#ffffff', { font: 'tiny' }); return w + 1; }
  if (s.kind === 'stick') { px.disc(g, x + 5, y + 5, 6, '#101018'); px.disc(g, x + 5, y + 5, 4, '#5a5a6a'); px.disc(g, x + 5, y + 4, 3, '#8a8a9a'); font(g, 'L', x + 6, y + 3, '#ffffff', { font: 'tiny', align: 'center' }); return 12; }
  if (s.kind === 'dpad') { px.rect(g, x + 3, y, 5, 11, '#101018'); px.rect(g, x, y + 3, 11, 5, '#101018'); px.rect(g, x + 4, y + 1, 3, 9, '#6a6a7a'); px.rect(g, x + 1, y + 4, 9, 3, '#6a6a7a'); if (s.dir !== undefined) { const d = [[4, 1], [4, 7], [1, 4], [7, 4]][s.dir]; px.rect(g, x + d[0], y + d[1], 3, 3, '#ffffff'); } return 12; }
  if (s.kind === 'mouse') { px.rect(g, x + 1, y, 9, 11, '#101018'); px.rect(g, x + 2, y + 1, 7, 9, '#c8c8d0'); px.rect(g, x + 5, y + 1, 1, 4, '#101018'); px.rect(g, x + (s.btn === 0 ? 2 : 6), y + 1, 3, 4, '#ff5a5a'); return 12; }
  const keyCap = (label, xx) => { const w = Math.max(11, fw(label, { font: 'tiny' }) + 6); px.rect(g, xx, y, w, H, '#101018'); px.rect(g, xx + 1, y + 1, w - 2, H - 2, '#e8e8f0'); px.rect(g, xx + 1, y + H - 3, w - 2, 2, '#a0a0b0'); font(g, label, xx + w / 2, y + 2, '#101018', { font: 'tiny', align: 'center' }); return w; };
  if (s.kind === 'keys') { let w = 0; s.labels.forEach((l, k) => { w += keyCap(short(l), x + w) + 1; }); return w; }
  return keyCap(short(s.label), x) + 1;
}
const short = l => ({ ARROWLEFT: '←', ARROWRIGHT: '→', ARROWUP: '↑', ARROWDOWN: '↓', ESCAPE: 'ESC', BACKSPACE: 'BKSP', ENTER: 'ENTER', SPACE: 'SPACE', SHIFT: 'SHIFT' }[String(l).toUpperCase()] || String(l).toUpperCase().replace('LEFT ', '').replace('RIGHT ', 'R'));
/** the PlayStation symbols drawn in pixels */
function glyphPS(g, n, cx, cy, c) {
  if (n === 0) { for (let k = -2; k <= 2; k++) { px.rect(g, cx + k, cy + k, 1, 1, c); px.rect(g, cx + k, cy - k, 1, 1, c); } }
  else if (n === 1) { px.rect(g, cx - 1, cy - 3, 3, 1, c); px.rect(g, cx - 1, cy + 3, 3, 1, c); px.rect(g, cx - 3, cy - 1, 1, 3, c); px.rect(g, cx + 3, cy - 1, 1, 3, c); px.rect(g, cx - 2, cy - 2, 1, 1, c); px.rect(g, cx + 2, cy - 2, 1, 1, c); px.rect(g, cx - 2, cy + 2, 1, 1, c); px.rect(g, cx + 2, cy + 2, 1, 1, c); }
  else if (n === 2) { px.rect(g, cx - 2, cy - 2, 5, 1, c); px.rect(g, cx - 2, cy + 2, 5, 1, c); px.rect(g, cx - 2, cy - 2, 1, 5, c); px.rect(g, cx + 2, cy - 2, 1, 5, c); }
  else { px.rect(g, cx, cy - 3, 1, 1, c); px.rect(g, cx - 1, cy - 2, 1, 2, c); px.rect(g, cx + 1, cy - 2, 1, 2, c); px.rect(g, cx - 2, cy, 1, 2, c); px.rect(g, cx + 2, cy, 1, 2, c); px.rect(g, cx - 3, cy + 2, 7, 1, c); }
}
/** a row of prompts [[action, 'LABEL'], ...] at (x, y): returns the width */
function row(g, I, items, x, y, o = {}) {
  let w = 0;
  for (const [a, label] of items) { const gw = draw(g, I, a, x + w, y, o); w += gw + 3; if (label) { font(g, label, x + w, y + 2, o.color || '#ffffff', { shadow: '#000' }); w += fw(label) + 9; } }
  return w;
}
function rowWidth(I, items, o = {}) { let w = 0; for (const [a, label] of items) { w += widthOf(I, a, o) + 3; if (label) w += fw(label) + 9; } return w; }
function widthOf(I, a, o = {}) { const s = spec(I, a, o.device); if (s.kind === 'tab') return fw(s.label, { font: 'tiny' }) + 7; if (s.kind === 'key') return Math.max(11, fw(short(s.label), { font: 'tiny' }) + 6) + 1; if (s.kind === 'keys') return s.labels.reduce((w, l) => w + Math.max(11, fw(short(l), { font: 'tiny' }) + 6) + 1, 0); return 12; }
/** the plain text of an action's button, for running text ('✕', 'W', 'LEFT CLICK') */
function text(I, a, device) { const s = spec(I, a, device); return s.kind === 'face' ? s.label : s.kind === 'tab' ? s.label : s.kind === 'mouse' ? (s.btn ? 'RIGHT CLICK' : 'LEFT CLICK') : s.kind === 'stick' ? 'LEFT STICK' : s.kind === 'dpad' ? 'D-PAD' : s.kind === 'keys' ? s.labels.map(short).join('/') : short(s.label); }
SN.glyph = { draw, row, rowWidth, widthOf, spec, text, PS, XB };
})();
