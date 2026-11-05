// 52-glyphs: on-screen prompts follow the device a player used last: PlayStation shapes for a controller (Xbox letters
// with the setting), keycaps for the keyboard, a mouse with its button lit once the mouse has been used.
const PAD_PS = { Pad0: ['cross', '#6aa8ff'], Pad1: ['circle', '#ff5a6a'], Pad2: ['square', '#ff8ad8'], Pad3: ['triangle', '#4ae0a8'], Pad4: ['L1'], Pad5: ['R1'], Pad6: ['L2'], Pad7: ['R2'], Pad8: ['CREATE'], Pad9: ['OPTIONS'], Pad10: ['L3'], Pad11: ['R3'], Pad12: ['up'], Pad13: ['down'], Pad14: ['left'], Pad15: ['right'] };
const PAD_XB = { Pad0: ['A', '#5ac04a'], Pad1: ['B', '#e84a3a'], Pad2: ['X', '#3a8ae8'], Pad3: ['Y', '#e8c03a'], Pad4: ['LB'], Pad5: ['RB'], Pad6: ['LT'], Pad7: ['RT'], Pad8: ['VIEW'], Pad9: ['MENU'], Pad10: ['LS'], Pad11: ['RS'], Pad12: ['up'], Pad13: ['down'], Pad14: ['left'], Pad15: ['right'] };
const KEYNAME = { Space: 'SPACE', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', Enter: 'ENTER', NumpadEnter: 'ENTER', Escape: 'ESC', Tab: 'TAB', Backspace: 'BKSP', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ControlLeft: 'CTRL' };
const Glyph = {
  mouseUsed: false,
  /** the family a player's prompts use now: 'ps' | 'xbox' | 'keys' */
  family(I) { I = I || G.game.input; if (I.lastDevice === 'gamepad') { const s = G.game.settings.glyphs; return s === 'xbox' || (s === 'auto' && I.padStyle && I.padStyle() === 'xbox') ? 'xbox' : 'ps'; } return 'keys'; },
  /** the code an action shows on that family (after rebinding) */
  code(action, I) {
    I = I || G.game.input; const fam = this.family(I), codes = (I.map[action] || []).filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    if (fam !== 'keys') return codes.find(c => /^Pad\d+$/.test(c)) || null;
    if (this.mouseUsed || I.lastDevice === 'mouse') { const m = codes.find(c => /^Mouse/.test(c)); if (m) return m; }
    return codes.find(c => !/^Pad|^Mouse/.test(c)) || codes.find(c => /^Mouse/.test(c)) || null;
  },
  /** plain words for a code (captions, the hub's howto) */
  word(action, I) { const c = this.code(action, I), fam = this.family(I); if (!c) return '?'; if (/^Pad/.test(c)) { const t = (fam === 'xbox' ? PAD_XB : PAD_PS)[c]; return t ? t[0].toUpperCase() : c; } if (c === 'Mouse0') return 'LEFT CLICK'; if (c === 'Mouse2') return 'RIGHT CLICK'; if (c === 'Mouse1') return 'WHEEL'; return KEYNAME[c] || c.replace(/^Key|^Digit/, ''); },
  /** draw an action's glyph with its left edge at x, centred on y; returns its width */
  draw(g, action, x, y, I, o = {}) { const c = this.code(action, I); return this.drawCode(g, c, x, y, this.family(I), o); },
  drawCode(g, c, x, y, fam, o = {}) {
    const s = o.scale || 1, r = Math.round(6 * s);
    if (!c) { E.font.text(g, '?', x, y - 4 * s, '#fff', { scale: s }); return 6 * s; }
    if (/^Pad\d+$/.test(c)) {
      const T2 = (fam === 'xbox' ? PAD_XB : PAD_PS)[c] || [c];
      const name = T2[0], col = T2[1];
      if (['cross', 'circle', 'square', 'triangle'].includes(name)) {
        px.disc(g, x + r, y, r, '#14101c'); px.disc(g, x + r, y, r - 1, '#2a2438');
        const k = r * .5;
        if (name === 'cross') { px.line(g, x + r - k, y - k, x + r + k, y + k, col, Math.max(1, s)); px.line(g, x + r + k, y - k, x + r - k, y + k, col, Math.max(1, s)); }
        else if (name === 'circle') { px.disc(g, x + r, y, k + .5, col); px.disc(g, x + r, y, Math.max(0, k - 1), '#2a2438'); }
        else if (name === 'square') { px.rect(g, x + r - k, y - k, k * 2, 1, col); px.rect(g, x + r - k, y + k, k * 2, 1, col); px.rect(g, x + r - k, y - k, 1, k * 2, col); px.rect(g, x + r + k - 1, y - k, 1, k * 2 + 1, col); }
        else { px.line(g, x + r, y - k, x + r + k, y + k * .8, col); px.line(g, x + r + k, y + k * .8, x + r - k, y + k * .8, col); px.line(g, x + r - k, y + k * .8, x + r, y - k, col); }
        return r * 2 + 1;
      }
      if (fam === 'xbox' && col) { px.disc(g, x + r, y, r, '#14101c'); px.disc(g, x + r, y, r - 1, col); E.font.text(g, name, x + r, y - 3 * s, '#ffffff', { align: 'center', scale: s, outline: false, shadow: '#0008' }); return r * 2 + 1; }
      if (['up', 'down', 'left', 'right'].includes(name)) { const w = r * 2; px.rect(g, x, y - r, w, w, '#14101c'); px.rect(g, x + w / 2 - 2 * s, y - r + 1, 4 * s, w - 2, '#4a4458'); px.rect(g, x + 1, y - 2 * s, w - 2, 4 * s, '#4a4458'); const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[name]; px.rect(g, x + w / 2 - 1 + d[0] * r * .55, y - 1 + d[1] * r * .55, 3, 3, '#ffffff'); return w + 1; }
      // triggers, bumpers, sticks, the small buttons: a tab with its name
      const w = E.font.width(name, { scale: s }) + 6 * s, tall = /2|T$/.test(name);
      px.rect(g, x, y - r + (tall ? 0 : 1), w, r * 2 - (tall ? 0 : 2), '#14101c'); px.rect(g, x + 1, y - r + 1 + (tall ? 0 : 1), w - 2, r * 2 - 2 - (tall ? 0 : 2), '#3a3448');
      if (tall) px.rect(g, x + 1, y - r + 1, w - 2, 2, '#5a5468');
      E.font.text(g, name, x + 3 * s, y - 3 * s, '#ffffff', { scale: s, outline: false }); return w + 1;
    }
    if (/^Mouse/.test(c)) {   // a mouse: its body, the button pressed lit
      const w = 9 * s, h = 13 * s, x0 = x, y0 = y - h / 2;
      px.rect(g, x0 + 1, y0, w - 2, h, '#14101c'); px.rect(g, x0, y0 + 1, w, h - 2, '#14101c'); px.rect(g, x0 + 1, y0 + 1, w - 2, h - 2, '#e8e4ec');
      px.rect(g, x0 + w / 2, y0 + 1, 1, h * .42, '#14101c'); px.rect(g, x0 + 1, y0 + h * .42, w - 2, 1, '#14101c');
      const lit = c === 'Mouse0' ? [x0 + 1, y0 + 1] : c === 'Mouse2' ? [x0 + w / 2 + 1, y0 + 1] : null;
      if (lit) px.rect(g, lit[0], lit[1], w / 2 - 1, h * .42 - 1, '#ff8a3a'); else px.rect(g, x0 + w / 2 - 1, y0 + 2, 3, h * .3, '#ff8a3a');
      return w + 2;
    }
    const label = KEYNAME[c] || c.replace(/^Key|^Digit/, ''), w = Math.max(12 * s, E.font.width(label, { scale: s }) + 7 * s);
    px.rect(g, x, y - r, w, r * 2, '#14101c'); px.rect(g, x + 1, y - r + 1, w - 2, r * 2 - 3, '#e8e2d4'); px.rect(g, x + 1, y + r - 2, w - 2, 1, '#9a9488');
    E.font.text(g, label, x + w / 2, y - 3 * s - 1, '#2a2430', { align: 'center', scale: s, outline: false });
    return w + 1;
  },
  /** a prompt: glyph + text, centred at x (returns its width) */
  cue(g, action, text, x, y, I, o = {}) {
    const s = o.scale || 1, tw = E.font.width(text, { scale: s }), gw = this.measure(action, I, s), w = gw + 4 + tw, x0 = Math.round(x - (o.align === 'left' ? 0 : o.align === 'right' ? w : w / 2));
    this.draw(g, action, x0, y, I, { scale: s });
    E.font.text(g, text, x0 + gw + 4, y - 3 * s, o.color || '#ffffff', { scale: s, shadow: '#000', outline: false });
    return w;
  },
  measure(action, I, s = 1) { if (!HAS_DOM) return 12; const c = this.code(action, I), fam = this.family(I); if (!c) return 6 * s; if (/^Pad\d+$/.test(c)) { const T2 = (fam === 'xbox' ? PAD_XB : PAD_PS)[c] || [c]; if (['cross', 'circle', 'square', 'triangle', 'up', 'down', 'left', 'right'].includes(T2[0]) || (fam === 'xbox' && T2[1])) return 13 * s; return E.font.width(T2[0], { scale: s }) + 7 * s; } if (/^Mouse/.test(c)) return 11 * s; const label = KEYNAME[c] || c.replace(/^Key|^Digit/, ''); return Math.max(12 * s, E.font.width(label, { scale: s }) + 7 * s) + 1; }
};
// moving the mouse is using it: prompts (and P1's aim) follow it, as the engine's buttons do
if (HAS_DOM) addEventListener('mousemove', e => { if ((e.movementX || e.movementY) && !(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents)) { Glyph.mouseUsed = true; if (G.game.input.lastDevice !== 'mouse') G.game.input.lastDevice = 'mouse'; } }, { passive: true });
