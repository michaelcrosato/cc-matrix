// The catalogue: one big item card at a time, by category. Arrives by mail next day.
import { panel, drawText, inRect, dim, textBlock } from '../draw.js';
import { drawIcon } from '../../art/icons.js';
import { ITEMS } from '../../data/items.js';
import { buyPrice, spend } from '../../systems/economy.js';
import { sendMail } from '../../systems/mail.js';

const CATS = [['furniture', 'Furniture'], ['clothes', 'Clothes'], ['hat', 'Hats'], ['glasses', 'Glasses'], ['umbrella', 'Umbrellas'], ['wall', 'Wallpaper'], ['floor', 'Floors']];
class Catalogue {
  constructor(g, onClose) { this.id = 'catalogue'; this.onClose = onClose; this.cat = 0; this.i = 0; }
  list(g) { return Object.keys(g.world.player.catalog).filter((id) => ITEMS[id]?.cat === CATS[this.cat][0]); }
  labels(g) { return CATS.map((c) => c[1]); }
  focusIndex() { return this.cat * 100 + this.i; }
  update(g, inp) {
    const m = inp.mouse;
    if (inp.tabPrev) { this.cat = (this.cat + CATS.length - 1) % CATS.length; this.i = 0; g.sound('uiTab'); }
    if (inp.tabNext) { this.cat = (this.cat + 1) % CATS.length; this.i = 0; g.sound('uiTab'); }
    const list = this.list(g);
    if (list.length) {
      if (inp.nav.right || inp.nav.down) { this.i = (this.i + 1) % list.length; g.sound('uiTick'); }
      if (inp.nav.left || inp.nav.up) { this.i = (this.i + list.length - 1) % list.length; g.sound('uiTick'); }
    }
    if (m.click && inRect(m, 100, 70, 24, 24)) { this.i = (this.i + list.length - 1) % Math.max(1, list.length); g.sound('uiTick'); }
    if (m.click && inRect(m, 356, 70, 24, 24)) { this.i = (this.i + 1) % Math.max(1, list.length); g.sound('uiTick'); }
    if ((inp.confirm || (m.click && inRect(m, 180, 190, 120, 22))) && list.length) {
      const id = list[this.i];
      const price = buyPrice(id);
      if (g.world.player.beans < price) { g.sound('uiError'); g.ui.toastMsg('Not enough beans. The book says nothing, but it notices.'); return; }
      spend(g, price);
      sendMail(g, { from: 'clementine', body: `Dear {player},\nYour order. The bee signed for it.\nClementine`, gift: id });
      g.sound('stamp');
      g.ui.toastMsg('Ordered. It comes by post tomorrow.');
      g.events.emit('ordered', { id, price });
      return;
    }
    if (inp.back || m.rclick) { g.sound('uiCancel'); g.ui.pop(this); this.onClose?.(); }
  }
  prompts() { return [['confirm', 'Order'], ['tabs', 'Category'], ['back', 'Close']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 90, 20, 300, 212, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 28, CATS[this.cat][1], { align: 'center', color: 'ink', scale: 2 });
    const list = this.list(g);
    if (!list.length) { textBlock(hud, 120, 100, 240, "Nothing here yet. Everything you've ever owned ends up in this book. So far, this hasn't come up.", { color: 'slate' }); return; }
    const id = list[this.i];
    const it = ITEMS[id];
    panel(hud, 100, 70, 24, 24, { fill: 'white', trim: 'mist' }); drawText(hud, 112, 78, '<', { align: 'center', color: 'ink' });
    panel(hud, 356, 70, 24, 24, { fill: 'white', trim: 'mist' }); drawText(hud, 368, 78, '>', { align: 'center', color: 'ink' });
    panel(hud, 192, 54, 96, 72, { fill: 'white', trim: 'mist' });
    drawIcon(hud, 216, 66, it.icon, it.iconColors, 3);
    drawText(hud, 240, 134, it.name, { align: 'center', color: 'ink' });
    drawText(hud, 240, 148, `${buyPrice(id).toLocaleString('en-US')} beans`, { align: 'center', color: 'plum' });
    if (it.line) textBlock(hud, 110, 162, 260, it.line, { color: 'slate' });
    panel(hud, 180, 204, 120, 22, { fill: 'sand', trim: 'orange' });
    drawText(hud, 240, 211, 'Order it', { align: 'center', color: 'ink' });
    drawText(hud, 240, 192, `${this.i + 1} of ${list.length}`, { align: 'center', color: 'slate' });
  }
}
export const catalogueScreen = (g, onClose) => new Catalogue(g, onClose);
