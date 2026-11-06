// A vertical list you can drive with a pad, keys or a mouse: big focused item, bright marker, no tables.
export class Menu {
  /**
   * @param items [{ label, value?: ()=>string, onConfirm?, onLeft?, onRight?, disabled?, blurb? }]
   */
  constructor(app, items, o = {}) {
    this.app = app;
    this.items = items;
    this.i = o.start ?? 0;
    this.top = 0;
    this.rows = o.rows ?? 8;
    this.onBack = o.onBack ?? null;
    this.rowH = o.rowH ?? 15;
    this.scale = o.scale ?? 1;
    this.x = o.x;
    this.y = o.y ?? 60;
    this.w = o.w ?? 240;
    this.sound = o.sound ?? true;
    this.fixFocus();
  }
  fixFocus() {
    if (!this.items.length) return;
    let guard = 0;
    while (this.items[this.i]?.disabled && guard++ < this.items.length) this.i = (this.i + 1) % this.items.length;
  }
  move(dir) {
    const n = this.items.length;
    let k = this.i;
    for (let g = 0; g < n; g++) {
      k = (k + dir + n) % n;
      if (!this.items[k].disabled) break;
    }
    if (k !== this.i) { this.i = k; this.app.sfx('uiMove'); }
    this.keepVisible();
  }
  keepVisible() {
    if (this.i < this.top) this.top = this.i;
    if (this.i >= this.top + this.rows) this.top = this.i - this.rows + 1;
  }
  update(ui) {
    const nav = this.app.devices.nav;
    const dev = this.app.devices;
    if (nav.up) this.move(-1);
    if (nav.down) this.move(1);
    const item = this.items[this.i];
    if (item) {
      if (nav.left && item.onLeft) { item.onLeft(); this.app.sfx('uiMove'); }
      if (nav.right && item.onRight) { item.onRight(); this.app.sfx('uiMove'); }
      if (nav.confirm && item.onConfirm && !item.disabled) { this.app.sfx('uiConfirm'); item.onConfirm(); return; }
    }
    if (nav.back && this.onBack) { this.app.sfx('uiBack'); this.onBack(); return; }
    if (dev.rightClick && this.onBack) { this.app.sfx('uiBack'); this.onBack(); return; }
    if (dev.wheel) {
      if (this.items.length > this.rows) {
        this.top = Math.max(0, Math.min(this.items.length - this.rows, this.top + (dev.wheel > 0 ? 1 : -1)));
        if (this.i < this.top) this.i = this.top;
        if (this.i >= this.top + this.rows) this.i = this.top + this.rows - 1;
      }
    }
    // Mouse: hover moves focus, click confirms.
    const x = this.xPos(ui);
    const end = Math.min(this.items.length, this.top + this.rows);
    for (let k = this.top; k < end; k++) {
      const y = this.y + (k - this.top) * this.rowH;
      if (ui.hit(x - 6, y - 3, this.w + 12, this.rowH)) {
        const it = this.items[k];
        if (dev.mouseMoved && !it.disabled && this.i !== k) { this.i = k; this.app.sfx('uiMove'); }
        if (dev.click && !it.disabled) {
          this.i = k;
          if (it.onConfirm) { this.app.sfx('uiConfirm'); it.onConfirm(); return; }
          if (it.onRight) {
            // Click the left or right half to step a value.
            if (dev.px < x + this.w / 2 && it.onLeft) it.onLeft(); else it.onRight();
            this.app.sfx('uiMove');
            return;
          }
        }
      }
    }
  }
  xPos(ui) { return this.x ?? (ui.w - this.w) / 2; }
  draw(ui) {
    const x = this.xPos(ui);
    const end = Math.min(this.items.length, this.top + this.rows);
    for (let k = this.top; k < end; k++) {
      const it = this.items[k];
      const y = this.y + (k - this.top) * this.rowH;
      const focus = k === this.i;
      if (focus) {
        ui.rect(x - 6, y - 3, this.w + 12, this.rowH - 1, 'navy');
        ui.outline(x - 6, y - 3, this.w + 12, this.rowH - 1, 'sand');
        ui.rect(x - 11, y - 3, 3, this.rowH - 1, 'sand');
      }
      const color = it.disabled ? 'slate' : focus ? 'sand' : 'white';
      ui.text(x, y, it.label, { color, scale: this.scale });
      if (it.value) {
        const v = it.value();
        const vw = ui.hud.measure(v, this.scale).width;
        const right = x + this.w;
        ui.text(right - vw - (focus ? 8 : 0), y, v, { color: focus ? 'white' : 'mist', scale: this.scale });
        if (focus && (it.onLeft || it.onRight)) {
          ui.text(right - vw - 16, y, '<', { color: 'sand', scale: this.scale });
          ui.text(right - 5, y, '>', { color: 'sand', scale: this.scale });
        }
      }
    }
    if (this.top > 0) ui.center(this.y - 11, '- MORE -', { color: 'mist' });
    if (end < this.items.length) ui.center(this.y + this.rows * this.rowH - 2, '- MORE -', { color: 'mist' });
    const cur = this.items[this.i];
    if (cur?.blurb) {
      const lines = ui.wrap(cur.blurb, ui.w - 40);
      lines.slice(0, 2).forEach((l, n) => ui.richCenter(this.y + Math.min(this.items.length, this.rows) * this.rowH + (this.items.length > this.rows ? 10 : 4) + n * 10, l, { color: 'mist' }));
    }
  }
}
