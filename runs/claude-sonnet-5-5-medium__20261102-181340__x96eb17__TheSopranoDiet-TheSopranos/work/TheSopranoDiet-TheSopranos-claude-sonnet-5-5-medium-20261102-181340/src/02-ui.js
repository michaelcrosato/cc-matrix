/* prompts that follow the device used last: PlayStation / Xbox glyphs, keys, mouse buttons */
(() => {
const G = SD, E = G.E, { px } = E, game = G.game;
const COL = {
  ps: ['#74a7ff', '#ff6b6b', '#ff9ad5', '#6be0a0'],       // cross, circle, square, triangle
  xb: ['#5fcf70', '#e8554e', '#4a90e8', '#f0c040']        // A B X Y
};
/* the pad button each action uses (standard mapping index) and its keyboard / mouse text */
G.ACT = {
  interact: { pad: 0, key: 'E' }, confirm: { pad: 0, key: 'Enter' }, cancel: { pad: 1, key: 'Esc' },
  attack: { pad: 2, key: 'J', mouse: 0 }, dash: { pad: 1, key: 'Space' }, skill: { pad: 3, key: 'Q', mouse: 2 },
  eat: { pad: 4, key: 'R' }, next: { pad: 5, key: 'T' }, view: { pad: 11, key: 'V' }, pause: { pad: 9, key: 'Esc' }, move: { pad: 'LS', key: 'WASD' }
};
const SHOULD = { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 9: 'OPT', 11: 'R3', 10: 'L3', 8: 'CRE' };
const XSHOULD = { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 9: 'MENU', 11: 'RS', 10: 'LS', 8: 'VIEW' };

G.deviceKind = () => {
  const d = game.input.lastDevice;
  return d === 'gamepad' ? 'pad' : d === 'mouse' ? 'mouse' : 'key';
};
G.xbox = () => game.input.padStyle ? game.input.padStyle() === 'xbox' : false;

/* draws one glyph at (x, y) (top-left) into the overlay g; returns its width */
G.glyph = (g, x, y, action, dev) => {
  const a = G.ACT[action] || { key: action }; dev = dev || G.deviceKind();
  if (dev === 'mouse' && a.mouse === undefined) dev = 'key';
  if (dev === 'pad') {
    if (a.pad === 'LS') { px.disc(g, x + 5, y + 5, 5, '#2c2c36'); px.disc(g, x + 5, y + 5, 3, '#8a8aa0'); return 11; }
    const xb = G.xbox();
    if (a.pad < 4) {
      const c = (xb ? COL.xb : COL.ps)[a.pad];
      px.disc(g, x + 5, y + 5, 5, '#15151c'); px.disc(g, x + 5, y + 5, 4, c);
      px.disc(g, x + 5, y + 5, 3, '#15151c');
      if (xb) { E.font.text(g, 'ABXY'[a.pad], x + 3, y + 1, c, { outline: false }); }
      else {
        const cx = x + 5, cy = y + 5;
        if (a.pad === 0) { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx + 2, cy - 2, cx - 2, cy + 2, c, 1); }
        if (a.pad === 1) { px.disc(g, cx, cy, 2, c); px.disc(g, cx, cy, 1, '#15151c'); }
        if (a.pad === 2) { px.rect(g, cx - 2, cy - 2, 5, 5, c); px.rect(g, cx - 1, cy - 1, 3, 3, '#15151c'); }
        if (a.pad === 3) { px.line(g, cx, cy - 2, cx - 2, cy + 2, c, 1); px.line(g, cx, cy - 2, cx + 2, cy + 2, c, 1); px.line(g, cx - 2, cy + 2, cx + 2, cy + 2, c, 1); }
      }
      return 11;
    }
    const t = (xb ? XSHOULD : SHOULD)[a.pad] || 'BTN', w = E.font.width(t) + 5;
    px.rect(g, x, y + 1, w, 9, '#15151c'); px.rect(g, x + 1, y + 2, w - 2, 7, '#3a3a48');
    E.font.text(g, t, x + 3, y + 2, '#ffffff', { outline: false });
    return w;
  }
  if (dev === 'mouse') {
    px.rect(g, x, y, 9, 12, '#d8d8e4'); px.rect(g, x + 1, y + 1, 7, 10, '#23232c');
    const left = a.mouse === 0; px.rect(g, left ? x + 1 : x + 5, y + 1, left ? 3 : 3, 4, '#ffcf5a');
    px.rect(g, x + 4, y + 1, 1, 5, '#d8d8e4');
    return 10;
  }
  let t = a.key; if (action !== 'move') { try { const l = game.input.label(action, 'keyboard'); if (l) t = l; } catch (e) {} }
  t = String(t).replace('Left click', 'LMB').replace('Right click', 'RMB');
  const w = Math.max(9, E.font.width(t) + 5);
  px.rect(g, x, y, w, 11, '#d8d8e4'); px.rect(g, x + 1, y + 1, w - 2, 9, '#2a2a36'); px.rect(g, x + 1, y + 9, w - 2, 1, '#14141c');
  E.font.text(g, t, x + 3, y + 2, '#ffffff', { outline: false });
  return w;
};

/* glyph + label, e.g. [✕] Talk. Returns the total width. */
G.prompt = (g, x, y, action, label, color) => {
  const w = G.glyph(g, x, y, action);
  E.font.text(g, label, x + w + 3, y + 2, color || '#ffffff', { shadow: '#000', outline: false });
  return w + 6 + E.font.width(label);
};

/* a row of prompts, right-aligned at x */
G.promptRow = (g, right, y, list) => {
  let total = 0; const ws = list.map(([a, l]) => { const w = G.glyphWidth(a) + 6 + E.font.width(l); total += w + 8; return w; });
  let x = right - total + 8;
  list.forEach(([a, l], i) => { G.prompt(g, x, y, a, l); x += ws[i] + 8; });
};
G.glyphWidth = action => {
  const a = G.ACT[action] || { key: action }; let dev = G.deviceKind();
  if (dev === 'mouse' && a.mouse === undefined) dev = 'key';
  if (dev === 'pad') return a.pad === 'LS' ? 11 : a.pad < 4 ? 11 : E.font.width((G.xbox() ? XSHOULD : SHOULD)[a.pad] || 'BTN') + 5;
  if (dev === 'mouse') return 10;
  let t = a.key; if (action !== 'move') { try { const l = game.input.label(action, 'keyboard'); if (l) t = l; } catch (e) {} }
  return Math.max(9, E.font.width(String(t).replace('Left click', 'LMB').replace('Right click', 'RMB')) + 5);
};

/* shared panel + text helpers */
G.panel = (g, x, y, w, h, alpha) => E.ui.box(g, x, y, w, h, { bg: ['#1b1624', '#120e19'], border: '#c9a45c', alpha: alpha == null ? .86 : alpha });
G.txt = (g, s, x, y, c, o) => E.font.text(g, s, x, y, c || '#fff', Object.assign({ shadow: '#000', outline: false }, o || {}));

/* toast queue shown top centre */
G.toasts = [];
G.toast = (title, sub, color) => { G.toasts.push({ title, sub, color: color || '#ffd36a', t: 0 }); if (G.toasts.length > 4) G.toasts.shift(); };
G.drawToasts = (g, W, dt) => {
  for (let i = G.toasts.length - 1; i >= 0; i--) { G.toasts[i].t += dt; if (G.toasts[i].t > 3.2) G.toasts.splice(i, 1); }
  G.toasts.forEach((t, i) => {
    const a = Math.min(1, t.t * 5, (3.2 - t.t) * 3), w = Math.max(E.font.width(t.title), E.font.width(t.sub || '')) + 16, x = (W - w) >> 1, y = 22 + i * 26 - (1 - a) * 6;
    px.blend(g, a, 'normal', () => { G.panel(g, x, y, w, t.sub ? 23 : 15, .9); G.txt(g, t.title, W / 2, y + 3, t.color, { align: 'center' }); if (t.sub) G.txt(g, t.sub, W / 2, y + 12, '#e6dcc6', { align: 'center' }); });
  });
};
})();
