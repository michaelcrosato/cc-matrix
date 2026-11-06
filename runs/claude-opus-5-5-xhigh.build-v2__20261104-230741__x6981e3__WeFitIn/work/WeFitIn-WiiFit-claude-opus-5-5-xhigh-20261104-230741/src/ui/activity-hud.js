// A few bits every activity's HUD shares.
import { charsIn, say, sayCentered, sayRight, wrap } from './font.js';
import { bar, panel, SAFE } from './widgets.js';

export const wrapCard = (text, width, scale = 1) => wrap(text, charsIn(width, scale));

/** A row at the top of the screen: time left on the left, score on the right. */
export function topRow(hud, left, right, { y = SAFE } = {}) {
  if (left) { hud.rect(SAFE - 3, y - 2, left.length * 6 + 5, 12, 'navy'); say(hud, SAFE, y, left, { name: 'top-left' }); }
  if (right) { const x = hud.width - SAFE; hud.rect(x - right.length * 6 - 2, y - 2, right.length * 6 + 5, 12, 'navy'); sayRight(hud, x, y, right, { color: 'sand', name: 'top-right' }); }
}

export { bar, panel, say, sayCentered, sayRight, SAFE };
