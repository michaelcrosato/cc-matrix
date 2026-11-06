// Mixed case on a 6px grid. Lowercase is drawn as sprites. Everything else uses hud.text.
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

/** Characters hud.text can draw, plus the lowercase sprites above. */
export const HUD_EXTRA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?'\": :;-()/+%*";

export function hasGlyph(ch) {
  if (ch === ' ' || ch === '\n') return true;
  if (GLYPHS[ch]) return true;
  return HUD_EXTRA.includes(ch);
}

export function missingGlyphs(text) {
  const bad = [];
  for (const ch of String(text)) if (!hasGlyph(ch)) bad.push(ch);
  return bad;
}

export function say(hud, x, y, text, { color = 'white', shadow = 'ink', scale = 1 } = {}) {
  for (const ch of String(text)) {
    const g = GLYPHS[ch];
    if (g) hud.sprite(x, y, g, { o: color }, { scale, shadow });
    else if (ch !== ' ') hud.text(x, y, hasGlyph(ch) ? ch : '?', { color, shadow, scale });
    x += 6 * scale;
  }
  return x;
}

export function measureText(text, scale = 1) {
  return { width: String(text).length * 6 * scale, height: 9 * scale };
}

/** Wrap to a character width. Each piece is at most `cols` characters. */
export function wrapText(text, cols) {
  const width = Math.max(1, cols | 0);
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= width) line = next;
    else {
      if (line) lines.push(line);
      if (word.length <= width) line = word;
      else {
        for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
        line = '';
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}
