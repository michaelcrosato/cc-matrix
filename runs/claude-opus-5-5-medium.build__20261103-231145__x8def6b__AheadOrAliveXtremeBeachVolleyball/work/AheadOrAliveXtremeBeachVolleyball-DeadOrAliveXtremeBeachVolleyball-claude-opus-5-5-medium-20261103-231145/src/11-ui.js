/* 11-ui: the 10-foot canvas UI kit. Screens lay out their widgets from r.W / r.H (the same layout in update and draw, so
 * headless tests can drive them), at most 8 focusables a screen, spatial focus by stick / d-pad / WASD / arrows, hover
 * moves the focus, a click activates, a right click goes back, the wheel pages. */
G.INPUT.MENU.cancel = ['Backspace', 'Pad1', 'Mouse2'];
G.THEMES = {
  day: { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', ink: '#fff8e8', muted: '#9fd3d6', accent: '#ff9e5e', gold: '#ffd36a' },
  night: { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', ink: '#fff8e8', muted: '#c8a8e0', accent: '#5ff0ff', gold: '#ffd36a' }
};
G.UI = {
  theme: 'day',
  get T() { return G.THEMES[this.theme] || G.THEMES.day; },
  panel(g, x, y, w, h, o = {}) { const T = this.T; E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || T.bg, border: o.border || T.border, alpha: o.alpha }); },
  /** the focus: a 2-px gold outline, a 1-px white inner line, a soft pulsing glow and a 1-px lift */
  focus(g, x, y, w, h) {
    x = Math.round(x); y = Math.round(y) - 1; w = Math.round(w); h = Math.round(h);
    const p = .25 + .2 * Math.sin(G.game.real * 5);
    px.blend(g, p, 'add', () => px.rect(g, x - 3, y - 3, w + 6, h + 6, '#ffd36a'));
    px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y, 2, h, '#ffd36a'); px.rect(g, x + w, y, 2, h, '#ffd36a');
    px.rect(g, x, y, w, 1, '#ffffff'); px.rect(g, x, y + h - 1, w, 1, '#ffffff'); px.rect(g, x, y, 1, h, '#ffffff'); px.rect(g, x + w - 1, y, 1, h, '#ffffff');
  },
  text(g, s, x, y, c = this.T.ink, o = {}) { return E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#00000099', outline: false }, o)); },
  heading(g, s, x, y, o = {}) { return E.font.text(g, s, Math.round(x), Math.round(y), o.color || this.T.gold, Object.assign({ scale: 2, shadow: '#000', outline: false }, o)); },
  title(g, s, x, y, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: 3, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], depth: 2, align: 'center' }, o)); },
  button(g, it, focused) {
    const T = this.T, dis = it.disabled;
    E.ui.box(g, Math.round(it.x), Math.round(it.y) - (focused ? 1 : 0), Math.round(it.w), Math.round(it.h), { bg: focused ? ['#1f7a8c', '#12475a'] : T.bg, border: dis ? '#5a6a70' : focused ? '#ffd36a' : T.border });
    if (focused) this.focus(g, it.x, it.y, it.w, it.h);
    const sc = it.scale || 1, tw = E.font.width(it.label, { scale: sc }), cx = it.align === 'left' ? it.x + 8 : it.x + it.w / 2 - tw / 2;
    E.font.text(g, it.label, Math.round(cx), Math.round(it.y + it.h / 2 - 3.5 * sc) - (focused ? 1 : 0), dis ? '#7a8a90' : focused ? '#ffffff' : T.ink, { scale: sc, shadow: '#000', outline: false });
    if (it.right) E.font.text(g, it.right, Math.round(it.x + it.w - 8 - E.font.width(it.right)), Math.round(it.y + it.h / 2 - 3.5) - (focused ? 1 : 0), dis ? '#7a8a90' : T.gold, { shadow: '#000', outline: false });
  },
  slider(g, it, focused) {
    const T = this.T, t = it.tune, v = it.get(), u = (v - t.min) / (t.max - t.min || 1), d = (t.def - t.min) / (t.max - t.min || 1);
    E.ui.box(g, it.x, it.y - (focused ? 1 : 0), it.w, it.h, { bg: focused ? ['#1f7a8c', '#12475a'] : T.bg, border: focused ? '#ffd36a' : T.border });
    if (focused) this.focus(g, it.x, it.y, it.w, it.h);
    E.font.text(g, t.label, it.x + 6, it.y + 3, '#fff8e8', { shadow: '#000', outline: false });
    const val = t.step >= 1 ? G.fmt(v) : (+v).toFixed(t.step < .01 ? 3 : 2);
    E.font.text(g, (v !== t.def ? '* ' : '') + val, it.x + it.w - 6 - E.font.width((v !== t.def ? '* ' : '') + val), it.y + 3, v !== t.def ? '#ffd36a' : '#9fd3d6', { shadow: '#000', outline: false });
    const bx = it.x + 6, bw = it.w - 12, by = it.y + it.h - 6;
    px.rect(g, bx, by, bw, 3, '#0a1a22'); px.rect(g, bx, by, Math.round(bw * u), 3, '#ff9e5e');
    px.rect(g, Math.round(bx + bw * d), by - 2, 1, 7, '#ffffff');   // the default as a tick
    px.rect(g, Math.round(bx + bw * u) - 1, by - 1, 3, 5, '#ffd36a');
  },
  hearts(g, x, y, aff) { E.ui.hearts(g, Math.round(x), Math.round(y), Math.round(aff / 10) / 2, 5); },
  stage(aff) { return aff >= 80 ? 'Best Friend' : aff >= 60 ? 'Good Friend' : aff >= 40 ? 'Friend' : aff >= 20 ? 'Acquaintance' : 'Stranger'; },
  money(g, x, y, n, align = 'left') {
    const s = G.fmtMoney(n), w = E.font.width(s, { scale: 2 }) + 14, X = align === 'right' ? x - w : x;
    px.disc(g, X + 5, y + 7, 5, '#c89020'); px.disc(g, X + 5, y + 7, 4, '#ffd36a'); E.font.text(g, '$', X + 3, y + 4, '#8a5a10', { outline: false });
    E.font.text(g, s, X + 13, y + 1, '#fff3c0', { scale: 2, shadow: '#000', outline: false });
    return w;
  },
  /** "Day 2 • Afternoon" with sun or moon and weather */
  clock(g, x, y, day, slot, weather, align = 'left') {
    const s = 'Day ' + day + ' • ' + G.SLOTS[slot], w = E.font.width(s) + 30, X = align === 'right' ? x - w : x;
    E.ui.box(g, X, y, w, 15, { bg: this.T.bg, border: this.T.border, alpha: .9 });
    if (slot === 2) { px.disc(g, X + 8, y + 7, 4, '#f0f0d0'); px.disc(g, X + 10, y + 6, 3, '#1a2a4a'); }
    else { px.disc(g, X + 8, y + 7, 4, '#ffd36a'); px.disc(g, X + 8, y + 7, 2, '#fff3c0'); }
    G.UI.weatherIcon(g, X + 16, y + 3, weather);
    E.font.text(g, s, X + 26, y + 4, '#fff8e8', { shadow: '#000', outline: false });
    return w;
  },
  weatherIcon(g, x, y, w) {
    if (w === 'rain') { px.disc(g, x + 3, y + 3, 3, '#c8d0e0'); px.disc(g, x + 6, y + 3, 2, '#c8d0e0'); for (let i = 0; i < 3; i++) px.rect(g, x + 1 + i * 3, y + 6, 1, 2, '#6ab0ff'); }
    else if (w === 'cloudy') { px.disc(g, x + 3, y + 4, 3, '#e8ecf4'); px.disc(g, x + 6, y + 4, 2, '#e8ecf4'); }
    else { px.disc(g, x + 4, y + 4, 2, '#ffd36a'); for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) px.dot(g, x + 4 + dx, y + 4 + dy, '#ffd36a'); }
  },
  mood(g, x, y, m) {
    if (m === 'happy') { px.disc(g, x + 3, y + 3, 3, '#ffd36a'); px.dot(g, x + 2, y + 2, '#5a3a10'); px.dot(g, x + 4, y + 2, '#5a3a10'); px.rect(g, x + 2, y + 4, 3, 1, '#5a3a10'); }
    else if (m === 'gloomy') { px.disc(g, x + 3, y + 3, 3, '#8a9ab0'); px.dot(g, x + 2, y + 2, '#2a3040'); px.dot(g, x + 4, y + 2, '#2a3040'); px.rect(g, x + 2, y + 5, 3, 1, '#2a3040'); }
    else { px.disc(g, x + 3, y + 3, 3, '#c8e0e8'); px.dot(g, x + 2, y + 2, '#2a3040'); px.dot(g, x + 4, y + 2, '#2a3040'); px.rect(g, x + 2, y + 4, 3, 1, '#2a3040'); }
  },
  coin(g, x, y) { px.disc(g, x + 4, y + 4, 4, '#c89020'); px.disc(g, x + 4, y + 4, 3, '#ffd36a'); px.dot(g, x + 3, y + 3, '#fff3c0'); },
  chip(g, x, y, c = '#e8283a') { px.disc(g, x + 4, y + 4, 4, '#ffffff'); px.disc(g, x + 4, y + 4, 3, c); px.disc(g, x + 4, y + 4, 1.5, '#ffffff'); },
  /** an item's icon: suits as a little swimsuit, accessories by anchor, gifts as a wrapped box in their category's colours */
  itemIcon(g, x, y, it, s = 1) {
    x = Math.round(x); y = Math.round(y);
    if (it.kind === 'suit') {
      const [m, a, t] = it.colors;
      px.rect(g, x + 4 * s, y + 1 * s, 2 * s, 3 * s, t); px.rect(g, x + 10 * s, y + 1 * s, 2 * s, 3 * s, t);
      px.rect(g, x + 3 * s, y + 4 * s, 10 * s, 5 * s, m); px.rect(g, x + 4 * s, y + 9 * s, 8 * s, 3 * s, m); px.rect(g, x + 5 * s, y + 12 * s, 6 * s, 2 * s, m);
      px.rect(g, x + 3 * s, y + 6 * s, 10 * s, 1 * s, a); if (it.cut === 'sport2' || it.cut === 'tankini') px.rect(g, x + 3 * s, y + 9 * s, 10 * s, 1 * s, '#f1cfb2');
    } else if (it.kind === 'acc') {
      const c = it.shades ? '#20262e' : '#ffd36a';
      if (it.anchor === 'face') { px.rect(g, x + 2 * s, y + 6 * s, 5 * s, 3 * s, it.id === 'heartshades' ? '#ff5fa2' : it.id === 'aviators' ? '#c89020' : c); px.rect(g, x + 9 * s, y + 6 * s, 5 * s, 3 * s, it.id === 'heartshades' ? '#ff5fa2' : it.id === 'aviators' ? '#c89020' : c); px.rect(g, x + 7 * s, y + 6 * s, 2 * s, 1 * s, '#e8eef2'); }
      else if (it.anchor === 'head') { px.rect(g, x + 2 * s, y + 7 * s, 12 * s, 3 * s, it.id === 'sunhat' ? '#e8c880' : it.id === 'visor' ? '#ffffff' : '#ff6a5a'); if (it.id === 'sunhat') px.rect(g, x + 5 * s, y + 4 * s, 6 * s, 3 * s, '#d8b870'); }
      else if (it.anchor === 'neck') for (let i = 0; i < 5; i++) px.disc(g, x + (3 + i * 2.5) * s, y + (6 + Math.abs(i - 2)) * s, 1.2 * s, '#ffffff');
      else if (it.anchor === 'wrists') { px.rect(g, x + 3 * s, y + 6 * s, 4 * s, 4 * s, '#ff5a5a'); px.rect(g, x + 9 * s, y + 6 * s, 4 * s, 4 * s, '#ff5a5a'); }
      else { px.disc(g, x + 8 * s, y + 8 * s, 4 * s, it.id === 'hibiscus' ? '#e8283a' : '#ff6aa8'); px.disc(g, x + 8 * s, y + 8 * s, 1.5 * s, '#ffd36a'); }
    } else {
      const [c1, c2] = G.GIFT_ICON_COLORS[it.cat] || ['#ffd36a', '#c89020'];
      px.rect(g, x + 2 * s, y + 5 * s, 12 * s, 9 * s, c2); px.rect(g, x + 3 * s, y + 6 * s, 10 * s, 7 * s, c1);
      px.rect(g, x + 7 * s, y + 5 * s, 2 * s, 9 * s, '#ffffff'); px.rect(g, x + 2 * s, y + 8 * s, 12 * s, 2 * s, '#ffffff');
      px.disc(g, x + 6 * s, y + 4 * s, 2 * s, '#ffffff'); px.disc(g, x + 10 * s, y + 4 * s, 2 * s, '#ffffff');
    }
  }
};

/** a focus over a list of widgets ({ x, y, w, h, id, disabled, kind }); one per screen. update() returns what happened */
G.Focus = class {
  constructor() { this.i = 0; this.items = []; this._p = null; }
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); return this; }
  get cur() { return this.items[this.i]; }
  focusId(id) { const k = this.items.findIndex(it => it.id === id); if (k >= 0) this.i = k; }
  _hit(p) { if (!p) return -1; return this.items.findIndex(it => p[0] >= it.x && p[0] < it.x + it.w && p[1] >= it.y && p[1] < it.y + it.h); }
  update(I = G.game.input) {
    const res = { pick: null, back: false, alt: false, extra: false, tabL: false, tabR: false, lr: 0 };
    const A = this.items; if (!A.length) { res.back = I.pressed('cancel'); return res; }
    const p = I.pointer && I.pointer();
    if (p && (!this._p || p[0] !== this._p[0] || p[1] !== this._p[1])) { const k = this._hit(p); if (k >= 0 && k !== this.i) { this.i = k; G.sfx('ui_tick'); } }
    this._p = p ? [p[0], p[1]] : null;
    const cur = A[this.i];
    // sliders take left / right and a mouse drag
    if (cur && cur.kind === 'slider') {
      const l = I.repeat('left', .3, .05), r = I.repeat('right', .3, .05);
      if (l || r) res.lr = r ? 1 : -1;
      if (p && I.down && I.held && I.held.has && I.held.has('Mouse0') && this._hit(p) === this.i) res.drag = clamp((p[0] - cur.x - 6) / (cur.w - 12), 0, 1);
    }
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) {
      if (cur && cur.kind === 'slider' && dx) continue;
      if (cur && cur.kind === 'stepper' && dx) { if (I.repeat(a, .35, .09)) res.lr = dx; continue; }
      if (!I.repeat(a, .35, .09)) continue;
      const n = this._nav(dx, dy); if (n >= 0 && n !== this.i) { this.i = n; G.sfx('ui_tick'); }
    }
    const c = I.clicked && I.clicked();
    if (c) { const k = this._hit(c); if (k >= 0) { this.i = k; const it = A[k]; if (it.kind === 'stepper') res.lr = c[0] > it.x + it.w / 2 ? 1 : -1; else if (it.kind !== 'slider') { if (it.disabled) G.sfx('ui_error'); else res.pick = it; } } }
    if (I.pressed('confirm') && cur) { if (cur.disabled) G.sfx('ui_error'); else if (cur.kind === 'stepper') res.lr = 1; else res.pick = cur; }
    if (res.pick) G.sfx('ui_select');
    if (I.pressed('cancel')) { res.back = true; G.sfx('ui_back'); }
    if (I.map.alt && I.pressed('alt')) res.alt = true;
    if (I.map.extra && I.pressed('extra')) res.extra = true;
    if (I.map.tabL && I.pressed('tabL')) res.tabL = true;
    if (I.map.tabR && I.pressed('tabR')) res.tabR = true;
    const w = G.takeWheel(); if (w < 0) res.tabL = true; else if (w > 0) res.tabR = true;
    if (res.tabL || res.tabR) G.sfx('ui_tab');
    return res;
  }
  /** the nearest widget in a direction (spatial focus) */
  _nav(dx, dy) {
    const c = this.items[this.i]; if (!c) return 0;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = -1, bd = 1e9;
    this.items.forEach((it, k) => {
      if (k === this.i) return;
      const x = it.x + it.w / 2, y = it.y + it.h / 2, vx = x - cx, vy = y - cy, along = vx * dx + vy * dy;
      if (along <= 2) return;
      const across = Math.abs(vx * dy - vy * dx), d = along + across * 2.2;
      if (d < bd) { bd = d; best = k; }
    });
    if (best < 0 && dy) { const k = this.i + dy; if (k >= 0 && k < this.items.length) return k; }
    return best;
  }
};
/** a vertical list of buttons centred at x: returns widgets */
G.UI.column = (labels, x, y, w, h = 18, gap = 4, o = {}) => labels.map((l, k) => Object.assign({ x: Math.round(x - w / 2), y: Math.round(y + k * (h + gap)), w, h, id: typeof l === 'string' ? l : l.id, label: typeof l === 'string' ? l : l.label }, typeof l === 'string' ? {} : l, o));
/** draw notices (toasts) */
G.drawNotices = r => {
  G.notices = G.notices.filter(n => n.t < n.sec);
  if (!G.notices.length) return;
  r.overlay(g => G.notices.forEach((n, k) => {
    const w = Math.max(E.font.width(n.title), E.font.width(n.text)) + 16, x = Math.round(r.W / 2 - w / 2), slide = Math.min(1, n.t * 6, (n.sec - n.t) * 6), y = Math.round(-30 + slide * (38 + k * 30));
    G.UI.panel(g, x, y, w, n.text ? 26 : 15); E.font.text(g, n.title, x + 8, y + 4, '#ffd36a', { shadow: '#000', outline: false });
    if (n.text) E.font.text(g, n.text, x + 8, y + 14, '#fff8e8', { shadow: '#000', outline: false });
  }));
};
