/* ---------- input: two sticks, no buttons ---------- */
// Posture = left stick / WASD. Technique = right stick, face buttons or IJKL. Menus: confirm / cancel.
const PAD_T = { tUp: 'Pad3', tDown: 'Pad0', tLeft: 'Pad2', tRight: 'Pad1' };
const KC_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'Pad1'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], dummy: ['Tab', 'Pad8'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], reset: ['KeyR', 'Pad3'], devKey: ['F2', 'Backquote'], l3: ['Pad10'], r3: ['Pad11'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
// local 2 players on one keyboard: P1 WASD + T F G H, P2 arrows + I J K L (and the numpad)
const KC_P1 = Object.assign({}, KC_KEYS, { up: ['KeyW', 'Pad12'], down: ['KeyS', 'Pad13'], left: ['KeyA', 'Pad14'], right: ['KeyD', 'Pad15'], tUp: ['KeyT', 'Pad3'], tDown: ['KeyG', 'Pad0'], tLeft: ['KeyF', 'Pad2'], tRight: ['KeyH', 'Pad1'] });
const KC_P2 = Object.assign({}, KC_KEYS, { up: ['ArrowUp', 'Pad12'], down: ['ArrowDown', 'Pad13'], left: ['ArrowLeft', 'Pad14'], right: ['ArrowRight', 'Pad15'], tUp: ['KeyI', 'Numpad8', 'Pad3'], tDown: ['KeyK', 'Numpad5', 'Numpad2', 'Pad0'], tLeft: ['KeyJ', 'Numpad4', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'Pad1'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], pause: ['Pad9'], start: ['Pad9', 'NumpadEnter'] });
KC.KEYS = KC_KEYS;

/** Reader: turns one E.Input into a control intent per step: { posture: n|u|d|l|r, tech: null|u|d|l|r (a press edge) } in SCREEN directions */
class Reader {
  constructor(input) { this.input = input; this.rs = null; this.last = { posture: 'n', tech: null, held: null }; this.recent = []; this.hist = []; }
  read() {
    const I = this.input, d = n => I.down(n);
    // posture: vertical beats horizontal (W+D = up)
    const posture = d('up') ? 'u' : d('down') ? 'd' : d('left') ? 'l' : d('right') ? 'r' : 'n';
    // technique: face buttons / keys press edges; the right stick is a 4-way gate with hysteresis
    const edges = [];
    if (I.pressed('tUp')) edges.push('u'); if (I.pressed('tDown')) edges.push('d'); if (I.pressed('tLeft')) edges.push('l'); if (I.pressed('tRight')) edges.push('r');
    const a = I.padAim;
    if (a) {
      const m = Math.hypot(a[0], a[1]), dir = Math.abs(a[0]) > Math.abs(a[1]) ? (a[0] > 0 ? 'r' : 'l') : (a[1] > 0 ? 'd' : 'u');
      if (this.rs && m > .35 && dir === this.rs) { /* held */ } else if (m > .5) { if (dir !== this.rs) edges.push(dir); this.rs = dir; } else if (m < .35) this.rs = null;
    } else this.rs = null;
    // most recent press wins; truly simultaneous: up > down > horizontal
    const order = { u: 0, d: 1, l: 2, r: 2 };
    edges.sort((x, y) => order[x] - order[y]);
    const tech = edges.length ? edges[0] : null;
    const held = I.down('tUp') ? 'u' : I.down('tDown') ? 'd' : I.down('tLeft') ? 'l' : I.down('tRight') ? 'r' : this.rs;
    this.last = { posture, tech, held };
    if (tech) { this.hist.push({ p: posture, t: tech, at: I.clock || 0 }); if (this.hist.length > 12) this.hist.shift(); }
    return this.last;
  }
}
KC.Reader = Reader;

// device family for prompts: 'key' | 'mouse' | 'ps' | 'xbox'
KC.family = (I = KC.game.input) => {
  const dev = I.lastDevice;
  if (dev === 'gamepad') return I.padStyle() === 'playstation' ? 'ps' : 'xbox';
  return dev === 'mouse' ? 'mouse' : 'key';
};
KC.padKeys = { confirm: 0, cancel: 1, tUp: 3, tDown: 0, tLeft: 2, tRight: 1 };

/* ---------- glyph icons (the 5x7 font has no ✕ ○ □ △, so the badges are drawn) ---------- */
const GL = {
  ps: { '✕': '#7aa7ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#5ad8a0' },
  xbox: { A: '#5ad85a', B: '#ff5a5a', X: '#5a8aff', Y: '#ffd24a' }
};
const PS2X = { '✕': 'A', '○': 'B', '□': 'X', '△': 'Y' };
function drawBadge(g, ch, x, y, s, col) {
  const r = Math.round(s / 2);
  px.disc(g, x + r, y + r, r, '#10101c'); px.disc(g, x + r, y + r, r - 1, '#262638');
  const cx = x + r, cy = y + r, q = Math.max(2, Math.round(s * .26));
  if (ch === '✕') { px.line(g, cx - q, cy - q, cx + q, cy + q, col, 1); px.line(g, cx - q, cy + q, cx + q, cy - q, col, 1); }
  else if (ch === '○') { for (let a = 0; a < 16; a++) { const t = a / 16 * TAU; px.dot(g, Math.round(cx + Math.cos(t) * q * 1.15), Math.round(cy + Math.sin(t) * q * 1.15), col); } }
  else if (ch === '□') { px.line(g, cx - q, cy - q, cx + q, cy - q, col, 1); px.line(g, cx - q, cy + q, cx + q, cy + q, col, 1); px.line(g, cx - q, cy - q, cx - q, cy + q, col, 1); px.line(g, cx + q, cy - q, cx + q, cy + q, col, 1); }
  else if (ch === '△') { px.line(g, cx, cy - q - 1, cx - q - 1, cy + q, col, 1); px.line(g, cx, cy - q - 1, cx + q + 1, cy + q, col, 1); px.line(g, cx - q - 1, cy + q, cx + q + 1, cy + q, col, 1); }
  else E.font.text(g, ch, cx, cy - 3, col, { align: 'center', outline: false });
  return s;
}
function drawKey(g, label, x, y, h = 11) {
  const w = Math.max(h, E.font.width(label) + 6);
  px.rect(g, x, y + 1, w, h, '#05040a'); px.rect(g, x, y, w, h, '#d8d4e4'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#f4f2fa'); px.rect(g, x, y + h - 2, w, 2, '#9a96b0');
  E.font.text(g, label, x + w / 2, y + 2, '#1a1626', { align: 'center', outline: false });
  return w;
}
function drawStick(g, side, dir, x, y, s = 13) {
  const r = Math.round(s / 2), cx = x + r, cy = y + r;
  px.disc(g, cx, cy, r, '#10101c'); px.disc(g, cx, cy, r - 1, '#3a3a52');
  px.disc(g, cx + (dir === 'l' ? -2 : dir === 'r' ? 2 : 0), cy + (dir === 'u' ? -2 : dir === 'd' ? 2 : 0), r - 3, side === 'L' ? '#7aa7ff' : '#ff9a6a');
  E.font.text(g, side, cx, cy - 3, '#10101c', { align: 'center', outline: false });
  const ax = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[dir];
  if (ax) { const ex = cx + ax[0] * (r + 3), ey = cy + ax[1] * (r + 3); px.line(g, cx + ax[0] * (r - 1), cy + ax[1] * (r - 1), ex, ey, '#ffd060', 1); px.dot(g, ex, ey, '#ffd060'); }
  return s + 4;
}
function drawMouse(g, btn, x, y) {
  px.rect(g, x, y, 10, 14, '#10101c'); px.rect(g, x + 1, y + 1, 8, 12, '#d8d4e4');
  px.rect(g, btn === 'R' ? x + 5 : x + 1, y + 1, 4, 5, '#ff9a4a'); px.rect(g, x + 5, y + 1, 1, 6, '#10101c');
  return 12;
}
/** one icon for an action on the device in use. Returns its width. */
KC.glyphAction = (g, act, x, y, size = 13, measure = false) => {
  const I = KC.game.input, fam = KC.family(I);
  if (measure) { if (fam === 'ps' || fam === 'xbox') return act === 'start' || act === 'pause' ? E.font.width('OPT') + 8 : size + 2; if (fam === 'mouse' && (act === 'confirm' || act === 'cancel')) return 12; const lab0 = { confirm: 'ENTER', cancel: 'ESC', start: 'ENTER', pause: 'ESC', alt: 'T' }[act] || I.label(act) || '?'; return Math.max(size - 2, E.font.width(lab0) + 6) + 2; }
  if (fam === 'ps' || fam === 'xbox') {
    const psCh = { confirm: '✕', cancel: '○', tUp: '△', tDown: '✕', tLeft: '□', tRight: '○', start: 'OPT', pause: 'OPT', alt: '△' }[act] || '✕';
    if (psCh === 'OPT') { const w = E.font.width('OPT') + 6; px.rect(g, x, y + 2, w, size - 3, '#10101c'); E.font.text(g, 'OPT', x + w / 2, y + 4, '#d8d4e4', { align: 'center', outline: false }); return w + 2; }
    if (fam === 'ps') drawBadge(g, psCh, x, y, size, GL.ps[psCh]); else { const xb = PS2X[psCh]; drawBadge(g, xb, x, y, size, GL.xbox[xb]); }
    return size + 2;
  }
  if (fam === 'mouse' && (act === 'confirm')) return drawMouse(g, 'L', x, y);
  if (fam === 'mouse' && act === 'cancel') return drawMouse(g, 'R', x, y);
  const lab = { confirm: 'ENTER', cancel: 'ESC', start: 'ENTER', pause: 'ESC', alt: 'T' }[act] || I.label(act) || '?';
  return drawKey(g, lab, x, y, size - 2) + 2;
};
/** a stick pair for a technique: [posture icon] + [strike icon] */
KC.glyphTech = (g, tech, x, y, opt = {}) => {
  const fam = KC.family(), t = KC.TECHS[tech]; if (!t) return 0;
  const posture = t.input[0], strike = t.input[1], toward = opt.right !== false ? 1 : -1;
  const toScreen = d => d === 't' ? (toward > 0 ? 'r' : 'l') : d === 'a' ? (toward > 0 ? 'l' : 'r') : d;
  const pd = posture === 'n' ? null : toScreen(posture), sd = toScreen(strike);
  let w = 0;
  if (fam === 'ps' || fam === 'xbox') {
    w += drawStick(g, 'L', pd, x, y); E.font.text(g, '+', x + w - 2, y + 3, '#e8e0ff', { outline: false }); w += 6;
    w += drawStick(g, 'R', sd, x + w, y);
  } else {
    const kl = { u: 'W', d: 'S', l: 'A', r: 'D' }, kr = { u: 'I', d: 'K', l: 'J', r: 'L' };
    if (pd) { w += drawKey(g, kl[pd], x, y) + 1; E.font.text(g, '+', x + w, y + 2, '#e8e0ff', { outline: false }); w += 7; }
    w += drawKey(g, kr[sd], x + w, y) + 1;
  }
  return w;
};
KC.promptText = (tech) => {
  const t = KC.TECHS[tech]; if (!t) return ''; const fam = KC.family();
  if (fam === 'ps' || fam === 'xbox') { const P = { n: '', t: 'TOWARD', a: 'AWAY', u: 'UP', d: 'DOWN' }, S = { u: 'UP', t: 'TOWARD', d: 'DOWN', a: 'AWAY' }; return (t.input[0] === 'n' ? '' : 'L ' + P[t.input[0]] + ' + ') + 'R ' + S[t.input[1]]; }
  const kl = { u: 'W', d: 'S', t: 'D', a: 'A' }, kr = { u: 'I', d: 'K', t: 'L', a: 'J' };
  return (t.input[0] === 'n' ? '' : kl[t.input[0]] + ' + ') + kr[t.input[1]];
};
/** the prompt bar: [icon] LABEL ... right-aligned pairs at the bottom */
KC.promptBar = (r, items, y) => r.overlay(g => {
  const yy = y === undefined ? r.H - 16 : y; let w = 0;
  const parts = items.map(([act, label]) => ({ act, label, w: KC.glyphAction(null, act, 0, 0, 13, true) + 2 + E.font.width(label) + 10 })); w = parts.reduce((s, p) => s + p.w, 0);
  let x = Math.round((r.W - w) / 2);
  px.blend(g, .55, 'normal', () => px.rect(g, x - 8, yy - 2, w + 14, 16, '#07060d'));
  for (const p of parts) { const iw = KC.glyphAction(g, p.act, x, yy - 1, 13); E.font.text(g, p.label, x + iw + 1, yy + 2, '#e8e0ff', { outline: false, shadow: '#000' }); x += p.w; }
});
KC.touchOnly = () => KC._touchOnly === true;
