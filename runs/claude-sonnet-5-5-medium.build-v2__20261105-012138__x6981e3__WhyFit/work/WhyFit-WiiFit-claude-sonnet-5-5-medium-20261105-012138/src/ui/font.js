// Mixed-case text on top of the capitals-only engine font. Lowercase goes through hud.sprite on a 6 px grid.
const H = {
a:'00 00 0e 01 0f 11 0f 00 00', b:'10 10 1e 11 11 11 1e 00 00', c:'00 00 0e 11 10 11 0e 00 00', d:'01 01 0f 11 11 11 0f 00 00',
e:'00 00 0e 11 1f 10 0e 00 00', f:'06 09 08 1c 08 08 08 00 00', g:'00 00 0f 11 11 11 0f 01 0e', h:'10 10 1e 11 11 11 11 00 00',
i:'04 00 0c 04 04 04 0e 00 00', j:'02 00 06 02 02 02 02 12 0c', k:'10 10 12 14 18 14 12 00 00', l:'0c 04 04 04 04 04 0e 00 00',
m:'00 00 1a 15 15 15 15 00 00', n:'00 00 1e 11 11 11 11 00 00', o:'00 00 0e 11 11 11 0e 00 00', p:'00 00 1e 11 11 11 1e 10 10',
q:'00 00 0f 11 11 11 0f 01 01', r:'00 00 16 19 10 10 10 00 00', s:'00 00 0f 10 0e 01 1e 00 00', t:'08 08 1c 08 08 09 06 00 00',
u:'00 00 11 11 11 13 0d 00 00', v:'00 00 11 11 11 0a 04 00 00', w:'00 00 11 11 15 15 0a 00 00', x:'00 00 11 0a 04 0a 11 00 00',
y:'00 00 11 11 11 11 0f 01 0e', z:'00 00 1f 02 04 08 1f 00 00' };
export const GLYPHS = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, v.split(' ').map((h) => parseInt(h, 16).toString(2).padStart(5, '0').replace(/0/g, '.').replace(/1/g, 'o'))]));
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;!?\'"-+=/()[]%_<>#*@&|~^$';
export const SUPPORTED = new Set([...UPPER, ...Object.keys(GLYPHS)]);
export const hasGlyph = (ch) => SUPPORTED.has(ch);
export function clean(text) { let o = ''; for (const ch of String(text)) o += SUPPORTED.has(ch) ? ch : (ch === '\n' ? '\n' : '?'); return o; }
export const widthOf = (text, scale = 1) => text.length * 6 * scale;
export function say(hud, x, y, text, { color = 'white', shadow = 'ink', scale = 1, anchor = 'tl' } = {}) {
  text = clean(text);
  if (anchor === 'c') x -= Math.floor(widthOf(text, scale) / 2) - 1; else if (anchor === 'r') x -= widthOf(text, scale) - scale;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (g) hud.sprite(x, y, g, { o: color }, { scale, shadow });
    else if (ch !== ' ') hud.text(x, y, ch, { color, shadow, scale });
    x += 6 * scale;
  }
  return x;
}
/** Word-wrap to a pixel width; returns lines. */
export function wrap(text, maxW, scale = 1) {
  const per = Math.max(1, Math.floor(maxW / (6 * scale)));
  const lines = [];
  for (const para of clean(text).split('\n')) {
    let cur = '';
    for (const w of para.split(' ')) {
      if (!cur) cur = w; else if ((cur + ' ' + w).length <= per) cur += ' ' + w; else { lines.push(cur); cur = w; }
    }
    lines.push(cur);
  }
  return lines;
}
export function sayWrapped(hud, x, y, text, maxW, opts = {}) {
  const sc = opts.scale ?? 1, ls = opts.lineGap ?? (9 * sc);
  const lines = wrap(text, maxW, sc);
  lines.forEach((l, i) => say(hud, x, y + i * ls, l, opts));
  return lines.length * ls;
}
