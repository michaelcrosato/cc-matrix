// The pattern studio: big 16×16 grid, palette strip, live preview on you. Pad or mouse.
import { panel, drawText, inRect, dim } from '../draw.js';
import { PATTERN_COLORS, blankPattern } from '../../systems/patterns.js';
import { Menu } from '../ui.js';
import { addItem } from '../../systems/economy.js';

const CELL = 10, X0 = 80, Y0 = 34;
class Studio {
  constructor(g, onClose) {
    this.id = 'pattern';
    this.onClose = onClose;
    this.slot = 0;
    const w = g.world;
    this.data = (w.patterns[this.slot] ?? blankPattern()).slice();
    this.cx = 8; this.cy = 8;
    this.color = 2;
    this.mode = 'pen'; // pen, fill
    this.mirror = false;
    this.undoStack = [];
    this.dirty = false;
  }
  labels() { return ['pen', 'fill', 'mirror', 'undo', 'save', 'wear']; }
  focusIndex() { return this.cy * 16 + this.cx; }
  push() { this.undoStack.push(this.data.slice()); if (this.undoStack.length > 30) this.undoStack.shift(); }
  paint(g, x, y) {
    if (this.data[y * 16 + x] === this.color && (!this.mirror || this.data[y * 16 + 15 - x] === this.color)) return;
    this.push();
    this.data[y * 16 + x] = this.color;
    if (this.mirror) this.data[y * 16 + 15 - x] = this.color;
    this.dirty = true;
    g.sound('uiTick');
    g.events.emit('patternEdit', {});
  }
  fill(g, x, y) {
    const from = this.data[y * 16 + x];
    if (from === this.color) return;
    this.push();
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px > 15 || py > 15 || this.data[py * 16 + px] !== from) continue;
      this.data[py * 16 + px] = this.color;
      if (this.mirror) this.data[py * 16 + 15 - px] = this.color;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
    this.dirty = true;
    g.sound('uiConfirm');
  }
  save(g) {
    const w = g.world;
    w.patterns[this.slot] = this.data.slice();
    w.player.pattern = this.slot;
    this.dirty = false;
    g.sound('stamp');
    g.events.emit('patternSaved', { slot: this.slot });
  }
  wear(g) {
    const w = g.world;
    this.save(g);
    w.player.look.pattern = this.slot;
    g.player.applyLook();
    g.events.emit('patternWorn', { slot: this.slot });
    g.ui.toastMsg('You are wearing your own pattern. It is very you.');
  }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.nav.left) { this.cx = (this.cx + 15) % 16; }
    if (inp.nav.right) { this.cx = (this.cx + 1) % 16; }
    if (inp.nav.up) { this.cy = (this.cy + 15) % 16; }
    if (inp.nav.down) { this.cy = (this.cy + 1) % 16; }
    const input = g.ctx.input;
    if (inp.tabPrev) { this.color = (this.color + 15) % 16; g.sound('uiTab'); }
    if (inp.tabNext) { this.color = (this.color + 1) % 16; g.sound('uiTab'); }
    if (inp.confirm) { if (this.mode === 'fill') this.fill(g, this.cx, this.cy); else this.paint(g, this.cx, this.cy); }
    if (input.isDown('PadCross') && this.mode === 'pen') this.paint(g, this.cx, this.cy);
    if (inp.square || input.wasPressed('KeyF')) { this.mode = this.mode === 'fill' ? 'pen' : 'fill'; g.sound('uiTab'); }
    if (inp.triangle || input.wasPressed('KeyM')) { this.mirror = !this.mirror; g.sound('uiTab'); }
    if (input.wasPressed('PadL2', 'KeyZ')) this.undo(g);
    if (input.wasPressed('PadR2', 'KeyV')) this.save(g);
    if (input.wasPressed('PadOptions', 'KeyC')) this.wear(g);
    // Mouse
    if (m.x >= X0 && m.x < X0 + 160 && m.y >= Y0 && m.y < Y0 + 160) {
      const x = Math.floor((m.x - X0) / CELL), y = Math.floor((m.y - Y0) / CELL);
      if (m.moved) { this.cx = x; this.cy = y; }
      if (m.click && this.mode === 'fill') this.fill(g, x, y);
      else if (m.down && this.mode === 'pen') this.paint(g, x, y);
      this.cx = x; this.cy = y;
    }
    for (let i = 0; i < 16; i++) { const [px, py, pw, ph] = this.swatch(i); if (m.click && inRect(m, px, py, pw, ph)) { this.color = i; g.sound('uiTab'); } }
    const b = this.buttons();
    for (const [name, x, y, w, h, fn] of b) if (m.click && inRect(m, x, y, w, h)) fn(g);
    // Slots
    if (input.wasPressed('Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8')) {
      for (let d = 1; d <= 8; d++) if (input.wasPressed(`Digit${d}`)) this.setSlot(g, d - 1);
    }
    if (inp.back || m.rclick) {
      if (this.dirty) this.save(g);
      g.sound('uiCancel');
      g.ui.pop(this);
      this.onClose?.();
    }
  }
  kit(g) {
    this.save(g);
    if (addItem(g, 'patternKit', { slot: this.slot }) < 0) { g.ui.toastMsg('Your pockets are full.'); return; }
    g.sound('pickUp');
    g.ui.toastMsg('A Pattern Kit, in your pockets. Lay it on the ground, or nail it to a post.');
  }
  setSlot(g, s) { this.slot = s; this.data = (g.world.patterns[s] ?? blankPattern()).slice(); this.undoStack = []; g.sound('uiTab'); }
  undo(g) { if (this.undoStack.length) { this.data = this.undoStack.pop(); g.sound('uiTick'); } }
  swatch(i) { return [X0 + 170 + (i % 4) * 22, Y0 + Math.floor(i / 4) * 22, 20, 20]; }
  buttons() {
    return [
      ['Pen', 340, 130, 60, 18, () => { this.mode = 'pen'; }], ['Fill', 340, 150, 60, 18, () => { this.mode = 'fill'; }],
      ['Mirror', 340, 170, 60, 18, () => { this.mirror = !this.mirror; }], ['Undo', 250, 130, 60, 18, (g) => this.undo(g)],
      ['Save', 250, 150, 60, 18, (g) => this.save(g)], ['Wear', 250, 170, 60, 18, (g) => this.wear(g)],
      ['Kit', 250, 190, 60, 18, (g) => this.kit(g)],
    ];
  }
  prompts() { return [['confirm', 'Paint'], ['fill', this.mode === 'fill' ? 'To pen' : 'To fill'], ['mirror', this.mirror ? 'Mirror off' : 'Mirror on'], ['back', 'Save & leave']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 66, 18, 348, 196, { fill: 'white', trim: 'sand' });
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) hud.rect(X0 + x * CELL, Y0 + y * CELL, CELL - 1, CELL - 1, PATTERN_COLORS[this.data[y * 16 + x]]);
    const cx = X0 + this.cx * CELL, cy = Y0 + this.cy * CELL;
    hud.rect(cx - 1, cy - 1, CELL + 1, 1, 'white'); hud.rect(cx - 1, cy + CELL - 1, CELL + 1, 1, 'white');
    hud.rect(cx - 1, cy - 1, 1, CELL + 1, 'white'); hud.rect(cx + CELL - 1, cy - 1, 1, CELL + 1, 'white');
    for (let i = 0; i < 16; i++) { const [px, py, pw, ph] = this.swatch(i); hud.rect(px - 1, py - 1, pw + 2, ph + 2, i === this.color ? 'ink' : 'mist'); hud.rect(px, py, pw, ph, PATTERN_COLORS[i]); }
    for (const [name, x, y, w, h] of this.buttons()) {
      const on = (name === 'Pen' && this.mode === 'pen') || (name === 'Fill' && this.mode === 'fill') || (name === 'Mirror' && this.mirror);
      panel(hud, x, y, w, h, { fill: on ? 'sand' : 'white', trim: on ? 'orange' : 'mist' });
      drawText(hud, x + w / 2, y + 5, name, { align: 'center', color: 'ink' });
    }
    drawText(hud, 325, 192, `Slot ${this.slot + 1} of 8`, { align: 'center', color: 'slate' });
    // Live preview: the pattern, at wearable size
    drawText(hud, 80, 22, `Sixteen by sixteen. Make me cry.`, { color: 'slate' });
  }
}
export const patternStudio = (g, onClose) => new Studio(g, onClose);
export { Menu };
