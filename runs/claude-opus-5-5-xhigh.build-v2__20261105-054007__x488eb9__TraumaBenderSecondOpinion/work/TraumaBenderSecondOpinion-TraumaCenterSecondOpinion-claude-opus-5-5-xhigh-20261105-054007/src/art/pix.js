// Small drawing helpers on top of E.px: rings, dashes, markers and button caps. Everything is hard-edged.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E;
const Pix = G.Pix = {
  ring(g, x, y, r, c, gap = 0) { const n = Math.max(8, Math.round(r * 6.3)); for (let i = 0; i < n; i++) { if (gap && (i % (gap * 2)) >= gap) continue; const a = i / n * Math.PI * 2; px.dot(g, Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), c); } },
  ellRing(g, x, y, rx, ry, c, gap = 0) { const n = Math.max(12, Math.round(Math.max(rx, ry) * 6.3)); for (let i = 0; i < n; i++) { if (gap && (i % (gap * 2)) >= gap) continue; const a = i / n * Math.PI * 2; px.dot(g, Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), c); } },
  /** a dashed polyline from arc length s0 on: dash and gap in pixels; phase scrolls it */
  dashed(g, pts, s0, c, dash = 4, gap = 3, ox = 0, oy = 0, phase = 0, w = 1) {
    let run = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.ceil(l); for (let k = 0; k <= n; k++) { const s = run + k / (n || 1) * l; if (s < s0) continue; if (((s + phase) % (dash + gap)) < dash) { const t = k / (n || 1), x = Math.round(a[0] + (b[0] - a[0]) * t + ox), y = Math.round(a[1] + (b[1] - a[1]) * t + oy); if (w > 1) px.rect(g, x - 1, y - 1, 2, 2, c); else px.dot(g, x, y, c); } } run += l; }
  },
  /** white corner brackets: Forceps' marker */
  brackets(g, x, y, r, c = '#ffffff') { const l = Math.max(2, Math.round(r * .55)); const X = Math.round(x), Y = Math.round(y), R = Math.round(r); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.rect(g, sx < 0 ? X - R : X + R - l + 1, Y + sy * R - (sy > 0 ? 0 : 0), l, 1, c); px.rect(g, X + sx * R, sy < 0 ? Y - R : Y + R - l + 1, 1, l, c); } },
  /** an arrow head and a shaft showing a pull axis */
  arrow(g, x, y, ax, ay, len, c) { const ex = x + ax * len, ey = y + ay * len; px.line(g, Math.round(x), Math.round(y), Math.round(ex), Math.round(ey), c); px.line(g, Math.round(ex), Math.round(ey), Math.round(ex - ax * 4 - ay * 3), Math.round(ey - ay * 4 + ax * 3), c); px.line(g, Math.round(ex), Math.round(ey), Math.round(ex - ax * 4 + ay * 3), Math.round(ey - ay * 4 - ax * 3), c); },
  /** a green hatch: Salve's marker */
  hatch(g, x, y, r, c, phase = 0) { const R = r * r; for (let j = -r | 0; j <= r; j++) for (let i = -r | 0; i <= r; i++) { if (i * i + j * j > R) continue; if (((i + j + (phase | 0)) & 3) === 0) px.dot(g, Math.round(x + i), Math.round(y + j), c); } },
  /** the plus-sign ring: Syringe's marker */
  plusRing(g, x, y, r, c) { Pix.ring(g, x, y, r, c, 2); px.rect(g, Math.round(x) - 3, Math.round(y), 7, 1, c); px.rect(g, Math.round(x), Math.round(y) - 3, 1, 7, c); },
  /** the orange ring: Cautery's marker */
  burnRing(g, x, y, r, c = '#ffa23c') { Pix.ring(g, x, y, r, c); Pix.ring(g, x, y, r + 1, E.tones(c).sh, 3); },
  /** a blue pair of dots: Suture's marker */
  pair(g, a, b, c, ox = 0, oy = 0) { px.rect(g, Math.round(a[0] + ox) - 1, Math.round(a[1] + oy) - 1, 3, 3, c); px.rect(g, Math.round(b[0] + ox) - 1, Math.round(b[1] + oy) - 1, 3, 3, c); },
  text(g, s, x, y, c = '#fff', o = {}) { E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#05040a' }, o)); },
  /** a panel in the theatre's look */
  panel(g, x, y, w, h, o = {}) { px.blend(g, o.alpha ?? .78, 'normal', () => px.rect(g, x, y, w, h, o.bg || '#061a1e')); px.rect(g, x, y, w, 1, o.line || '#2c6a68'); px.rect(g, x, y + h - 1, w, 1, o.line2 || '#123c40'); px.rect(g, x, y, 1, h, o.line2 || '#123c40'); px.rect(g, x + w - 1, y, 1, h, o.line2 || '#123c40'); },
};

// ------------------------------------------------------------------ prompts: drawn as button caps, from input.label
const FACE = { playstation: { '✕': '#5b8fe8', '○': '#e8585b', '□': '#d877c6', '△': '#4fd0a0' }, xbox: { A: '#4fbf52', B: '#e8504a', X: '#4a8fe8', Y: '#e8c43a' } };
const Glyph = G.Glyph = {
  /** the cap for a label; returns its width. o.scale, o.dim */
  cap(g, label, x, y, o = {}) {
    const k = o.scale || 1, face = FACE.playstation[label] || FACE.xbox[label], w = E.font.width(label, { scale: k }) + 6 * k, h = 9 * k + 1;
    const bg = face || (o.key ? '#d7dde0' : '#28333a'), edge = E.tones(bg), ink = face ? '#08101a' : o.key ? '#10181c' : '#eef6f4';
    px.rect(g, x + 1, y, w - 2, h, bg); px.rect(g, x, y + 1, w, h - 2, bg); px.rect(g, x + 1, y + h - 1, w - 2, 1, edge.sh); px.rect(g, x + 1, y, w - 2, 1, edge.lt);
    E.font.text(g, label, x + 3 * k, y + Math.round(k * 1.2), ink, { outline: false, scale: k });
    return w;
  },
  /** the cap for an action, through input.label, so it follows the device used last and rebinding */
  action(g, input, action, x, y, o = {}) { const label = Glyph.short(input.label(action)); return Glyph.cap(g, label, x, y, Object.assign({ key: input.lastDevice !== 'gamepad' }, o)); },
  short(l) { return l === 'Left click' ? 'Click' : l === 'Right click' ? 'R-click' : l === 'Middle click' ? 'M-click' : l; },
  width(input, action, k = 1) { return E.font.width(Glyph.short(input.label(action)), { scale: k }) + 6 * k; },
};
})();
