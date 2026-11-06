// The widgets every screen is built from, in absolute art pixels. They are methods of UI.
export const widgets = {
  panel(x, y, w, h, { color = 'ink', border = 'night', scan = false, gap = 2 } = {}) {
    if (scan) for (let k = 0; k < h; k += gap) this.rect(x, y + k, w, 1, color); else this.rect(x, y, w, h, color);
    if (border) this.frameRect(x, y, w, h, border);
  },
  bar(x, y, w, h, f, color = 'lime', back = 'night') { this.rect(x, y, w, h, back); this.rect(x, y, Math.round(w * Math.max(0, Math.min(1, f))), h, color); },
  button(id, x, y, w, h, label, o = {}) {
    const f = this.item(id, x, y, w, h, o);
    const bg = o.disabled ? 'ink' : f ? 'navy' : o.bg ?? 'night', col = o.disabled ? 'slate' : f ? 'white' : o.color ?? 'mist';
    this.rect(x, y, w, h, bg); this.rect(x, y + h - 2, w, 2, 'ink');
    const scale = o.scale ?? 1, ty = Math.round(y + (h - 7 * scale) / 2) - (h > 12 ? 1 : 0);
    if (o.left) this.text(x + 6, ty, label, { color: col, scale }); else this.text(x + w / 2, ty, label, { color: col, scale, align: 'center' });
    if (o.right) this.text(x + w - 6, ty, o.right, { color: o.rightColor ?? 'sand', align: 'right' });
    return f;
  },
  slider(id, x, y, w, h, label, value, min, max, o = {}) {
    const f = this.item(id, x, y, w, h, { ...o, slider: { value, min, max, step: o.step ?? (max - min) / 20, set: o.set, reset: o.reset } });
    this.rect(x, y, w, h, f ? 'navy' : 'night');
    this.text(x + 6, y + Math.round((h - 7) / 2), label, { color: f ? 'white' : 'mist' });
    const bw = o.barW ?? Math.floor(w * 0.42), bx = x + w - bw - (o.valueW ?? 34), by = y + Math.round(h / 2) - 2, frac = (value - min) / (max - min || 1);
    this.rect(bx, by, bw, 4, 'ink'); this.rect(bx, by, Math.round(bw * frac), 4, f ? 'lime' : 'mist'); this.rect(bx + Math.round((bw - 3) * frac), by - 2, 3, 8, 'white');
    this.text(x + w - 5, y + Math.round((h - 7) / 2), o.format ? o.format(value) : value.toFixed(2), { align: 'right', color: f ? 'sand' : 'mist' });
    const it = this.items[this.items.length - 1]; it.bar = { x: bx, w: bw };
    return f;
  },
  tabs(id, x, y, w, labels, index, onChange) {
    const tw = Math.floor(w / labels.length);
    labels.forEach((l, i) => { const on = i === index; this.rect(x + i * tw, y, tw - 1, 12, on ? 'navy' : 'night'); this.text(x + i * tw + (tw - 1) / 2, y + 3, l, { align: 'center', color: on ? 'sand' : 'slate' }); this.clicks.push({ x: x + i * tw, y, w: tw - 1, h: 12, fn: () => onChange(i) }); });
    if (this.app.actions.pressed('tabL')) { onChange((index - 1 + labels.length) % labels.length); this.app.mix?.sfx('tick'); }
    if (this.app.actions.pressed('tabR')) { onChange((index + 1) % labels.length); this.app.mix?.sfx('tick'); }
  },
  header(title, sub = null) {
    this.text(10, 8, title, { scale: 2, color: 'sand', shadow: 'ink' });
    if (sub) this.text(10, 26, sub, { color: 'mist' });
  },
};
