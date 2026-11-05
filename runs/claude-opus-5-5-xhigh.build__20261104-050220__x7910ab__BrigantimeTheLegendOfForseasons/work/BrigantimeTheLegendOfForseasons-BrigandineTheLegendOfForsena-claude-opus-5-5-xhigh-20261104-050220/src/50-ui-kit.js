// THE 10-FOOT UI KIT: windows, text, bars, the focus model (d-pad and stick move it in 2D, hover moves it when the
// pointer really moves, a click picks, a right click goes back, the wheel scrolls), lists of at most 8 rows (5 at
// Large), the prompt bar (glyphs follow the last device), toasts, confirms and one-card tips. Everything draws in
// screen pixels inside r.overlay, anchored to r.W and r.H, clear of the corner buttons.

const { px: UX, font: FONT, ui: EUI } = E;
const UI = G.UI = {};
UI.COL = { bg: '#141a3a', bg2: '#1e2650', border: '#e8e4ff', text: '#ffffff', dim: '#b8b0c8', gold: '#ffd36a', good: '#7ae07a', bad: '#ff6a5a', focus: '#ffe070', panel: '#10142c' };
/** text scale for panels: 1, or 2 with Settings > UI scale: Large */
UI.k = () => (G.game && G.game.settings && G.game.settings.uiScale === 'Large' ? 2 : 1);
UI.lh = () => FONT.lineHeight() * UI.k() + 3 * UI.k();
UI.maxRows = () => (UI.k() > 1 ? 5 : 8);
UI.text = (g, s, x, y, color = UI.COL.text, o = {}) => FONT.text(g, String(s), Math.round(x), Math.round(y), color, Object.assign({ shadow: '#000000', outline: false, scale: o.scale || UI.k() }, o));
UI.width = (s, o = {}) => FONT.width(String(s), Object.assign({ scale: o.scale || UI.k() }, o));
UI.box = (g, x, y, w, h, o = {}) => EUI.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: [UI.COL.bg2, UI.COL.bg], border: UI.COL.border, alpha: .92 }, o));
UI.bar = (g, x, y, w, h, frac, color, back = '#0a0a14') => { UX.rect(g, x, y, w, h, back); UX.rect(g, x + 1, y + 1, Math.max(0, Math.round((w - 2) * G.clamp(frac, 0, 1))), h - 2, color); UX.rect(g, x + 1, y + 1, Math.max(0, Math.round((w - 2) * G.clamp(frac, 0, 1))), 1, E.tones(color).hi); };
/** a labelled bar with its number: 'HP 45/60' */
UI.statBar = (g, x, y, w, label, v, max, color) => { const k = UI.k(); UI.text(g, label, x, y, UI.COL.dim); const lw = 22 * k; UI.bar(g, x + lw, y + 1, w - lw - 30 * k, 5 * k, v / Math.max(1, max), color); UI.text(g, Math.round(v) + (max !== null ? '' : ''), x + w - 28 * k, y, UI.COL.text); };
UI.title = (g, s, x, y, o = {}) => FONT.title(g, s, x, y, Object.assign({ scale: 2, colors: ['#fff6c8', '#ffd36a', '#e07a2a'], outline: '#1a0c10', depth: 2, depthColor: '#5a2a1a', align: 'center' }, o));
/** the focus frame round a rect: a bright frame, an arrow and a small bounce */
UI.focusFrame = (g, x, y, w, h, t) => {
  const b = Math.round(Math.sin(t * 8) * 1);
  UX.rect(g, x - 1, y - 1, w + 2, 1, UI.COL.focus); UX.rect(g, x - 1, y + h, w + 2, 1, UI.COL.focus); UX.rect(g, x - 1, y - 1, 1, h + 2, UI.COL.focus); UX.rect(g, x + w, y - 1, 1, h + 2, UI.COL.focus);
  UX.poly(g, [[x - 6 + b, y + h / 2 - 3], [x - 2 + b, y + h / 2], [x - 6 + b, y + h / 2 + 3]], UI.COL.focus);
};

/**
 * the focus model: st = { f: index, hp: last pointer }; items = [{ x, y, w, h, disabled }]; o: { wrap, cols, back,
 * noKeys }. Moves the focus, and returns 'pick' (confirm or a click on an item), 'back' (cancel or a right click) or null.
 */
/** stand-in geometry for items not yet drawn (headless tests, the first step): a column, or a row */
UI.synth = (n, cols = 1) => Array.from({ length: n }, (_, i) => ({ x: (i % cols) * 20, y: Math.floor(i / cols) * 20, w: 10, h: 10 }));
UI.nav = (st, items, o = {}) => {
  const inp = G.inp(); if (!items.length) { if (inp.pressed('cancel')) return 'back'; return null; }
  if (st.f === undefined || st.f >= items.length) st.f = 0;
  const before = st.f;
  if (!o.noKeys) {
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) {
      if (!G.repeat(a)) continue;
      if (o.horizontal === false && dx) continue;
      const cur = items[st.f], cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
      let best = -1, bd = Infinity;
      items.forEach((it, i) => {
        if (i === st.f) return;
        const ix = it.x + it.w / 2, iy = it.y + it.h / 2, ddx = ix - cx, ddy = iy - cy, along = ddx * dx + ddy * dy;
        if (along <= 1) return;
        const across = Math.abs(dx ? ddy : ddx), d = along + across * 2.5;
        if (d < bd) { bd = d; best = i; }
      });
      if (best < 0 && o.wrap !== false && (dy && !dx)) best = dy > 0 ? 0 : items.length - 1;
      if (best >= 0) st.f = best;
    }
  }
  // the mouse: hover focuses when it really moved; a click on an item picks it; the wheel scrolls
  const p = inp.pointer ? inp.pointer() : null, moved = p && (!st.hp || p[0] !== st.hp[0] || p[1] !== st.hp[1]);
  const hit = q => q ? items.findIndex(it => q[0] >= it.x && q[0] < it.x + it.w && q[1] >= it.y && q[1] < it.y + it.h) : -1;
  if (moved && inp.lastDevice === 'mouse') { const i = hit(p); if (i >= 0) st.f = i; }
  st.hp = p ? p.slice() : null;
  const z = inp.zoom ? inp.zoom() : 1;
  if (o.wheel && z !== 1) st.f = G.clamp(st.f + (z > 1 ? -1 : 1), 0, items.length - 1);
  if (st.f !== before) G.sfx('ui_move');
  const c = inp.clicked && inp.clicked();
  if (c) { const i = hit(c); if (i >= 0) { st.f = i; return items[i].disabled ? (G.sfx('ui_error'), UI.why = items[i].disabled, null) : 'pick'; } }
  // the left button is also a confirm, but in a list only the click on an item picks (and the click picks that item)
  if (inp.pressed('confirm') && inp.lastDevice !== 'mouse') {
    if (items[st.f].disabled) { G.sfx('ui_error'); UI.why = items[st.f].disabled; return null; }
    return 'pick';
  }
  if (inp.pressed('cancel')) return 'back';
  return null;
};

/** a vertical list with scrolling: rows = [{ label, sub, right, disabled, color, icon(g, x, y) }]; draws and navigates */
class List {
  constructor(o = {}) { this.st = { f: 0 }; this.top = 0; this.o = o; this.items = []; }
  /** lay out at (x, y), w wide, at most `rows` rows */
  layout(rows, x, y, w) {
    const lh = (this.o.lh || UI.lh()) + (this.o.pad || 2), max = this.o.rows || UI.maxRows();
    this.rows = rows; this.x = x; this.y = y; this.w = w; this.lhh = lh;
    if (this.st.f >= rows.length) this.st.f = Math.max(0, rows.length - 1);
    if (this.st.f < this.top) this.top = this.st.f; if (this.st.f >= this.top + max) this.top = this.st.f - max + 1;
    this.top = G.clamp(this.top, 0, Math.max(0, rows.length - max));
    this.vis = rows.slice(this.top, this.top + max);
    this.items = this.vis.map((r, i) => ({ x, y: y + i * lh, w, h: lh - 1, disabled: r.disabled }));
    this.h = this.vis.length * lh;
    return this;
  }
  /** returns 'pick' | 'back' | null; this.sel is the row */
  update(rows) {
    if (rows) this.layout(rows, this.x || 0, this.y || 0, this.w || 100);
    if (!this.rows) return null;
    const st = { f: this.st.f - this.top, hp: this.st.hp }, before = this.st.f;
    // moving past the visible window scrolls
    const inp = G.inp(); let res = null;
    if (this.rows.length > this.vis.length && (G.repeat('down') && st.f === this.vis.length - 1 || G.repeat('up') && st.f === 0)) {
      const d = inp.down('down') ? 1 : -1; this.st.f = G.clamp(this.st.f + d, 0, this.rows.length - 1); if (this.st.f !== before) G.sfx('ui_move');
      if (inp.pressed('cancel')) return 'back';
      return null;
    }
    res = UI.nav(st, this.items, { wheel: true, horizontal: false, wrap: this.rows.length <= this.vis.length });
    this.st.f = this.top + (st.f || 0); this.st.hp = st.hp;
    const z = inp.zoom ? inp.zoom() : 1; if (z !== 1 && this.rows.length > this.vis.length) this.st.f = G.clamp(this.st.f + (z > 1 ? -1 : 1), 0, this.rows.length - 1);
    return res;
  }
  get sel() { return this.rows ? this.rows[this.st.f] : null; }
  get index() { return this.st.f; }
  set index(i) { this.st.f = i; }
  draw(g, t, focused = true) {
    const k = UI.k();
    this.vis.forEach((r, i) => {
      const it = this.items[i], on = this.top + i === this.st.f, y = it.y + 1;
      if (on && focused) UX.rect(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, '#2e3a78');
      let x = it.x + 2;
      if (r.icon) { r.icon(g, x, y); x += 12 * k; }
      UI.text(g, r.label, x, y, r.disabled ? '#6a6680' : r.color || (on ? UI.COL.focus : UI.COL.text));
      if (r.right !== undefined) UI.text(g, r.right, it.x + it.w - 2, y, r.disabled ? '#6a6680' : r.rightColor || UI.COL.dim, { align: 'right' });
      if (on && focused) UI.focusFrame(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, t);
    });
    if (this.top > 0) UX.poly(g, [[this.x + this.w / 2 - 3, this.y - 3], [this.x + this.w / 2 + 3, this.y - 3], [this.x + this.w / 2, this.y - 6]], UI.COL.dim);
    if (this.top + this.vis.length < this.rows.length) { const yb = this.y + this.h + 1; UX.poly(g, [[this.x + this.w / 2 - 3, yb], [this.x + this.w / 2 + 3, yb], [this.x + this.w / 2, yb + 3]], UI.COL.dim); }
  }
}
UI.List = List;

/** the prompt bar: [[action, verb], ...] as glyph + verb, bottom centre */
UI.prompts = (r, list, o = {}) => {
  G.lastPrompts = list.map(p => p[1]);
  r.overlay(g => {
    const dev = G.device(), k = UI.k();
    const parts = list.map(([a, verb]) => ({ a, verb, w: 0 }));
    // measure
    let total = 0; for (const p of parts) { p.w = G.glyphW(p.a, dev) + 3 + UI.width(p.verb) + 9; total += p.w; }
    let x = Math.round((r.W - total) / 2), y = o.y !== undefined ? o.y : r.H - 12 * k - 2;
    UX.rect(g, x - 6, y - 3, total + 8, 10 * k + 5, '#0a0c1c'); UX.rect(g, x - 6, y - 3, total + 8, 1, '#3a4070');
    for (const p of parts) {
      const gw = G.glyph(g, x, y + (k > 1 ? 4 : 0), p.a, dev); UI.text(g, p.verb, x + gw + 2, y, UI.COL.text); x += p.w;
    }
  });
};
/** a glyph's width without drawing it */
G.glyphW = (a, dev) => {
  if (dev === 'gamepad') return ['confirm', 'cancel', 'command', 'info'].includes(a) ? 11 : Math.max(9, E.font.width(a === 'pause' ? 'OPTIONS' : a === 'move' ? 'STICK' : 'L1') + 6);
  const lab = G.keyLabel(a, dev); if (dev === 'mouse' && lab.mouse) return 9;
  return Math.max(9, E.font.width(lab.key || '') + 5) + 1;
};

/* ---- toasts: short messages that come and go ---- */
UI.toasts = [];
UI.toast = (text, color = UI.COL.gold, secs = 2.6) => { UI.toasts.push({ text, color, t: secs, max: secs }); if (UI.toasts.length > 4) UI.toasts.shift(); };
UI.drawToasts = (r, dt) => {
  if (!UI.toasts.length) return;
  r.overlay(g => {
    let y = 34; for (const t of UI.toasts) {
      const w = UI.width(t.text) + 14, x = Math.round((r.W - w) / 2), a = Math.min(1, t.t * 3);
      if (a > .3) { UI.box(g, x, y, w, 10 * UI.k() + 6, { alpha: .9 }); UI.text(g, t.text, x + 7, y + 3, t.color); }
      y += 14 * UI.k() + 4;
    }
  });
};
UI.tickToasts = dt => { for (const t of UI.toasts) t.t -= dt; UI.toasts = UI.toasts.filter(t => t.t > 0); };

/* ---- a modal confirm ---- */
UI.modal = null;
/** ask a yes/no question: onYes() on the first answer */
UI.confirm = (text, onYes, o = {}) => { UI.modal = { text, onYes, onNo: o.onNo, yes: o.yes || 'Yes', no: o.no || 'No', st: { f: o.def === 'yes' ? 0 : 1 } }; };
/** run the modal (returns true while one is open: the scene waits) */
UI.modalUpdate = () => {
  const m = UI.modal; if (!m) return false;
  const res = UI.nav(m.st, m.items || UI.synth(2, 2));
  if (res === 'pick') { UI.modal = null; G.sfx(m.st.f === 0 ? 'ui_confirm' : 'ui_cancel'); G.game.input.consumeAll(); if (m.st.f === 0) m.onYes(); else if (m.onNo) m.onNo(); }
  else if (res === 'back') { UI.modal = null; G.sfx('ui_cancel'); G.game.input.consumeAll(); if (m.onNo) m.onNo(); }
  return true;
};
UI.modalDraw = (r, t) => {
  const m = UI.modal; if (!m) return;
  r.overlay(g => {
    const k = UI.k(), lines = FONT.wrap(m.text, 220 * k, { scale: k }), w = 240 * k, h = lines.length * UI.lh() + 34 * k, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
    UX.rect(g, 0, 0, r.W, r.H, '#00000080'.slice(0, 7)); UI.box(g, x, y, w, h, { alpha: 1 });
    lines.forEach((l, i) => UI.text(g, l, x + w / 2, y + 8 + i * UI.lh(), UI.COL.text, { align: 'center' }));
    const by = y + h - 18 * k, bw = 60 * k;
    m.items = [{ x: x + w / 2 - bw - 6, y: by, w: bw, h: 12 * k }, { x: x + w / 2 + 6, y: by, w: bw, h: 12 * k }];
    [m.yes, m.no].forEach((s, i) => { const it = m.items[i]; UX.rect(g, it.x, it.y, it.w, it.h, i === m.st.f ? '#2e3a78' : '#1a1e40'); UI.text(g, s, it.x + it.w / 2, it.y + 2, i === m.st.f ? UI.COL.focus : UI.COL.text, { align: 'center' }); if (i === m.st.f) UI.focusFrame(g, it.x, it.y, it.w, it.h, t); });
  });
};

/* ---- one-card tips (Settings > Tutorial tips) ---- */
UI.tipSeen = {};
UI.tip = (id, title, text) => {
  if (!G.game.settings || G.game.settings.tips === 'Off' || UI.tipSeen[id]) return;
  UI.tipSeen[id] = true; try { E.store.set('brigantime:tips', UI.tipSeen); } catch (e) { /* storage blocked */ }
  UI.tipCard = { title, text, t: 0 };
};
UI.loadTips = () => { try { UI.tipSeen = E.store.get('brigantime:tips', {}) || {}; } catch (e) { UI.tipSeen = {}; } };
UI.tipDraw = (r, dt) => {
  const c = UI.tipCard; if (!c) return;
  c.t += dt; if (c.t > 9) { UI.tipCard = null; return; }
  r.overlay(g => {
    const k = UI.k(), w = 180 * k, lines = FONT.wrap(c.text, w - 12, { scale: k }), h = lines.length * UI.lh() + 22 * k, x = 8, y = 40 * k;
    UI.box(g, x, y, w, h, { bg: ['#2a2410', '#1a1608'], border: '#ffd36a', alpha: .94 });
    UI.text(g, c.title, x + 6, y + 4, UI.COL.gold); lines.forEach((l, i) => UI.text(g, l, x + 6, y + 6 + 10 * k + i * UI.lh(), UI.COL.text));
  });
};
UI.why = null;
/** the one-line reason a choice is disabled, in a footer */
UI.footer = (r, text, color = UI.COL.dim) => { if (!text) return; r.overlay(g => { const w = UI.width(text) + 12, x = Math.round((r.W - w) / 2), y = r.H - 30 * UI.k(); UI.box(g, x, y, w, 10 * UI.k() + 4, { alpha: .9 }); UI.text(g, text, x + 6, y + 2, color); }); };
