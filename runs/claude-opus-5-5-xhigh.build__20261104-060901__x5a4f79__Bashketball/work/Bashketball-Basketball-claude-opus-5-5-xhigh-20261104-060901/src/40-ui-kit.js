/* 40-ui-kit: the 10-foot interface (PLAN 11.1-11.2). Glyph icons drawn in pixels for every device (PlayStation's
 * cross, circle, square, triangle; Xbox's A B X Y; keycaps sized to their text; a mouse with the bound button lit),
 * prompt lines that swap {action} tokens for the icons of the device each player used last, menu navigation read from
 * every player (pad, keys, mouse hover and clicks, the wheel), big focusable buttons with an animated outline, rating
 * pips and cards. Body text is the 5x7 font at scale 1 or more; never the tiny font for anything a player needs. */
const UIC = { ink: '#fff7ec', paper: '#140c24', panel: '#1e1434', accent: '#ff3ca6', accent2: '#2de2ff', gold: '#ffd23a', muted: '#9a8fb8', line: '#3a2a5a', dim: '#5a4e78' };
const PS_BTN = { 0: ['x', '#7ab4ff'], 1: ['o', '#ff6a6a'], 2: ['s', '#ff8ad8'], 3: ['t', '#5ae08a'], 4: ['L1'], 5: ['R1'], 6: ['L2'], 7: ['R2'], 8: ['CREATE'], 9: ['OPTIONS'], 10: ['L3'], 11: ['R3'], 12: ['du'], 13: ['dd'], 14: ['dl'], 15: ['dr'] };
const XB_BTN = { 0: ['A', '#5ad84a'], 1: ['B', '#ff4a4a'], 2: ['X', '#4a8aff'], 3: ['Y', '#ffd23a'], 4: ['LB'], 5: ['RB'], 6: ['LT'], 7: ['RT'], 8: ['VIEW'], 9: ['MENU'], 10: ['LS'], 11: ['RS'], 12: ['du'], 13: ['dd'], 14: ['dl'], 15: ['dr'] };
const glyphStyle = () => (game.settings && game.settings.glyphs) || 'playstation';
/** which glyph an action shows for a player now: { kind: 'pad', n, style } | { kind: 'key', text } | { kind: 'mouse', btn } | { kind: 'stick' } */
function glyphFor(action, input, device) {
  const I = input || game.input, dev = device || I.lastDevice || 'keyboard', codes = (I.map && I.map[action]) || KEYS[action] || [];
  if (action === 'move') return dev === 'gamepad' ? { kind: 'stick' } : { kind: 'key', text: I.half === 'right' ? 'ARROWS' : 'WASD' };
  const pad = codes.find(c => /^Pad\d+$/.test(c)), mouse = codes.find(c => /^Mouse\d$/.test(c)), key = codes.find(c => !/^Pad|^Mouse|^Act:/.test(c));
  if (dev === 'gamepad' && pad) return { kind: 'pad', n: +pad.slice(3), style: glyphStyle() };
  if (dev === 'mouse' && mouse) return { kind: 'mouse', btn: +mouse.slice(5) };
  if (key) return { kind: 'key', text: keyText(key, I) };
  if (pad) return { kind: 'pad', n: +pad.slice(3), style: glyphStyle() };
  return { kind: 'key', text: action.toUpperCase() };
}
function keyText(code, I) {
  const L = { Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'TAB', Period: '.', Slash: '/', Comma: ',', Semicolon: ';', Quote: "'", PageUp: 'PGUP', PageDown: 'PGDN' };
  if (L[code]) return L[code]; if (/^Key[A-Z]$/.test(code)) return (I && I.codeLabel ? I.codeLabel(code) : code.slice(3)).toUpperCase(); if (/^Digit\d$/.test(code)) return code.slice(5); if (/^Numpad/.test(code)) return 'NUM' + code.slice(6);
  return code.toUpperCase();
}
/** the width a glyph takes at scale s (1: prompt lines, 2: How to Play) */
function glyphW(gl, s = 1) {
  if (gl.kind === 'key') return Math.max(9, E.font.width(gl.text) + 5) * s;
  if (gl.kind === 'pad') { const L = (gl.style === 'xbox' ? XB_BTN : PS_BTN)[gl.n] || ['?']; return (L[0].length > 1 && !/^d[udlr]$/.test(L[0]) ? E.font.width(L[0]) + 6 : 10) * s; }
  if (gl.kind === 'mouse') return 8 * s; if (gl.kind === 'stick') return 10 * s; return 10 * s;
}
/** draw a glyph with its top-left at (x, y), height 10 * s */
function drawGlyph(g, gl, x, y, s = 1) {
  x = Math.round(x); y = Math.round(y); const H = 10 * s, W = glyphW(gl, s);
  if (gl.kind === 'key') { E.ui.box(g, x, y, W, H, { bg: ['#f4f0e8', '#c8c0d8'], border: '#3a3050', gradient: true }); px.rect(g, x + 1, y + H - 2 * s, W - 2, s, '#8a80a0'); E.font.text(g, gl.text, x + W / 2, y + Math.round((H - 7 * s) / 2) - (s > 1 ? 1 : 0), '#1a1428', { align: 'center', outline: false, scale: s }); return W; }
  if (gl.kind === 'mouse') { px.rect(g, x + s, y, W - 2 * s, H, '#e8e4f0'); px.rect(g, x, y + s, W, H - 2 * s, '#e8e4f0'); px.rect(g, x + W / 2 - .5, y, 1, H / 2, '#5a5070'); px.rect(g, gl.btn === 2 ? x + W / 2 : x + s, y + s, W / 2 - s, H / 2 - s, '#ff3ca6'); return W; }
  if (gl.kind === 'stick') { px.disc(g, x + W / 2, y + H / 2, H / 2, '#2a2438'); px.disc(g, x + W / 2, y + H / 2, H / 2 - 2 * s, '#5a5070'); px.disc(g, x + W / 2 - s, y + H / 2 - s, H / 4, '#8a80a0'); return W; }
  const L = (gl.style === 'xbox' ? XB_BTN : PS_BTN)[gl.n] || ['?'], name = L[0], col = L[1];
  if (/^d[udlr]$/.test(name)) { px.rect(g, x + 3 * s, y, 4 * s, H, '#3a3448'); px.rect(g, x, y + 3 * s, W, 4 * s, '#3a3448'); const k = { du: [3, 0], dd: [3, 6], dl: [0, 3], dr: [6, 3] }[name]; px.rect(g, x + k[0] * s, y + k[1] * s, 4 * s, 4 * s, '#f4f0e8'); return W; }
  if (name.length > 1) { E.ui.box(g, x, y, W, H, { bg: ['#4a4458', '#2a2438'], border: '#8a80a0' }); E.font.text(g, name, x + W / 2, y + Math.round((H - 7 * s) / 2), '#f4f0e8', { align: 'center', outline: false, scale: s }); return W; }
  const cx = x + W / 2, cy = y + H / 2, R = H / 2;
  px.disc(g, cx, cy, R, '#1a1428'); px.disc(g, cx, cy, R - s, '#2e2840');
  if (gl.style === 'xbox') { px.disc(g, cx, cy, R - s, col); E.font.text(g, name, cx, y + Math.round((H - 7 * s) / 2), '#141018', { align: 'center', outline: false, scale: s }); return W; }
  const r2 = R - 2.5 * s;
  if (name === 'x') { px.line(g, cx - r2, cy - r2, cx + r2, cy + r2, col, s + .5); px.line(g, cx - r2, cy + r2, cx + r2, cy - r2, col, s + .5); }
  else if (name === 'o') { px.disc(g, cx, cy, r2 + .5, col); px.disc(g, cx, cy, r2 - s, '#2e2840'); }
  else if (name === 's') { px.rect(g, cx - r2, cy - r2, r2 * 2, r2 * 2, col); px.rect(g, cx - r2 + s, cy - r2 + s, r2 * 2 - 2 * s, r2 * 2 - 2 * s, '#2e2840'); }
  else if (name === 't') { px.poly(g, [[cx, cy - r2 - .5], [cx + r2 + .5, cy + r2 - .5], [cx - r2 - .5, cy + r2 - .5]], col); px.poly(g, [[cx, cy - r2 + 1.5 * s], [cx + r2 - 1.5 * s, cy + r2 - 1.5 * s], [cx - r2 + 1.5 * s, cy + r2 - 1.5 * s]], '#2e2840'); }
  return W;
}
/** a prompt line: 'Hold {turbo} + {shoot} to DUNK' with icons for the player's device; o { align, color, input, scale, device } */
function promptLine(g, text, x, y, o = {}) {
  const I = o.input || game.input, s = o.scale || 1, parts = String(text).split(/(\{\w+\})/).filter(Boolean);
  const items = parts.map(p => { const m = /^\{(\w+)\}$/.exec(p); return m ? { gl: glyphFor(m[1], I, o.device) } : { t: p }; });
  const w = items.reduce((a, it) => a + (it.gl ? glyphW(it.gl, s) + 2 * s : E.font.width(it.t, { scale: s })), 0);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  for (const it of items) {
    if (it.gl) { drawGlyph(g, it.gl, cx + s, y - 1 * s, s); cx += glyphW(it.gl, s) + 2 * s; }
    else { E.font.text(g, it.t, Math.round(cx), Math.round(y), o.color || UIC.ink, { outline: '#0c0614', scale: s }); cx += E.font.width(it.t, { scale: s }); }
  }
  return w;
}
const promptWidth = (text, o = {}) => { const I = o.input || game.input, s = o.scale || 1; return String(text).split(/(\{\w+\})/).filter(Boolean).reduce((a, p) => { const m = /^\{(\w+)\}$/.exec(p); return a + (m ? glyphW(glyphFor(m[1], I, o.device), s) + 2 * s : E.font.width(p, { scale: s })); }, 0); };

/* ---- menu input from every player: pad, keys, the mouse ---- */
const NAV = { hover: null, lastPointer: null, consumed: false };
function navInput() {
  const o = { up: false, down: false, left: false, right: false, confirm: false, cancel: false, tabL: false, tabR: false, alt: false, start: false, settings: false, any: false, who: null, mouse: false };
  if (NAV.consumed) { NAV.consumed = false; for (const I of game.players) I.consumeAll(); return o; }
  for (const I of game.players) {
    if (I.repeat('up', .3, .09)) o.up = true; if (I.repeat('down', .3, .09)) o.down = true; if (I.repeat('left', .3, .09)) o.left = true; if (I.repeat('right', .3, .09)) o.right = true;
    if (I.pressed('confirm')) { o.confirm = true; o.who = o.who || I; }
    if (I.pressed('cancel') || (I.lastDevice === 'mouse' && I.pressed('pass') && !I.pressed('confirm'))) o.cancel = true;
    if (I.pressed('tabL')) o.tabL = true; if (I.pressed('tabR')) o.tabR = true; if (I.pressed('oop')) o.alt = true;
    if (I.pressed('start')) { o.start = true; if (I.lastDevice === 'gamepad') o.settings = true; }
    if (I.anyPressed()) o.any = true;
  }
  const I = game.input, pt = I.pointer();
  if (pt && (!NAV.lastPointer || Math.hypot(pt[0] - NAV.lastPointer[0], pt[1] - NAV.lastPointer[1]) > .5)) { NAV.hover = pt; o.mouse = true; }
  NAV.lastPointer = pt; o.click = I.clicked();
  return o;
}
function consumeNav() { NAV.consumed = true; for (const I of game.players) I.consumeAll(); }
/** a vertical list of big buttons: state { i }, items [{ label, sub, disabled, color }]; returns { picked, moved, cancel }, and
 *  remembers each button's rectangle (for the mouse) in state.rects */
function listNav(state, items, nav, o = {}) {
  const n = items.length, res = { picked: -1, moved: false, cancel: nav.cancel };
  if (!n) return res;
  const step = d => { let i = state.i; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!items[i].disabled) break; } if (i !== state.i) { state.i = i; res.moved = true; sfx('select'); } };
  if (nav[o.horizontal ? 'left' : 'up']) step(-1); if (nav[o.horizontal ? 'right' : 'down']) step(1);
  if (state.rects && NAV.hover && nav.mouse) state.rects.forEach((rc, i) => { if (rc && !items[i].disabled && inRect(NAV.hover, rc) && state.i !== i) { state.i = i; res.moved = true; sfx('select'); } });
  if (nav.click && state.rects) state.rects.forEach((rc, i) => { if (rc && !items[i].disabled && inRect(nav.click, rc)) { state.i = i; res.picked = i; } });
  if (nav.confirm && !items[state.i].disabled) res.picked = state.i;
  if (res.picked >= 0) sfx('confirm');
  if (res.cancel) sfx('cancel');
  return res;
}
const inRect = (p, r) => p && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3];
/** one big button: focus = an animated 2-px outline, a pointer and a brighter fill (never color alone) */
function drawButton(g, x, y, w, h, label, o = {}) {
  const f = !!o.focus, t = game.real, pulse = f ? .5 + .5 * Math.sin(t * 6) : 0;
  E.ui.box(g, x, y, w, h, { bg: o.disabled ? ['#241c34', '#1a1428'] : f ? ['#4a2a6a', '#2e1a4a'] : ['#2a1e40', '#1c1430'], border: f ? (pulse > .5 ? UIC.gold : '#fff0a0') : UIC.line, alpha: o.alpha || .95 });
  if (f) { px.rect(g, x - 1, y - 1, w + 2, 1, UIC.gold); px.rect(g, x - 1, y + h, w + 2, 1, UIC.gold); px.rect(g, x - 1, y, 1, h, UIC.gold); px.rect(g, x + w, y, 1, h, UIC.gold); E.font.text(g, '▸', x + 4 + Math.round(pulse * 2), y + Math.round(h / 2) - 4, UIC.gold, { outline: false }); }
  const s = o.scale || 1, ty = y + Math.round((h - 7 * s) / 2) - (o.sub ? 4 : 0);
  E.font.text(g, label, o.center ? x + w / 2 : x + 14, ty, o.disabled ? UIC.dim : o.color || (f ? '#ffffff' : UIC.ink), { align: o.center ? 'center' : 'left', scale: s, outline: '#0c0614' });
  if (o.sub) E.font.text(g, o.sub, o.center ? x + w / 2 : x + 14, ty + 9 * s + 1, f ? '#e8d8ff' : UIC.muted, { align: o.center ? 'center' : 'left', outline: false });
  return [x, y, w, h];
}
/** rating pips: eight icons with their name and ten pips */
function drawRatings(g, def, x, y, o = {}) {
  RATING_KEYS.forEach((k, i) => {
    const yy = y + i * (o.gap || 9), v = def.ratings[k];
    E.font.text(g, RATING_NAMES[k], x, yy, UIC.muted, { outline: false });
    for (let n = 0; n < 10; n++) px.rect(g, x + 40 + n * 5, yy + 1, 4, 5, n < v ? (v >= 9 ? UIC.gold : v >= 6 ? '#5ae08a' : '#7ab4ff') : '#2e2440');
  });
}
/** a screen's frame: dark gradient, a title strip, the prompt bar at the bottom in the last device's glyphs */
function screenFrame(r, title, prompts, o = {}) {
  const arena = !o.noBg && !o.sky && menuBackdrop(r, o.dim);
  r.overlay(g => {
    if (!o.noBg && !arena) { r.sky(o.sky || ['#0a0618', '#1a0e30', '#2a1240']); }
    if (title) E.font.title(g, title, Math.round(r.W / 2), Math.round(r.H * .05), { align: 'center', scale: o.titleScale || 2, colors: ['#fffbe8', '#ffe08a', '#ff8a3a', '#c8401a'], depth: 2 });
    if (prompts) promptBar(g, r, prompts);
  });
}
function promptBar(g, r, prompts) {
  const y = r.H - 15; px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, r.W, 19, '#0a0614'));
  const text = prompts.join('    '); promptLine(g, text, Math.round(r.W / 2), y, { align: 'center' });
}
/** wrap text to a width; returns lines */
const wrapText = (text, w, o = {}) => E.font.wrap(String(text), w, o);
/** a live portrait of a player's rig in a frame */
const PORTRAITS = {};
function portraitRig(id) { if (PORTRAITS[id]) return PORTRAITS[id]; const d = get('player', id); const rig = d ? dressPlayer(d, d.team) : castRig(id); rig.update(0, { x: 0, y: 0, z: 0, facing: PI / 2 }); return (PORTRAITS[id] = rig); }
function drawPortrait(g, id, x, y, size, o = {}) { const rig = portraitRig(id); rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: PI / 2, expr: o.expr || null }); rig.drawPortrait(g, x, y, size, Object.assign({ zoom: size / 13, turn: o.turn === undefined ? .35 : o.turn, bg: o.bg || '#1a1030', border: o.border || UIC.line }, o)); }
