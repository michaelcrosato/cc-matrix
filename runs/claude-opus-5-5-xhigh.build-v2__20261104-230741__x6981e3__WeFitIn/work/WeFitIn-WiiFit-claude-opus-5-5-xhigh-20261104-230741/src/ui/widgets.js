// Shapes for the pixel HUD. Lines are at least 2 art px thick: a 1 px ring vanishes at 10 feet.
import { layout } from './layout.js';
import { say, sayCentered, textWidth } from './font.js';

export const SAFE = 12;

export function panel(hud, x, y, w, h, { fill = 'white', border = 'ink', name = 'panel', thick = 2 } = {}) {
  layout.rec(name, x, y, w, h);
  hud.rect(x + 1, y - thick, w - 2, thick, border);
  hud.rect(x + 1, y + h, w - 2, thick, border);
  hud.rect(x - thick, y + 1, thick, h - 2, border);
  hud.rect(x + w, y + 1, thick, h - 2, border);
  hud.rect(x, y, w, h, fill);
}

export function bar(hud, x, y, w, h, frac, color = 'cyan', back = 'ink', name = 'bar') {
  layout.rec(name, x, y, w, h);
  hud.rect(x, y, w, h, back);
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) hud.rect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * f)), Math.max(1, h - 2), color);
}

/** A filled disc, drawn as scanlines. */
export function disc(hud, cx, cy, r, color) {
  const ir = Math.ceil(r);
  for (let dy = -ir; dy <= ir; dy++) {
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    if (half <= 0 && Math.abs(dy) >= r) continue;
    const hw = Math.round(half);
    hud.rect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1, color);
  }
}

/** A ring, drawn as scanlines between two radii. */
export function ring(hud, cx, cy, r, thick, color) {
  thick = Math.max(2, thick); // a 1 px ring vanishes at 10 feet
  const outer = r + thick / 2, inner = Math.max(0, r - thick / 2);
  const ir = Math.ceil(outer);
  const X = Math.round(cx), Y = Math.round(cy);
  for (let dy = -ir; dy <= ir; dy++) {
    const a = outer * outer - dy * dy;
    if (a < 0) continue;
    const ho = Math.round(Math.sqrt(a));
    const b = inner * inner - dy * dy;
    if (b <= 0) { hud.rect(X - ho, Y + dy, ho * 2 + 1, 1, color); continue; }
    const hi = Math.round(Math.sqrt(b));
    const w = Math.max(1, ho - hi);
    hud.rect(X - ho, Y + dy, w, 1, color);
    hud.rect(X + hi + (ho - hi - w) + 1, Y + dy, w, 1, color);
  }
}

export function line(hud, x0, y0, x1, y1, color, thick = 2) {
  thick = Math.max(2, thick);
  const d = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const off = Math.floor(thick / 2);
  for (let i = 0; i <= d; i++) {
    const t = i / d;
    hud.rect(Math.round(x0 + (x1 - x0) * t) - off, Math.round(y0 + (y1 - y0) * t) - off, thick, thick, color);
  }
}

const STAR_ROWS = [
  '.....o.....',
  '....ooo....',
  '....ooo....',
  'ooooooooooo',
  '.ooooooooo.',
  '..ooooooo..',
  '...ooooo...',
  '..ooo.ooo..',
  '..oo...oo..',
];
export const STAR_W = 11;

export function star(hud, x, y, filled = true, scale = 1) {
  layout.rec('star', x, y, STAR_W * scale, 9 * scale);
  hud.sprite(x, y, STAR_ROWS, { o: filled ? 'sand' : 'slate' }, { scale, shadow: 'ink' });
}

export function starRow(hud, x, y, count, scale = 1, total = 3) {
  for (let i = 0; i < total; i++) star(hud, x + i * (STAR_W + 2) * scale, y, i < count, scale);
  return x + total * (STAR_W + 2) * scale;
}

export function starRowWidth(scale = 1, total = 3) { return total * (STAR_W + 2) * scale - 2 * scale; }

/** The balance dial: a white face, the ring, the Dot. p coordinates run to 1.2 at the rim. */
export function drawDial(hud, { x, y, r = 44, dot = null, ringR = 0.3, ringX = 0, ringY = 0, inside = false, brighten = 0, target = null, fade = 1, mouse = null, color = 'red', label = null, hideDot = false }) {
  const X = Math.round(x), Y = Math.round(y);
  layout.rec('dial', X - r, Y - r, r * 2, r * 2);
  disc(hud, X, Y, r + 2, 'slate');
  disc(hud, X, Y, r, 'white');
  const s = r / 1.2;
  hud.rect(X - r + 3, Y - 1, r * 2 - 5, 2, 'mist');
  hud.rect(X - 1, Y - r + 3, 2, r * 2 - 5, 'mist');
  if (fade > 0) {
    const rc = inside ? (brighten > 0.6 ? 'lime' : 'green') : 'teal';
    ring(hud, X + ringX * s, Y - ringY * s, Math.max(3, ringR * s), r > 30 ? 3 : 2, rc);
  }
  if (target) {
    disc(hud, X + target.x * s, Y - target.y * s, r > 30 ? 4 : 3, 'orange');
    ring(hud, X + target.x * s, Y - target.y * s, (r > 30 ? 6 : 4), 1, 'ink');
  }
  if (dot && fade > 0 && !hideDot) {
    const dr = r > 30 ? 4 : 3;
    disc(hud, X + dot.x * s, Y - dot.y * s, dr + 1, 'ink');
    disc(hud, X + dot.x * s, Y - dot.y * s, dr, color);
  }
  if (mouse) {
    line(hud, X, Y, mouse.x, mouse.y, 'mist', 1);
    hud.rect(mouse.x - 4, mouse.y - 1, 8, 2, 'ink');
    hud.rect(mouse.x - 1, mouse.y - 4, 2, 8, 'ink');
  }
  if (label) sayCentered(hud, X, Y + r + 4, label, { color: 'white', name: 'dial-label' });
}

/** A heading with a soft backing strip. */
export function heading(hud, text, y = SAFE, scale = 2, color = 'white') {
  const w = textWidth(text, scale);
  const cx = Math.round(hud.width / 2);
  hud.rect(cx - Math.round(w / 2) - 6, y - 3, w + 12, 9 * scale + 5, 'navy');
  sayCentered(hud, cx, y, text, { scale, color, name: 'heading' });
}

export function pill(hud, x, y, text, { fill = 'navy', color = 'white', scale = 1, name = 'pill' } = {}) {
  const w = textWidth(text, scale) + 6 * scale;
  hud.rect(x, y, w, 9 * scale + 2, fill);
  say(hud, x + 3 * scale, y + 1, text, { color, scale, name });
  return w;
}

export { say, sayCentered };
