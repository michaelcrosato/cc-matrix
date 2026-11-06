// A big number with up and down; and a plain free-standing menu.
import { panel, drawText, inRect, dim } from '../draw.js';
import { Menu } from '../ui.js';

class NumberScreen {
  constructor({ title, max, step, onDone }) { this.id = 'number'; this.title = title; this.max = max; this.step = step; this.value = Math.min(max, step * 10); this.onDone = onDone; }
  focusIndex() { return this.value; }
  labels() { return [String(this.value)]; }
  update(g, inp) {
    const m = inp.mouse;
    const big = this.step * 10;
    let v = this.value;
    if (inp.nav.up) v += this.step;
    if (inp.nav.down) v -= this.step;
    if (inp.nav.right) v += big;
    if (inp.nav.left) v -= big;
    if (m.click) {
      if (inRect(m, 160, 100, 30, 30)) v -= big;
      if (inRect(m, 290, 100, 30, 30)) v += big;
      if (inRect(m, 200, 154, 80, 22)) { g.sound('uiConfirm'); g.ui.pop(this); this.onDone(this.value); return; }
    }
    if (g.ctx.input.wasPressed('KeyM') || inp.square) v = this.max;
    v = Math.max(0, Math.min(this.max, v));
    if (v !== this.value) { this.value = v; g.sound('uiTick'); }
    if (inp.confirm) { g.sound('uiConfirm'); g.ui.pop(this); this.onDone(this.value); return; }
    if (inp.back || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); this.onDone(0); }
  }
  prompts() { return [['confirm', 'OK'], ['fill', 'All of it'], ['back', 'Cancel']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 120, 60, 240, 130, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 70, this.title, { align: 'center', color: 'ink' });
    drawText(hud, 240, 104, this.value.toLocaleString('en-US'), { align: 'center', color: 'ink', scale: 3 });
    drawText(hud, 240, 132, `of ${this.max.toLocaleString('en-US')}`, { align: 'center', color: 'slate' });
    panel(hud, 160, 100, 30, 30, { fill: 'sand', trim: 'orange' });
    drawText(hud, 175, 110, '<', { align: 'center', color: 'ink' });
    panel(hud, 290, 100, 30, 30, { fill: 'sand', trim: 'orange' });
    drawText(hud, 305, 110, '>', { align: 'center', color: 'ink' });
    panel(hud, 200, 154, 80, 22, { fill: 'sand', trim: 'orange' });
    drawText(hud, 240, 161, 'OK', { align: 'center', color: 'ink' });
  }
}
export function* numberPicker(g, { title, max, step = 100 }) {
  if (max <= 0) return 0;
  let done = null;
  g.ui.push(new NumberScreen({ title, max, step: Math.min(step, Math.max(1, max)), onDone: (v) => { done = v; } }));
  while (done === null) yield;
  return done;
}
export function* menuChoiceFree(g, title, labels, o = {}) {
  let result = -2;
  const items = labels.map((l, i) => ({ label: l, action: (gg, m) => { result = i; gg.ui.pop(m); } }));
  g.ui.push(new Menu({ id: o.id ?? 'choice', title, items, x: o.x ?? 130, y: o.y ?? 70, w: o.w ?? 220, back: (gg, m) => { result = -1; gg.ui.pop(m); } }));
  while (result === -2) yield;
  return result;
}
