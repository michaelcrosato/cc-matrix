// Ounce's small dial portrait, with a needle for her mood.
import { disc, line } from '../ui/widgets.js';

const MOOD_ANGLE = { neutral: 0, pleased: 0.45, smug: 0.75, droop: -1.15, alarm: 1.4, concern: -0.42, spin: 0 };

export function drawOuncePortrait(hud, x, y, r, mood = 'neutral', t = 0) {
  disc(hud, x, y, r + 2, 'slate');
  disc(hud, x, y, r, 'white');
  for (const a of [-1, -0.5, 0, 0.5, 1]) {
    hud.rect(Math.round(x + Math.sin(a) * (r - 2)), Math.round(y - Math.cos(a) * (r - 2)), 1, 1, 'mist');
  }
  hud.rect(x - 4, y - 3, 2, 3, 'ink');
  hud.rect(x + 3, y - 3, 2, 3, 'ink');
  const a = mood === 'spin' ? t * 9 : (MOOD_ANGLE[mood] ?? 0) + Math.sin(t * 5) * 0.03;
  line(hud, x, y + 1, x + Math.sin(a) * (r - 3), y + 1 - Math.cos(a) * (r - 3), 'red', 2);
  disc(hud, x, y + 1, 1, 'red');
}
