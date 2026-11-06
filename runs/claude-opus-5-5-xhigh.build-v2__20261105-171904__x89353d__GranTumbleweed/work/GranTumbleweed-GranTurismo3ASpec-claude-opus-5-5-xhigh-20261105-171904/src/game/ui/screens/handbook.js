// The Handbook: pages, one topic each. Reachable from pause and from the Map's menu.
import { HANDBOOK } from '../../data/text.js';
import { drawGlyph, specFor, glyphWidth } from '../glyphs.js';
const CONTROLS = [['steer', 'STEER'], ['throttle', 'THROTTLE'], ['brake', 'BRAKE, REVERSE'], ['handbrake', 'HANDBRAKE'], ['shift', 'SHIFT UP, DOWN'], ['camera', 'CAMERA'], ['lookBack', 'LOOK BACK'], ['look', 'LOOK AROUND'], ['recover', 'RECOVER (HOLD 1 S)'], ['pause', 'PAUSE']];
export class HandbookScreen {
  constructor(app, o = {}) { this.id = 'handbook'; this.app = app; this.page = 0; this.o = o; }
  draw(ui) {
    const app = this.app, pages = HANDBOOK, p = pages[this.page], w = Math.min(ui.w - 30, 360), x = Math.round(ui.cx - w / 2), h = ui.h - 40;
    ui.panel(x, 8, w, h, { color: 'ink', border: 'slate' });
    ui.text(x + 8, 13, 'THE HANDBOOK', { color: 'slate' }); ui.text(x + w - 8, 13, `${this.page + 1}/${pages.length}`, { align: 'right', color: 'slate' });
    ui.text(ui.cx, 26, p.title, { align: 'center', scale: 2 > w / 260 ? 1 : 1, color: 'sand' });
    if (p.device) {
      const dev = app.actions.lastDevice, xbox = app.options.glyphs === 'xbox', hud = ui.hud;
      CONTROLS.forEach(([a, label], i) => { const spec = specFor(a, dev), gw = glyphWidth(hud, spec, xbox), y = 42 + i * 15; drawGlyph(hud, x + w / 2 - 10 - gw, y, spec, xbox); ui.text(x + w / 2, y + 2, label); });
    } else ui.lines(x + 12, 46, p.lines, { gap: 13 });
    ui.button('prev', x + 8, ui.h - 50, 70, 13, 'PREVIOUS', { confirm: () => { this.page = (this.page - 1 + pages.length) % pages.length; }, quiet: false });
    ui.button('next', x + w - 78, ui.h - 50, 70, 13, 'NEXT', { confirm: () => { this.page = (this.page + 1) % pages.length; } });
    if (!this.focus) this.focus = 'next';
    if (app.actions.pressed('tabL')) this.page = (this.page - 1 + pages.length) % pages.length;
    if (app.actions.pressed('tabR')) this.page = (this.page + 1) % pages.length;
    ui.prompts([['confirm', 'TURN PAGE'], ['back', 'BACK']]);
  }
}
