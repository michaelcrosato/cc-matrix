import { App } from '../../app.js';
import { BACK, TAB_LEFT, TAB_RIGHT, MENU_LEFT, MENU_RIGHT } from '../../core/actions.js';
import { HOW_TO } from '../../data/howto.js';
import { promptBar } from '../prompts.js';
import { sayCentered } from '../font.js';
import { heading, panel, SAFE } from '../widgets.js';
import { dim, wrapTo } from './common.js';

/** How to play: one idea per page. */
export class HowToScreen {
  name = 'howto'; i = 0;
  update(ctx) {
    const { input } = ctx;
    const n = HOW_TO.length;
    if (input.wasPressed(...TAB_RIGHT, ...MENU_RIGHT) || input.wasPressed('MouseLeft') || input.wheel > 0) { this.i = (this.i + 1) % n; App.sfx('menuMove'); }
    if (input.wasPressed(...TAB_LEFT, ...MENU_LEFT) || input.wheel < 0) { this.i = (this.i - 1 + n) % n; App.sfx('menuMove'); }
    if (input.wasPressed(...BACK) || input.wasPressed('MouseRight') || input.wasPressed('PadCross', 'Enter')) App.stack.pop(this);
  }
  draw(ctx) {
    const { hud } = ctx;
    dim(hud);
    const p = HOW_TO[this.i];
    heading(hud, p.title);
    const w = Math.min(hud.width - SAFE * 2, 340);
    const rows = p.lines.flatMap((l) => wrapTo(l, w - 16));
    const y = 60;
    panel(hud, Math.round((hud.width - w) / 2), y, w, rows.length * 13 + 14, { fill: 'white', name: 'howto' });
    rows.forEach((l, k) => sayCentered(hud, hud.width / 2, y + 7 + k * 13, l, { color: 'ink', shadow: false, name: 'howto-text' }));
    sayCentered(hud, hud.width / 2, y + rows.length * 13 + 22, `${this.i + 1} / ${HOW_TO.length}`, { color: 'sand', name: 'howto-page' });
    promptBar(hud, App.device, [['tabs', 'Page'], ['back', 'Back']]);
  }
}
