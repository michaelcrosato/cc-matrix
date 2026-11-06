// Pixel drawing helpers for the HUD. Everything records its rect, so a test can assert it fits.
import { say, textWidth } from './font.js';

export const rects = { list: [], on: true };
export const note = (x, y, w, h, tag = '') => { if (rects.on) rects.list.push({ x, y, w, h, tag }); };
export const clearRects = () => { rects.list.length = 0; };

const cache = new Map();
export function discRows(r, inner = -1) {
  const key = `${r}|${inner}`; let rows = cache.get(key);
  if (rows) return rows;
  rows = []; const n = r * 2 + 1;
  for (let j = 0; j < n; j++) {
    let s = '';
    for (let i = 0; i < n; i++) { const d = Math.hypot(i - r, j - r); s += d <= r + 0.3 && (inner < 0 || d >= inner - 0.3) ? 'o' : '.'; }
    rows.push(s);
  }
  cache.set(key, rows); return rows;
}
export const disc = (hud, cx, cy, r, color) => hud.sprite(Math.round(cx - r), Math.round(cy - r), discRows(Math.round(r)), { o: color }, { shadow: false });
export const ring = (hud, cx, cy, r, color, th = 2) => hud.sprite(Math.round(cx - r), Math.round(cy - r), discRows(Math.round(r), Math.round(r - th + 1)), { o: color }, { shadow: false });
export function line(hud, x0, y0, x1, y1, color, th = 2) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) hud.rect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), th, th, color);
}
export function panel(hud, x, y, w, h, fill = 'white', edge = 'mist') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  hud.rect(x + 2, y, w - 4, h, edge); hud.rect(x, y + 2, w, h - 4, edge); hud.rect(x + 1, y + 1, w - 2, h - 2, edge);
  hud.rect(x + 2, y + 2, w - 4, h - 4, fill);
  note(x, y, w, h, 'panel');
}
export function bar(hud, x, y, w, h, frac, fill = 'cyan', back = 'night') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w);
  hud.rect(x, y, w, h, 'ink'); hud.rect(x + 1, y + 1, w - 2, h - 2, back);
  const f = Math.round((w - 2) * Math.max(0, Math.min(1, frac)));
  if (f > 0) hud.rect(x + 1, y + 1, f, h - 2, fill);
  note(x, y, w, h, 'bar');
}
const STAR = ['....o....', '....o....', '...ooo...', 'ooooooooo', '.ooooooo.', '..ooooo..', '..ooooo..', '.ooo.ooo.', '.o.....o.'];
export function star(hud, x, y, on, scale = 1) { hud.sprite(Math.round(x), Math.round(y), STAR, { o: on ? 'sand' : 'night' }, { scale, shadow: 'ink' }); }
export function stars(hud, x, y, n, scale = 1, max = 3) { for (let i = 0; i < max; i++) star(hud, x + i * 11 * scale, y, i < n, scale); return max * 11 * scale; }
export const starsWidth = (scale = 1, max = 3) => max * 11 * scale;
export function label(hud, x, y, text, o = {}) { const end = say(hud, x, y, text, o); note(x, y, textWidth(text, o.scale ?? 1), 7 * (o.scale ?? 1), 'text'); return end; }
export const dropCaps = (s) => s;
// The ring-and-dot dial. r is its pixel radius. p maps -1.2..1.2 onto the dial.
export function dial(hud, cx, cy, r, { ringR = 0.3, x = 0, y = 0, inside = false, glow = 0, face = 'white', hideDot = false, hideRing = false, target = null, seat = null } = {}) {
  disc(hud, cx, cy, r + 2, 'ink'); disc(hud, cx, cy, r, face);
  ring(hud, cx, cy, r, seat ?? 'slate', 2);
  for (let a = 0; a < 12; a++) { const c = Math.cos((a / 12) * 6.283), s = Math.sin((a / 12) * 6.283); hud.rect(Math.round(cx + c * (r - 5)), Math.round(cy + s * (r - 5)), 2, 2, 'mist'); }
  const rp = Math.max(3, (ringR / 1.2) * r);
  if (!hideRing) {
    if (inside) disc(hud, cx, cy, rp, glow > 0.5 ? 'cyan' : 'lime');
    ring(hud, cx, cy, rp, inside ? 'green' : 'sky', 3);
  }
  if (target) { const tx = cx + (target.x / 1.2) * r, ty = cy - (target.y / 1.2) * r; ring(hud, tx, ty, Math.max(3, target.r ? (target.r / 1.2) * r : 4), 'orange', 2); }
  if (!hideDot) {
    const dx = cx + (x / 1.2) * r, dy = cy - (y / 1.2) * r;
    disc(hud, dx, dy, Math.max(2, Math.round(r / 11)) + 1, 'ink');
    disc(hud, dx, dy, Math.max(2, Math.round(r / 11)), 'red');
  }
  note(cx - r - 2, cy - r - 2, 2 * r + 4, 2 * r + 4, 'dial');
}
// The chart: a line of up to seven points, with labels.
export function chart(hud, x, y, w, h, values, { min = 15, max = 100, color = 'red', slide = 0, days = 7 } = {}) {
  panel(hud, x, y, w, h, 'white', 'mist');
  const ix = x + 16, iy = y + 8, iw = w - 26, ih = h - 22;
  for (const v of [30, 60, 90]) { const gy = iy + ih - ((v - min) / (max - min)) * ih; hud.rect(ix, Math.round(gy), iw, 1, 'mist'); say(hud, x + 3, gy - 3, String(v), { color: 'slate', shadow: false }); }
  let px = null, py = null;
  values.forEach((v, i) => {
    const gx = ix + (iw * i) / Math.max(1, days - 1), gy = iy + ih - ((v - slide - min) / (max - min)) * ih;
    if (px !== null) line(hud, px, py, gx, gy, color, 2);
    px = gx; py = gy;
  });
  values.forEach((v, i) => {
    const gx = ix + (iw * i) / Math.max(1, days - 1), gy = iy + ih - ((v - slide - min) / (max - min)) * ih;
    disc(hud, gx, gy, 3, color); hud.rect(Math.round(gx) - 1, Math.round(gy) - 1, 2, 2, 'white');
  });
  for (let i = 0; i < days; i++) say(hud, ix + (iw * i) / Math.max(1, days - 1) - 2, y + h - 11, String(i + 1), { color: 'slate', shadow: false });
}
