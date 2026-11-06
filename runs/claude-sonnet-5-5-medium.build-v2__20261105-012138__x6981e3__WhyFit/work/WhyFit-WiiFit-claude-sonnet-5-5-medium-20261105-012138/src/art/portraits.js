// Ounce's dial portrait in HUD pixels. The needle is its eyebrow and shows mood.
import { disc, ring, line } from '../ui/widgets.js';
export const MOODS = { neutral: 0, pleased: 40, whip: 70, droop: -75, spin: 0, worried: -35, smug: 25 };
export function needleAngle(mood, t) { return mood === 'spin' ? (t * 480) % 360 : (MOODS[mood] ?? 0) + Math.sin(t * 2) * 3; }
/** size = diameter in art px */
export function drawOunce(hud, x, y, size = 32, mood = 'neutral', t = 0) {
  const r = Math.floor(size / 2), cx = x + r, cy = y + r;
  disc(hud, cx, cy, r, 'slate'); disc(hud, cx, cy, r - 2, 'white');
  for (let a = -60; a <= 60; a += 30) { const rad = a * Math.PI / 180; hud.rect(Math.round(cx + Math.sin(rad) * (r - 4)) - 1, Math.round(cy - Math.cos(rad) * (r - 4)) - 1, 2, 2, 'mist'); }
  const ex = Math.max(2, Math.floor(r * 0.28));
  hud.rect(cx - ex - 1, cy - 2, 2, 4, 'ink'); hud.rect(cx + ex - 1, cy - 2, 2, 4, 'ink');
  const ang = needleAngle(mood, t) * Math.PI / 180;
  const len = r * 0.8;
  line(hud, cx, cy + 1, cx + Math.sin(ang) * len, cy + 1 - Math.cos(ang) * len, 'red', 2);
  disc(hud, cx, cy + 1, 2, 'red');
}
