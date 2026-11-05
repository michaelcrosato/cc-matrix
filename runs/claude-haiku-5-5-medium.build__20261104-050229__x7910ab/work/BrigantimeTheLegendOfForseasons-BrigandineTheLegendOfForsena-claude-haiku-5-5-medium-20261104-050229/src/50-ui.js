// The 10-foot UI kit: a focusable list that takes the stick, the arrows and the mouse (hover moves the focus, a click picks),
// the windows and text the screens share, and the touch-only check. Layouts are in screen pixels anchored to r.W and r.H.
(() => {
  const H = G, px = E.px;

  // a list of choices. items: [{ label, sub, disabled, value }]. onPick(index, item), onCancel(), onMove(index).
  class List {
    constructor(items, o = {}) {
      this.items = items; this.i = o.index || 0; this.x = o.x || 0; this.y = o.y || 0; this.w = o.w || 180;
      this.rowH = o.rowH || 12; this.maxRows = o.maxRows || 8; this.title = o.title || null;
      this.onPick = o.onPick || null; this.onCancel = o.onCancel || null; this.onMove = o.onMove || null;
      this.rects = []; this.top = 0; this.color = o.color || '#f2eefc';
    }
    set(items, i = 0) { this.items = items; this.i = Math.max(0, Math.min(i, items.length - 1)); }
    get item() { return this.items[this.i]; }
    move(d) {
      const n = this.items.length; if (!n) return;
      let i = this.i;
      for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!this.items[i].disabled) break; }
      if (i !== this.i) { this.i = i; if (this.onMove) this.onMove(i); }
    }
    // call once per update. Returns the picked index, or -1.
    update(game) {
      const I = game.input, n = this.items.length;
      if (I.repeat('up', .35, .13)) this.move(-1);
      if (I.repeat('down', .35, .13)) this.move(1);
      const p = I.pointer && I.pointer();
      if (p) {
        const hit = this.rects.findIndex(r => p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]);
        if (hit >= 0 && this.items[this.top + hit] && !this.items[this.top + hit].disabled && this.top + hit !== this.i) { this.i = this.top + hit; if (this.onMove) this.onMove(this.i); }
      }
      const c = I.clicked && I.clicked();
      if (c && n) {
        const hit = this.rects.findIndex(r => c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]);
        if (hit >= 0) { const k = this.top + hit; if (!this.items[k].disabled) { this.i = k; return this.pick(); } }
      }
      if (n && I.pressed('confirm')) { const it = this.items[this.i]; if (it && !it.disabled) return this.pick(); }
      if (I.pressed('cancel') && this.onCancel) this.onCancel();
      return -1;
    }
    pick() { if (this.onPick) this.onPick(this.i, this.items[this.i]); return this.i; }
    // draws the list; the window scrolls to keep the cursor in view
    draw(r, o = {}) {
      const rows = Math.min(this.maxRows, this.items.length), top = Math.max(0, Math.min(this.i - Math.floor(rows / 2), this.items.length - rows));
      this.top = top; this.rects = [];
      const h = (this.title ? 16 : 4) + rows * this.rowH + 4;
      r.overlay(g => {
        if (o.box !== false) E.ui.box(g, this.x - 6, this.y - 6, this.w + 12, h + 4, { bg: ['#1c1830', '#0e0b18'], border: '#8a7ab0', alpha: .94 });
        let y = this.y;
        if (this.title) { E.font.text(g, this.title, this.x, y, '#ffe9a8', { shadow: '#000' }); y += 14; }
        for (let k = 0; k < rows; k++) {
          const idx = top + k, it = this.items[idx], sel = idx === this.i, ry = y + k * this.rowH;
          this.rects.push([this.x - 2, ry - 1, this.w + 4, this.rowH]);
          if (sel) { px.rect(g, this.x - 2, ry - 1, this.w + 4, this.rowH, '#4a3e78'); px.rect(g, this.x - 2, ry - 1, 2, this.rowH, '#ffd36a'); }
          const col = it.disabled ? '#7a7490' : sel ? '#fff4c8' : this.color;
          E.font.text(g, (sel ? '▸ ' : '  ') + it.label, this.x + 2, ry + 1, col, { shadow: '#000' });
          if (it.sub) E.font.text(g, String(it.sub), this.x + this.w - 2, ry + 1, it.disabled ? '#6a6480' : '#cfc6ec', { align: 'right', shadow: '#000' });
        }
        if (this.items.length > rows) E.font.text(g, (top + 1) + ' of ' + this.items.length, this.x + this.w, y + rows * this.rowH + 1, '#8a84a0', { align: 'right' });
      });
      return { x: this.x - 6, y: this.y - 6, w: this.w + 12, h: h + 4 };
    }
  }
  H.List = List;

  // a box with a title and wrapped text under it (a card, a tidings panel, a unit's details)
  H.panel = (r, x, y, w, h, o = {}) => r.overlay(g => E.ui.box(g, x, y, w, h, { bg: o.bg || ['#1c1830', '#0e0b18'], border: o.border || '#8a7ab0', alpha: o.alpha || .92 }));
  // word-wrapped text lines, for a width in screen pixels
  H.wrap = (text, w) => E.font.wrap(text, w);
  H.say = (r, text, x, y, w, color = '#f0ecff', o = {}) => {
    const lines = E.font.wrap(text, w);
    r.overlay(g => lines.forEach((t, i) => E.font.text(g, t, x, y + i * 9, color, Object.assign({ shadow: '#000' }, o))));
    return lines.length;
  };
  H.bar = (r, x, y, w, frac, color, label) => r.overlay(g => {
    E.ui.bar(g, x, y, w, 4, H.clamp(frac, 0, 1), color);
    if (label) E.font.text(g, label, x, y - 9, '#f4f0ff', { shadow: '#000' });
  });

  // a sound for a menu move or pick, by the engine's presets
  const SFX_ALIAS = { cursor: 'ui_move', confirm: 'ui_confirm', cancel: 'ui_cancel', hit: 'sword_clang', skill: 'cast_charge', bell: 'bell_toll', move: 'step', quest: 'banner_flip', level: 'heal' };
  H.sfx = (game, name) => game.audio.sfx(SFX_ALIAS[name] || name);

  // touch-only: a phone or tablet with no mouse, keyboard or controller. Those get the notice instead of the game.
  H.touchOnly = (game) => {
    if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') return false;
    if (!((navigator.maxTouchPoints || 0) > 0)) return false;
    if (matchMedia('(any-pointer: fine)').matches || matchMedia('(any-hover: hover)').matches) return false;
    const pads = typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads() || []).filter(Boolean) : [];
    return pads.length === 0;
  };

  // the realm's name and colour, for a banner
  H.realmColor = realm => (H.get('realm', realm).color || '#888');
  H.seasonColor = season => (season ? H.get('season', season).color : '#c8c0d8');
})();
