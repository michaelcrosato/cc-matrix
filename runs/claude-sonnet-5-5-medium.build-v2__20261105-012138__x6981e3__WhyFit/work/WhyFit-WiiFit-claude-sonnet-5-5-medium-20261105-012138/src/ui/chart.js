// The Wobble Age line chart: 7 points, with a twist: at the confession every point slides down 7.
import { disc, line, panel } from './widgets.js';
import { say } from './font.js';
export function drawChart(hud, x, y, w, h, ages, { slide = 0, days = 7, label = true } = {}) {
  panel(hud, x, y, w, h);
  const lo = 10, hi = 100, px = (i) => x + 24 + (i / (days - 1)) * (w - 40), py = (a) => y + 12 + (1 - (a - lo) / (hi - lo)) * (h - 32);
  for (const a of [20, 40, 60, 80]) { hud.rect(x + 22, Math.round(py(a)), w - 30, 1, 'mist'); say(hud, x + 4, Math.round(py(a)) - 3, String(a), { color: 'slate', shadow: false }); }
  const pts = ages.map((a, i) => [px(i), py(a - 7 * slide)]);
  for (let i = 1; i < pts.length; i++) line(hud, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 'red', 2);
  pts.forEach(([X, Y], i) => { disc(hud, Math.round(X), Math.round(Y), 3, 'navy'); disc(hud, Math.round(X), Math.round(Y), 2, i === pts.length - 1 ? 'sand' : 'white'); });
  if (label) for (let i = 0; i < days; i++) say(hud, Math.round(px(i)), y + h - 12, String(i + 1), { anchor: 'c', color: 'slate', shadow: false });
  if (pts.length) { const [X, Y] = pts[pts.length - 1]; say(hud, Math.round(X), Math.round(Y) - 12, String(Math.round(ages[ages.length - 1] - 7 * slide)), { anchor: 'c', color: 'ink', shadow: false }); }
}
