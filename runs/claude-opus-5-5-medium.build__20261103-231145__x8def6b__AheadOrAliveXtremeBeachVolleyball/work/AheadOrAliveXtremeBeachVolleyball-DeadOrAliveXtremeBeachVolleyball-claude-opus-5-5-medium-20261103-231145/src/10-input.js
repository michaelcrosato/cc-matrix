/* 10-input: action maps per context, the device and glyph logic, glyph icons drawn as pixel art, prompts, the mouse
 * wheel, and the touch-only gate. */
const MENUK = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Backspace', 'Pad1'] };
const MOVES = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
G.INPUT = {
  // play, dive, shot, call in this order so the split keyboard's halves come out F/. play, G// dive, H/, shot, R/L call
  MATCH: Object.assign({}, MOVES, { play: ['Space', 'KeyJ', 'Mouse0', 'Pad0'], dive: ['ShiftLeft', 'KeyL', 'Pad1'], shot: ['KeyE', 'KeyK', 'Mouse2', 'Pad2'], call: ['KeyQ', 'KeyI', 'Mouse1', 'Pad3'], view: ['KeyV', 'Pad11'] }, MENUK),
  EXPLORE: Object.assign({}, MOVES, { interact: ['KeyE', 'Space', 'Enter', 'Pad0'], run: ['ShiftLeft', 'Pad1', 'Pad7'], bag: ['KeyG', 'Pad2'], leave: ['KeyM', 'Tab', 'Pad3'], snap: ['KeyC', 'Pad8'] }, MENUK),
  MENU: Object.assign({}, MOVES, { alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], hide: ['KeyH', 'Pad11'], zoomIn: ['Equal', 'Pad7'], zoomOut: ['Minus', 'Pad6'] }, MENUK),
  POOLHOP: Object.assign({}, MOVES, { hopA: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], hopB: ['KeyL', 'ShiftLeft', 'Pad1'], hopX: ['KeyK', 'KeyE', 'Mouse2', 'Pad2'], hopY: ['KeyI', 'KeyQ', 'Pad3'] }, MENUK),
  CASINO: Object.assign({}, MOVES, { alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], hit: ['KeyH', 'Pad0'], stand: ['KeyS', 'Pad2'], double: ['KeyD', 'Pad3'], split: ['KeyP', 'Pad5'],
    reel1: ['KeyJ', 'Pad0'], reel2: ['KeyK', 'Pad1'], reel3: ['KeyL', 'Pad2'] }, MENUK)
};
// the casino's blackjack keys H S D P sit on letters WASD also uses: the casino reads them only in their own phase
G.INPUT.CASINO.down = ['ArrowDown', 'Pad13']; G.INPUT.CASINO.right = ['ArrowRight', 'Pad15'];
G.INPUT.CASINO.cancel = ['Backspace', 'Pad1'];
G.INPUT.CASINO.confirm = ['Enter', 'Space', 'Pad0'];
// a mouse wheel: menus page with it, photo mode zooms with it
G.wheel = 0;
if (typeof addEventListener === 'function') addEventListener('wheel', e => { G.wheel += Math.sign(e.deltaY); G.lastInputT = G.game ? G.game.real : 0; G.anyInput = true; }, { passive: true });
G.takeWheel = () => { const w = G.wheel; G.wheel = 0; return w; };

/* ---- devices: 'ps' | 'xbox' | 'kbm' ---- */
G.device = (I = G.game.input) => I.lastDevice === 'gamepad' ? (I.padStyle() === 'xbox' ? 'xbox' : 'ps') : I.lastDevice === 'mouse' ? 'mouse' : 'kbm';
/** the code to show for an action on the input's last device: a pad button, a key or a mouse button */
G.codeFor = (action, I = G.game.input, dev = G.device(I)) => {
  const codes = (I.map && I.map[action]) || [];
  if (dev === 'ps' || dev === 'xbox') return codes.find(c => /^Pad\d+$/.test(c)) || codes[0];
  if (dev === 'mouse') return codes.find(c => /^Mouse/.test(c)) || codes.find(c => /^(Key|Space|Shift|Enter|Arrow|Tab|Backspace|Escape|Digit|Period|Slash|Comma|Equal|Minus)/.test(c)) || codes[0];
  return codes.find(c => /^(Key|Space|Shift|Enter|Arrow|Tab|Backspace|Escape|Digit|Period|Slash|Comma|Equal|Minus|Numpad)/.test(c)) || codes[0];
};
G.PS_COL = ['#8fb8ff', '#ff7a7a', '#f59ad8', '#5fe0b4'];
G.XB_COL = ['#6ad66a', '#ff5a5a', '#4aa8ff', '#ffd23a'];
/** draw the glyph icon for a code at (x, y) (top-left, 9 px tall); returns its width */
G.drawGlyph = (g, x, y, code, I = G.game.input) => {
  x = Math.round(x); y = Math.round(y);
  const pad = /^Pad(\d+)$/.exec(code || ''), style = I.padStyle ? I.padStyle() : 'playstation';
  if (pad) {
    const n = +pad[1];
    if (n <= 3) {
      if (style === 'xbox') { px.disc(g, x + 4.5, y + 4.5, 4.5, G.XB_COL[n]); E.font.text(g, 'ABXY'[n], x + 3, y + 1, '#101418', { outline: false }); }
      else {
        px.disc(g, x + 4.5, y + 4.5, 4.5, '#1a1d28'); px.disc(g, x + 4.5, y + 4.5, 3.5, '#262a38'); const c = G.PS_COL[n];
        if (n === 0) { px.line(g, x + 2, y + 2, x + 6, y + 6, c); px.line(g, x + 6, y + 2, x + 2, y + 6, c); }
        else if (n === 1) { px.disc(g, x + 4.5, y + 4.5, 2.6, c); px.disc(g, x + 4.5, y + 4.5, 1.4, '#262a38'); }
        else if (n === 2) { px.rect(g, x + 2, y + 2, 5, 5, c); px.rect(g, x + 3, y + 3, 3, 3, '#262a38'); }
        else { px.line(g, x + 4, y + 2, x + 2, y + 6, c); px.line(g, x + 4, y + 2, x + 6, y + 6, c); px.line(g, x + 2, y + 6, x + 6, y + 6, c); }
      }
      return 9;
    }
    const names = style === 'xbox' ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] : ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3'];
    if (n >= 12 && n <= 15) {   // the d-pad: a cross with the pressed arm lit
      px.rect(g, x + 3, y, 3, 9, '#3a3e4c'); px.rect(g, x, y + 3, 9, 3, '#3a3e4c');
      const arm = [[3, 0, 3, 3], [3, 6, 3, 3], [0, 3, 3, 3], [6, 3, 3, 3]][n - 12]; px.rect(g, x + arm[0], y + arm[1], arm[2], arm[3], '#ffffff'); return 9;
    }
    const t = names[n] || ('B' + n), w = E.font.width(t) + 6;
    E.ui.box(g, x, y, w, 9, { bg: '#2a2e3c', border: '#8a90a8', gradient: false }); E.font.text(g, t, x + 3, y + 1, '#ffffff', { outline: false });
    return w;
  }
  if (/^Mouse(\d)$/.test(code || '')) {   // a mouse with the bound button lit
    const b = +code[5];
    px.rect(g, x + 1, y, 7, 9, '#d8dce8'); px.rect(g, x, y + 1, 9, 7, '#d8dce8'); px.rect(g, x + 4, y, 1, 4, '#5a6070');
    if (b === 0) px.rect(g, x + 1, y + 1, 3, 3, '#ff9e5e'); else if (b === 2) px.rect(g, x + 5, y + 1, 3, 3, '#ff9e5e'); else px.rect(g, x + 4, y + 1, 1, 3, '#ff9e5e');
    return 9;
  }
  // a keycap
  const t = (I.codeLabel ? I.codeLabel(code) : code || '?').replace('Left click', 'LMB'), w = Math.max(9, E.font.width(t) + 6);
  px.rect(g, x, y, w, 9, '#9aa0b4'); px.rect(g, x, y, w, 8, '#f0f2f8'); px.rect(g, x + 1, y + 1, w - 2, 6, '#ffffff');
  E.font.text(g, t, x + 3, y + 1, '#2a2e3c', { outline: false });
  return w;
};
G.glyphW = (code, I = G.game.input) => { const pad = /^Pad(\d+)$/.exec(code || ''); if (pad) { const n = +pad[1]; if (n <= 3 || (n >= 12 && n <= 15)) return 9; const st = I.padStyle(); const names = st === 'xbox' ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] : ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3']; return E.font.width(names[n] || 'B' + n) + 6; }
  if (/^Mouse/.test(code || '')) return 9; return Math.max(9, E.font.width((I.codeLabel ? I.codeLabel(code) : code || '?').replace('Left click', 'LMB')) + 6); };
/** a prompt: glyph + text; returns its width */
G.prompt = (g, x, y, action, text, I = G.game.input, color = '#fff8e8') => {
  const code = G.codeFor(action, I), w = G.drawGlyph(g, x, y, code, I);
  E.font.text(g, text, x + w + 3, y + 1, color, { shadow: '#000', outline: false });
  return w + 3 + E.font.width(text) + 8;
};
G.promptW = (action, text, I = G.game.input) => G.glyphW(G.codeFor(action, I), I) + 3 + E.font.width(text) + 8;
/** the word for a button in running text ("Press ✕"), from the action map and the device */
G.btn = (action, I = G.game.input) => { const c = G.codeFor(action, I); if (/^Pad(\d+)$/.test(c)) { const n = +c.slice(3); const st = I.padStyle(); if (n <= 3) return st === 'xbox' ? 'ABXY'[n] : '✕○□△'[n]; } return I.codeLabel ? I.codeLabel(c) : c; };
G.fillTips = (s, I) => s.replace(/\{(\w+)\}/g, (m, a) => G.btn(a, I));
/** the prompt bar at the bottom centre: [[action, text], ...] */
G.promptBar = (r, list, I = G.game.input, y = null) => {
  const ta = I.touchArea && I.touchArea(); let total = 0; for (const [a, t] of list) total += G.promptW(a, t, I);
  const yy = y === null ? r.H - 16 - (ta && ta.y0 < r.H - 16 ? r.H - ta.y0 : 0) : y;
  r.overlay(g => {
    px.blend(g, .55, 'normal', () => px.rect(g, Math.round(r.W / 2 - total / 2 - 6), yy - 3, Math.round(total + 8), 15, '#081820'));
    let x = Math.round(r.W / 2 - total / 2); for (const [a, t] of list) x += G.prompt(g, x, yy, a, t, I);
  });
};

/* ---- the touch-only gate: a coarse pointer only, and no key or pad seen yet ---- */
G.sawKeyOrPad = false;
G.touchOnly = () => {
  if (G.sawKeyOrPad || typeof matchMedia !== 'function') return false;
  try { return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  const seen = () => { G.anyInput = true; if (G.game) G.lastInputT = G.game.real; };
  addEventListener('keydown', () => { G.sawKeyOrPad = true; seen(); }, true);
  addEventListener('pointerdown', seen, true);
  addEventListener('pointermove', e => { if (G._pm) { if (Math.hypot(e.clientX - G._pm[0], e.clientY - G._pm[1]) > 4) seen(); } G._pm = [e.clientX, e.clientY]; }, true);
  addEventListener('touchstart', seen, true);
}
/** gamepads count as "a key or pad": any button seen down */
G.pollPads = () => {
  try { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps || []) if (p && p.buttons.some(b => b.pressed)) { G.sawKeyOrPad = true; G.anyInput = true; G.lastInputT = G.game.real; } } catch (e) { /* blocked */ }
};
