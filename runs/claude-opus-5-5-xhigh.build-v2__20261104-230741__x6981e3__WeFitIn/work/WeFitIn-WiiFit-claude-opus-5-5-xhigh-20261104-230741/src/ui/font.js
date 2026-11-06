// Mixed-case text: lowercase through hud.sprite, everything else through hud.text, on a 6 px grid.
// Rows top to bottom, 5 bits, bit 4 = left. Rows 7-8 are descenders.
import { layout } from './layout.js';

const H = {
  a: '00 00 0e 01 0f 11 0f 00 00', b: '10 10 1e 11 11 11 1e 00 00', c: '00 00 0e 11 10 11 0e 00 00', d: '01 01 0f 11 11 11 0f 00 00',
  e: '00 00 0e 11 1f 10 0e 00 00', f: '06 09 08 1c 08 08 08 00 00', g: '00 00 0f 11 11 11 0f 01 0e', h: '10 10 1e 11 11 11 11 00 00',
  i: '04 00 0c 04 04 04 0e 00 00', j: '02 00 06 02 02 02 02 12 0c', k: '10 10 12 14 18 14 12 00 00', l: '0c 04 04 04 04 04 0e 00 00',
  m: '00 00 1a 15 15 15 15 00 00', n: '00 00 1e 11 11 11 11 00 00', o: '00 00 0e 11 11 11 0e 00 00', p: '00 00 1e 11 11 11 1e 10 10',
  q: '00 00 0f 11 11 11 0f 01 01', r: '00 00 16 19 10 10 10 00 00', s: '00 00 0f 10 0e 01 1e 00 00', t: '08 08 1c 08 08 09 06 00 00',
  u: '00 00 11 11 11 13 0d 00 00', v: '00 00 11 11 11 0a 04 00 00', w: '00 00 11 11 15 15 0a 00 00', x: '00 00 11 0a 04 0a 11 00 00',
  y: '00 00 11 11 11 11 0f 01 0e', z: '00 00 1f 02 04 08 1f 00 00',
};
export const GLYPHS = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.split(' ').map((h) => parseInt(h, 16).toString(2).padStart(5, '0').replace(/0/g, '.').replace(/1/g, 'o'))]));

/** Everything the engine's 5x7 font can draw, besides the lowercase above. */
export const ENGINE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:-+=/()[]%_!?<>#\'"*@{};&|\\~^$`';
const KNOWN = new Set([...ENGINE_CHARS, ...Object.keys(GLYPHS)]);

/** Hub names can hold anything: every character the font lacks becomes '?'. */
export function sanitize(text) {
  return String(text)
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[–—]/g, '-')
    .replace(/[^\n]/g, (c) => (KNOWN.has(c) ? c : '?'));
}

export function hasGlyph(ch) { return KNOWN.has(ch); }

export const textWidth = (text, scale = 1) => (String(text).length ? String(text).length * 6 - 1 : 0) * scale;

/** Draw text at art-pixel (x, y). Returns the x after the last character. */
export function say(hud, x, y, text, { color = 'white', shadow = 'ink', scale = 1, name = 'text' } = {}) {
  const s = sanitize(text);
  layout.rec(name, x, y, textWidth(s, scale), 9 * scale, s);
  // Both fonts get one shadow, drawn here: the engine's two shadows don't match at larger scales.
  const off = scale >= 3 ? 2 : 1;
  for (const ch of s) {
    const g = GLYPHS[ch];
    if (g) {
      if (shadow) hud.sprite(x + off, y + off, g, { o: shadow }, { scale, shadow: false });
      hud.sprite(x, y, g, { o: color }, { scale, shadow: false });
    } else if (ch !== ' ') {
      if (shadow) hud.text(x + off, y + off, ch, { color: shadow, shadow: false, scale });
      hud.text(x, y, ch, { color, shadow: false, scale });
    }
    x += 6 * scale;
  }
  return x;
}

export function sayCentered(hud, cx, y, text, opts = {}) {
  const w = textWidth(sanitize(text), opts.scale ?? 1);
  return say(hud, Math.round(cx - w / 2), y, text, opts);
}

export function sayRight(hud, rx, y, text, opts = {}) {
  const w = textWidth(sanitize(text), opts.scale ?? 1);
  return say(hud, Math.round(rx - w), y, text, opts);
}

/** Word wrap by characters per line. */
export function wrap(text, maxChars) {
  const out = [];
  for (const para of sanitize(text).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if (word.length > maxChars) {
        if (line) { out.push(line); line = ''; }
        let w = word;
        while (w.length > maxChars) { out.push(w.slice(0, maxChars)); w = w.slice(maxChars); }
        line = w;
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Chars that fit in a width of art pixels at a scale. */
export const charsIn = (width, scale = 1) => Math.max(1, Math.floor((width + scale) / (6 * scale)));
