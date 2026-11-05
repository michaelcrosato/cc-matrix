(() => {
const E = My3D2dge, SN = globalThis.SN;
// ---- input preset: controller first, keyboard native, mouse for menus and the trigger ----------------------------------
SN.INPUT = {
  up: ['ArrowUp', 'Pad12'], down: ['ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  thrust: ['KeyW', 'Pad0'], fire: ['Space', 'Mouse0', 'Pad2'], absorb: ['KeyF', 'Pad1'], camera: ['KeyC', 'Pad3'], lookBack: ['KeyB', 'Pad11'],
  airL: ['KeyQ', 'Pad6'], airR: ['KeyE', 'Pad7'], shiftL: ['KeyZ', 'Pad4'], shiftR: ['KeyX', 'Pad5']
};
SN.Controls = {
  game: null,
  analog(i, I) { try { const p = navigator.getGamepads()[(I || this.game.input).padIndex]; return p && p.buttons[i] ? p.buttons[i].value : 0; } catch (e) { return 0; } },
  read(c, input) {
    const g = this.game, I = input || g.input; c = c || SN.neutralControls();
    const sx = I.padMove ? I.padMove[0] : 0, sy = I.padMove ? I.padMove[1] : 0;
    const key = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    c.steer = Math.abs(sx) > .01 ? sx : key;
    const pk = (I.down('up') ? 1 : 0) - (I.down('down') ? 1 : 0);
    c.pitch = Math.abs(sy) > .01 ? sy : pk;
    c.thrust = I.down('thrust') ? 1 : 0;
    c.brakeL = Math.max(I.down('airL') ? 1 : 0, this.analog(6, I)); c.brakeR = Math.max(I.down('airR') ? 1 : 0, this.analog(7, I));
    c.fire = I.down('fire'); c.firePressed = I.pressed('fire'); c.absorb = I.pressed('absorb');
    c.shiftL = I.pressed('shiftL'); c.shiftR = I.pressed('shiftR');
    return c;
  }
};

// ---- glyphs: PlayStation shapes or Xbox letters for a pad, keycaps for the keyboard, mouse buttons -----------------------
const SHAPES = {
  cross: ['1.....1', '.1...1.', '..1.1..', '...1...', '..1.1..', '.1...1.', '1.....1'], circle: ['.11111.', '1.....1', '1.....1', '1.....1', '1.....1', '1.....1', '.11111.'],
  square: ['1111111', '1.....1', '1.....1', '1.....1', '1.....1', '1.....1', '1111111'], tri: ['...1...', '..1.1..', '..1.1..', '.1...1.', '.1...1.', '1.....1', '1111111']
};
const PS = { '✕': ['cross', '#7aa8ff'], '○': ['circle', '#ff6b7a'], '□': ['square', '#ff9be0'], '△': ['tri', '#6df0a8'] };
const XB = { A: '#5fe08a', B: '#ff6b6b', X: '#6ab0ff', Y: '#ffd84a' };
SN.Glyph = {
  // draw one prompt chip for an action; returns its width. `label` is what the engine says for that action on the device in use
  chip(g, label, x, y, o = {}) {
    const mouse = /click/i.test(label), pad = SN.Glyph.isPad();
    const sh = pad ? PS[label] : null;
    if (sh) { const w = 13; px(g, x, y - 1, w, 13, '#1a1630'); px(g, x + 1, y, w - 2, 11, '#2c2550'); this.shape(g, SHAPES[sh[0]], x + 3, y + 2, sh[1]); return w + 2; }
    if (pad && XB[label] && SN.game.input.padStyle() !== 'playstation') { px(g, x + 1, y - 1, 11, 13, '#1a1630'); px(g, x, y, 13, 11, '#1a1630'); px(g, x + 1, y, 11, 11, XB[label]); E.font.text(g, label, x + 4, y + 2, '#10101a', false); return 15; }
    const t = label.length > 12 ? label.slice(0, 12) : label, w = Math.max(13, E.font.width ? E.font.width(t) + 8 : t.length * 5 + 8), tw = E.font.text(g, t, 0, -50, '#000', false).w; const ww = Math.max(13, tw + 8);
    px(g, x, y - 1, ww, 14, '#10101c'); px(g, x + 1, y, ww - 2, 12, mouse ? '#4a2a58' : pad ? '#3a3560' : '#34324a'); px(g, x + 1, y + 10, ww - 2, 2, '#20203a');
    E.font.text(g, t, x + 4, y + 2, '#ffffff', false); return ww + 2;
  },
  shape(g, rows, x, y, col) { g.fillStyle = col; rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '1') g.fillRect(x + i, y + j, 1, 1); }); },
  isPad() { return SN.game && SN.game.input.lastDevice === 'gamepad'; },
  label(action) { const g = SN.game; if (!g) return ''; const dev = g.input.lastDevice; return g.input.label(action, dev === 'touch' ? 'keyboard' : dev); },
  prompt(g, action, text, x, y, o = {}) {
    const lab = typeof action === 'string' && action.startsWith('=') ? action.slice(1) : this.label(action);
    const w = this.chip(g, lab, x, y, o); const col = o.color || '#d8d4ff';
    if (text) { const t = E.font.text(g, text, x + w + 2, y + 2, col, '#0b0814'); return w + 2 + t.w + 8; }
    return w;
  },
  // right-aligned row of prompts
  row(g, items, rx, y) { let tot = 0; const meas = items.map(([a, t]) => { const lab = a.startsWith('=') ? a.slice(1) : this.label(a); const cw = this.chip({ fillRect() {}, set fillStyle(v) {} }, lab, 0, 0); return cw + 2 + E.font.text({ fillRect() {}, set fillStyle(v) {} }, t, 0, 0, '#000', false).w + 10; }); tot = meas.reduce((a, b) => a + b, 0); let x = rx - tot; items.forEach(([a, t]) => { x += this.prompt(g, a, t, x, y); }); },
  left(g, items, x, y) { items.forEach(([a, t]) => { x += this.prompt(g, a, t, x, y); }); }
};
const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
SN.px = px;

// ---- weapon icons (12x12, drawn from strings) -------------------------------------------------------------------------------
const WI = {
  swarm: ['............', '..1....1....', '.11...11....', '..1....1..1.', '...1.1..1.11', '..111..1.1.1', '.1.1...11...', '..1.....1...', '.....1...1..', '....11......', '.1...1...1..', '............'],
  seeker: ['............', '.....11.....', '....1111....', '....1111....', '....1111....', '...111111...', '...111111...', '..11.11.11..', '..1..11..1..', '.....11.....', '....1..1....', '............'],
  mine: ['............', '.....11.....', '..1..11..1..', '...111111...', '.1.111111.1.', '.1111111111.', '.1111111111.', '.1.111111.1.', '...111111...', '..1..11..1..', '.....11.....', '............'],
  cannon: ['............', '............', '.......1....', '..111111111.', '.11111111111', '.11111111111', '..111111111.', '.......1....', '..1.........', '.1..........', '............', '............'],
  rail: ['............', '1...........', '.1..........', '..1.........', '...1....1...', '....1..1....', '.....11.....', '....1..1....', '...1....1...', '..1.........', '.1..........', '1...........'],
  tremor: ['............', '............', '.....11.....', '....1..1....', '...1....1...', '..1..11..1..', '.1..1..1..1.', '1..1....1..1', '............', '............', '............', '............'],
  bulwark: ['............', '..11111111..', '.1111111111.', '.1111111111.', '.1111111111.', '.1111111111.', '..11111111..', '..11111111..', '...111111...', '....1111....', '.....11.....', '............'],
  auto: ['............', '....1111....', '...1....1...', '..1..11..1..', '..1.1..1.1..', '..1..11..1..', '...1....1...', '....1111....', '.....11.....', '....1..1....', '...1....1...', '............'],
  nitro: ['............', '......11....', '.....111....', '....111.....', '...1111.....', '..111111....', '.....111....', '....111.....', '...11.......', '..11........', '..1.........', '............'],
  siphon: ['............', '.1.1.1.1.1..', '..1.1.1.1...', '...1.1.1....', '....111.....', '.....1......', '.....1......', '....111.....', '...11111....', '..1111111...', '............', '............']
};
SN.WeaponIcon = (g, id, x, y, s = 2) => { const col = SN.WEAPONS[id].color; g.fillStyle = col; WI[id].forEach((r, j) => { for (let i = 0; i < 12; i++) if (r[i] === '1') g.fillRect(x + i * s, y + j * s, s, s); }); };
})();
