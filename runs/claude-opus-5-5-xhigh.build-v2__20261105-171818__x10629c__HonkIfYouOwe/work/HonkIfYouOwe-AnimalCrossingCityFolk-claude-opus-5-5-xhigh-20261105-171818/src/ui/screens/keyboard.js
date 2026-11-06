// The on-screen keyboard: a chunky grid for the pad, real typing for the keyboard.
import { panel, drawText, inRect, dim, textWidth } from '../draw.js';

const ROWS = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', "0123456789.,!", "?'-&() _"];
const CELL = 24;
const GRID_Y = 70;
const BUTTON_Y = GRID_Y + ROWS.length * CELL + 2;
class Keyboard {
  constructor({ title, max = 12, value = '', hint = '', random = null, onDone, onCancel, multi = false }) {
    this.id = 'keyboard'; this.title = title; this.max = max; this.value = value; this.hint = hint; this.random = random; this.onDone = onDone; this.onCancel = onCancel;
    this.cx = 0; this.cy = 0;
    this.multi = multi;
    this.randomI = 0;
  }
  labels() { return ROWS; }
  currentText() { return this.value; }
  focusIndex() { return this.cy * 20 + this.cx; }
  rect(cx, cy) { return [240 - (13 * CELL) / 2 + cx * CELL, GRID_Y + cy * CELL, CELL - 2, CELL - 2]; }
  type(g, ch) { if (this.value.length < this.max) { this.value += ch; g.sound('uiTick'); } else g.sound('uiError'); }
  rowsAt(y) { return y < ROWS.length ? ROWS[y].length : 2; }
  commit(g) { const v = this.value.trim(); if (!v) { g.sound('uiError'); return; } g.sound('uiConfirm'); g.ui.pop(this); this.onDone(v); }
  update(g, inp) {
    for (const k of inp.keysTyped) {
      if (k === 'Enter') { this.commit(g); return; }
      if (k === 'Backspace') { this.value = this.value.slice(0, -1); g.sound('uiTick'); continue; }
      if (k.length === 1 && /[A-Za-z0-9 .,!?'&()_-]/.test(k)) this.type(g, k);
    }
    const typing = inp.keysTyped.length > 0;
    if (inp.nav.right && !typing) { this.cx++; g.sound('uiTick'); }
    if (inp.nav.left && !typing) { this.cx--; g.sound('uiTick'); }
    if (inp.nav.up && !typing) { this.cy = (this.cy + ROWS.length) % (ROWS.length + 1); g.sound('uiTick'); }
    if (inp.nav.down && !typing) { this.cy = (this.cy + 1) % (ROWS.length + 1); g.sound('uiTick'); }
    const len = this.rowsAt(this.cy);
    this.cx = ((this.cx % len) + len) % len;
    const m = inp.mouse;
    if (m.moved || m.click) for (let y = 0; y < ROWS.length; y++) for (let x = 0; x < ROWS[y].length; x++) if (inRect(m, ...this.rect(x, y))) { this.cx = x; this.cy = y; if (m.click) this.type(g, ROWS[y][x]); }
    const r0 = [150, BUTTON_Y, 80, 20], r1 = [250, BUTTON_Y, 80, 20];
    if (m.click && inRect(m, ...r0)) { this.value = this.value.slice(0, -1); g.sound('uiTick'); }
    if (m.click && inRect(m, ...r1)) { this.commit(g); return; }
    if (inp.confirm && !typing) {
      if (this.cy >= ROWS.length) { if (this.cx === 0) { this.value = this.value.slice(0, -1); g.sound('uiTick'); } else { this.commit(g); return; } }
      else this.type(g, ROWS[this.cy][this.cx]);
    }
    if (inp.square) { this.value = this.value.slice(0, -1); g.sound('uiTick'); }
    if (inp.triangle && this.random) { this.value = this.random[this.randomI++ % this.random.length]; g.sound('uiConfirm'); }
    if (g.ctx.input.wasPressed('Tab') && this.random) { this.value = this.random[this.randomI++ % this.random.length]; g.sound('uiConfirm'); }
    if (g.ctx.input.wasPressed('PadCircle') || (m.rclick) || g.ctx.input.wasPressed('Escape')) {
      if (this.onCancel) { g.sound('uiCancel'); g.ui.pop(this); this.onCancel(); }
      else if (this.value) { this.value = this.value.slice(0, -1); g.sound('uiTick'); }
    }
  }
  prompts(g) {
    // On a keyboard you just type, so the prompts are the keys that aren't letters.
    const p = g.inp.device === 'pad' ? [['confirm', 'Type'], ['rubout', 'Rub out']] : [['done', 'Done'], ['rubout', 'Rub out']];
    if (this.random) p.push(['random', 'Suggest']);
    if (this.onCancel) p.push(['back', 'Never mind']);
    return p;
  }
  draw(g, hud) {
    dim(hud);
    panel(hud, 60, 14, 360, 240, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 20, this.title, { align: 'center', color: 'ink', scale: 1 });
    panel(hud, 80, 30, 320, 22, { fill: 'sand', trim: 'orange' });
    const shown = this.value.length > 44 ? `…${this.value.slice(-44)}` : this.value;
    const w = textWidth(shown);
    drawText(hud, 88, 37, shown, { color: 'ink' });
    if (Math.floor(g.ctx.time * 2) % 2 === 0) hud.rect(89 + w, 36, 2, 9, 'plum');
    if (this.hint) drawText(hud, 240, 57, this.hint, { align: 'center', color: 'slate' });
    ROWS.forEach((row, y) => [...row].forEach((ch, x) => {
      const [rx, ry, rw, rh] = this.rect(x, y);
      const f = this.cy === y && this.cx === x;
      panel(hud, rx, ry, rw, rh, { fill: f ? 'sand' : 'white', trim: f ? 'orange' : 'mist' });
      drawText(hud, rx + rw / 2, ry + 7, ch === ' ' ? '_' : ch, { align: 'center', color: 'ink' });
    }));
    const by = BUTTON_Y;
    const f0 = this.cy === ROWS.length && this.cx === 0, f1 = this.cy === ROWS.length && this.cx === 1;
    panel(hud, 150, by, 80, 20, { fill: f0 ? 'sand' : 'white', trim: f0 ? 'orange' : 'mist' });
    drawText(hud, 190, by + 6, 'Rub out', { align: 'center', color: 'ink' });
    panel(hud, 250, by, 80, 20, { fill: f1 ? 'sand' : 'white', trim: f1 ? 'orange' : 'mist' });
    drawText(hud, 290, by + 6, 'Done', { align: 'center', color: 'ink' });
  }
}
export function* keyboardFlow(g, opts) {
  let result = null;
  g.ui.push(new Keyboard({ ...opts, onDone: (v) => { result = v; }, onCancel: opts.canCancel ? () => { result = ''; } : null }));
  while (result === null) yield;
  return result;
}
export const openKeyboard = (g, opts) => g.ui.push(new Keyboard(opts));
