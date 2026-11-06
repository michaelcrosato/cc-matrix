// Pockets: 5×3 big cells, the selected item's name and one sentence, actions on press.
import { panel, drawText, textBlock, inRect, dim, textWidth } from '../draw.js';
import { drawIcon } from '../../art/icons.js';
import { ITEMS } from '../../data/items.js';
import { Menu } from '../ui.js';
import { pocketActions } from '../../systems/pocketActions.js';

const CELL = 40, COLS = 5, ROWS = 3;
const X0 = 240 - (COLS * CELL) / 2, Y0 = 44;
class Grid {
  constructor({ id, title, onPick, onBack, filter, actions = true }) {
    this.id = id;
    this.title = title;
    this.focus = 0;
    this.onPick = onPick;
    this.onBack = onBack;
    this.filter = filter;
    this.actions = actions;
  }
  labels() { return this.g.world.player.pockets.map((s) => (s ? ITEMS[s.id]?.name : '')); }
  focusIndex() { return this.focus; }
  rect(i) { return [X0 + (i % COLS) * CELL, Y0 + Math.floor(i / COLS) * CELL, CELL - 2, CELL - 2]; }
  update(g, inp) {
    if (inp.nav.left) { this.focus = (this.focus + 14) % 15; g.sound('uiTick'); }
    if (inp.nav.right) { this.focus = (this.focus + 1) % 15; g.sound('uiTick'); }
    if (inp.nav.up) { this.focus = (this.focus + 10) % 15; g.sound('uiTick'); }
    if (inp.nav.down) { this.focus = (this.focus + 5) % 15; g.sound('uiTick'); }
    const m = inp.mouse;
    let clicked = false;
    for (let i = 0; i < 15; i++) if (inRect(m, ...this.rect(i))) { if (m.moved) this.focus = i; if (m.click) { this.focus = i; clicked = true; } }
    if (inp.confirm || clicked) this.press(g);
    else if (inp.back || inp.pockets || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); this.onBack?.(); }
  }
  press(g) {
    const slot = g.world.player.pockets[this.focus];
    if (!slot) { g.sound('uiError'); return; }
    if (this.filter && !this.filter(slot, this.focus)) { g.sound('uiError'); return; }
    g.sound('uiConfirm');
    if (this.onPick) { g.ui.pop(this); this.onPick(this.focus, slot); return; }
    const list = pocketActions(g, this.focus, slot);
    const it = ITEMS[slot.id];
    const menu = new Menu({ id: 'pocketAction', title: null, items: list.concat([{ label: 'Never mind', action: (gg, m) => gg.ui.pop(m) }]), x: 330, y: 150 - list.length * 10, w: 130, itemH: 18, gap: 2, dim: false, dimBack: false });
    g.ui.push(menu);
  }
  prompts() { return this.onPick ? [['confirm', 'Choose'], ['back', 'Back']] : [['confirm', 'Use'], ['back', 'Close']]; }
  draw(g, hud) {
    dim(hud);
    const w = g.world.player;
    panel(hud, X0 - 12, Y0 - 28, COLS * CELL + 22, ROWS * CELL + 88, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, Y0 - 21, this.title, { align: 'center', scale: 2, color: 'ink' });
    for (let i = 0; i < 15; i++) {
      const [x, y, cw, ch] = this.rect(i);
      const slot = w.pockets[i];
      const focused = i === this.focus;
      const allowed = !this.filter || !slot || this.filter(slot, i);
      panel(hud, x, y, cw, ch, { fill: focused ? 'sand' : 'white', trim: focused ? 'orange' : 'mist' });
      if (slot) {
        const it = ITEMS[slot.id];
        drawIcon(hud, x + 3, y + 3, it?.icon ?? 'question', allowed ? it?.iconColors : GREY, 2);
      }
    }
    const s = w.pockets[this.focus];
    if (s) {
      const it = ITEMS[s.id];
      drawText(hud, 240, Y0 + ROWS * CELL + 3, it?.name ?? s.id, { align: 'center', color: 'ink' });
      textBlock(hud, X0 - 4, Y0 + ROWS * CELL + 15, COLS * CELL + 8, it?.line ?? '', { color: 'slate' });
    } else drawText(hud, 240, Y0 + ROWS * CELL + 3, 'An empty pocket.', { align: 'center', color: 'slate' });
    this.extraDraw?.(g, hud);
  }
}
const GREY = { o: 'mist', x: 'mist', w: 'white', '#': 'slate' };
export const pocketsScreen = () => new Grid({ id: 'pockets', title: 'Pockets' });
export const pocketsPicker = (g, { title, filter, onPick, onCancel, extraDraw }) => { const gr = new Grid({ id: 'pocketPick', title, filter, onPick, onBack: onCancel }); gr.extraDraw = extraDraw; return gr; };
export { textWidth };
