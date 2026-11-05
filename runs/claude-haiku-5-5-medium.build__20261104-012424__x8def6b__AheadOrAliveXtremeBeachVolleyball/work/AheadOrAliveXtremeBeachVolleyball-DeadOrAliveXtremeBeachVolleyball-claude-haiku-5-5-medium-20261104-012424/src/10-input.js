/* 10-input: action maps per context, device-aware prompts (PlayStation, Xbox, keycaps, mouse), the touch-only gate. */
const E_ = () => E;
G.menuKeys = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0', 'Mouse0'], cancel: ['Backspace', 'Escape', 'Pad1', 'Mouse2'],
  alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5']
};
/* the match layout: the engine's split keyboard gives P1 F G H R and P2 . / , L from this order */
G.matchKeys = Object.assign({}, G.menuKeys, {
  play: ['Space', 'KeyJ', 'Mouse0', 'Pad0'], dive: ['ShiftLeft', 'KeyL', 'Pad1'], shot: ['KeyE', 'KeyK', 'Mouse2', 'Pad2'],
  call: ['KeyQ', 'KeyI', 'Mouse1', 'Pad3'], view: ['KeyV', 'Pad11'], snap: ['KeyC', 'Pad8'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.exploreKeys = Object.assign({}, G.menuKeys, {
  interact: ['KeyE', 'Space', 'Enter', 'Mouse0', 'Pad0'], run: ['ShiftLeft', 'Pad1', 'Pad7'], bag: ['KeyG', 'Pad2'], leave: ['KeyM', 'Tab', 'Pad3'],
  snap: ['KeyC', 'Pad8'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0', 'Mouse0'], cancel: ['Backspace', 'Pad1', 'Mouse2'], start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.poolKeys = Object.assign({}, G.menuKeys, {
  hopA: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], hopB: ['KeyL', 'ShiftLeft', 'Pad1'], hopX: ['KeyK', 'KeyE', 'Mouse2', 'Pad2'], hopY: ['KeyI', 'KeyQ', 'Pad3'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.casinoKeys = Object.assign({}, G.menuKeys, {
  play: ['Space', 'Pad0'], dive: ['Pad1'], shot: ['Pad2'], call: ['Pad3'],
  hit: ['KeyH', 'Pad0'], stand: ['KeyS', 'Pad2'], double: ['KeyD', 'Pad3'], split: ['KeyP', 'Pad5'], bet: ['KeyJ', 'Pad0'], reel1: ['KeyJ'], reel2: ['KeyK'], reel3: ['KeyL'],
  spin: ['Space', 'Pad0'], chipS: ['Pad5'], chipM: ['Pad4'], remove: ['Pad2'], place: ['Mouse0'], leave: ['Pad1', 'Mouse2'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.photoKeys = Object.assign({}, G.menuKeys, {
  shoot: ['Pad0', 'Space', 'Enter'], exit: ['Pad1', 'Escape'], subject: ['Pad2', 'KeyF'], panel: ['Pad3', 'KeyR'], hideUi: ['Pad10', 'KeyH'],
  zoomIn: ['Pad7'], zoomOut: ['Pad6'], start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
/* what a pad's button index is called in each family, and its keyboard names */
G.PAD_SYMBOL = { ps: ['✕', '○', '□', '△'], xbox: ['A', 'B', 'X', 'Y'] };
G.PAD_PILL = { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT' };
G.PAD_PILL_XBOX = { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS' };
G.PAD_COLOR = { ps: ['#8fb8ff', '#ff7a7a', '#f59ad8', '#5fe0b4'], xbox: ['#6ad66a', '#ff5a5a', '#4aa8ff', '#ffd23a'] };
G.KEY_NAME = { Space: 'SPACE', Enter: 'ENTER', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL', Escape: 'ESC', Backspace: 'BKSP', Tab: 'TAB',
  Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Period: '.', Slash: '/', Comma: ',', NumpadEnter: 'ENTER' };
G.keyName = function (code) {
  if (G.KEY_NAME[code]) return G.KEY_NAME[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return String(code).toUpperCase();
};
/* the device prompts follow: the last one used (per player input). 'ps' | 'xbox' | 'kbm' */
G.padStyle = function () { return G.game.input.glyphs === 'xbox' ? 'xbox' : 'ps'; };
G.devOf = function (input) {
  input = input || G.game.input;
  return input.lastDevice === 'gamepad' ? G.padStyle() : 'kbm';
};
/* the first bound code of an action that matches the kind asked for */
G.boundCode = function (input, action, kind) {
  const codes = (input.map && input.map[action]) || [];
  for (const c of codes) {
    if (c.startsWith('Act:') || c.startsWith('PadAxis')) continue;
    if (kind === 'pad' && c.startsWith('Pad')) return c;
    if (kind === 'kbm' && !c.startsWith('Pad')) return c;
  }
  return null;
};
G.padIndex = function (code) { return +String(code).replace('Pad', ''); };
/* draw one prompt (a glyph and text) inside an overlay; returns its width in screen pixels */
G.prompt = function (r, action, x, y, text, o) {
  o = o || {};
  const input = o.input || G.game.input, dev = o.dev || G.devOf(input), scale = o.scale || 1, color = o.color || '#fff8e8';
  const size = 9 * scale;
  let w = 0, tw = 0;
  const run = (gg) => {
    let code = dev === 'kbm' ? G.boundCode(input, action, 'kbm') : G.boundCode(input, action, 'pad');
    if (!code) code = G.boundCode(input, action, dev === 'kbm' ? 'pad' : 'kbm');
    if (dev === 'kbm') {
      const label = G.keyName(code || '?');
      w = Math.max(size + 2, E.font.width(label, { scale: 1 }) + 6);
      E.px.rect(gg, x, y - 2, w, 10, '#c8c0a8'); E.px.rect(gg, x + 1, y - 1, w - 2, 8, '#2a2a3a');
      E.font.text(gg, label, x + Math.round((w - E.font.width(label, { scale: 1 })) / 2), y - 1, '#fff8e8', { shadow: null });
    } else {
      const k = G.padIndex(code || 'Pad0');
      if (k <= 3) {
        const col = G.PAD_COLOR[dev][k], cy = y + size / 2 - 2;
        E.px.disc(gg, x + size / 2, cy, size / 2, '#1a1a26');
        E.px.disc(gg, x + size / 2, cy, size / 2 - 1, col);
        if (dev === 'xbox') E.font.text(gg, G.PAD_SYMBOL.xbox[k], x + size / 2, cy - 3, '#1a1a26', { align: 'center' });
        else G.drawPsSymbol(gg, k, x + size / 2, cy, scale);
        w = size + 2;
      } else {
        const pill = dev === 'xbox' ? (G.PAD_PILL_XBOX[k] || G.PAD_PILL[k] || 'PAD' + k) : (G.PAD_PILL[k] || 'PAD' + k);
        w = E.font.width(pill, { scale: 1 }) + 6;
        E.px.rect(gg, x, y - 2, w, 10, '#2a2a3a'); E.font.text(gg, pill, x + w / 2, y - 1, '#f4f4f8', { align: 'center' });
      }
    }
    if (text) { tw = E.font.width(text, { scale: 1 }) * (scale > 1 ? 1 : 1); E.font.text(gg, text, x + w + 3 * scale, y - 1, color, { shadow: '#000' }); }
  };
  if (r.overlay) r.overlay(run);
  return w + (text ? 3 * scale + E.font.width(text, { scale: 1 }) : 0);
};
G.drawPsSymbol = function (g, k, cx, cy, scale) {
  const c = '#14141e', s = 3;
  if (k === 0) { E.px.line(g, cx - s, cy - s, cx + s, cy + s, c, 1); E.px.line(g, cx + s, cy - s, cx - s, cy + s, c, 1); }
  else if (k === 1) { E.px.disc(g, cx, cy, s, c); E.px.disc(g, cx, cy, s - 2, G.PAD_COLOR.ps[1]); }
  else if (k === 2) { E.px.rect(g, cx - s, cy - s, 2 * s, 1, c); E.px.rect(g, cx - s, cy + s, 2 * s, 1, c); E.px.rect(g, cx - s, cy - s, 1, 2 * s, c); E.px.rect(g, cx + s, cy - s, 1, 2 * s, c); }
  else { E.px.line(g, cx - s, cy + s - 1, cx, cy - s, c, 1); E.px.line(g, cx, cy - s, cx + s, cy + s - 1, c, 1); E.px.line(g, cx - s, cy + s - 1, cx + s, cy + s - 1, c, 1); }
};
/* the touch-only gate: a tap-only device with no key or pad yet */
G.sawKeyOrPad = false;
G.touchOnly = function () {
  if (G.sawKeyOrPad) return false;
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
};
G.noteDevice = function () {
  const I = G.game && G.game.input;
  if (I && I.lastDevice !== 'touch' && I.lastDevice) G.sawKeyOrPad = G.sawKeyOrPad || I.lastDevice === 'keyboard' || I.lastDevice === 'gamepad' || I.lastDevice === 'mouse';
};
/* a bottom prompt bar: [[action, text], ...] */
G.promptBar = function (r, items, o) {
  o = o || {};
  const y = r.H - 16, scale = 1;
  const parts = items.filter(Boolean).map(([a, t]) => ({ a, t, w: 0 }));
  let total = 0;
  for (const p of parts) { p.w = G.promptWidth(p.a, p.t, o); total += p.w + 14; }
  let x = Math.round(r.W / 2 - total / 2 + 7);
  r.overlay(g => { E.ui.box(g, 0, y - 6, r.W, 18, { bg: ['#0a0a14', '#14142a'], border: null, alpha: .72, gradient: true }); });
  for (const p of parts) { G.prompt(r, p.a, x, y, p.t, o); x += p.w + 14; }
};
G.promptWidth = function (action, text, o) {
  const input = (o && o.input) || G.game.input, dev = (o && o.dev) || G.devOf(input), size = 9;
  let gw;
  if (dev === 'kbm') {
    const code = G.boundCode(input, action, 'kbm') || G.boundCode(input, action, 'pad');
    gw = Math.max(size + 2, E.font.width(G.keyName(code || '?'), { scale: 1 }) + 6);
  } else gw = size + 2;
  if (dev !== 'kbm') { const code = G.boundCode(input, action, 'pad'); const k = code ? G.padIndex(code) : 0; if (k > 3) gw = E.font.width(dev === 'xbox' ? (G.PAD_PILL_XBOX[k] || G.PAD_PILL[k] || 'PAD' + k) : (G.PAD_PILL[k] || 'PAD' + k), { scale: 1 }) + 6; }
  return gw + (text ? 3 + E.font.width(text, { scale: 1 }) : 0);
};
/* the input gather: call once per update, after G.noteDevice */
G.sawAny = function () { return G.game.input.lastDevice !== 'touch'; };
