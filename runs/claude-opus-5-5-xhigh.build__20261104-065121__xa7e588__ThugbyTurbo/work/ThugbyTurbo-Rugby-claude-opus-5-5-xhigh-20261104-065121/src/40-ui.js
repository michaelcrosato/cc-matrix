/* ---- 10-FOOT UI: button badges that follow the device used last (PlayStation by default, Xbox in Settings, keycaps,
 * the mouse), prompt markup "{b:x} TACKLE", big panels, and a big focusable menu the stick, keys and mouse all drive ---- */
const UI = TT.ui = {};
const FONT = E.font;
UI.txt = (g, s, x, y, c = '#ffffff', o = {}) => FONT.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000000' }, o));
UI.title = (g, s, x, y, o = {}) => FONT.title(g, s, Math.round(x), Math.round(y), Object.assign({ align: 'center', scale: 3, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 }, o));
UI.w = (s, o = {}) => FONT.width(s, o);
UI.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: ['#1c2436', '#10141e'], border: o.focus ? '#f0c040' : '#5a6a8a', alpha: .94 }, o));
/** the face buttons' colours, by family */
const PS = { '✕': '#6a9cf0', '○': '#f05a64', '□': '#e07ac8', '△': '#4ad0a0' }, XB = { A: '#5ac85a', B: '#e8503a', X: '#3a86e8', Y: '#f0c830' };
/** the label of an action on an input's last device (or the one named); the act's own name for special pseudo-actions */
UI.label = (act, I, device) => {
  if (!I) I = TT.game && TT.game.input;
  let dev = device || (I ? I.lastDevice : 'keyboard'); if (dev === 'touch') dev = 'keyboard';
  if (act === 'mouseL') return dev === 'gamepad' ? '' : 'LMB';
  if (act === 'mouseR') return dev === 'gamepad' ? '' : 'RMB';
  if (act === 'stick') return dev === 'gamepad' ? 'L-STICK' : 'WASD';
  return I ? I.label(act, dev === 'mouse' ? 'keyboard' : dev) : act.toUpperCase();
};
/** draw one badge for an action (or a raw label) at (x, y) (top left); returns its width */
UI.glyph = (g, act, x, y, I, o = {}) => {
  const lab = o.raw || UI.label(act, I, o.device);
  if (!lab) return 0;
  const s = o.scale || 1, X = Math.round(x), Y = Math.round(y);
  const face = PS[lab] || (lab.length === 1 && XB[lab] && (I ? I.lastDevice === 'gamepad' : false) ? XB[lab] : null);
  if (face) {
    const r = 5 * s;
    px.disc(g, X + r, Y + r, r, '#0c0e14'); px.disc(g, X + r, Y + r, r - 1, '#262a36'); px.disc(g, X + r, Y + r - 1, r - 2, '#30364a');
    FONT.text(g, lab, X + r, Y + r - 3 * s - (PS[lab] ? 0 : 0) + (lab === '△' ? 0 : 0), face, { align: 'center', scale: s, outline: false });
    return r * 2 + 1;
  }
  const pad = I && I.lastDevice === 'gamepad' && !o.device || o.device === 'gamepad';
  const w = UI.w(lab, { scale: s }) + 6 * s, h = 11 * s;
  if (pad) {   // shoulder buttons and the rest: a rounded pill
    px.rect(g, X + 1, Y, w - 2, h, '#0c0e14'); px.rect(g, X, Y + 1, w, h - 2, '#0c0e14'); px.rect(g, X + 1, Y + 1, w - 2, h - 2, '#30364a');
    FONT.text(g, lab, X + w / 2, Y + 2 * s, '#e8ecf8', { align: 'center', scale: s, outline: false });
  } else {     // a keycap
    px.rect(g, X, Y, w, h, '#2a2e3a'); px.rect(g, X, Y, w, h - 2, '#d8dce8'); px.rect(g, X + 1, Y + 1, w - 2, h - 4, '#eef0f6'); px.rect(g, X, Y, w, 1, '#ffffff');
    FONT.text(g, lab, X + w / 2, Y + 2 * s, '#1a1e2a', { align: 'center', scale: s, outline: false });
  }
  return w + 1;
};
/** prompt markup: '{b:x} TACKLE  {b:ci} SWITCH' (an action's badge, then the words); returns its width */
UI.promptWidth = (s, I, o = {}) => { let w = 0; for (const [k, v] of UI.parse(s)) w += k === 'b' ? UI.glyphW(v, I, o) + 2 : UI.w(v, { scale: o.scale || 1 }); return w; };
UI.glyphW = (act, I, o = {}) => { const lab = UI.label(act, I, o.device), s = o.scale || 1; if (!lab) return 0; return PS[lab] || (lab.length === 1 && XB[lab] && I && I.lastDevice === 'gamepad') ? 11 * s : UI.w(lab, { scale: s }) + 7 * s; };
UI.parse = s => { const out = []; let i = 0; const re = /\{b:(\w+)\}/g; let m; while ((m = re.exec(s))) { if (m.index > i) out.push(['t', s.slice(i, m.index)]); out.push(['b', m[1]]); i = m.index + m[0].length; } if (i < s.length) out.push(['t', s.slice(i)]); return out; };
UI.prompt = (g, s, x, y, I, o = {}) => {
  const sc = o.scale || 1, w = UI.promptWidth(s, I, o);
  let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  if (o.bg) { px.rect(g, Math.round(cx) - 4, Math.round(y) - 3, Math.round(w) + 8, 11 * sc + 6, o.bg); }
  for (const [k, v] of UI.parse(s)) {
    if (k === 'b') cx += UI.glyph(g, v, cx, y, I, o) + 2;
    else { UI.txt(g, v, cx, y + 2 * sc, o.color || '#ffffff', { scale: sc }); cx += UI.w(v, { scale: sc }); }
  }
  return w;
};
/** a rectangle hit test on a screen point */
UI.inRect = (pt, r) => pt && pt[0] >= r[0] && pt[0] < r[0] + r[2] && pt[1] >= r[1] && pt[1] < r[1] + r[3];
/** a focus list that the stick, the keys and the mouse share: up/down (or left/right) moves it, the mouse over a rect
 *  moves it (only when the mouse moved), a click picks; returns { moved, picked, back } */
class Focus {
  constructor(n, o = {}) { this.i = o.i || 0; this.n = n; this.axis = o.axis || 'v'; this.rects = []; this.lastPt = null; this.disabled = o.disabled || (() => false); this.wrap = o.wrap !== false; this.cols = o.cols || 0; }
  update(I, game) {
    const res = { moved: false, picked: false, back: false, hover: false };
    if (!this.n) return res;
    const prev = this.axis === 'v' ? 'up' : 'left', next = this.axis === 'v' ? 'down' : 'right';
    const step = d => { let i = this.i; for (let k = 0; k < this.n; k++) { i = this.wrap ? (i + d + this.n) % this.n : clamp(i + d, 0, this.n - 1); if (!this.disabled(i)) break; } if (i !== this.i) { this.i = i; res.moved = true; } };
    const P = game ? game.players : [I];
    for (const q of P) {
      if (q.repeat(prev, .32, .1)) step(-1);
      if (q.repeat(next, .32, .1)) step(1);
      if (this.cols) { if (q.repeat('up', .32, .1)) step(-this.cols); if (q.repeat('down', .32, .1)) step(this.cols); }
      if (q.pressed('confirm') || q.pressed('start')) { if (!this.disabled(this.i)) res.picked = true; }
      if (q.pressed('cancel')) res.back = true;
    }
    const pt = I.pointer && I.pointer();
    if (pt && (!this.lastPt || Math.abs(pt[0] - this.lastPt[0]) + Math.abs(pt[1] - this.lastPt[1]) > 0)) {
      this.rects.forEach((r, i) => { if (r && UI.inRect(pt, r) && !this.disabled(i) && i !== this.i) { this.i = i; res.moved = true; res.hover = true; } });
    }
    this.lastPt = pt;
    const ck = I.clicked && I.clicked();
    if (ck) this.rects.forEach((r, i) => { if (r && UI.inRect(ck, r) && !this.disabled(i)) { this.i = i; res.picked = true; } });
    if (res.moved && TT.sound) TT.sound.ui('move');
    return res;
  }
}
UI.Focus = Focus;
/** a big vertical menu: entries at scale 2 in boxes, a description line for the focused one */
class BigMenu {
  constructor(items, o = {}) { this.items = items; this.o = o; this.f = new Focus(items.length, { disabled: i => !!(this.items[i] && this.items[i].disabled), i: o.i || 0 }); }
  get i() { return this.f.i; } set i(v) { this.f.i = v; }
  update(I, game) {
    const r = this.f.update(I, game);
    if (r.picked) { const it = this.items[this.f.i]; if (TT.sound) TT.sound.ui('pick'); I.consumeAll(); if (game) game.players.forEach(q => q.consumeAll()); if (it && it.fn) it.fn(it, this.f.i); if (this.o.onPick) this.o.onPick(this.f.i, it); }
    else if (r.back && this.o.onBack) { if (TT.sound) TT.sound.ui('back'); this.o.onBack(); }
    return r;
  }
  draw(g, x, y, o = {}) {
    const sc = o.scale || 2, h = o.h || 10 * sc + 3, gap = o.gap === undefined ? 3 : o.gap, w = o.w || Math.max(...this.items.map(it => UI.w(it.label, { scale: sc }))) + 30 * sc / 2;
    this.f.rects = [];
    this.items.forEach((it, i) => {
      const yy = y + i * (h + gap), on = i === this.f.i, X = Math.round(x - w / 2);
      this.f.rects[i] = [X, yy, w, h];
      if (on) { const t = (TT.game ? TT.game.real : 0) * 6; UI.panel(g, X - 2, yy - 2, w + 4, h + 4, { bg: ['#3a2a10', '#241808'], border: '#f0c040', focus: true }); UI.txt(g, '▸', X + 6, yy + (h - 7 * sc) / 2 + Math.sin(t) * .8, '#ffe060', { scale: sc }); }
      else UI.panel(g, X, yy, w, h, { bg: ['#1a2032', '#10141e'], border: '#3a4660', alpha: .85 });
      UI.txt(g, it.label, x, yy + (h - 7 * sc) / 2, it.disabled ? '#6a7088' : on ? '#fff4c0' : '#d8dcec', { align: 'center', scale: sc });
    });
    const it = this.items[this.f.i];
    if (it && it.desc && o.desc !== false) UI.txt(g, it.desc, x, o.descY !== undefined ? o.descY : y + this.items.length * (h + gap) + 6, '#c8d0e8', { align: 'center' });
    return y + this.items.length * (h + gap);
  }
}
UI.BigMenu = BigMenu;
/** the device-following hint line at a screen's foot: '{b:confirm} SELECT  {b:cancel} BACK' */
UI.hints = (g, r, s, I, o = {}) => UI.prompt(g, s, r.W / 2, r.H - (o.y || 16), I, Object.assign({ align: 'center', bg: 'rgba(0,0,0,.45)' }, o));
/** a team's crest as a small shield (art from the stadium's crest table) */
UI.crest = (g, teamId, x, y, s = 1) => {
  const tm = TT.TEAMS[teamId], art = TT.crestArt[tm.crest.art], X = Math.round(x), Y = Math.round(y), W = 14 * s, H = 16 * s;
  px.rect(g, X, Y, W, H - 3 * s, '#101014'); px.poly(g, [[X, Y + H - 4 * s], [X + W, Y + H - 4 * s], [X + W / 2, Y + H]], '#101014');
  px.rect(g, X + s, Y + s, W - 2 * s, H - 5 * s, tm.crest.bg); px.poly(g, [[X + s, Y + H - 4 * s], [X + W - s, Y + H - 4 * s], [X + W / 2, Y + H - s]], tm.crest.bg);
  for (let v = 0; v < 10; v++) for (let u = 0; u < 12; u++) { const ch = art[v][u]; if (ch === '.') continue; px.rect(g, X + s + u * s, Y + 2 * s + v * s, s, s, ch === '#' ? tm.crest.fg : '#f0f0f0'); }
};
/** a bar with a label (team cards' SPEED, POWER, SKILL; the dev sliders) */
UI.bar = (g, x, y, w, h, v, col, o = {}) => { px.rect(g, x, y, w, h, '#0c0e14'); px.rect(g, x + 1, y + 1, Math.round((w - 2) * clamp(v, 0, 1)), h - 2, col); if (o.mark !== undefined) px.rect(g, x + 1 + Math.round((w - 2) * o.mark), y - 1, 1, h + 2, '#ffffff'); };
/** any input at all this step (for the attract mode and the idle clock): a key, a button, the mouse moved, a stick */
UI.anyInput = (game, o = {}) => {
  for (const q of game.players) if (q.anyPressed() || (q.clicked && q.clicked())) return true;
  const I = game.input, pt = I.pointer && I.pointer();
  if (pt) { if (UI._lastPt && Math.abs(pt[0] - UI._lastPt[0]) + Math.abs(pt[1] - UI._lastPt[1]) > (o.px || 8)) { UI._lastPt = pt; return true; } if (!UI._lastPt) UI._lastPt = pt; }
  const m = I.move(); if (Math.hypot(m[0], m[1]) > .5) return true;
  return false;
};
