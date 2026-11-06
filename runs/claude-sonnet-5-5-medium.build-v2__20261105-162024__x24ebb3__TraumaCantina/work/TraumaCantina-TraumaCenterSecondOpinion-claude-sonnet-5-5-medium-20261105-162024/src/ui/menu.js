// A vertical focus menu: pad/keys move focus, mouse hover moves focus, click confirms, right click backs out.
import { mtext, textW, clean } from './hud.js';
export class Menu {
  constructor(items, o = {}) { this.items = items; this.i = Math.max(0, items.findIndex((x) => !x.disabled)); this.rects = []; this.o = o; this.hoverLock = 0; this.t = 0; }
  setItems(items) { this.items = items; this.i = Math.min(this.i, items.length - 1); }
  focus() { return this.items[this.i]; }
  move(d) { let n = this.items.length, j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled && !this.items[j].header) break; } if (j !== this.i) { this.i = j; return true; } return false; }
  /** returns 'move' | 'select' | 'back' | 'left' | 'right' | null */
  update(nav, app, dt, audio) {
    this.t += dt; let r = null;
    if (nav.y) { if (this.move(nav.y)) r = 'move'; }
    if (nav.hover && app.devices.last === 'kb') { const k = this.rects.findIndex((q) => q && nav.hover[0] >= q[0] && nav.hover[0] < q[0] + q[2] && nav.hover[1] >= q[1] && nav.hover[1] < q[1] + q[3]); if (k >= 0 && !this.items[k].disabled && !this.items[k].header && k !== this.i) { this.i = k; r = 'move'; } }
    const it = this.items[this.i];
    if (nav.x && it) { if (it.onLeft && nav.x < 0) { it.onLeft(); r = 'left'; } else if (it.onRight && nav.x > 0) { it.onRight(); r = 'right'; } }
    if (nav.click) { const k = this.rects.findIndex((q) => q && nav.click[0] >= q[0] && nav.click[0] < q[0] + q[2] && nav.click[1] >= q[1] && nav.click[1] < q[1] + q[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; const sl = this.items[k]; if (sl.slider) { const q = this.rects[k]; const f = Math.max(0, Math.min(1, (nav.click[0] - (q[0] + q[2] * 0.5)) / (q[2] * 0.45))); sl.onSet?.(f); r = 'right'; } else { this.items[k].onSelect?.(); r = 'select'; } } }
    else if (nav.confirm && it && !it.disabled) { if (it.onSelect) it.onSelect(); else if (it.onRight) it.onRight(); r = 'select'; }
    if (nav.back || nav.rclick) r = r ?? 'back';
    if (r === 'move') audio?.play('uiMove'); else if (r === 'select') audio?.play('uiOk'); else if (r === 'back') audio?.play('uiBack'); else if (r === 'left' || r === 'right') audio?.play('uiMove');
    return r;
  }
  /** Draw centred list from y; each row `rowH` tall. Big focused item with a marker. */
  draw(hud, y, o = {}) {
    const rowH = o.rowH ?? 17, scale = o.scale ?? 1, w = hud.width; this.rects = [];
    this.items.forEach((it, k) => {
      const foc = k === this.i, yy = y + k * rowH, lab = clean(typeof it.label === 'function' ? it.label() : it.label), val = it.value ? clean(typeof it.value === 'function' ? it.value() : it.value) : '';
      const sc = foc ? 2 : 1, col = it.disabled ? 'slate' : foc ? 'white' : 'mist';
      const lw = textW(hud, lab, sc), full = val ? lw + 10 + textW(hud, val, 1) : lw, x = o.left !== undefined ? o.left : Math.round((w - full) / 2);
      const ty = yy + (foc ? 0 : 4);
      if (foc) { hud.rect(x - 16, yy - 2, full + 32, 17, 'navy'); hud.rect(x - 16, yy - 2, 3, 17, 'sand'); const b = Math.round(Math.sin(this.t * 8) * 1.5); hud.sprite(x - 10 + b, yy + 3, ['x..', 'xx.', 'xxx', 'xx.', 'x..'], { x: 'sand' }); }
      if (it.header) { hud.text(x, ty, lab, { color: 'sand' }); } else hud.text(x, ty, lab, { color: col, scale: sc, shadow: foc ? 'ink' : 'ink' });
      if (val) { const vx = x + lw + 10; if (it.slider) { const bw = 80, f = it.frac?.() ?? 0; hud.rect(vx, yy + 3, bw, 7, 'slate'); hud.rect(vx + 1, yy + 4, Math.round((bw - 2) * f), 5, foc ? 'sand' : 'sky'); hud.text(vx + bw + 5, yy + 3, val, { color: 'white' }); } else hud.text(vx, yy + 3, (foc && it.onLeft ? '< ' : '') + val + (foc && it.onRight ? ' >' : ''), { color: foc ? 'sand' : 'sky' }); }
      this.rects[k] = it.header ? null : [x - 16, yy - 2, Math.max(full + 32, it.slider ? full + 120 : 0), 17];
      if (it.slider) this.rects[k] = [x - 16 + 0, yy - 2, full + 130, 17];
    });
  }
}
