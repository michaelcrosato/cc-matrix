/* ---- THE 10-FOOT UI KIT (plan §11.1–11.2): focusable lists with an animated focus, cards, buttons, sliders, pips for the
 * ratings, glyph icons for PlayStation and Xbox pads, keycaps for the keyboard, a mouse for the pointer, and prompt lines
 * in the glyphs of the last device. Every menu answers any one device alone: pad, keyboard or mouse. ---- */
const C = { ink: '#fff7ec', paper: '#140c24', accent: '#ff3ca6', cyan: '#2de2ff', gold: '#ffd23a', muted: '#9a8fb8', danger: '#ff5a3a', line: '#3a2a5a', ok: '#7af0a0' };

/** any player's input: a menu takes the press from whichever device (§11.1) */
const anyPressed = a => game.players.some(I => I && I.pressed(a));
const anyDown = a => game.players.some(I => I && I.down(a));
const anyConsume = a => game.players.forEach(I => I && I.consume(a));
const lastInput = () => game.players.slice().sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0))[0] || game.input;
/** the device the player used last, for the glyphs: 'gamepad', 'keyboard', 'mouse' or 'touch' */
const device = () => game.input.lastDevice || 'keyboard';
/** the controller family for glyphs: PlayStation (default) or Xbox, by Settings */
const padStyle = () => setting('buttons') === 'Xbox' ? 'xbox' : 'playstation';

/** the keys a menu moves with: arrows, WASD, a pad's d-pad or stick (the engine's up/down/left/right), Tab and Q/E */
const navDir = () => ({
  up: anyPressed('up'), down: anyPressed('down'), left: anyPressed('left'), right: anyPressed('right'),
  ok: anyPressed('confirm'), back: anyPressed('cancel'), start: anyPressed('start')
});

/** a list of focusable items: { label, sub, on(), disabled, color }; the focus moves with arrows and the mouse hover;
 * a click or ✕ (Enter, Space) picks it; ○ (Esc) goes back through onBack. Returns the focused index. */
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.x = o.x || 40; this.y = o.y || 60; this.gap = o.gap || 24; this.w = o.w || 260; this.onBack = o.onBack || null; this.center = !!o.center; this.hoverAble = o.hover !== false; this.t = 0; }
  setItems(items) { this.items = items; this.i = clamp(this.i, 0, Math.max(0, items.length - 1)); }
  nav(dt) {
    const n = this.items.length; if (!n) return;
    const k = navDir();
    if (k.up || k.down) { let j = this.i; for (let t = 0; t < n; t++) { j = (j + (k.down ? 1 : -1) + n) % n; if (!this.items[j].disabled && !this.items[j].header) break; } this.i = j; sfxOnce('select'); }
    if (k.ok) { const it = this.items[this.i]; if (it && !it.disabled && !it.header && it.on) { anyConsume('confirm'); sfxOnce('confirm'); it.on(this); } }
    if (k.back && this.onBack) { anyConsume('cancel'); sfxOnce('cancel'); this.onBack(this); }
  }
  /** the mouse: hover moves the focus to an item under the pointer; a click picks it; the wheel scrolls (not needed here) */
  pointer(r, boxes) {
    const p = game.input.pointer(); const c = game.input.clicked();
    if (p) for (let i = 0; i < this.items.length; i++) { const b = boxes[i]; if (b && p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h && !this.items[i].disabled && !this.items[i].header) { if (this.hoverAble && this.i !== i) this.i = i; } }
    if (c) for (let i = 0; i < this.items.length; i++) { const b = boxes[i]; if (b && c[0] >= b.x && c[0] <= b.x + b.w && c[1] >= b.y && c[1] <= b.y + b.h && !this.items[i].disabled && !this.items[i].header) { this.i = i; const it = this.items[i]; if (it.on) it.on(this); return; } }
  }
  /** draws the list; returns the boxes of each item (for the mouse) */
  draw(r, o = {}) {
    this.t += 1 / 60;
    const boxes = [];
    const x0 = o.x !== undefined ? o.x : this.x, y0 = o.y !== undefined ? o.y : this.y, gap = o.gap || this.gap, w = o.w || this.w;
    r.overlay(g => {
      this.items.forEach((it, i) => {
        const y = y0 + i * gap, focus = i === this.i && !it.header, col = it.disabled ? C.muted : (it.color || (focus ? C.ink : '#d8cfee'));
        const bx = { x: x0 - 6, y: y - 6, w, h: gap - 2 }; boxes[i] = bx;
        if (it.header) { E.font.text(g, it.label, x0, y, C.gold, { scale: 1, shadow: '#000', outline: false }); return; }
        if (focus) {
          const pulse = .5 + .5 * Math.sin(this.t * 6);
          E.ui.box(g, bx.x, bx.y, bx.w, bx.h, { bg: [`rgba(255,60,166,${.25 + .1 * pulse})`, '#3a1040'], gradient: false, alpha: .9 });
          px.rect(g, bx.x, bx.y, 2, bx.h, C.accent); px.rect(g, bx.x + bx.w - 2, bx.y, 2, bx.h, C.accent);
          E.font.text(g, '▸', x0 - 2, y, C.accent, { scale: 2, shadow: '#000', outline: false });
        }
        E.font.text(g, it.label, x0 + 16, y, col, { scale: o.scale || 2, shadow: '#000', outline: false });
        if (it.sub) E.font.text(g, it.sub, x0 + 16 + (o.subX || w - 40), y, it.disabled ? C.muted : C.cyan, { scale: 1, shadow: '#000', outline: false, align: 'right' });
      });
    });
    return boxes;
  }
}

/** a sound for a focus move, once per step (so a held stick doesn't stutter) */
const sfxOnce = name => { if (!S.sfxStep || S.sfxStep !== game.time) { S.sfxStep = game.time; if (A && A.sfx) { try { A.sfx(name); } catch (e) { /* headless: no audio */ } } } };

/** glyphs: PlayStation's ✕ ○ □ △ L1 R1 L2 R2 OPTIONS CREATE and the d-pad, Xbox's A B X Y LB RB LT RT Menu View, keycaps for
 * the keyboard and the mouse with the button lit (§11.2). Drawn once, at the sizes the prompts use. */
const GLYPH = {};
const drawGlyph = (g, kind, x, y, s = 9) => {
  const pad = padStyle();
  if (kind === 'cross' || kind === 'circle' || kind === 'square' || kind === 'triangle' || kind === 'A' || kind === 'B' || kind === 'X' || kind === 'Y') {
    const col = { cross: '#4a7ce8', circle: '#e0404a', square: '#e070c0', triangle: '#50c080', A: '#50c040', B: '#e04040', X: '#4a80e0', Y: '#f0c030' }[kind];
    px.disc(g, x + s / 2, y + s / 2, s / 2, '#0c0a14'); px.disc(g, x + s / 2, y + s / 2, s / 2 - 1, col);
    E.font.text(g, { cross: 'x', circle: 'o', square: '■', triangle: '△', A: 'A', B: 'B', X: 'X', Y: 'Y' }[kind], x + s / 2, y + 1, '#ffffff', { align: 'center', font: 'tiny', outline: false, scale: 1 });
    return;
  }
  E.font.text(g, kind, x + 1, y + 1, C.ink, { font: 'tiny', outline: false, scale: 1 });
};
/** the glyph name of an action on a pad (PlayStation or Xbox), for a prompt */
const padGlyph = action => {
  const ps = { shoot: 'square', pass: 'cross', shove: 'circle', oop: 'triangle', turbo: 'R2', taunt: 'L1', confirm: 'cross', cancel: 'circle', start: 'OPTIONS' };
  const xb = { shoot: 'X', pass: 'A', shove: 'B', oop: 'Y', turbo: 'RT', taunt: 'LB', confirm: 'A', cancel: 'B', start: 'MENU' };
  return (padStyle() === 'xbox' ? xb : ps)[action] || action;
};
/** keyboard and mouse labels: the engine's own label for the action, the mouse's side for a mouse action */
const keyLabel = action => {
  const k = KEYS[action] || [];
  const first = k.find(c => c.startsWith('Key') || c === 'Space' || c.startsWith('Shift') || c.startsWith('Digit') || c.startsWith('Arrow'));
  if (!first) return action.toUpperCase();
  return first.replace('Key', '').replace('ShiftLeft', 'SHIFT').replace('ShiftRight', 'SHIFT').replace('Space', 'SPACE');
};
/** a prompt line: '{shoot} SHOOT   {pass} PASS', each token one glyph in the last device's style */
const promptTokens = (text, playerI) => {
  const dev = playerI ? playerI.lastDevice : device();
  return text.split(/(\{[a-z]+\})/).filter(Boolean).map(t => {
    const m = /^\{([a-z]+)\}$/.exec(t);
    if (!m) return { text: t };
    const a = m[1];
    if (a === 'move') return { glyph: dev === 'gamepad' ? 'stick' : 'WASD' };
    if (dev === 'gamepad') return { glyph: padGlyph(a) };
    if (dev === 'mouse' && (a === 'shoot' || a === 'pass')) return { mouse: a === 'shoot' ? 'L' : 'R' };
    return { key: keyLabel(a) };
  });
};
const ICON_GLYPHS = { cross: 1, circle: 1, square: 1, triangle: 1, A: 1, B: 1, X: 1, Y: 1 };
const promptLine = (g, text, x, y, o = {}) => {
  let cx = x;
  for (const t of promptTokens(text, o.player)) {
    const sc = o.scale || 1;
    if (t.text !== undefined) { E.font.text(g, t.text, cx, y, o.color || C.ink, { shadow: '#000', outline: false, scale: sc }); cx += E.font.width(t.text, { scale: sc }); continue; }
    const name = t.glyph !== undefined ? t.glyph : t.key !== undefined ? t.key : t.mouse;
    if (t.glyph !== undefined && ICON_GLYPHS[name]) { drawGlyph(g, name, cx, y - 2, 9); cx += 11; continue; }
    const label = t.mouse ? (t.mouse === 'L' ? 'LEFT CLICK' : 'RIGHT CLICK') : name;
    const w = E.font.width(label, { font: 'tiny', scale: 1 }) + 6;
    E.ui.box(g, cx, y - 3, w, 11, { bg: ['#2a1e40', '#1a1230'], gradient: false, alpha: .95 });
    E.font.text(g, label, cx + 3, y - 1, t.mouse ? C.gold : C.ink, { font: 'tiny', outline: false, scale: 1 });
    cx += w + 3;
  }
  return cx;
};
const promptWidth = (text, o = {}) => { let w = 0; for (const t of promptTokens(text, o.player)) w += t.text !== undefined ? E.font.width(t.text, { scale: o.scale || 1 }) : 11; return w; };

/** a ratings row: eight pips (1..10) with their icons (never raw numbers on a 10-foot screen) */
const ratingPips = (g, x, y, p, o = {}) => {
  const keys = RATING_KEYS, labels = { zoom: 'ZOOM', splash: 'SPLASH', deep: 'DEEP', slam: 'SLAM', dime: 'DIME', swipe: 'SWIPE', swat: 'SWAT', bump: 'BUMP' };
  keys.forEach((k, i) => {
    const v = p.ratings ? p.ratings[k] : p.def.ratings[k], yy = y + i * (o.gap || 14);
    E.font.text(g, labels[k], x, yy, C.muted, { font: 'tiny', scale: o.scale || 1, outline: false });
    for (let j = 0; j < 10; j++) px.rect(g, x + 44 + j * 5, yy, 4, 5, j < v ? (v >= 8 ? C.gold : v >= 5 ? C.cyan : C.accent) : '#2a2040');
  });
};
/** a live portrait: the player's rig close-up in a frame */
const portraitOf = (g, rig, x, y, size, o = {}) => { try { rig.drawPortrait(g, x, y, size, Object.assign({ zoom: 3, turn: .4, bg: '#1c1230', frame: true }, o)); } catch (e) { game.fail('portrait', e); } };

/** a panel: a box with a border and a gradient, the house look of every menu and card */
const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a1a4a', '#140c26'], border: o.border || C.line, alpha: o.alpha !== undefined ? o.alpha : .92 });
/** the title block of a screen: a title at the top, a subtitle under it */
const screenTitle = (g, t, sub, W, y = 14) => {
  E.font.title(g, t, W / 2, y, { align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
  if (sub) E.font.text(g, sub, W / 2, y + 30, C.cyan, { align: 'center', scale: 1, shadow: '#000', outline: false });
};
/** the prompt bar at the bottom of a menu screen, in the last device's glyphs */
const promptBar = (r, items) => r.overlay(g => {
  let x = r.W / 2 - 150;
  const parts = items.map(([a, word]) => ({ a, word }));
  const total = parts.reduce((s, p) => s + promptWidth(p.a) + 6 + E.font.width(p.word, { scale: 1 }) + 18, 0);
  x = r.W / 2 - total / 2;
  for (const p of parts) { x = promptLine(g, p.a, x, r.H - 16, { color: C.ink }) + 6; E.font.text(g, p.word, x, r.H - 16, C.ink, { scale: 1, shadow: '#000', outline: false }); x += E.font.width(p.word, { scale: 1 }) + 18; }
});
/** a standard menu prompt: ✕ select, ○ back */
const MENU_PROMPT = [['{confirm}', 'SELECT'], ['{cancel}', 'BACK']];
