// O.Prompt: button prompts drawn as icons (PlayStation or Xbox face buttons, shoulders and triggers, keycaps, the
// mouse, sticks and the d-pad), following the device each player used last. Every prompt in the game comes from here.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px;

const BMP = {   // 7x7 symbols
  cross: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
  circle: ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'],
  square: ['#######', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '#######'],
  triangle: ['...#...', '..#.#..', '..#.#..', '.#...#.', '.#...#.', '#.....#', '#######']
};
const BMP5 = {
  cross: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], circle: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  square: ['#####', '#...#', '#...#', '#...#', '#####'], triangle: ['..#..', '.#.#.', '.#.#.', '#...#', '#####']
};
const PS = { 0: ['cross', '#7fb2ff'], 1: ['circle', '#ff6b6b'], 2: ['square', '#ff8fd8'], 3: ['triangle', '#4fe0a8'] };
const XB = { 0: ['A', '#5bc236'], 1: ['B', '#e8443a'], 2: ['X', '#3a7cf0'], 3: ['Y', '#f2c21b'] };
const SHOULDER = { playstation: { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3' }, xbox: { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS' } };
const bmp = (g, rows, x, y, k, c) => { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') px.rect(g, x + i * k, y + j * k, k, k, c); };
const txt = (g, s, x, y, c, k, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: false, scale: k }, o));
const tw = (s, k) => E.font.width(s, { scale: k });

const P = O.Prompt = {
  inputOf(o) { return (o && o.inp) || game.input; },
  family(inp) { const s = (inp && inp.padStyle && inp.padStyle()) || game.input.padStyle(); return s === 'xbox' || s === 'nintendo' || s === 'generic' ? 'xbox' : 'playstation'; },
  device(inp) { const d = inp.lastDevice || 'keyboard'; return d === 'touch' ? 'keyboard' : d; },
  /** the code an action shows on a device ('Pad0', 'Space', 'Mouse0', 'KeyJ') */
  codeFor(inp, action, device) {
    const m = inp.map[action]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis')), pads = real.filter(c => c.startsWith('Pad')), keys = real.filter(c => !c.startsWith('Pad'));
    if (device === 'gamepad') return pads[0] || keys[0] || null;
    if (device === 'mouse') return keys.find(c => c.startsWith('Mouse')) || keys.find(c => !c.startsWith('Mouse')) || pads[0] || null;
    return keys.find(c => !c.startsWith('Mouse')) || keys[0] || pads[0] || null;
  },
  /** width in pixels of one icon */
  iconW(inp, action, size = 1, device) {
    device = device || P.device(inp);
    if (action === 'move' || action === 'moveH' || action === 'moveV') return device === 'gamepad' ? (size > 1 ? 19 : 11) : P.capW(action === 'moveV' ? 'W' : 'A', size) * (action === 'move' ? 2 : 2) + 1;
    if (action === 'any') return tw(device === 'gamepad' ? 'ANY BUTTON' : 'ANY KEY', size) + 8;
    const code = P.codeFor(inp, action, device); if (!code) return 0;
    return P.codeW(inp, code, size);
  },
  capW(label, size) { const k = size > 1 ? 2 : 1; return Math.max(size > 1 ? 18 : 10, tw(label, k) + (size > 1 ? 8 : 5)); },
  codeW(inp, code, size = 1) {
    const big = size > 1;
    const m = /^Pad(\d+)$/.exec(code);
    if (m) { const n = +m[1]; if (n <= 3 || (n >= 12 && n <= 15)) return big ? 19 : 11; return tw(SHOULDER[P.family(inp)][n] || 'PAD', big ? 2 : 1) + (big ? 10 : 6); }
    if (code === 'Mouse0' || code === 'Mouse2' || code === 'Mouse1') return big ? 14 : 9;
    return P.capW(P.keyLabel(inp, code), size);
  },
  keyLabel(inp, code) {
    if (code === 'Space') return 'SPACE'; if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT'; if (code === 'Enter' || code === 'NumpadEnter') return 'ENTER';
    if (code === 'Escape') return 'ESC'; if (code === 'Backspace') return 'BKSP'; if (code === 'Backquote') return '`';
    return String(inp.codeLabel(code)).toUpperCase();
  },
  /** draw one code's icon with its top-left at (x, y); returns its width */
  drawCode(g, inp, code, x, y, size = 1, o = {}) {
    const big = size > 1, k = big ? 2 : 1, H = big ? 19 : 11, dim = o.dim ? .45 : 1, lit = o.lit;
    x = Math.round(x); y = Math.round(y);
    const m = /^Pad(\d+)$/.exec(code);
    if (m) {
      const n = +m[1], fam = P.family(inp);
      if (n <= 3) {
        const r = big ? 9 : 5, cx = x + r, cy = y + r;
        px.disc(g, cx, cy, r, '#0b0c18'); px.disc(g, cx, cy, r - 1, lit ? '#3a3f66' : '#232641');
        if (fam === 'playstation') { const [s, c] = PS[n]; const rows = big ? BMP[s] : BMP5[s], kk = big ? 2 : 1, w = rows[0].length * kk; bmp(g, rows, cx - Math.floor(w / 2), cy - Math.floor(w / 2), kk, c); }
        else { const [s, c] = XB[n]; txt(g, s, cx - Math.floor(tw(s, k) / 2) + (big ? 1 : 0), cy - (big ? 7 : 3), c, k); }
        if (dim < 1) px.blend(g, .5, 'normal', () => px.disc(g, cx, cy, r, '#000000'));
        return r * 2 + 1;
      }
      if (n >= 12 && n <= 15) {   // d-pad: a cross with the arm lit
        const s = big ? 6 : 3, cx = x + Math.floor((big ? 19 : 11) / 2), cy = y + Math.floor(H / 2);
        px.rect(g, cx - s * 1.5, cy - s / 2, s * 3, s, '#0b0c18'); px.rect(g, cx - s / 2, cy - s * 1.5, s, s * 3, '#0b0c18');
        px.rect(g, cx - s * 1.5 + 1, cy - s / 2 + 1, s * 3 - 2, s - 2, '#3a3f66'); px.rect(g, cx - s / 2 + 1, cy - s * 1.5 + 1, s - 2, s * 3 - 2, '#3a3f66');
        const arm = { 12: [0, -1], 13: [0, 1], 14: [-1, 0], 15: [1, 0] }[n];
        px.rect(g, cx - s / 2 + arm[0] * s + 1, cy - s / 2 + arm[1] * s + 1, s - 2, s - 2, '#f2b632');
        return big ? 19 : 11;
      }
      const label = SHOULDER[fam][n] || 'PAD', w = tw(label, k) + (big ? 10 : 6);
      px.rect(g, x, y + (big ? 2 : 1), w, H - (big ? 3 : 2), '#0b0c18'); px.rect(g, x + 1, y + (big ? 3 : 2), w - 2, H - (big ? 5 : 4), lit ? '#4a4f78' : '#2e3256');
      px.rect(g, x + 2, y + (big ? 3 : 2), w - 4, 1, '#585e90');
      txt(g, label, x + (big ? 5 : 3), y + (big ? 4 : 2), '#e8ecff', k);
      return w;
    }
    if (code === 'Mouse0' || code === 'Mouse2' || code === 'Mouse1') {
      const w = big ? 14 : 9, h = H; px.rect(g, x + 1, y, w - 2, h, '#0b0c18'); px.rect(g, x, y + 1, w, h - 2, '#0b0c18');
      px.rect(g, x + 1, y + 1, w - 2, h - 2, '#d8dcf0'); px.rect(g, x + Math.floor(w / 2), y + 1, 1, Math.floor(h / 2), '#0b0c18'); px.rect(g, x + 1, y + Math.floor(h / 2), w - 2, 1, '#0b0c18');
      const half = Math.floor(w / 2) - 1;
      if (code === 'Mouse0') px.rect(g, x + 1, y + 1, half, Math.floor(h / 2) - 1, '#f2b632');
      else if (code === 'Mouse2') px.rect(g, x + Math.floor(w / 2) + 1, y + 1, w - Math.floor(w / 2) - 2, Math.floor(h / 2) - 1, '#f2b632');
      else px.rect(g, x + Math.floor(w / 2) - 1, y + 2, 3, 3, '#f2b632');
      return w;
    }
    const label = P.keyLabel(inp, code), w = P.capW(label, size);
    px.rect(g, x, y, w, H, '#0b0c18'); px.rect(g, x + 1, y + 1, w - 2, H - 2, lit ? '#ffffff' : '#e6e9f5'); px.rect(g, x + 1, y + H - (big ? 4 : 3), w - 2, big ? 3 : 2, '#9aa0bd');
    txt(g, label, x + Math.round((w - tw(label, k)) / 2), y + (big ? 3 : 2), '#14182e', k);
    return w;
  },
  /** one action's icon (or a pseudo action: 'move', 'moveH', 'moveV', 'any'); returns its width */
  icon(g, x, y, action, o = {}) {
    const inp = P.inputOf(o), size = o.size || 1, device = o.device || P.device(inp), big = size > 1, H = big ? 19 : 11;
    if (action === 'move' || action === 'moveH' || action === 'moveV') {
      if (device === 'gamepad') {
        const r = big ? 9 : 5, cx = x + r, cy = y + r; px.disc(g, cx, cy, r, '#0b0c18'); px.disc(g, cx, cy, r - 1, '#2e3256'); px.disc(g, cx, cy, r - (big ? 4 : 2), '#585e90');
        const t = game.real * 3, ax = action === 'moveV' ? 0 : Math.round(Math.cos(t) * (big ? 3 : 2)), ay = action === 'moveH' ? 0 : Math.round(Math.sin(t) * (big ? 3 : 2));
        px.disc(g, cx + ax, cy + ay, big ? 3 : 1, '#f2b632'); return r * 2 + 1;
      }
      const pair = action === 'moveV' ? ['KeyW', 'KeyS'] : action === 'moveH' ? ['KeyA', 'KeyD'] : ['KeyW', 'KeyD'];
      if (action === 'move') { const w1 = P.drawCode(g, inp, 'KeyW', x, y, size); txt(g, '/', x + w1 + 1, y + (big ? 3 : 2), '#ffffff', big ? 2 : 1); const w2 = P.drawCode(g, inp, 'ArrowUp', x + w1 + (big ? 12 : 6), y, size); return w1 + w2 + (big ? 12 : 6); }
      const w1 = P.drawCode(g, inp, pair[0], x, y, size), w2 = P.drawCode(g, inp, pair[1], x + w1 + 1, y, size); return w1 + w2 + 1;
    }
    if (action === 'any') { const s = device === 'gamepad' ? 'ANY BUTTON' : 'ANY KEY'; return P.drawCode(g, inp, 'Act:' + s, x, y, size) || 0; }
    const code = P.codeFor(inp, action, device); if (!code) return 0;
    return P.drawCode(g, inp, code, x, y, size, o);
  },
  /** an icon (or several, joined) and a label: P.draw(g, x, y, 'action', { label: 'THROW', size: 2, align: 'center' }); returns the width */
  draw(g, x, y, actions, o = {}) {
    const list = Array.isArray(actions) ? actions : [actions], size = o.size || 1, big = size > 1, k = big ? 2 : 1, inp = P.inputOf(o);
    const iw = list.reduce((s, a) => s + P.iconW(inp, a, size) + 2, -2), lw = o.label ? tw(o.label, k) + (big ? 5 : 3) : 0, W = iw + lw;
    let cx = o.align === 'center' ? x - W / 2 : o.align === 'right' ? x - W : x; cx = Math.round(cx);
    const flash = o.pulse ? Math.floor(game.real * 4) % 2 : -1;
    list.forEach((a, i) => { cx += P.icon(g, cx, y, a, Object.assign({}, o, { lit: flash === i })) + 2; });
    if (o.label) E.font.text(g, o.label, cx + (big ? 3 : 1), y + (big ? 3 : 2), o.color || '#ffffff', { scale: k, shadow: '#000', outline: false });
    return W;
  },
  /** a mash pair whose highlight alternates at the player's rhythm (rate in Hz; 0 = a steady teaching beat) */
  pair(g, x, y, a1, a2, o = {}) {
    const ph = o.flip !== undefined ? o.flip : Math.floor(game.real * (o.rate || 5)) % 2, size = o.size || 1, inp = P.inputOf(o);
    const w1 = P.icon(g, x, y, a1, Object.assign({}, o, { lit: ph === 0 })) + 2;
    const w2 = P.icon(g, x + w1, y + (ph === 1 ? -1 : 0), a2, Object.assign({}, o, { lit: ph === 1 }));
    let w = w1 + w2;
    if (o.label) { E.font.text(g, o.label, x + w + 3, y + (size > 1 ? 3 : 2), o.color || '#ffffff', { scale: size > 1 ? 2 : 1, shadow: '#000', outline: false }); w += tw(o.label, size > 1 ? 2 : 1) + 3; }
    void inp; return w;
  },
  /** a strip of prompts centred at x: [[actions, label], ...] (the bottom of every screen) */
  strip(g, items, x, y, o = {}) {
    const size = o.size || 1, big = size > 1, k = big ? 2 : 1, inp = P.inputOf(o), gap = big ? 14 : 9;
    const ws = items.map(([a, l]) => (Array.isArray(a) ? a : [a]).reduce((s, b) => s + P.iconW(inp, b, size) + 2, -2) + tw(l, k) + (big ? 5 : 3));
    const W = ws.reduce((s, w) => s + w, 0) + gap * (items.length - 1);
    let cx = o.align === 'left' ? x : o.align === 'right' ? x - W : x - W / 2;
    if (o.bg !== false) px.blend(g, .65, 'normal', () => px.rect(g, cx - 6, y - 3, W + 12, (big ? 19 : 11) + 6, '#070914'));
    items.forEach(([a, l], i) => { P.draw(g, cx, y, a, Object.assign({}, o, { label: l, align: 'left' })); cx += ws[i] + gap; });
    return W;
  }
};
})();
