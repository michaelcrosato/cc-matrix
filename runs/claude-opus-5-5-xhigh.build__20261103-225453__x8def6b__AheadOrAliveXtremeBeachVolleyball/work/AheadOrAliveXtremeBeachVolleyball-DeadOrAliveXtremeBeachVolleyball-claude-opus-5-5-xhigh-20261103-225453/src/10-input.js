/* 10-input: the action maps per context, the device and glyph logic, button icons drawn as pixel art, prompts that
 * follow the device used last (per player), the mouse wheel, and the touch-only gate. */
const DIRS = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
const SYS = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'] };
G.PRESETS = {
  // matches: the order play, dive, shot, call gives the split keyboard F G H R and . / , L
  MATCH: { ...DIRS, play: ['Space', 'KeyJ', 'Mouse0', 'Pad0'], dive: ['ShiftLeft', 'KeyL', 'Pad1'], shot: ['KeyE', 'KeyK', 'Mouse2', 'Pad2'], call: ['KeyQ', 'KeyI', 'Mouse1', 'Pad3'], view: ['KeyV', 'Pad11'], ...SYS,
    confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'], snap: ['KeyC', 'Pad8'], skip: ['Space', 'Enter', 'Mouse0', 'Pad0', 'Pad1'] },
  EXPLORE: { ...DIRS, interact: ['KeyE', 'Space', 'Enter', 'Pad0'], run: ['ShiftLeft', 'Pad1', 'Pad7'], bag: ['KeyG', 'Pad2'], leave: ['KeyM', 'Tab', 'Pad3'], snap: ['KeyC', 'Pad8'], ...SYS,
    confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Mouse2', 'Pad1'] },
  MENU: { ...DIRS, confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Mouse2', 'Pad1'], alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'],
    esc: ['Escape'], hide: ['KeyH', 'Pad11'], snap: ['KeyC', 'Pad8'], trigL: ['Pad6'], trigR: ['Pad7'], ...SYS },
  POOLHOP: { ...DIRS, hopA: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], hopB: ['KeyL', 'ShiftLeft', 'Pad1'], hopX: ['KeyK', 'KeyE', 'Mouse2', 'Pad2'], hopY: ['KeyI', 'KeyQ', 'Pad3'], ...SYS,
    confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'] },
  CASINO: { ...DIRS, confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Mouse2', 'Pad1'], alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'],
    hit: ['KeyH'], stand: ['KeyS'], double: ['KeyD'], split: ['KeyP'], reel1: ['KeyJ'], reel2: ['KeyK'], reel3: ['KeyL'], esc: ['Escape'], ...SYS, pause: ['Escape', 'Pad9'] }
};
/** a menu over a scene borrows the MENU actions (tabs, option, special) and gives the scene's back on closing */
G._inputStack = [];
G.pushInput = name => { G._inputStack.push(G.inputPreset); G.useInput(name); };
G.popInput = () => { const p = G._inputStack.pop(); if (p) G.useInput(p); };
G.ACTION_NAMES = { play: 'Hit', dive: 'Dive', shot: 'Shot / Block', call: 'Call', view: 'Camera', interact: 'Interact', run: 'Run', bag: 'Gift bag', leave: 'Island map', snap: 'Postcard',
  confirm: 'Confirm', cancel: 'Back', alt: 'Option', extra: 'Special', tabL: 'Tab left', tabR: 'Tab right', hopA: 'Hop ✕', hopB: 'Hop ○', hopX: 'Hop □', hopY: 'Hop △', skip: false, esc: false, hide: false, trigL: false, trigR: false,
  hit: 'Hit (blackjack)', stand: 'Stand', double: 'Double', split: 'Split', reel1: 'Stop reel 1', reel2: 'Stop reel 2', reel3: 'Stop reel 3' };
/** every player's input on one preset (a scene's own input option does player 1; joined players follow here) */
G.useInput = (name) => {
  const P = G.PRESETS[name];
  for (const I of G.game.players) { if (I.half) I.use(E.Input.halfKeys(P, I.half)); else I.use(P); I.glyphs = G.setting('glyphs', 'playstation'); }
  G.inputPreset = name;
};

/* ---- devices and glyphs ---- */
/** 'ps' | 'xbox' | 'kbm' for an input: a pad follows the Button symbols setting */
G.dev = (I = G.game.input) => I.lastDevice === 'gamepad' ? (G.setting('glyphs', 'playstation') === 'xbox' ? 'xbox' : 'ps') : 'kbm';
G.sawKeyOrPad = false;
const PS_COL = { 0: '#8fb8ff', 1: '#ff7a7a', 2: '#f59ad8', 3: '#5fe0b4' }, XB_COL = { 0: '#6ad66a', 1: '#ff5a5a', 2: '#4aa8ff', 3: '#ffd23a' };
const XB_L = ['A', 'B', 'X', 'Y'], PS_SH = ['L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3'], XB_SH = ['LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'];
const padCodeOf = (I, a) => { const m = I.map[a]; return m && m.find(c => /^Pad\d+$/.test(c)); };
const keyCodeOf = (I, a, mouse) => { const m = I.map[a] || []; return mouse ? m.find(c => c.startsWith('Mouse')) : m.find(c => !c.startsWith('Pad') && !c.startsWith('Act:') && !c.startsWith('Mouse')); };
/** a disc face button */
function faceBtn(g, x, y, i, style) {
  if (style === 'ps') {
    px.disc(g, x + 4, y + 4, 4.6, '#0c0a18'); px.disc(g, x + 4, y + 4, 3.8, '#24203a');
    const c = PS_COL[i];
    if (i === 0) { px.line(g, x + 2, y + 2, x + 6, y + 6, c); px.line(g, x + 6, y + 2, x + 2, y + 6, c); }
    else if (i === 1) { px.disc(g, x + 4, y + 4, 2.6, c); px.disc(g, x + 4, y + 4, 1.5, '#24203a'); }
    else if (i === 2) { px.rect(g, x + 2, y + 2, 5, 1, c); px.rect(g, x + 2, y + 6, 5, 1, c); px.rect(g, x + 2, y + 2, 1, 5, c); px.rect(g, x + 6, y + 2, 1, 5, c); }
    else { px.line(g, x + 4, y + 2, x + 2, y + 6, c); px.line(g, x + 4, y + 2, x + 6, y + 6, c); px.line(g, x + 2, y + 6, x + 6, y + 6, c); }
  } else {
    px.disc(g, x + 4, y + 4, 4.6, '#0c0a18'); px.disc(g, x + 4, y + 4, 3.8, XB_COL[i]);
    E.font.text(g, XB_L[i], x + 2, y + 1, '#141018', { outline: false });
  }
  return 9;
}
function pill(g, x, y, label, col = '#e8e4f0') {
  const w = E.font.width(label) + 5;
  px.rect(g, x + 1, y, w - 2, 9, '#0c0a18'); px.rect(g, x, y + 1, w, 7, '#0c0a18');
  px.rect(g, x + 1, y + 1, w - 2, 7, '#3a3656'); px.rect(g, x + 1, y + 1, w - 2, 1, '#5a5678');
  E.font.text(g, label, x + 3, y + 1, col, { outline: false });
  return w;
}
function keycap(g, x, y, label) {
  const w = Math.max(9, E.font.width(label) + 5);
  px.rect(g, x + 1, y, w - 2, 10, '#141018'); px.rect(g, x, y + 1, w, 8, '#141018');
  px.rect(g, x + 1, y + 1, w - 2, 8, '#9a94a6'); px.rect(g, x + 1, y + 1, w - 2, 6, '#f0ece2');
  E.font.text(g, label, x + Math.round((w - E.font.width(label)) / 2), y + 1, '#2a2434', { outline: false });
  return w;
}
function mouseIcon(g, x, y, btn) {
  px.rect(g, x + 1, y, 5, 10, '#141018'); px.rect(g, x, y + 1, 7, 8, '#141018');
  px.rect(g, x + 1, y + 1, 5, 8, '#e8e4dc'); px.rect(g, x + 3, y + 1, 1, 4, '#8a8478');
  const lit = '#ff9e5e';
  if (btn === 0) px.rect(g, x + 1, y + 1, 2, 4, lit); else if (btn === 2) px.rect(g, x + 4, y + 1, 2, 4, lit); else px.rect(g, x + 3, y + 1, 1, 3, lit);
  return 8;
}
function stickIcon(g, x, y, style) {
  px.disc(g, x + 4, y + 4, 4.6, '#0c0a18'); px.disc(g, x + 4, y + 4, 3.8, '#3a3656'); px.disc(g, x + 4, y + 4, 2.2, style === 'ps' ? '#8fb8ff' : '#c8c4d8'); px.dot(g, x + 3, y + 3, '#ffffff');
  return 9;
}
/** draw the icon for an action on an input's device at (x, y); returns its width. Pseudo-actions: 'move' (stick / WASD),
 *  'aim' (stick / mouse), 'dpad' */
G.glyph = (g, x, y, a, I = G.game.input, o = {}) => {
  x = Math.round(x); y = Math.round(y);
  const style = o.style || G.dev(I);
  if (a === 'move' || a === 'aim') {
    if (style !== 'kbm') return stickIcon(g, x, y, style);
    if (a === 'aim' && I.lastDevice === 'mouse') return mouseIcon(g, x, y, -1);
    return keycap(g, x, y, I.half === 'right' ? '←↑→' : 'WASD');
  }
  if (style !== 'kbm') {
    const c = padCodeOf(I, a); if (!c) return 0;
    const n = +c.slice(3);
    if (n <= 3) return faceBtn(g, x, y, n, style);
    if (n >= 12 && n <= 15) return pill(g, x, y, ['D↑', 'D↓', 'D←', 'D→'][n - 12]);
    return pill(g, x, y, (style === 'ps' ? PS_SH : XB_SH)[n - 4] || c);
  }
  const mc = I.lastDevice === 'mouse' && keyCodeOf(I, a, true);
  if (mc && !o.keysOnly) return mouseIcon(g, x, y, +mc.slice(5));
  const kc = keyCodeOf(I, a); if (!kc) { const m2 = keyCodeOf(I, a, true); return m2 ? mouseIcon(g, x, y, +m2.slice(5)) : 0; }
  return keycap(g, x, y, I.codeLabel(kc));
};
G.glyphW = (a, I = G.game.input, o = {}) => {
  const style = o.style || G.dev(I);
  if (a === 'move' || a === 'aim') return style !== 'kbm' ? 9 : a === 'aim' && I.lastDevice === 'mouse' ? 8 : Math.max(9, E.font.width(I.half === 'right' ? '←↑→' : 'WASD') + 5);
  if (style !== 'kbm') { const c = padCodeOf(I, a); if (!c) return 0; const n = +c.slice(3); return n <= 3 ? 9 : E.font.width(n >= 12 && n <= 15 ? 'D↑' : (style === 'ps' ? PS_SH : XB_SH)[n - 4] || c) + 5; }
  const mc = I.lastDevice === 'mouse' && keyCodeOf(I, a, true); if (mc && !o.keysOnly) return 8;
  const kc = keyCodeOf(I, a); return kc ? Math.max(9, E.font.width(I.codeLabel(kc)) + 5) : 8;
};
/** a text name for an action's button, in the current device's terms (for sentences in tips: "Press ✕ to ...") */
G.btnName = (a, I = G.game.input) => {
  const style = G.dev(I);
  if (a === 'move') return style === 'kbm' ? 'WASD' : 'the stick';
  if (style !== 'kbm') { const c = padCodeOf(I, a); if (!c) return a; const n = +c.slice(3); return n <= 3 ? (style === 'ps' ? ['✕', '○', '□', '△'][n] : XB_L[n]) : (style === 'ps' ? PS_SH : XB_SH)[n - 4] || c; }
  const mc = I.lastDevice === 'mouse' && keyCodeOf(I, a, true); if (mc) return ['Left click', 'Middle click', 'Right click'][+mc.slice(5)];
  const kc = keyCodeOf(I, a); return kc ? I.codeLabel(kc) : a;
};
/** a prompt: the action's icon and a word; returns its width */
G.prompt = (g, x, y, a, text, o = {}) => {
  const I = o.input || G.game.input, w = G.glyph(g, x, y, a, I, o);
  const col = o.color || '#fff8e8';
  if (text) E.font.text(g, text, Math.round(x + w + 3), Math.round(y + 1), col, { shadow: '#0a0814', outline: false });
  return w + (text ? 3 + E.font.width(text) + 8 : 6);
};
G.promptW = (a, text, o = {}) => G.glyphW(a, o.input || G.game.input, o) + (text ? 3 + E.font.width(text) + 8 : 6);
/** the bottom prompt bar: [[action, text], ...] centred at the bottom of the safe area */
G.promptBar = (g, r, items, o = {}) => {
  if (G.attract) return;   // (no one is playing the demo: its only prompt is the attract's own Press)
  items = items.filter(Boolean);
  const W = items.reduce((s, [a, t]) => s + G.promptW(a, t, o), 0), y = o.y !== undefined ? o.y : r.H - Math.round(r.H * .05) - 10;
  let x = Math.round(o.x !== undefined ? o.x : (r.W - W) / 2);
  if (o.bg !== false && items.length) E.ui.box(g, x - 6, y - 3, W + 8, 16, { bg: ['#0f4c5c', '#0a2d3d'], border: '#2a6a7a', alpha: .78 });
  for (const [a, t] of items) x += G.prompt(g, x, y, a, t, o);
};

/* ---- the mouse wheel (the canvas UI pages lists with it) ---- */
G.wheel = 0; G._wheelAcc = 0;
if (typeof window.addEventListener === 'function' && typeof document !== 'undefined') {
  window.addEventListener('wheel', e => { G._wheelAcc += Math.sign(e.deltaY); }, { passive: true });
  window.addEventListener('keydown', () => { G.sawKeyOrPad = true; }, { capture: true });
  window.addEventListener('gamepadconnected', () => { G.sawKeyOrPad = true; });
}
G.tickWheel = () => { G.wheel = G._wheelAcc; G._wheelAcc = 0; };

/* ---- touch-only devices: no touch controls, a notice and the Settings button; the attract mode runs ---- */
G.touchOnly = () => {
  if (G.sawKeyOrPad || G.forceTouchOnly === false) return false;
  if (G.forceTouchOnly) return true;
  try { return !!(window.matchMedia && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches); } catch (e) { return false; }
};
G.TOUCH_ONLY_AT_BOOT = false;
