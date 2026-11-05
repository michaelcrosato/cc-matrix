/* INPUT + UI KIT: the action map, controls -> commands, glyph badges, panels and the focus system. */
B.UI = {};
const UI = B.UI;
UI.PAL = { bg1: '#1c1813', bg2: '#0e0c0a', border: '#b8924a', focus: '#ffd36a', text: '#f0e6d0', dim: '#8a7e66', hp: '#e0463c', mp: '#4a8aff', food: '#c8a040', good: '#8aff9a', bad: '#ff8a7a', rivet: '#e8c878' };
UI.INPUT = () => {
  const E = My3D2dge, D = E.Input.DEFAULT, o = {};
  for (const k of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) o[k] = D[k].slice();
  o.cancel = ['Backspace', ...o.cancel.filter(c => c !== 'Backspace')];
  return Object.assign(o, {
    fwd: ['KeyW', 'ArrowUp', 'Numpad8', 'Pad12'], back: ['KeyS', 'ArrowDown', 'Numpad5', 'Numpad2', 'Pad13'], strafeL: ['KeyA', 'Numpad4'], strafeR: ['KeyD', 'Numpad6'],
    turnL: ['KeyQ', 'ArrowLeft', 'Numpad7', 'Pad14'], turnR: ['KeyE', 'ArrowRight', 'Numpad9', 'Pad15'],
    use: ['KeyF', 'Pad0'], putDown: ['KeyH'], throw: ['KeyG', 'Pad1'], strike: ['Space', 'Mouse2', 'Pad2'], party: ['KeyI', 'Pad3'], camp: ['KeyC', 'Pad10'], examine: ['KeyX', 'Mouse1', 'Pad11'],
    map: ['KeyM', 'Pad8'], journal: ['KeyJ'], selPrev: ['Pad4', 'ShiftLeft+Tab'], selNext: ['Pad5', 'Tab'], handMain: ['Pad7'], handOff: ['Pad6'],
    m1: ['Digit1'], m2: ['Digit2'], m3: ['Digit3'], m4: ['Digit4'], m5: ['Digit5'], m6: ['Digit6'], tabL: ['Pad4', 'KeyZ', 'PageUp'], tabR: ['Pad5', 'KeyV', 'PageDown'], alt: ['Pad3', 'KeyT'], altB: ['Pad2', 'KeyR'], altC: ['Pad7', 'KeyY'], altD: ['Pad6']
  });
};
UI.last = () => UI.game.input.lastDevice;
UI.xbox = () => UI.game.settings.glyphs === 'xbox';
/** draw a button badge for an action (or a literal glyph string) at x,y; returns its width */
UI.glyph = (g, a, x, y, opt) => {
  const E = My3D2dge, inp = UI.game.input; let s = typeof a === 'string' && inp.map[a] ? inp.label(a) : String(a), dev = UI.last();
  if (dev === 'touch') dev = 'keyboard';
  const pad = dev === 'gamepad'; let w = 9;
  if (pad && ['✕', '○', '□', '△'].includes(s)) {
    const col = { '✕': '#6a9aff', '○': '#ff6a6a', '□': '#ff9ad0', '△': '#6aeaa0' }[s];
    g.fillStyle = '#10101a'; g.beginPath(); g.arc(x + 5, y + 5, 5.2, 0, 6.3); g.fill(); g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath();
    if (s === '✕') { g.moveTo(x + 2.8, y + 2.8); g.lineTo(x + 7.2, y + 7.2); g.moveTo(x + 7.2, y + 2.8); g.lineTo(x + 2.8, y + 7.2); } else if (s === '○') g.arc(x + 5, y + 5, 2.6, 0, 6.3); else if (s === '□') g.rect(x + 2.6, y + 2.6, 4.8, 4.8); else { g.moveTo(x + 5, y + 2.2); g.lineTo(x + 7.8, y + 7.4); g.lineTo(x + 2.2, y + 7.4); g.closePath(); }
    g.stroke(); return 11;
  }
  if (pad && ['A', 'B', 'X', 'Y'].includes(s) && s.length === 1) { const col = { A: '#4ac86a', B: '#ff5a5a', X: '#5a8aff', Y: '#ffd040' }[s]; g.fillStyle = col; g.beginPath(); g.arc(x + 5, y + 5, 5, 0, 6.3); g.fill(); E.font.text(g, s, x + 5, y + 1, '#10101a', { align: 'center', outline: false }); return 11; }
  if (dev === 'mouse' && /click/i.test(s)) { g.fillStyle = '#d8d0c0'; g.fillRect(x + 1, y, 7, 10); g.fillStyle = '#10101a'; g.fillRect(x + 4, y, 1, 4); g.fillStyle = '#ffd36a'; if (/right/i.test(s)) g.fillRect(x + 5, y, 3, 4); else g.fillRect(x + 1, y, 3, 4); return 11; }
  w = E.font.width(s, { font: 'normal' }) + 6; g.fillStyle = pad ? '#2a2a3a' : '#d8d0c0'; g.fillRect(x, y, w, 10); g.fillStyle = pad ? '#4a4a5e' : '#8a8274'; g.fillRect(x, y + 8, w, 2);
  E.font.text(g, s, x + 3, y + 1, pad ? '#f0f0ff' : '#1c1813', { outline: false }); return w + 1;
};
/** a prompt row: [[action, 'Verb'], ...] drawn left to right at x,y; align right if o.right */
UI.prompts = (g, list, x, y, o) => {
  const E = My3D2dge; o = o || {}; const ws = list.map(([a, v]) => (typeof a === 'string' && UI.game.input.map[a] ? (UI.glyphW(a)) : 11) + E.font.width(v) + 6); const total = ws.reduce((a, b) => a + b, 0);
  let cx = o.right ? x - total : o.center ? x - total / 2 : x;
  list.forEach(([a, v], i) => { const gw = UI.glyph(g, a, Math.round(cx), y); E.font.text(g, v, Math.round(cx) + gw + 2, y + 1, UI.PAL.text, { shadow: '#000', outline: false }); cx += ws[i]; });
  return total;
};
UI.glyphW = (a) => { const s = UI.game.input.label(a), dev = UI.last(); if (dev === 'gamepad' && ['✕', '○', '□', '△'].includes(s)) return 11; if (dev === 'gamepad' && s.length === 1 && 'ABXY'.includes(s)) return 11; if (dev === 'mouse' && /click/i.test(s)) return 11; return My3D2dge.font.width(s, { font: 'normal' }) + 7; };
UI.panel = (g, x, y, w, h, o) => {
  o = o || {}; My3D2dge.ui.box(g, x, y, w, h, { bg: o.bg || [UI.PAL.bg1, UI.PAL.bg2], border: o.focus ? UI.PAL.focus : UI.PAL.border, shadow: false });
  if (o.focus) { g.strokeStyle = UI.PAL.focus; g.globalAlpha = .6 + .4 * Math.sin(UI.game.real * 5); g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); g.globalAlpha = 1; }
  g.fillStyle = UI.PAL.rivet; for (const [rx, ry] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) g.fillRect(rx, ry, 2, 2);
};
UI.text = (g, s, x, y, col, o) => My3D2dge.font.text(g, s, Math.round(x), Math.round(y), col || UI.PAL.text, Object.assign({ shadow: '#000', outline: false }, o || {}));
UI.title = (g, s, x, y, o) => My3D2dge.font.title(g, s, x, y, Object.assign({ align: 'center', scale: 2, colors: ['#fff6d8', '#ffd36a', '#c8923a', '#6a4a1a'], depthColor: '#2a1a08', depth: 2 }, o || {}));
/* ---- the focus system: widgets are rects; the d-pad moves to the nearest in a direction; the mouse hovers and clicks ---- */
UI.Focus = class {
  constructor() { this.items = []; this.cur = 0; this.id = null; this.lastPointer = null; this.mouseMoved = false; }
  begin() { this.items = []; }
  add(id, x, y, w, h, o) { this.items.push(Object.assign({ id, x, y, w, h }, o || {})); return this.items.length - 1; }
  index(id) { return this.items.findIndex(i => i.id === id); }
  set(id) { const i = this.index(id); if (i >= 0) { this.cur = i; this.id = id; } }
  /** reads input; returns { act: 'confirm'|'click'|'alt'|'back'|'left'|'right', item } or null */
  run() {
    const inp = UI.game.input, E = My3D2dge; let res = null;
    if (this.id != null) { const k = this.index(this.id); if (k >= 0) this.cur = k; } if (this.cur >= this.items.length) this.cur = Math.max(0, this.items.length - 1);
    const ptr = inp.pointer ? inp.pointer() : null;
    if (ptr && (!this.lastPointer || Math.abs(ptr[0] - this.lastPointer[0]) + Math.abs(ptr[1] - this.lastPointer[1]) > 1.5)) { this.lastPointer = ptr.slice(); if (UI.last() === 'mouse' || UI.last() === 'keyboard' && false) { const i = this.items.findIndex(it => !it.skip && ptr[0] >= it.x && ptr[0] < it.x + it.w && ptr[1] >= it.y && ptr[1] < it.y + it.h); if (i >= 0 && i !== this.cur) { this.cur = i; this.id = this.items[i].id; UI.sfx('ui_move'); } } }
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) if (inp.repeat(a, .35, .1)) { const n = this.nav(dx, dy); if (n >= 0) { this.cur = n; this.id = this.items[n].id; UI.sfx('ui_move'); } else if (dx) res = { act: dx < 0 ? 'left' : 'right', item: this.items[this.cur] }; }
    const it = this.items[this.cur];
    if (inp.pressed('confirm')) { inp.consume('confirm'); res = { act: 'confirm', item: it }; }
    else if (inp.pressed('cancel')) { inp.consume('cancel'); res = { act: 'back', item: it }; }
    else if (inp.pressed('alt')) { res = { act: 'alt', item: it }; } else if (inp.pressed('altB')) { res = { act: 'altB', item: it }; }
    const ck = inp.clicked(); if (ck) { const i = this.items.findIndex(it2 => !it2.skip && ck[0] >= it2.x && ck[0] < it2.x + it2.w && ck[1] >= it2.y && ck[1] < it2.y + it2.h); if (i >= 0) { this.cur = i; this.id = this.items[i].id; res = { act: 'click', item: this.items[i] }; } else res = { act: 'clickAway', item: null, at: ck }; }
    return res;
  }
  nav(dx, dy) {
    const c = this.items[this.cur]; if (!c) return -1; if (c.nb) { const k = dx < 0 ? 'l' : dx > 0 ? 'r' : dy < 0 ? 'u' : 'd'; if (c.nb[k] != null) { const i = this.index(c.nb[k]); if (i >= 0) return i; } }
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = -1, bs = 1e9;
    this.items.forEach((it, i) => { if (i === this.cur || it.skip) return; const ix = it.x + it.w / 2, iy = it.y + it.h / 2, vx = ix - cx, vy = iy - cy; const along = vx * dx + vy * dy; if (along <= 1) return; const perp = Math.abs(vx * dy) + Math.abs(vy * dx); const s = along + perp * 2.2; if (s < bs) { bs = s; best = i; } });
    return best;
  }
};
UI.sfx = (n, o) => { if (UI.game) UI.game.audio.sfx(n, o); };
/** wrap text to a width; returns lines */
UI.wrap = (s, w, o) => My3D2dge.font.wrap(s, w, o);
/** a dim backdrop over the 3D view */
UI.veil = (g, r, a) => { g.save(); g.globalAlpha = a == null ? .62 : a; g.fillStyle = '#05030a'; g.fillRect(0, 0, r.W, r.H); g.restore(); };
