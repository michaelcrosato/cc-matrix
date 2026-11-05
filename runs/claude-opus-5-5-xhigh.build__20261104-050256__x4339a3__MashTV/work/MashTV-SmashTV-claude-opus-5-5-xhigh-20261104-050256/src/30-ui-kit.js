// ---- the UI kit: 10-foot canvas widgets drawn in r.overlay; focus handling written once (any player, keys, mouse) ----
const UI = MT.ui = {};
const FONT = E.font;
UI.text = (g, s, x, y, c = '#fff7e8', o = {}) => FONT.text(g, String(s), Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
UI.width = (s, scale = 1) => FONT.width(String(s), { scale });
/** the input that acted last (prompts show its glyphs) */
UI.lastInput = () => { let best = game.input; for (const p of game.players) if ((p._lastAct || 0) > (best._lastAct || 0)) best = p; return best; };
/** every player's menu presses this step, merged; mouse hover and clicks separately */
UI.nav = () => {
  const n = { up: false, down: false, left: false, right: false, confirm: false, cancel: false, tabL: false, tabR: false, reset: false, start: false, more: false, any: false, holdConfirm: false };
  for (const p of game.players) {
    if (!p.map.confirm) continue;
    const rep = a => p.map[a] && p.repeat(a, .32, .09);
    const pr = a => p.map[a] && p.pressed(a);
    if (rep('up')) n.up = true; if (rep('down')) n.down = true; if (rep('left')) n.left = true; if (rep('right')) n.right = true;
    if (pr('confirm')) n.confirm = true; if (pr('cancel')) n.cancel = true; if (pr('tabL')) n.tabL = true; if (pr('tabR')) n.tabR = true; if (pr('reset')) n.reset = true; if (pr('start')) n.start = true; if (pr('more')) n.more = true;
    if (p.map.confirm && (p.down('confirm') || p.down('start'))) n.holdConfirm = true;
    if (p.anyPressed()) { n.any = true; p._lastAct = game.real; }
  }
  return n;
};
/** a focus list: state { i }; items: [{ label, sub, disabled }]; layout: [{ x, y, w, h }] rects in screen pixels.
 *  Returns { picked, moved, side } (picked: index confirmed or clicked; side: -1 / +1 for left / right on the focused row) */
UI.listStep = (st, items, rects, nav, o = {}) => {
  const out = { picked: -1, moved: false, side: 0 };
  const n = items.length; if (!n) return out;
  const move = d => { let k = st.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!items[k].disabled || o.focusDisabled) break; } if (k !== st.i) { st.i = k; out.moved = true; MT.sfx('blip'); } };
  if (nav.up) move(-1); if (nav.down) move(1);
  const wh = MT.wheelTake ? MT.wheelTake() : 0; if (wh) move(wh);
  if (nav.left) out.side = -1; if (nav.right) out.side = 1;
  const I = game.input, p = I.pointer && I.pointer();
  const movedP = st._p !== undefined && p && (!st._p || st._p[0] !== p[0] || st._p[1] !== p[1]);
  if (movedP || (p && I.lastDevice === 'mouse' && st._p === undefined)) { for (let k = 0; k < rects.length; k++) { const R = rects[k]; if (R && p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h && !items[k].disabled && st.i !== k) { st.i = k; out.moved = true; MT.sfx('blip'); } } }
  st._p = p ? p.slice() : null;
  const c = I.clicked && I.clicked();
  if (c) for (let k = 0; k < rects.length; k++) { const R = rects[k]; if (R && c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h && !items[k].disabled) { st.i = k; out.picked = k; out.click = c; } }
  if (nav.confirm && !items[st.i].disabled) out.picked = st.i;
  if (out.picked >= 0) MT.sfx('bell');
  return out;
};
/** a clicked rect test for one-off buttons */
UI.clickIn = R => { const c = game.input.clicked && game.input.clicked(); return !!(c && R && c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h); };
UI.hoverIn = R => { const p = game.input.pointer && game.input.pointer(); return !!(p && game.input.lastDevice === 'mouse' && R && p[0] >= R.x && p[0] < R.x + R.w && p[1] >= R.y && p[1] < R.y + R.h); };
/** a panel: dark, gold-lined, 85% opaque (never text over busy art without one) */
UI.panel = (g, x, y, w, h, o = {}) => {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a1446', '#140a24'], border: o.border || '#ffcc33', alpha: o.alpha === undefined ? .9 : o.alpha });
};
/** marquee bulbs chasing round a rectangle (the focus frame, menu frames, the jumbotron border) */
UI.bulbs = (g, x, y, w, h, t, o = {}) => {
  const step = o.step || 6, on = o.on || '#fff6b0', off = o.off || '#8a5a08', speed = o.speed || 10;
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const per = 2 * (w + h); let k = 0;
  for (let d = 0; d < per; d += step, k++) {
    let px2, py2; if (d < w) { px2 = x + d; py2 = y; } else if (d < w + h) { px2 = x + w; py2 = y + d - w; } else if (d < 2 * w + h) { px2 = x + w - (d - w - h); py2 = y + h; } else { px2 = x; py2 = y + h - (d - 2 * w - h); }
    const lit = (k + Math.floor(t * speed)) % 3 === 0;
    px.rect(g, px2 - 1, py2 - 1, 2, 2, lit ? on : off);
  }
};
/** a menu row: label (scale 2), focused rows in a gold bulb frame with a scale bump */
UI.row = (g, R, label, focused, t, o = {}) => {
  const sc = o.scale || 2, disabled = o.disabled;
  if (focused) { px.rect(g, R.x, R.y, R.w, R.h, '#3a1e5a'); UI.bulbs(g, R.x, R.y, R.w, R.h, t); }
  const ty = R.y + Math.round((R.h - 7 * sc) / 2), tx = o.align === 'left' ? R.x + 8 : R.x + R.w / 2;
  UI.text(g, label, tx, ty - (focused ? 1 : 0), disabled ? '#6a5a7a' : focused ? '#ffcc33' : '#fff7e8', { scale: sc, align: o.align === 'left' ? 'left' : 'center' });
  if (o.value !== undefined) UI.text(g, o.value, R.x + R.w - 8, ty, focused ? '#fff7e8' : '#c9b6e4', { scale: sc, align: 'right' });
};
/** the bottom prompt bar: [[action, 'TEXT'], ...] in the glyphs of the last device used */
UI.promptBar = (g, r, items, o = {}) => {
  const I = o.input || UI.lastInput(), sc = r.W >= 480 ? 1 : 1;
  const w = MT.glyph.measure(items, I, { scale: sc }) + 16, h = 17, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H - h - 4 - (o.lift || 0));
  px.blend(g, .8, 'normal', () => px.rect(g, x, y, w, h, '#0c0618'));
  px.rect(g, x, y, w, 1, '#ffcc33');
  MT.glyph.prompt(g, r.W / 2, y + 3, items, I, { scale: sc, align: 'center' });
};
/** a title in the logo's style */
UI.title = (g, s, x, y, sc = 3, o = {}) => FONT.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: sc, colors: o.colors || ['#ffcc33', '#ff2e88'], align: o.align || 'center', depth: o.depth === undefined ? 2 : o.depth, depthColor: '#5a1040' }, o));
/** the MASH TV logo: a CRT outline with rabbit-ear antennas around the title, a sparkle */
UI.logo = (g, cx, y, sc, t) => {
  const w = Math.round(UI.width('MASH TV', sc) * 1.25 + 24), h = Math.round(sc * 7 + 30), x = Math.round(cx - w / 2);
  px.line(g, cx - 8, y + 2, cx - 30, y - 18, '#c8d0e0', 2); px.line(g, cx + 8, y + 2, cx + 30, y - 18, '#c8d0e0', 2); px.disc(g, cx - 30, y - 18, 3, '#ff2e88'); px.disc(g, cx + 30, y - 18, 3, '#2ee6ff');
  px.rect(g, x - 3, y - 1, w + 6, h + 6, '#0c0618'); px.rect(g, x - 2, y, w + 4, h + 4, '#c8d0e0'); px.rect(g, x, y + 2, w, h, '#2a1050'); px.rect(g, x + 2, y + 4, w - 4, h - 4, '#1a0838');
  UI.bulbs(g, x - 2, y, w + 4, h + 4, t, { step: 7 });
  UI.title(g, 'MASH TV', cx, y + 12, sc);
  const sp = Math.floor(t * 2) % 4; if (sp < 2) { const sx = x + w - 14, sy = y + 10; px.line(g, sx - 4, sy, sx + 4, sy, '#ffffff'); px.line(g, sx, sy - 4, sx, sy + 4, '#ffffff'); px.dot(g, sx, sy, '#fff6b0'); }
  return h + 6;
};
/** TV static over the whole screen (transitions): k 0..1 */
UI.static = (g, r, k, t) => {
  if (k <= 0) return;
  const W = r.bw, H = r.bh, n = Math.round(W * H * .06 * k);
  px.blend(g, Math.min(1, k * 1.2), 'normal', () => px.rect(g, 0, 0, W, H, '#1a1828'));
  for (let i = 0; i < n; i++) { const x = (Math.random() * W) | 0, y = (Math.random() * H) | 0, c = Math.random() < .5 ? '#ffffff' : '#7a788a'; px.rect(g, x, y, 1 + (Math.random() * 2 | 0), 1, c); }
  const roll = ((t * 160) % (H + 30)) - 15; px.blend(g, .3 * k, 'add', () => px.rect(g, 0, roll, W, 6, '#ffffff'));
};
/** a slider row (dev mode, settings) */
UI.slider = (g, R, label, v, min, max, focused, t, valText) => {
  if (focused) { px.rect(g, R.x, R.y, R.w, R.h, '#3a1e5a'); UI.bulbs(g, R.x, R.y, R.w, R.h, t); }
  UI.text(g, label, R.x + 6, R.y + 3, focused ? '#ffcc33' : '#fff7e8');
  const bx = R.x + 6, by = R.y + R.h - 7, bw = R.w - 70, k = clamp((v - min) / (max - min), 0, 1);
  px.rect(g, bx, by, bw, 3, '#0c0618'); px.rect(g, bx, by, Math.round(bw * k), 3, focused ? '#ffcc33' : '#c08aff'); px.rect(g, bx + Math.round(bw * k) - 1, by - 2, 3, 7, '#fff7e8');
  UI.text(g, valText, R.x + R.w - 6, R.y + R.h - 11, '#fff7e8', { align: 'right' });
  return { bx, by, bw };
};
