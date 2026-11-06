// [glyph] verb prompts. They follow the last device used.
import { drawGlyph, glyphsFor } from '../art/glyphs.js';
import { App } from '../app.js';
import { say, textWidth } from './font.js';
import { note } from './widgets.js';

export function promptWidth(action, verb) {
  const gs = glyphsFor(action, App.device.last);
  let w = 0;
  for (const g of gs) w += (g.startsWith('key:') ? Math.max(11, textWidth(g.slice(4)) + 6) : g.startsWith('mouse') ? 9 : g === 'stick' || ['cross', 'circle', 'square', 'triangle'].includes(g) ? 11 : Math.max(11, textWidth(App.glyphSet() === 'xb' && g === 'Options' ? 'Menu' : g) + 6)) + 2;
  return w + 2 + textWidth(verb);
}
export function prompt(hud, x, y, action, verb, o = {}) {
  const gs = glyphsFor(action, App.device.last);
  const set = App.glyphSet();
  let cx = x; const start = x;
  for (const g of gs) cx += drawGlyph(hud, cx, y, g, set) + 2;
  App.lastPrompts[action] = `${App.device.last === 'pad' ? `pad-${set}` : App.device.last}:${gs.join('+')}`;
  const end = say(hud, cx + 2, y + 2, verb, { color: o.color ?? 'white', shadow: o.shadow ?? 'ink' });
  note(start, y, end - start, 11, 'prompt');
  return end;
}
export function promptBar(hud, list, y = null) {
  const h = hud.height, by = y ?? h - 16;
  let widths = list.map(([a, v]) => promptWidth(a, v));
  // Narrow windows keep the most important prompts, in order.
  while (list.length > 1 && widths.reduce((a, b) => a + b + 10, -10) > hud.width - 8) { list = list.slice(0, -1); widths = widths.slice(0, -1); }
  const total = widths.reduce((a, b) => a + b + 10, -10);
  hud.rect(0, by - 2, hud.width, 16, 'ink');
  let x = Math.max(4, (hud.width - total) / 2);
  list.forEach(([a, v], i) => { prompt(hud, x, by, a, v); x += widths[i] + 10; });
  note(Math.max(4, (hud.width - total) / 2), by, total, 11, 'promptbar');
}
