// HUD helpers on the engine's pixel HUD canvas: wrap, markup, glyphs, tokens, bars, EKG.
export const FONT_OK = /^[A-Z0-9 .,:;!?\-+%/()\[\]'"#&*=<>\n]*$/;
export const clean = (s) => String(s).replace(/—|–/g, '-').replace(/…/g, '...').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

export function wrap(hud, text, width, scale = 1) {
  const words = clean(text).toUpperCase().split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (hud.measure(t.replace(/\*/g, ''), scale).width <= width) cur = t; else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur); return lines;
}
/** Text with *word* highlight markup. */
export function mtext(hud, x, y, text, o = {}) {
  const { color = 'white', hi = 'sand', scale = 1, anchor = 'top-left', shadow = 'ink' } = o;
  const parts = clean(text).toUpperCase().split('*'); const plain = parts.join('');
  const W = hud.measure(plain, scale).width;
  let ox = x;
  if (anchor.includes('right')) ox = hud.width - x - W; else if (anchor === 'top' || anchor === 'center' || anchor === 'bottom') ox = Math.round((hud.width - W) / 2) + x;
  const oy = anchor.startsWith('bottom') ? hud.height - y - 7 * scale : anchor === 'center' || anchor === 'left' || anchor === 'right' ? Math.round(hud.height / 2) + y : y;
  let cx = ox;
  parts.forEach((p, i) => { if (!p) return; hud.text(cx, oy, p, { color: i % 2 ? hi : color, scale, shadow }); cx += hud.measure(p, scale).width; });
  return W;
}
export const textW = (hud, t, s = 1) => hud.measure(clean(t).toUpperCase().replace(/\*/g, ''), s).width;
export function ctext(hud, y, text, o = {}) { const W = textW(hud, text, o.scale || 1); return mtext(hud, Math.round((hud.width - W) / 2), y, text, o); }

// ---- glyphs ----
const R9 = ['..ooooo..', '.ooooooo.', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', 'ooooooooo', '.ooooooo.', '..ooooo..'];
const SYM = {
  cross: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'], circle: ['.xxx.', 'x...x', 'x...x', 'x...x', '.xxx.'],
  square: ['xxxxx', 'x...x', 'x...x', 'x...x', 'xxxxx'], tri: ['..x..', '.x.x.', '.x.x.', 'x...x', 'xxxxx'],
};
const MAPPING = {
  confirm: { ps: 'cross', xbox: 'A', kb: 'ENTER' }, back: { ps: 'circle', xbox: 'B', kb: 'ESC' }, use: { ps: 'R2', xbox: 'RT', kb: 'LMB' },
  release: { ps: 'circle', xbox: 'B', kb: 'RMB' }, gift: { ps: 'L2', xbox: 'LT', kb: 'SPACE' }, steady: { ps: 'L1', xbox: 'LB', kb: 'SHIFT' },
  tool: { ps: 'RS', xbox: 'RS', kb: '1-8' }, last: { ps: 'R1', xbox: 'RB', kb: 'Q' }, pause: { ps: 'OPT', xbox: 'MENU', kb: 'ESC' },
  extra: { ps: 'tri', xbox: 'Y', kb: 'E' }, quick: { ps: 'square', xbox: 'X', kb: 'F' }, tabs: { ps: 'L1', xbox: 'LB', kb: 'Q' }, tabsR: { ps: 'R1', xbox: 'RB', kb: 'E' },
  move: { ps: 'LS', xbox: 'LS', kb: 'MOUSE' }, table: { ps: 'DPAD', xbox: 'DPAD', kb: 'TAB' }, rotate: { ps: 'RS', xbox: 'RS', kb: 'Q E' }, skip: { ps: 'tri', xbox: 'Y', kb: 'ESC' },
  paddles: { ps: 'L2 R2', xbox: 'LT RT', kb: 'J K' }, nav: { ps: 'DPAD', xbox: 'DPAD', kb: 'ARROWS' }, any: { ps: 'cross', xbox: 'A', kb: 'ENTER' },
};
export function glyphLabel(app, act) {
  const m = MAPPING[act]; if (!m) return act.toUpperCase();
  const dev = app.devices.last === 'pad' ? (app.settings.glyphs === 'xbox' ? 'xbox' : 'ps') : 'kb'; return { dev, g: m[dev] };
}
const FACE = { A: 'lime', B: 'red', X: 'blue', Y: 'sand' };
/** Draw a glyph at (x,y); returns its width. */
export function drawGlyph(hud, x, y, g, dev) {
  if (dev === 'ps' && SYM[g]) { hud.sprite(x, y, R9, { o: 'navy' }); hud.sprite(x + 2, y + 2, SYM[g], { x: g === 'cross' ? 'sky' : g === 'circle' ? 'red' : g === 'square' ? 'plum' : 'lime' }); return 10; }
  if (dev === 'xbox' && FACE[g]) { hud.sprite(x, y, R9, { o: FACE[g] }); hud.text(x + 2, y + 1, g, { color: 'ink', shadow: false }); return 10; }
  const lab = g; const w = hud.measure(lab).width + 5;
  hud.rect(x, y, w, 9, dev === 'kb' ? 'slate' : 'navy'); hud.rect(x + 1, y + 1, w - 2, 7, dev === 'kb' ? 'mist' : 'blue'); hud.text(x + 3, y + 1, lab, { color: 'ink', shadow: false });
  return w + 1;
}
/** Draw a row of prompts [{act,label}] left-aligned at (x,y) or centred if x === 'center'. */
export function prompts(hud, app, items, x, y) {
  const dev0 = glyphLabel(app, 'confirm').dev;
  let total = 0; const parts = items.map((it) => { const gl = glyphLabel(app, it.act); const gw = typeof gl === 'string' ? hud.measure(gl).width + 5 : (SYM[gl.g] || FACE[gl.g]) ? 10 : hud.measure(gl.g).width + 6; const lw = textW(hud, it.label); total += gw + 3 + lw + 8; return { it, gl, gw, lw }; });
  let cx = x === 'center' ? Math.round((hud.width - total) / 2) : x;
  for (const p of parts) { cx += drawGlyph(hud, cx, y, typeof p.gl === 'string' ? p.gl : p.gl.g, p.gl.dev || dev0) + 2; hud.text(cx, y + 1, clean(p.it.label).toUpperCase(), { color: 'white' }); cx += p.lw + 8; }
}
/** Resolve {token} markers to text for display (no string hard-codes a button). */
export function tokens(app, s) {
  return s.replace(/\{(\w+)\}/g, (_, k) => { const g = glyphLabel(app, k === 'tool' ? 'tool' : k); if (typeof g === 'string') return g; const m = { cross: 'X', circle: 'O', square: '[]', tri: '^' }; return m[g.g] || g.g; });
}
export function bar(hud, x, y, w, h, frac, col, bg = 'ink', border = 'slate') {
  hud.rect(x, y, w, h, border); hud.rect(x + 1, y + 1, w - 2, h - 2, bg); const f = Math.max(0, Math.min(1, frac)); if (f > 0) hud.rect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * f)), h - 2, col);
}
export function line(hud, x0, y0, x1, y1, col) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) hud.rect(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), 1, 1, col); }
/** EKG trace: `t` seconds; rate beats per second. */
export function ekg(hud, x, y, w, h, t, bps, col, jitter = 0) {
  let py = y + h / 2;
  for (let i = 0; i < w; i++) {
    const tt = t - (w - i) / 40, ph = ((tt * bps) % 1 + 1) % 1; let v = 0;
    if (ph < 0.08) v = 0.15 * Math.sin((ph / 0.08) * Math.PI); else if (ph > 0.12 && ph < 0.14) v = -0.2; else if (ph >= 0.14 && ph < 0.18) v = 1 - Math.abs((ph - 0.16) / 0.02) * 1; else if (ph > 0.2 && ph < 0.3) v = 0.2 * Math.sin(((ph - 0.2) / 0.1) * Math.PI);
    v += jitter * (Math.sin(tt * 91) * Math.sin(tt * 37));
    const yy = y + h / 2 - v * (h / 2 - 1); if (i > 0) line(hud, x + i - 1, py, x + i, yy, col); py = yy;
  }
}
export const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const COL = { red: 0xe8443a, blue: 0x3b82f6, green: 0x22c55e, sand: 0xf5b700 };
export const SEAT_COLORS = [0xe8443a, 0x3b82f6, 0x22c55e, 0xf5b700];
export const SEAT_PAL = ['red', 'blue', 'green', 'sand'];
