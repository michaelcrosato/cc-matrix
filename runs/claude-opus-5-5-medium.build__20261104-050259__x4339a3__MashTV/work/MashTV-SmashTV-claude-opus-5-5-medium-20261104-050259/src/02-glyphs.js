// ---------------------------------------------------------------- glyphs: button icons that follow the device used last
// The 5x7 font has no ✕ ○ □ △, so the PlayStation and Xbox buttons, keycaps and the mouse are small pixel icons.
MT.glyph = (() => {
  const F = E.font;
  const PS = { Pad0: ['cross', '#7aa8ff'], Pad1: ['circle', '#ff6a6a'], Pad2: ['square', '#ff8ad8'], Pad3: ['triangle', '#5fe0a0'],
    Pad4: ['tab', 'L1'], Pad5: ['tab', 'R1'], Pad6: ['tab', 'L2'], Pad7: ['tab', 'R2'], Pad8: ['pill', 'CREATE'], Pad9: ['pill', 'OPTIONS'],
    Pad10: ['stick', 'L3'], Pad11: ['stick', 'R3'], Pad12: ['dpad', 'u'], Pad13: ['dpad', 'd'], Pad14: ['dpad', 'l'], Pad15: ['dpad', 'r'] };
  const XB = { Pad0: ['letter', 'A', '#5fd86a'], Pad1: ['letter', 'B', '#ff5a5a'], Pad2: ['letter', 'X', '#5a9aff'], Pad3: ['letter', 'Y', '#ffd23a'],
    Pad4: ['tab', 'LB'], Pad5: ['tab', 'RB'], Pad6: ['tab', 'LT'], Pad7: ['tab', 'RT'], Pad8: ['pill', 'VIEW'], Pad9: ['pill', 'MENU'],
    Pad10: ['stick', 'LS'], Pad11: ['stick', 'RS'], Pad12: ['dpad', 'u'], Pad13: ['dpad', 'd'], Pad14: ['dpad', 'l'], Pad15: ['dpad', 'r'] };
  const KEYNAMES = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'ENTER', NumpadEnter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB' };
  const tw = (s) => F.width(s);
  const txt = (g, s, x, y, c) => F.text(g, s, x, y, c, { outline: false });
  const S = (g, x, y, w, h, c, k) => px.rect(g, x, y, w * k, h * k, c);

  function family(I) { const gl = (I && I.glyphs) || 'playstation'; return gl === 'xbox' ? 'xbox' : 'playstation'; }
  function deviceOf(I) { const d = I ? I.lastDevice : 'keyboard'; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; }
  function codeFor(action, I, dev = deviceOf(I)) {
    if (action === 'move' || action === 'aim') return action;
    const codes = (I && I.map && I.map[action]) || (MT.PLAY[action] || MT.MENU[action] || []);
    if (dev === 'gamepad') return codes.find(c => /^Pad\d+$/.test(c)) || codes[0];
    if (dev === 'mouse') { const m = codes.find(c => c.startsWith('Mouse')); if (m) return m; }
    return codes.find(c => !c.startsWith('Pad') && !c.startsWith('Act:') && !c.startsWith('Mouse')) || codes.find(c => c.startsWith('Mouse')) || codes[0];
  }
  // each icon: a function (g, x, y, k) -> width drawn; y is the top; 11 px tall at k 1
  function disc(g, x, y, k, fill) { px.disc(g, x + 5 * k, y + 5 * k, 5 * k + .4, '#0e0a18'); px.disc(g, x + 5 * k, y + 5 * k, 4.6 * k, fill || '#2a2238'); }
  function psFace(g, x, y, k, shape, col) {
    disc(g, x, y, k); const cx = x + 5 * k, cy = y + 5 * k, s = 2.4 * k;
    if (shape === 'cross') { px.line(g, cx - s, cy - s, cx + s, cy + s, col, k); px.line(g, cx - s, cy + s, cx + s, cy - s, col, k); }
    else if (shape === 'circle') { px.disc(g, cx, cy, s + .6 * k, col); px.disc(g, cx, cy, s - .6 * k, '#2a2238'); }
    else if (shape === 'square') { px.rect(g, cx - s, cy - s, s * 2, k, col); px.rect(g, cx - s, cy + s - k, s * 2, k, col); px.rect(g, cx - s, cy - s, k, s * 2, col); px.rect(g, cx + s - k, cy - s, k, s * 2, col); }
    else if (shape === 'triangle') { const a = [cx, cy - s - .5], b = [cx - s - .5, cy + s - .3], c = [cx + s + .5, cy + s - .3]; px.line(g, a[0], a[1], b[0], b[1], col, k); px.line(g, b[0], b[1], c[0], c[1], col, k); px.line(g, c[0], c[1], a[0], a[1], col, k); }
    return 11 * k;
  }
  function letter(g, x, y, k, L, col) {
    disc(g, x, y, k, '#1c1a22'); px.disc(g, x + 5 * k, y + 5 * k, 4.6 * k, col);
    F.text(g, L, x + 5 * k - (tw(L) * k) / 2 + .5, y + 2 * k, '#101010', { scale: k, outline: false }); return 11 * k;
  }
  function tab(g, x, y, k, L) {
    const w = (tw(L) + 6) * k; px.rect(g, x, y + k, w, 9 * k, '#0e0a18'); px.rect(g, x + k, y + 2 * k, w - 2 * k, 7 * k, '#3a3248');
    px.rect(g, x + k, y + 2 * k, w - 2 * k, k, '#6a6080'); F.text(g, L, x + 3 * k, y + 2.5 * k, '#f4f0ff', { scale: k, outline: false }); return w;
  }
  function pill(g, x, y, k, L) {
    const w = (tw(L) + 8) * k; px.rect(g, x + k, y + 2 * k, w - 2 * k, 7 * k, '#0e0a18'); px.rect(g, x, y + 3 * k, w, 5 * k, '#0e0a18');
    px.rect(g, x + 2 * k, y + 3 * k, w - 4 * k, 5 * k, '#4a4058'); F.text(g, L, x + 4 * k, y + 2.5 * k, '#f4f0ff', { scale: k, outline: false }); return w;
  }
  function stick(g, x, y, k, L) {
    px.disc(g, x + 5 * k, y + 5 * k, 5.4 * k, '#0e0a18'); px.disc(g, x + 5 * k, y + 5 * k, 4.6 * k, '#5a5070'); px.disc(g, x + 5 * k, y + 5 * k, 3.2 * k, '#2a2238');
    F.text(g, L, x + 5 * k - tw(L) * k / 2 + .5, y + 2 * k, '#f4f0ff', { scale: k, outline: false }); return 11 * k;
  }
  function dpad(g, x, y, k, dir) {
    px.rect(g, x + 3 * k, y, 5 * k, 11 * k, '#0e0a18'); px.rect(g, x, y + 3 * k, 11 * k, 5 * k, '#0e0a18');
    px.rect(g, x + 4 * k, y + k, 3 * k, 9 * k, '#5a5070'); px.rect(g, x + k, y + 4 * k, 9 * k, 3 * k, '#5a5070');
    const hi = '#ffcc33', m = { u: [4, 1], d: [4, 7], l: [1, 4], r: [7, 4], all: null }[dir];
    if (m) px.rect(g, x + m[0] * k, y + m[1] * k, 3 * k, 3 * k, hi); else { px.rect(g, x + 4 * k, y + 4 * k, 3 * k, 3 * k, hi); }
    return 11 * k;
  }
  function keycap(g, x, y, k, L) {
    const w = Math.max(11, tw(L) + 6) * k;
    px.rect(g, x, y, w, 11 * k, '#0e0a18'); px.rect(g, x + k, y + k, w - 2 * k, 9 * k, '#d8d0e8'); px.rect(g, x + k, y + 8 * k, w - 2 * k, 2 * k, '#9a90b0');
    px.rect(g, x + k, y + k, w - 2 * k, k, '#ffffff'); F.text(g, L, x + w / 2 - tw(L) * k / 2 + .5, y + 1.5 * k, '#1a1424', { scale: k, outline: false }); return w;
  }
  function mouse(g, x, y, k, btn) {
    px.rect(g, x + 1 * k, y, 8 * k, 11 * k, '#0e0a18'); px.rect(g, x + 2 * k, y + k, 6 * k, 9 * k, '#d8d0e8');
    px.rect(g, x + 4.5 * k, y + k, k, 4 * k, '#0e0a18'); px.rect(g, x + 2 * k, y + 5 * k, 6 * k, k, '#0e0a18');
    if (btn === 0) px.rect(g, x + 2 * k, y + k, 2.5 * k, 4 * k, '#ff2e88'); else if (btn === 2) px.rect(g, x + 5.5 * k, y + k, 2.5 * k, 4 * k, '#ff2e88');
    else if (btn === 'move') { px.rect(g, x + 2 * k, y + k, 6 * k, 4 * k, '#2ee6ff'); }
    return 10 * k;
  }
  function drawCode(g, x, y, code, I, k = 1) {
    if (!code) return 0;
    if (code === 'move' || code === 'aim') {
      const dev = deviceOf(I);
      if (dev === 'gamepad') return stick(g, x, y, k, code === 'move' ? (family(I) === 'xbox' ? 'LS' : 'L') : (family(I) === 'xbox' ? 'RS' : 'R'));
      if (code === 'move') { let w = 0; for (const L of ['W', 'A', 'S', 'D']) w += keycap(g, x + w, y, k, L) + k; return w - k; }
      return mouse(g, x, y, k, 'move');
    }
    if (/^Pad\d+$/.test(code)) {
      const t = (family(I) === 'xbox' ? XB : PS)[code]; if (!t) return keycap(g, x, y, k, code);
      if (t[0] === 'cross' || t[0] === 'circle' || t[0] === 'square' || t[0] === 'triangle') return psFace(g, x, y, k, t[0], t[1]);
      if (t[0] === 'letter') return letter(g, x, y, k, t[1], t[2]);
      return ({ tab, pill, stick, dpad })[t[0]](g, x, y, k, t[1]);
    }
    if (code === 'Mouse0') return mouse(g, x, y, k, 0);
    if (code === 'Mouse2') return mouse(g, x, y, k, 2);
    let L = KEYNAMES[code]; if (!L) { L = I && I.codeLabel ? I.codeLabel(code) : code.replace(/^Key|^Digit/, ''); L = String(L).toUpperCase().slice(0, 6); }
    return keycap(g, x, y, k, L);
  }
  const api = {
    codeFor, deviceOf, family,
    draw(g, x, y, action, I, o = {}) { return drawCode(g, Math.round(x), Math.round(y), codeFor(action, I), I, o.scale || 1); },
    width(action, I, o = {}) { return api.measure([[action, '']], I, o); },
    measure(items, I, o = {}) {
      const k = o.scale || 1; let w = 0;
      for (const [a, label] of items) { const code = codeFor(a, I); w += codeWidth(code, I, k) + (label ? 3 * k + tw(label) * k : 0) + 10 * k; }
      return Math.max(0, w - 10 * k);
    },
    // a row of [action, 'TEXT'] pairs: icon then label; o.align 'center' centres it on x
    prompt(g, x, y, items, I, o = {}) {
      const k = o.scale || 1; if (o.align === 'center') x -= api.measure(items, I, o) / 2;
      x = Math.round(x); y = Math.round(y);
      for (const [a, label] of items) {
        const w = api.draw(g, x, y, a, I, { scale: k }); x += w;
        if (label) { x += 3 * k; F.text(g, label, x, y + 2 * k, o.color || '#fff7e8', { scale: k, shadow: '#000', outline: false }); x += tw(label) * k; }
        x += 10 * k;
      }
      return x;
    }
  };
  function codeWidth(code, I, k) {
    if (code === 'move') return deviceOf(I) === 'gamepad' ? 11 * k : (11 * 4 + 3) * k;
    if (code === 'aim') return deviceOf(I) === 'gamepad' ? 11 * k : 10 * k;
    if (/^Pad\d+$/.test(code)) { const t = (family(I) === 'xbox' ? XB : PS)[code]; if (!t) return 11 * k; if (t[0] === 'tab') return (tw(t[1]) + 6) * k; if (t[0] === 'pill') return (tw(t[1]) + 8) * k; return 11 * k; }
    if (code && code.startsWith('Mouse')) return 10 * k;
    let L = KEYNAMES[code]; if (!L) { L = I && I.codeLabel ? I.codeLabel(code) : String(code); L = String(L).toUpperCase().slice(0, 6); }
    return Math.max(11, tw(L) + 6) * k;
  }
  return api;
})();
