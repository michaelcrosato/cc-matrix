// Panels and small drawing helpers, all in art pixels on the HUD.
import { drawText, textWidth, wrap, LINE_H } from './font.js';
export { drawText, textWidth, wrap, LINE_H };

export function panel(hud, x, y, w, h, { fill = 'white', trim = 'sand', edge = 'ink' } = {}) {
  hud.rect(x + 1, y, w - 2, h, edge);
  hud.rect(x, y + 1, w, h - 2, edge);
  hud.rect(x + 1, y + 1, w - 2, h - 2, trim);
  hud.rect(x + 3, y + 3, w - 6, h - 6, fill);
}
export const dim = (hud, color = 'ink') => {
  // A dither curtain: every other pixel row and column, cheap and legible behind panels.
  hud.sprite(0, 0, DITHER_ROWS, { '#': color }, { shadow: false });
};
const DITHER_ROWS = [];
for (let y = 0; y < 270; y++) {
  let row = '';
  for (let x = 0; x < 480; x++) row += (x + y) % 2 === 0 ? '#' : '.';
  DITHER_ROWS.push(row);
}
export function button(hud, x, y, w, h, label, { focused = false, disabled = false, scale = 1, align = 'center' } = {}) {
  const fill = focused ? 'sand' : 'white';
  panel(hud, x, y, w, h, { fill, trim: focused ? 'orange' : 'mist' });
  const ty = y + Math.floor((h - 7 * scale) / 2);
  if (align === 'center') drawText(hud, x + Math.floor(w / 2), ty, label, { color: disabled ? 'mist' : 'ink', align: 'center', scale });
  else drawText(hud, x + 10, ty, label, { color: disabled ? 'mist' : 'ink', scale });
}
export function bar(hud, x, y, w, h, t, color = 'green', back = 'night') {
  hud.rect(x, y, w, h, back);
  hud.rect(x, y, Math.round(w * Math.max(0, Math.min(1, t))), h, color);
}
export function textBlock(hud, x, y, width, s, o = {}) {
  const lines = wrap(s, width, o.scale ?? 1);
  lines.forEach((l, i) => drawText(hud, x, y + i * (o.lineH ?? LINE_H), l, o));
  return lines.length;
}
export const inRect = (m, x, y, w, h) => m.x >= x && m.y >= y && m.x < x + w && m.y < y + h;
