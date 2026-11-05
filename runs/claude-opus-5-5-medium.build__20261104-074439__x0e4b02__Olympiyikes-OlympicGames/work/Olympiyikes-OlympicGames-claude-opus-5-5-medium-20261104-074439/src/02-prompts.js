/* OLYMPIYIKES! — button prompts as icons (§2.3): PlayStation / Xbox face buttons, shoulders, sticks, keycaps, the mouse. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;

const PS = { Pad0: ['✕', '#7fb2ff'], Pad1: ['○', '#ff6b6b'], Pad2: ['□', '#ff8fd8'], Pad3: ['△', '#4fe0a8'], Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'CREATE', Pad9: 'OPTIONS', Pad10: 'L3', Pad11: 'R3' };
const XB = { Pad0: ['A', '#5bc236'], Pad1: ['B', '#e8443a'], Pad2: ['X', '#3a7cf0'], Pad3: ['Y', '#f2c21b'], Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT', Pad8: 'VIEW', Pad9: 'MENU', Pad10: 'LS', Pad11: 'RS' };
const DPAD = { Pad12: 'up', Pad13: 'down', Pad14: 'left', Pad15: 'right' };

const family = inp => { const s = (inp.padStyle && inp.padStyle()) || game.settings.glyphs; return s === 'xbox' ? 'xbox' : 'playstation'; };
const device = inp => { const d = inp.lastDevice || 'keyboard'; return d === 'touch' ? 'keyboard' : d; };

/** the code shown for an action on this player's last device */
function codeFor(inp, action, dev) {
  dev = dev || device(inp);
  if (action === 'move') return dev === 'gamepad' ? 'Stick' : 'WASD';
  if (action === 'aim') return dev === 'gamepad' ? 'Stick' : dev === 'mouse' ? 'Pointer' : 'WASD';
  const codes = (inp.map && inp.map[action]) || [];
  if (dev === 'gamepad') return codes.find(c => /^Pad\d/.test(c)) || codes[0];
  if (dev === 'mouse') { const m = codes.find(c => /^Mouse/.test(c)); if (m) return m; }
  return codes.find(c => !/^(Pad|Mouse|Act:)/.test(c)) || codes[0];
}
O.codeFor = codeFor;

function ring(g, cx, cy, R, fill, rim) { px.disc(g, cx, cy, R, rim); px.disc(g, cx, cy, R - 1, fill); }
function symbol(g, sym, cx, cy, R, col) {
  const k = Math.max(2, Math.round(R * .55));
  if (sym === '✕') { px.line(g, cx - k, cy - k, cx + k, cy + k, col, R > 6 ? 2 : 1); px.line(g, cx - k, cy + k, cx + k, cy - k, col, R > 6 ? 2 : 1); }
  else if (sym === '○') { px.disc(g, cx, cy, k + 1, col); px.disc(g, cx, cy, Math.max(1, k - (R > 6 ? 1 : 0)), '#1a1d2e'); }
  else if (sym === '□') { const w = R > 6 ? 2 : 1; px.rect(g, cx - k, cy - k, 2 * k + 1, w, col); px.rect(g, cx - k, cy + k - w + 1, 2 * k + 1, w, col); px.rect(g, cx - k, cy - k, w, 2 * k + 1, col); px.rect(g, cx + k - w + 1, cy - k, w, 2 * k + 1, col); }
  else if (sym === '△') { const w = R > 6 ? 2 : 1; px.line(g, cx - k, cy + k - 1, cx, cy - k, col, w); px.line(g, cx, cy - k, cx + k, cy + k - 1, col, w); px.line(g, cx - k, cy + k - 1, cx + k, cy + k - 1, col, w); }
  else E.font.text(g, sym, cx, cy - (R > 6 ? 7 : 3), col, { align: 'center', outline: false, scale: R > 6 ? 2 : 1 });
}

/** draws an icon for one code at (x, y) top-left; returns its width */
function icon(g, inp, code, x, y, size, lit) {
  const s = size || 1, H = s === 2 ? 17 : 9, R = (H - 1) / 2, cy = y + R;
  if (code === 'Stick') { ring(g, x + R, cy, R, '#262a3c', '#c8d0f0'); px.disc(g, x + R, cy, Math.max(2, R - 3), lit ? '#ffffff' : '#7a84aa'); return H; }
  if (code === 'Pointer') { return mouse(g, x, y, s, null); }
  if (/^Mouse/.test(code)) return mouse(g, x, y, s, code === 'Mouse0' ? 'L' : code === 'Mouse2' ? 'R' : 'M');
  if (/^Pad\d+$/.test(code)) {
    if (DPAD[code]) { const c = x + R; px.rect(g, c - R / 3, y, R * 2 / 3 + 1, H, '#c8d0f0'); px.rect(g, x, cy - R / 3, H, R * 2 / 3 + 1, '#c8d0f0');
      const d = DPAD[code], o = R * .6, hx = d === 'left' ? -o : d === 'right' ? o : 0, hy = d === 'up' ? -o : d === 'down' ? o : 0; px.disc(g, c + hx, cy + hy, Math.max(1, R / 3), '#ffd86a'); return H; }
    const T = family(inp) === 'xbox' ? XB : PS, v = T[code];
    if (Array.isArray(v)) { ring(g, x + R, cy, R, lit ? '#3a4060' : '#1a1d2e', lit ? '#ffffff' : '#c8d0f0'); symbol(g, v[0], x + R, cy, R, v[1]); return H; }
    const label = v || code, w = E.font.width(label, { scale: s }) + 6 * s;
    px.rect(g, x, y + 1, w, H - 2, '#c8d0f0'); px.rect(g, x + 1, y + 2, w - 2, H - 4, lit ? '#3a4060' : '#1a1d2e');
    E.font.text(g, label, x + w / 2, y + Math.round((H - 7 * s) / 2), '#ffffff', { align: 'center', outline: false, scale: s });
    return w;
  }
  // a keycap
  let label = code === 'WASD' ? 'WASD' : (inp.codeLabel ? inp.codeLabel(code) : code);
  if (label === 'R Shift') label = 'Shift';
  const w = Math.max(H, E.font.width(label, { scale: s }) + 6 * s);
  px.rect(g, x, y, w, H, '#3a3f58'); px.rect(g, x, y, w, H - s, lit ? '#ffffff' : '#e6e9f4'); px.rect(g, x + 1, y + 1, w - 2, H - s - 2, lit ? '#fff7d0' : '#f6f7fc');
  E.font.text(g, label, x + w / 2, y + Math.max(1, Math.round((H - s - 7 * s) / 2)), '#1a1d2e', { align: 'center', outline: false, scale: s });
  return w;
}
function mouse(g, x, y, s, half) {
  const H = s === 2 ? 17 : 9, W = Math.round(H * .7);
  px.rect(g, x + 1, y, W - 2, H, '#e6e9f4'); px.rect(g, x, y + 1, W, H - 2, '#e6e9f4');
  px.rect(g, x + Math.floor(W / 2), y, 1, Math.floor(H / 2), '#3a3f58'); px.rect(g, x, y + Math.floor(H / 2), W, 1, '#3a3f58');
  if (half === 'L') px.rect(g, x + 1, y + 1, Math.floor(W / 2) - 1, Math.floor(H / 2) - 1, '#f2b632');
  if (half === 'R') px.rect(g, x + Math.floor(W / 2) + 1, y + 1, Math.floor(W / 2) - 1, Math.floor(H / 2) - 1, '#f2b632');
  if (!half) px.disc(g, x + W / 2, y + H / 2, 1, '#f2b632');
  return W;
}

O.Prompt = {
  /** an action's icon (+ label) at (x, y top); returns the width drawn. o: { input, size, label, color, align: 'left'|'center'|'right' } */
  draw(g, x, y, action, o = {}) {
    const inp = o.input || game.input, s = o.size || 1, code = codeFor(inp, action, o.device), lw = o.label ? E.font.width(o.label, { scale: s }) + 3 * s : 0;
    const w = this.width(action, o);
    let x0 = o.align === 'center' ? Math.round(x - w / 2) : o.align === 'right' ? x - w : x;
    const iw = icon(g, inp, code, x0, y, s, o.lit);
    if (o.label) E.font.text(g, o.label, x0 + iw + 3 * s, y + (s === 2 ? 2 : 1), o.color || '#ffffff', { outline: false, shadow: '#000', scale: s });
    return iw + lw;
  },
  width(action, o = {}) {
    const inp = o.input || game.input, s = o.size || 1, code = codeFor(inp, action, o.device);
    const c = E.mkCanvas ? null : null; void c;
    let iw;
    if (code === 'Stick') iw = s === 2 ? 17 : 9; else if (code === 'Pointer' || /^Mouse/.test(code)) iw = Math.round((s === 2 ? 17 : 9) * .7);
    else if (/^Pad\d+$/.test(code)) { const T = family(inp) === 'xbox' ? XB : PS, v = T[code]; iw = DPAD[code] || Array.isArray(v) ? (s === 2 ? 17 : 9) : E.font.width(v || code, { scale: s }) + 6 * s; }
    else { let label = code === 'WASD' ? 'WASD' : (inp.codeLabel ? inp.codeLabel(code) : code); if (label === 'R Shift') label = 'Shift'; iw = Math.max(s === 2 ? 17 : 9, E.font.width(label, { scale: s }) + 6 * s); }
    return iw + (o.label ? E.font.width(o.label, { scale: s }) + 3 * s : 0);
  },
  /** the mash pair, highlighting alternately at the athlete's rhythm */
  pair(g, x, y, o = {}) {
    const s = o.size || 1, inp = o.input || game.input, phase = o.phase === undefined ? Math.floor(game.real * 6) % 2 : o.phase;
    const w1 = icon(g, inp, codeFor(inp, 'mashL'), x, y + (phase === 0 ? -s : 0), s, phase === 0);
    const w2 = icon(g, inp, codeFor(inp, 'mashR'), x + w1 + 3 * s, y + (phase === 1 ? -s : 0), s, phase === 1);
    let w = w1 + w2 + 3 * s;
    if (o.label) { E.font.text(g, o.label, x + w + 3 * s, y + (s === 2 ? 2 : 1), o.color || '#ffffff', { outline: false, shadow: '#000', scale: s }); w += E.font.width(o.label, { scale: s }) + 3 * s; }
    return w;
  },
  /** a prompt strip centered at the bottom: items [[action, label], ...] */
  strip(g, r, items, o = {}) {
    const s = o.size || (r.H >= 300 ? 2 : 1), gap = 10 * s;
    let w = 0; const ws = items.map(([a, l]) => this.width(a, { input: o.input, size: s, label: l })); for (const v of ws) w += v; w += gap * (items.length - 1);
    let x = Math.round(r.W / 2 - w / 2); const y = o.y === undefined ? r.H - (s === 2 ? 24 : 14) : o.y;
    E.ui.box(g, x - 6, y - 4, w + 12, (s === 2 ? 17 : 9) + 8, { bg: '#080a1c', border: '#2a3060', gradient: false, alpha: .8 });
    items.forEach(([a, l], i) => { this.draw(g, x, y, a, { input: o.input, size: s, label: l }); x += ws[i] + gap; });
  },
  label(action, inp) { inp = inp || game.input; const code = codeFor(inp, action); if (/^Pad\d+$/.test(code)) { const v = (family(inp) === 'xbox' ? XB : PS)[code]; return Array.isArray(v) ? v[0] : v || code; } return inp.codeLabel ? inp.codeLabel(code) : code; },
  icon
};
})();
