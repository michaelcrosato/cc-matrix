// SNIPEOUT HD: prompt icons that follow the device used last. PlayStation (the default): coloured face symbols in dark
// discs, L1 / R1 / L2 / R2 tabs, Options and Create pills, the d-pad and the stick; Xbox (Settings, Button symbols): A B
// X Y in their colours, LB RB LT RT, Menu and View; the keyboard: keycaps sized to the key's label; the mouse: a mouse
// with its button lit. Labels always come from the player's bindings (input.label), never typed in.
(() => {
const E = My3D2dge, SN = globalThis.SN, px = E.px;
const PS = { 0: ['✕', '#7cb2e8'], 1: ['○', '#ff6b6b'], 2: ['□', '#ff79c6'], 3: ['△', '#3fd8a6'] }, XB = { 0: ['A', '#5ad85a'], 1: ['B', '#ff5a5a'], 2: ['X', '#4a9aff'], 3: ['Y', '#ffd23f'] };
const SHOULDER = { ps: ['L1', 'R1', 'L2', 'R2'], xb: ['LB', 'RB', 'LT', 'RT'] };
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: false }, o));
const W = (s, o = {}) => E.font.width(s, o);
const G = SN.glyph = {
  /** the device whose prompts to show for an input */
  device(I) { const d = I.lastDevice; return d === 'touch' ? 'keyboard' : d; },
  style(I) { return (I.glyphs || 'playstation') === 'xbox' ? 'xb' : 'ps'; },
  /** the code an action shows on a device: a pad button index, a key code or a mouse button */
  code(I, action, dev) {
    const m = I.map[action]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (dev === 'gamepad') return real.find(c => /^Pad\d+$/.test(c)) || null;
    if (dev === 'mouse') return real.find(c => c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad')) || null;
    return real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real.find(c => !c.startsWith('Pad')) || null;
  },
  /** draw an action's prompt at (x, y) (its top left), height about 11 * k; returns the width drawn */
  draw(g, action, x, y, o = {}) {
    const I = o.input || E.current.input, dev = o.device || G.device(I), k = o.k || 1;
    if (action === 'steer' || action === 'move' || action === 'noseDown' || action === 'pitch') return G.dir(g, action, x, y, I, dev, k);
    const code = G.code(I, action, dev);
    if (!code) return 0;
    if (/^Pad\d+$/.test(code)) return G.pad(g, +code.slice(3), x, y, G.style(I), k);
    if (code.startsWith('Mouse')) return G.mouse(g, +code.slice(5), x, y, k);
    return G.key(g, I.codeLabel(code), x, y, k);
  },
  pad(g, b, x, y, st, k = 1) {
    const r = Math.round(5 * k), cx = x + r + 1, cy = y + r + 1;
    if (b <= 3) {
      const [sym, col] = (st === 'xb' ? XB : PS)[b];
      px.disc(g, cx, cy, r + 1, '#0a0a12'); px.disc(g, cx, cy, r, '#1c1c2a');
      if (st === 'xb') T(g, sym, cx - Math.floor(W(sym) * Math.max(1, Math.round(k)) / 2) + 1, cy - 3 * Math.max(1, Math.round(k)), col, { scale: Math.max(1, Math.round(k * .9)) });
      else G.psSym(g, b, cx, cy, Math.round(3 * k), col);
      return r * 2 + 3;
    }
    const label = b >= 4 && b <= 7 ? SHOULDER[st][b - 4] : b === 9 ? (st === 'xb' ? 'MENU' : 'OPTIONS') : b === 8 ? (st === 'xb' ? 'VIEW' : 'CREATE') : b === 10 ? (st === 'xb' ? 'LS' : 'L3') : b === 11 ? (st === 'xb' ? 'RS' : 'R3') : b === 12 ? '↑' : b === 13 ? '↓' : b === 14 ? '←' : b === 15 ? '→' : 'PS';
    const w = W(label) + 6, h = Math.round(11 * k);
    px.rect(g, x, y, w, h, '#0a0a12'); px.rect(g, x + 1, y + 1, w - 2, h - 2, b >= 6 && b <= 7 ? '#2a2a3e' : '#22222e');
    if (b >= 4 && b <= 7) px.rect(g, x + 1, y + 1, w - 2, 1, '#5a5a78');
    T(g, label, x + 3, y + Math.round((h - 7) / 2), '#e8e8f4');
    return w + 1;
  },
  psSym(g, b, cx, cy, s, col) {
    if (b === 0) { px.line(g, cx - s, cy - s, cx + s, cy + s, col); px.line(g, cx - s, cy + s, cx + s, cy - s, col); }
    else if (b === 1) { for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(t) * s), Math.round(cy + Math.sin(t) * s), col); } }
    else if (b === 2) { px.rect(g, cx - s, cy - s, s * 2 + 1, 1, col); px.rect(g, cx - s, cy + s, s * 2 + 1, 1, col); px.rect(g, cx - s, cy - s, 1, s * 2 + 1, col); px.rect(g, cx + s, cy - s, 1, s * 2 + 1, col); }
    else { px.line(g, cx, cy - s, cx - s, cy + s - 1, col); px.line(g, cx, cy - s, cx + s, cy + s - 1, col); px.rect(g, cx - s, cy + s - 1, s * 2 + 1, 1, col); }
  },
  key(g, label, x, y, k = 1) {
    const w = Math.max(11, W(label) + 6), h = Math.round(11 * k);
    px.rect(g, x, y, w, h, '#0a0a12'); px.rect(g, x + 1, y + 1, w - 2, h - 3, '#e8e8f0'); px.rect(g, x + 1, y + h - 2, w - 2, 1, '#9a9aa8');
    T(g, label, x + Math.floor((w - W(label)) / 2), y + Math.round((h - 9) / 2) + 1, '#14141c');
    return w + 1;
  },
  mouse(g, b, x, y, k = 1) {
    const w = 9, h = Math.round(12 * k);
    px.rect(g, x, y, w, h, '#0a0a12'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#d8d8e4'); px.rect(g, x + 4, y + 1, 1, 4, '#0a0a12'); px.rect(g, x + 1, y + 5, w - 2, 1, '#0a0a12');
    if (b === 0) px.rect(g, x + 1, y + 1, 3, 4, '#29c8e8'); else if (b === 2) px.rect(g, x + 5, y + 1, 3, 4, '#ff79c6'); else px.rect(g, x + 4, y + 1, 1, 3, '#ffd23f');
    return w + 2;
  },
  /** directions: the stick or d-pad (gamepad), the keys (keyboard) */
  dir(g, action, x, y, I, dev, k = 1) {
    if (dev === 'gamepad') {
      const r = Math.round(5 * k), cx = x + r + 1, cy = y + r + 1;
      px.disc(g, cx, cy, r + 1, '#0a0a12'); px.disc(g, cx, cy, r, '#2a2a3a'); px.disc(g, cx, cy - (action === 'noseDown' ? 2 : 0), r - 2, '#4a4a62');
      if (action === 'steer') { px.dot(g, cx - r + 1, cy, '#ffffff'); px.dot(g, cx + r - 1, cy, '#ffffff'); }
      else if (action === 'noseDown') px.dot(g, cx, cy - r + 1, '#ffffff');
      return r * 2 + 3;
    }
    const keys = action === 'steer' ? [I.label('left', 'keyboard'), I.label('right', 'keyboard')] : action === 'noseDown' ? ['↑'] : action === 'pitch' ? ['↑', '↓'] : ['↑', '↓', '←', '→'];
    let w = 0; for (const kk of keys) w += G.key(g, kk, x + w, y, k);
    return w;
  },
  /** a row of prompts: [[action, 'LABEL'], ...] at (x, y), right-aligned when o.right; returns the width */
  bar(g, items, x, y, o = {}) {
    const I = o.input || E.current.input, gap = 6; let w = 0;
    const measure = () => { let t = 0; for (const [a, l] of items) { const cv = G._scratch || (G._scratch = SN.browser ? document.createElement('canvas').getContext('2d') : null); t += (cv ? G.draw(cv, a, 0, 0, { input: I }) : 12) + W(l) + 3 + gap; } return t; };
    let cx = o.right ? x - measure() : o.center ? x - measure() / 2 : x;
    for (const [a, l] of items) { const gw = G.draw(g, a, cx, y, { input: I }); cx += gw + 2; T(g, l, cx, y + 2, o.color || '#e8ecff', { shadow: '#000' }); cx += W(l) + 1 + gap; w += gw + W(l) + 3 + gap; }
    return w;
  },
  /** text with {action} tokens turned into prompt icons, drawn at (x, y); returns the width */
  rich(g, text, x, y, color = '#ffffff', o = {}) {
    const I = o.input || E.current.input, parts = String(text).split(/(\{[a-zA-Z]+\})/); let cx = x;
    for (const p of parts) {
      const m = /^\{([a-zA-Z]+)\}$/.exec(p);
      if (m) { cx += G.draw(g, m[1], cx, y - 2, { input: I }) + 1; continue; }
      if (!p) continue; T(g, p, cx, y, color, Object.assign({ shadow: '#000' }, o.font || {})); cx += W(p, o.font || {});
    }
    return cx - x;
  },
  /** rich text wrapped to maxW: lines of it (each drawn by rich) */
  richLines(text, maxW, I) {
    const words = String(text).split(' '), lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && G.richWidth(t, I) > maxW) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  },
  richWidth(text, I) { const parts = String(text).split(/(\{[a-zA-Z]+\})/); let w = 0; for (const p of parts) { const m = /^\{([a-zA-Z]+)\}$/.exec(p); w += m ? 14 : W(p); } return w; }
};
})();
