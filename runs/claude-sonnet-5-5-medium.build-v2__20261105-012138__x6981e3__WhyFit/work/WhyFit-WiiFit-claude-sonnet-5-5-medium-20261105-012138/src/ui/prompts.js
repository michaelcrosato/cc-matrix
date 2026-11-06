// Bottom prompt bar: "[glyph] verb" following the last device used.
import { promptRow, promptWidth } from '../art/glyphs.js';
import { layoutLog } from './widgets.js';

export function drawPrompts(app, hud, items, { y = null, x = null, align = 'center' } = {}) {
  const set = app.device.glyphSet;
  const w = promptWidth(set, items);
  const yy = y ?? hud.height - 22;
  const xx = x ?? (align === 'center' ? Math.floor((hud.width - w) / 2) : 12);
  hud.rect(xx - 6, yy - 3, w + 8, 18, 'night');
  promptRow(hud, set, items, xx, yy);
  layoutLog.add('prompts', xx - 6, yy - 3, w + 8, 18);
  app.promptLog = { set, items: items.map((i) => i[0]) };
}
