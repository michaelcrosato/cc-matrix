// Compare a painting with the catalogue print: a missing star, an extra earring.
import { panel, drawText, dim, inRect } from '../draw.js';
import { ITEMS } from '../../data/items.js';
import { ART } from '../../data/art.js';
import { paintingSprite } from '../../art/paintingSprites.js';

class Compare {
  constructor(g, stock, onClose) { this.id = 'compare'; this.stock = stock; this.onClose = onClose; this.t = 0; }
  update(g, inp, dt) { this.t += dt; if (inp.back || inp.confirm || inp.mouse.click || inp.mouse.rclick) { g.sound('uiCancel'); g.ui.pop(this); this.onClose?.(); } }
  currentText() { return this.stock.id; }
  prompts() { return [['back', 'Close']]; }
  draw(g, hud) {
    dim(hud);
    panel(hud, 40, 30, 400, 190, { fill: 'white', trim: 'sand' });
    const it = ITEMS[this.stock.id];
    const genuine = ART.find((a) => a.id === (it.of ?? it.id));
    drawText(hud, 240, 38, genuine.name, { align: 'center', color: 'ink' });
    drawText(hud, 140, 54, 'Catalogue print', { align: 'center', color: 'slate' });
    drawText(hud, 340, 54, 'On the easel', { align: 'center', color: 'slate' });
    const left = paintingSprite(genuine.id);
    const right = paintingSprite(this.stock.id);
    hud.sprite(140 - 88, 66, left.rows, left.colors, { shadow: false, scale: 1 });
    hud.sprite(340 - 88, 66, right.rows, right.colors, { shadow: false, scale: 1 });
    drawText(hud, 240, 204, 'Look closely. Magda is pretending not to watch.', { align: 'center', color: 'plum' });
  }
}
export const compareScreen = (g, stock, onClose) => new Compare(g, stock, onClose);
export { inRect };
