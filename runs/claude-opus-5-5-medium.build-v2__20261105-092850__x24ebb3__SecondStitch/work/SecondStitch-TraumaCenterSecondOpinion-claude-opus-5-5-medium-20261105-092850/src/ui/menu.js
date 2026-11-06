// A 10-foot list: big focused item with a bright marker; d-pad, keys, hover and click all move the same focus.
export class Menu {
  constructor(app, items, opts = {}) { this.app = app; this.items = items; this.focus = opts.focus ?? 0; this.rowH = opts.rowH ?? 18; this.x = opts.x ?? null; this.y = opts.y ?? 90; this.width = opts.width ?? 200; this.scroll = 0; this.maxRows = opts.maxRows ?? 8; this.fixFocus(1); this.hit = []; }
  fixFocus(dir) { let n = this.items.length; while (n-- > 0 && this.items[this.focus]?.disabled) this.focus = (this.focus + dir + this.items.length) % this.items.length; }
  /** Input step; returns the activated item or 'back' or null. */
  update(ctx) {
    const { devices, audio } = this.app, n = devices.nav;
    const prev = this.focus;
    if (n.up) { this.focus = (this.focus - 1 + this.items.length) % this.items.length; this.fixFocus(-1); }
    if (n.down) { this.focus = (this.focus + 1) % this.items.length; this.fixFocus(1); }
    if (devices.pointerMoved) for (const h of this.hit) { if (devices.pointerX >= h.x && devices.pointerX <= h.x + h.w && devices.pointerY >= h.y && devices.pointerY <= h.y + h.h && !this.items[h.i].disabled) this.focus = h.i; }
    if (ctx.input.wheel) { this.focus = (this.focus + Math.sign(ctx.input.wheel) + this.items.length) % this.items.length; this.fixFocus(Math.sign(ctx.input.wheel)); }
    if (this.focus !== prev) audio.play('uiMove');
    const item = this.items[this.focus];
    if (item?.adjust && (n.left || n.right)) { item.adjust(n.right ? 1 : -1); audio.play('uiMove'); }
    if (n.back || devices.rightClick(ctx.input)) { audio.play('uiBack'); return 'back'; }
    if (n.confirm) { audio.play('uiConfirm'); return item; }
    const click = devices.click(ctx.input);
    if (click) for (const h of this.hit) {
      if (click.x >= h.x && click.x <= h.x + h.w && click.y >= h.y && click.y <= h.y + h.h && !this.items[h.i].disabled) {
        this.focus = h.i;
        const it = this.items[h.i];
        if (it.adjust && it.value) { it.adjust(click.x > h.x + h.w / 2 ? 1 : -1); audio.play('uiMove'); return null; }
        audio.play('uiConfirm');
        return it;
      }
    }
    return null;
  }
  draw(hud) {
    const X = this.x ?? Math.round((hud.width - this.width) / 2);
    this.hit = [];
    if (this.focus < this.scroll) this.scroll = this.focus;
    if (this.focus >= this.scroll + this.maxRows) this.scroll = this.focus - this.maxRows + 1;
    const end = Math.min(this.items.length, this.scroll + this.maxRows);
    for (let i = this.scroll; i < end; i++) {
      const it = this.items[i], y = this.y + (i - this.scroll) * this.rowH, on = i === this.focus;
      if (on) { hud.rect(X - 4, y - 4, this.width + 8, this.rowH - 2, 0x8a1f38); hud.rect(X - 4, y - 4, 3, this.rowH - 2, 0xffd24d); }
      const color = it.disabled ? 0x5a6172 : on ? 0xffffff : 0xb8c0d0;
      hud.text(X + 4, y, it.label, { color, scale: this.app.settings.pixel && it.big ? 2 : 1 });
      if (it.value) {
        const val = `${on ? '< ' : ''}${it.value()}${on ? ' >' : ''}`;
        hud.text(X + this.width - hud.measure(val).width - 2, y, val, { color: on ? 0xffd24d : 0x8ad0ff });
      }
      if (it.bar) { const b = it.bar(), W = 64, bx = X + this.width - W - 60; hud.rect(bx, y + 1, W, 5, 0x2a3142); hud.rect(bx, y + 1, Math.round(W * b), 5, on ? 0xffd24d : 0x8ad0ff); }
      this.hit.push({ i, x: X - 4, y: y - 4, w: this.width + 8, h: this.rowH - 2 });
    }
    if (this.scroll > 0) hud.text(X + this.width - 6, this.y - 12, '^', { color: 0xffd24d });
    if (end < this.items.length) hud.text(X + this.width - 6, this.y + this.maxRows * this.rowH - 4, 'v', { color: 0xffd24d });
  }
}
