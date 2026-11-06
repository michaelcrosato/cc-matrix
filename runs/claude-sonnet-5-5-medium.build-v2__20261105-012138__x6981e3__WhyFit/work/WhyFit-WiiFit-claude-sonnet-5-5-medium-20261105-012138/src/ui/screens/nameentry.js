// Name entry: letter grid (stick, d-pad, click) plus direct typing, 8 characters max.
import { say } from '../font.js';
import { panel, inRect, layoutLog } from '../widgets.js';
import { drawPrompts } from '../prompts.js';

const UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), LOW = 'abcdefghijklmnopqrstuvwxyz'.split('');
export class NameEntry {
  id = 'name'; blocks = true;
  constructor(app, onDone, initial = '') {
    this.app = app; this.onDone = onDone; this.name = initial.slice(0, 8); this.lower = false; this.cur = 0; this.rects = [];
    this.kd = (e) => {
      if (this.scene?.stack[this.scene.stack.length - 1] !== this) return;
      if (e.key.length === 1 && /[A-Za-z\- ]/.test(e.key)) { this.add(e.key); e.preventDefault?.(); }
      else if (e.key === 'Backspace') { this.del(); }
      else if (e.key === 'Enter' && this.name.length) { this.done(); }
    };
    if (typeof window !== 'undefined') window.addEventListener('keydown', this.kd);
  }
  onClose() { if (typeof window !== 'undefined') window.removeEventListener('keydown', this.kd); }
  get keys() { return [...(this.lower ? LOW : UP), '-', ' ', 'Aa', 'Del', 'Done']; }
  add(ch) { if (this.name.length < 8) { this.name += ch; this.app.sfx('move', { volume: 0.6 }); } }
  del() { this.name = this.name.slice(0, -1); this.app.sfx('back', { volume: 0.5 }); }
  done() { if (!this.name.trim()) { this.app.sfx('deny'); return; } this.app.sfx('confirm'); this.scene.pop(); this.onDone?.(this.name.trim()); }
  press(i) {
    const k = this.keys[i];
    if (k === 'Aa') this.lower = !this.lower; else if (k === 'Del') this.del(); else if (k === 'Done') this.done(); else this.add(k);
  }
  update(nav) {
    const cols = 9, n = this.keys.length;
    if (nav.left) this.cur = (this.cur + n - 1) % n;
    if (nav.right) this.cur = (this.cur + 1) % n;
    if (nav.up) this.cur = (this.cur - cols + n) % n;
    if (nav.down) this.cur = (this.cur + cols) % n;
    if (nav.moved || nav.click) this.rects.forEach((r, i) => { if (r && inRect(nav, r)) { if (nav.moved) this.cur = i; if (nav.click) { this.cur = i; this.press(i); } } });
    if (nav.confirm) this.press(this.cur);
    if (nav.back) { if (this.name.length) this.del(); else { this.scene.pop(); this.onDone?.(null); } }
    if (nav.triangle) this.lower = !this.lower;
  }
  draw(hud) {
    const w = 240, h = 150, x = Math.floor((hud.width - w) / 2), y = Math.floor((hud.height - h) / 2) - 10;
    panel(hud, x, y, w, h);
    say(hud, x + 10, y + 8, 'Your name', { color: 'teal', shadow: false, scale: 2 });
    hud.rect(x + 10, y + 28, w - 20, 16, 'mist');
    say(hud, x + 14, y + 32, this.name + (Math.floor(this.t * 2) % 2 ? '_' : ' '), { color: 'ink', shadow: false, scale: 1 });
    this.rects = [];
    this.keys.forEach((k, i) => {
      const cx = x + 12 + (i % 9) * 24, cy = y + 52 + Math.floor(i / 9) * 22;
      const r = { x: cx, y: cy, w: k.length > 2 ? 34 : 20, h: 18 };
      if (k.length > 2 || i >= 26) r.w = k === 'Done' ? 40 : 24;
      this.rects[i] = r;
      hud.rect(r.x, r.y, r.w, r.h, i === this.cur ? 'teal' : 'mist');
      say(hud, r.x + Math.floor(r.w / 2), r.y + 5, k === ' ' ? 'sp' : k, { anchor: 'c', color: i === this.cur ? 'white' : 'ink', shadow: false });
    });
    layoutLog.add('name-grid', x, y, w, h);
    drawPrompts(this.app, hud, [['confirm', 'Pick'], ['back', 'Delete']]);
  }
}
