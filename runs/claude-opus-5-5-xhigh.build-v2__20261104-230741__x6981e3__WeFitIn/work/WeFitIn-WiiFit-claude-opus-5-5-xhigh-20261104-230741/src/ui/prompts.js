// Prompts read [glyph] verb and follow the last device used.
import { PROMPTS } from '../core/actions.js';
import { drawGlyph, glyphWidth } from '../art/glyphs.js';
import { layout, PROMPT_Y } from './layout.js';
import { say, textWidth } from './font.js';

export function promptGlyphs(action, column) {
  const entry = PROMPTS[action];
  if (!entry) return [];
  const g = entry[column];
  if (g === null || g === undefined) return [];
  return Array.isArray(g) ? g : [g];
}

function promptWidth(glyphs, verb) {
  let w = 0;
  for (const g of glyphs) w += glyphWidth(g) + 1;
  return w + 3 + textWidth(verb);
}

/** Draw one prompt. Returns the x after it. */
export function drawPrompt(hud, device, x, y, action, verb) {
  const column = device.promptColumn();
  const glyphs = promptGlyphs(action, column);
  if (!glyphs.length) return x;
  layout.prompts.push(`${column}:${glyphs.join('+')}:${verb}`);
  layout.rec('prompt', x, y, promptWidth(glyphs, verb), 11);
  for (const g of glyphs) x += drawGlyph(hud, x, y, g) + 1;
  x += 3;
  return say(hud, x, y + 2, verb, { color: 'white', name: 'prompt-text' });
}

/** A row of prompts along the bottom of the screen, centred, in a soft strip. */
export function promptBar(hud, device, list, { y = null, align = 'center', strip = true } = {}) {
  const column = device.promptColumn();
  const items = list.filter(([action]) => promptGlyphs(action, column).length);
  if (!items.length) return;
  const gap = 12;
  let total = 0;
  for (const [action, verb] of items) total += promptWidth(promptGlyphs(action, column), verb) + gap;
  total -= gap;
  const Y = y ?? hud.height - PROMPT_Y;
  let x = align === 'left' ? 12 : Math.max(12, Math.round((hud.width - total) / 2));
  if (strip) hud.rect(Math.max(0, x - 5), Y - 3, Math.min(hud.width, total + 10), 17, 'navy');
  for (const [action, verb] of items) x = drawPrompt(hud, device, x, Y, action, verb) + gap;
}
