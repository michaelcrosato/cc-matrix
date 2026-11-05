/* ---- GLYPHS (6.2): prompt chips for the device used last. Gamepad: round badges with the PlayStation symbols in their
 * colors (✕ blue, ○ red, □ pink, △ green), or Xbox letters (A green, B red, X blue, Y yellow) with Settings, Button
 * symbols; shoulders and triggers as rounded tabs. Keyboard: keycaps. Mouse: a little mouse with the button lit.
 * Glyphs.text(g, 'Hold {shoot} for a slapshot', x, y) lays out text with chips ---- */
const Glyphs = (() => {
  const PS = { 0: ['✕', '#7aa7ff'], 1: ['○', '#ff6b6b'], 2: ['□', '#ff8ad8'], 3: ['△', '#4fe3a1'] };
  const XB = { 0: ['A', '#5ad85a'], 1: ['B', '#ff5a5a'], 2: ['X', '#5a9aff'], 3: ['Y', '#ffd84a'] };
  const SH = { ps: ['L1', 'R1', 'L2', 'R2'], xb: ['LB', 'RB', 'LT', 'RT'] };
  const OTHER = { ps: { 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'PS' }, xb: { 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'GUIDE' } };
  const xbox = I => (I.glyphs || S('buttons')) === 'xbox' || (S('buttons') === 'xbox');
  /** the device a prompt should show for an input: gamepad, keyboard or mouse */
  const dev = I => { const d = I.lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; };
  function codeFor(I, action, kind) {
    const m = (I.map && I.map[action]) || []; if (kind === 'gamepad') return m.find(c => /^Pad\d+$/.test(c)); if (kind === 'mouse') return m.find(c => /^Mouse\d$/.test(c)) || m.find(c => !/^Pad|^Mouse|^Act:|^PadAxis/.test(c));
    return m.find(c => !/^Pad|^Mouse|^Act:|^PadAxis/.test(c));
  }
  const W = (str, sc = 1) => E.font.width(str, { scale: sc });
  /** what a chip shows: { kind: 'badge' | 'tab' | 'key' | 'mouse', lab, col, n } */
  function spec(I, action, d) {
    if (action === 'up' || action === 'left' || action === 'down' || action === 'right') return d === 'gamepad' ? { kind: 'tab', lab: action === 'up' || action === 'down' ? 'D-PAD ↑↓' : 'D-PAD ←→' } : { kind: 'key', lab: action === 'up' || action === 'down' ? '↑↓' : '←→' };
    if (d === 'gamepad') {
      const code = codeFor(I, action, 'gamepad'); if (!code) return { kind: 'key', lab: '?' };
      const n = +code.slice(3), xb = xbox(I);
      if (n <= 3) { const [lab, col] = (xb ? XB : PS)[n]; return { kind: 'badge', lab, col }; }
      if (n <= 7) return { kind: 'tab', lab: SH[xb ? 'xb' : 'ps'][n - 4] };
      return { kind: 'key', lab: OTHER[xb ? 'xb' : 'ps'][n] || code, dark: true };
    }
    if (d === 'mouse') { const code = codeFor(I, action, 'mouse'); if (code && /^Mouse/.test(code)) return { kind: 'mouse', n: +code.slice(5) }; return { kind: 'key', lab: code ? I.codeLabel(code) : '?' }; }
    if (d === 'touch') return { kind: 'key', lab: action.toUpperCase() };
    const code = codeFor(I, action, 'keyboard'); return { kind: 'key', lab: code ? I.codeLabel(code) : '?' };
  }
  const widthOf = (sp, sc) => sp.kind === 'badge' ? Math.ceil(9 * sc + 1) : sp.kind === 'tab' ? Math.ceil(W(sp.lab, sc) + 6 * sc) : sp.kind === 'mouse' ? Math.ceil(7 * sc + 1) : Math.ceil(Math.max(9 * sc, W(String(sp.lab).toUpperCase(), sc) + 6 * sc));
  /** draw one chip; returns its width. o: { input, device, scale } */
  function chip(g, action, x, y, o = {}) {
    const I = o.input || game.input, d = o.device || dev(I), sc = o.scale || 1, h = 9 * sc, sp = spec(I, action, d);
    x = Math.round(x); y = Math.round(y);
    if (sp.kind === 'badge') { const r = 4.5 * sc; px.disc(g, x + r, y + r, r + .5, '#0c1018'); px.disc(g, x + r, y + r, r - .5, '#1e2636'); E.font.text(g, sp.lab, x + r + .5, y + r - 3 * sc, sp.col, { align: 'center', scale: sc, outline: false }); return widthOf(sp, sc); }
    if (sp.kind === 'tab') { const w = widthOf(sp, sc); px.rect(g, x, y, w, h, '#0c1018'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#2a3448'); px.rect(g, x + 1, y + 1, w - 2, 1, '#4a5a78'); E.font.text(g, sp.lab, x + w / 2, y + 1 * sc, '#e8eef8', { align: 'center', scale: sc, outline: false }); return w; }
    if (sp.kind === 'mouse') return mouse(g, sp.n, x, y, sc);
    return keycap(g, sp.lab, x, y, sc, sp.dark ? '#2a3448' : undefined);
  }
  function keycap(g, lab, x, y, sc = 1, bg = '#e8e4d8') {
    lab = String(lab).toUpperCase(); const w = Math.ceil(Math.max(9 * sc, W(lab, sc) + 6 * sc)), h = 9 * sc, dark = bg !== '#e8e4d8';
    px.rect(g, x, y + 1, w, h, '#0c1018'); px.rect(g, x, y, w, h - 1, dark ? bg : '#c8c4b8'); px.rect(g, x + 1, y, w - 2, h - 2, bg); px.rect(g, x + 1, y, w - 2, 1, dark ? '#4a5a78' : '#ffffff');
    E.font.text(g, lab, x + w / 2, y + 1 * sc, dark ? '#e8eef8' : '#1a1a22', { align: 'center', scale: sc, outline: false }); return w;
  }
  function mouse(g, btn, x, y, sc = 1) {
    const w = 7 * sc, h = 10 * sc; px.rect(g, x, y, w, h, '#0c1018'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#e8e4d8'); px.rect(g, x + 1, y + 4 * sc, w - 2, 1, '#8a8a90');
    const lit = '#ffd36a'; if (btn === 0) px.rect(g, x + 1, y + 1, Math.floor((w - 2) / 2), 3 * sc, lit); else if (btn === 2) px.rect(g, x + Math.ceil(w / 2), y + 1, Math.floor((w - 2) / 2), 3 * sc, lit); else px.rect(g, x + Math.floor(w / 2), y + 1, 1 * sc, 3 * sc, '#e83a2a');
    px.rect(g, x + Math.floor(w / 2), y + 1, 1, 3 * sc, '#8a8a90'); return Math.ceil(w + 1);
  }
  /** the width of a chip (to center a prompt) */
  function chipW(action, o = {}) { const I = o.input || game.input; return widthOf(spec(I, action, o.device || dev(I)), o.scale || 1); }
  /** text with {action} chips; o: { align, color, scale, input, shadow }; returns its width */
  function text(g, str, x, y, o = {}) {
    const parts = String(str).split(/(\{[a-z]+\})/), sc = o.scale || 1, col = o.color || '#eef4ff';
    const widths = parts.map(p => /^\{[a-z]+\}$/.test(p) ? chipW(p.slice(1, -1), o) + 2 : E.font.width(p, { scale: sc }));
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    parts.forEach((p, i) => {
      if (/^\{[a-z]+\}$/.test(p)) { chip(g, p.slice(1, -1), cx + 1, y - 1 * sc, o); }
      else if (p) E.font.text(g, p, Math.round(cx), Math.round(y), col, { scale: sc, outline: false, shadow: o.shadow === undefined ? '#000' : o.shadow });
      cx += widths[i];
    });
    return total;
  }
  /** a plain-text label for logs and hub tags: 'J', '✕', 'Left click' */
  const label = (action, I = game.input) => { const d = dev(I), c = codeFor(I, action, d === 'mouse' ? 'mouse' : d === 'gamepad' ? 'gamepad' : 'keyboard'); if (!c) return '?'; if (/^Pad(\d+)$/.test(c)) { const n = +c.slice(3); return n <= 3 ? (xbox(I) ? XB : PS)[n][0] : n <= 7 ? SH[xbox(I) ? 'xb' : 'ps'][n - 4] : OTHER[xbox(I) ? 'xb' : 'ps'][n]; } return I.codeLabel(c); };
  return { chip, chipW, text, keycap, mouse, label, dev, PS, XB };
})();
