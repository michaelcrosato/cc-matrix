// The Wobble Age chart: one line, seven points, and at the confession every point slides down by seven.
import { layout } from './layout.js';
import { line, panel } from './widgets.js';
import { say, sayCentered } from './font.js';

/** ages: numbers already as shown. slide: subtracted from each point, for the animation. */
export function drawAgeChart(hud, x, y, w, h, ages, { slide = 0, days = 7, min = 18, max = 102, title = 'Wobble Age', fill = 'white', labels = true } = {}) {
  layout.rec('chart', x, y, w, h);
  panel(hud, x, y, w, h, { fill, name: 'chart-panel' });
  const px = x + 24, py = y + 14, pw = w - 34, ph = h - 26;
  if (title) say(hud, x + 5, y + 3, title, { color: 'teal', shadow: false, name: 'chart-title' });
  for (const v of [30, 60, 90]) {
    const gy = py + ph - Math.round(((v - min) / (max - min)) * ph);
    hud.rect(px, gy, pw, 2, 'mist');
    say(hud, x + 5, gy - 4, String(v), { color: 'slate', shadow: false, name: 'chart-axis' });
  }
  const pts = ages.slice(-days).map((a, i) => {
    const v = a - slide;
    return { x: px + Math.round((i / Math.max(1, days - 1)) * pw), y: py + ph - Math.round(((Math.max(min, Math.min(max, v)) - min) / (max - min)) * ph), v };
  });
  for (let i = 1; i < pts.length; i++) line(hud, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, 'sky', 2);
  for (const p of pts) { hud.rect(p.x - 2, p.y - 2, 5, 5, 'red'); hud.rect(p.x - 1, p.y - 1, 3, 3, 'white'); }
  if (labels && pts.length) {
    const last = pts[pts.length - 1];
    sayCentered(hud, Math.min(last.x, x + w - 12), Math.max(py - 2, last.y - 13), String(Math.round(last.v)), { color: 'ink', shadow: false, name: 'chart-value' });
  }
}
