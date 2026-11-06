// Focus across menus: pad, keys and mouse all land on the same thing.
export class Focus {
  constructor(input, audioHook) { this.input = input; this.layer = null; this.cur = null; this.hook = audioHook; }
  setLayer(layer) { this.layer = layer; this.refresh(true); }
  items() { return this.layer ? [...this.layer.el.querySelectorAll('[data-focus]')].filter(e => !e.classList.contains('nofocus')) : []; }
  refresh(toFirst = false) {
    const items = this.items();
    if (!items.includes(this.cur) || toFirst) { const want = this.layer && this.layer.el.querySelector('[data-default]'); this.set(want || items[0] || null, true); } else if (this.cur) this.cur.classList.add('focused');
  }
  set(el, silent = false) {
    if (this.cur === el) { if (el) el.classList.add('focused'); return; }
    if (this.cur) this.cur.classList.remove('focused');
    this.cur = el; if (el) { el.classList.add('focused'); if (!silent && this.hook) this.hook('move'); }
  }
  /** Move to the nearest item in a direction. */
  move(dx, dy) {
    const items = this.items(); if (!items.length) return false; if (!this.cur) { this.set(items[0]); return true; }
    const a = this.cur.getBoundingClientRect(); const ax = a.left + a.width / 2, ay = a.top + a.height / 2; let best = null, bs = 1e12;
    for (const it of items) {
      if (it === this.cur) continue; const r = it.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, ddx = x - ax, ddy = y - ay;
      const along = ddx * dx + ddy * dy; if (along <= 4) continue;
      const across = Math.abs(ddx * dy) + Math.abs(ddy * dx); const s = along + across * 2.2; if (s < bs) { bs = s; best = it; }
    }
    if (best) { this.set(best); return true; }
    return false;
  }
  activate(el = this.cur) { if (el && el._act) { if (this.hook) this.hook('ok'); el._act(); } }
  tick() {
    const l = this.layer; if (!l) return;
    const M = this.input.menu;
    if (this.cur && !this.cur.isConnected) this.refresh(true);
    if (M.up) this.move(0, -1); if (M.down) this.move(0, 1);
    if (M.left) { if (this.cur && this.cur._adj) { this.cur._adj(-1); } else if (!this.move(-1, 0) && l.onLeft) l.onLeft(); }
    if (M.right) { if (this.cur && this.cur._adj) { this.cur._adj(1); } else if (!this.move(1, 0) && l.onRight) l.onRight(); }
    if (M.confirm) this.activate();
    if (M.back && l.onBack) { if (this.hook) this.hook('back'); l.onBack(); }
    if (M.more && l.onMore) l.onMore();
  }
}
