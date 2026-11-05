/* BASKETBLAM - 10-foot UI kit: glyph prompts (PlayStation / Xbox / keyboard / mouse), focus lists, cards */
const padStyle = () => (game.settings.glyphs === 'Xbox' ? 'xbox' : 'ps');
const lastDev = () => game.input.lastDevice || 'keyboard';
const PADMAP = { shoot: 'sq', pass: 'x', shove: 'o', oop: 'tri', turbo: 'r2', taunt: 'l1', confirm: 'x', cancel: 'o', start: 'opt', pause: 'opt', move: 'ls' };
const KEYMAP = { shoot: 'SPACE', pass: 'E', shove: 'Q', oop: 'F', turbo: 'SHIFT', taunt: 'R', confirm: 'ENTER', cancel: 'ESC', start: 'ENTER', pause: 'ESC', move: 'WASD' };
const XBOX = { sq: ['X', '#4a8cff'], x: ['A', '#46d060'], o: ['B', '#ff4a4a'], tri: ['Y', '#ffd23a'], r2: ['RT', '#d0d0e0'], l1: ['LB', '#d0d0e0'], opt: ['=', '#d0d0e0'], ls: ['L', '#d0d0e0'] };
function glyphWidth(action) {
  const dev = lastDev();
  if (dev === 'gamepad') { const b = PADMAP[action] || 'x'; return (b === 'r2' || b === 'l1') && padStyle() === 'ps' ? 14 : (XBOX[b] && XBOX[b][0].length > 1 && padStyle() === 'xbox' ? 14 : 12); }
  if (dev === 'mouse' && (action === 'shoot' || action === 'pass')) return 12;
  return E.font.width(KEYMAP[action] || '?', { font: 'tiny' }) + 7;
}
function drawGlyph(g, action, x, y) { // (x, y) = top-left; height 11
  const dev = lastDev();
  if (dev === 'gamepad') {
    const b = PADMAP[action] || 'x', cx = x + 5, cy = y + 5;
    if (padStyle() === 'xbox') {
      const [t, col] = XBOX[b] || ['?', '#fff']; const w = t.length > 1 ? 14 : 11;
      if (t.length > 1) { px.rect(g, x, y + 1, w, 9, '#202030'); px.rect(g, x, y + 1, w, 1, '#8a8aa0'); E.font.text(g, t, x + w / 2, y + 2, col, { align: 'center', font: 'tiny', outline: false }); }
      else { px.disc(g, cx, cy, 5, '#14141e'); px.disc(g, cx, cy, 4, col); E.font.text(g, t, cx, y + 2, '#10101a', { align: 'center', font: 'tiny', outline: false }); }
    } else {
      if (b === 'r2' || b === 'l1') { px.rect(g, x, y + 1, 14, 9, '#202030'); px.rect(g, x, y + 1, 14, 1, '#8a8aa0'); E.font.text(g, b === 'r2' ? 'R2' : 'L1', x + 7, y + 2, '#e0e0f0', { align: 'center', font: 'tiny', outline: false }); }
      else if (b === 'opt') { px.disc(g, cx, cy, 5, '#14141e'); px.rect(g, cx - 2, cy - 2, 5, 1, '#d0d0e0'); px.rect(g, cx - 2, cy, 5, 1, '#d0d0e0'); px.rect(g, cx - 2, cy + 2, 5, 1, '#d0d0e0'); }
      else if (b === 'ls') { px.disc(g, cx, cy, 5, '#14141e'); px.disc(g, cx, cy, 3, '#8a8aa0'); }
      else {
        px.disc(g, cx, cy, 5, '#14141e');
        if (b === 'x') { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#6ab0ff', 1); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, '#6ab0ff', 1); }
        else if (b === 'o') { px.disc(g, cx, cy, 3, '#ff6a6a'); px.disc(g, cx, cy, 2, '#14141e'); }
        else if (b === 'sq') { px.rect(g, cx - 2, cy - 2, 5, 5, '#ff9ad0'); px.rect(g, cx - 1, cy - 1, 3, 3, '#14141e'); }
        else if (b === 'tri') { px.poly(g, [[cx, cy - 3], [cx + 3, cy + 2], [cx - 3, cy + 2]], '#5ae0a0'); px.poly(g, [[cx, cy - 1], [cx + 1, cy + 1], [cx - 1, cy + 1]], '#14141e'); }
      }
    }
    return;
  }
  if (dev === 'mouse' && (action === 'shoot' || action === 'pass')) {
    px.rect(g, x + 1, y, 9, 11, '#d8d8e8'); px.rect(g, x + 1, y + 5, 9, 6, '#a0a0b8'); px.rect(g, action === 'shoot' ? x + 1 : x + 6, y, 4, 5, '#ff6a3a'); px.rect(g, x + 5, y, 1, 5, '#202030'); return;
  }
  const t = KEYMAP[action] || '?', w = E.font.width(t, { font: 'tiny' }) + 6;
  px.rect(g, x, y + 1, w, 9, '#d8d8e8'); px.rect(g, x, y + 9, w, 1, '#8a8aa8'); E.font.text(g, t, x + w / 2, y + 3, '#202030', { align: 'center', font: 'tiny', outline: false });
}
function promptW(action, label) { return glyphWidth(action) + 3 + E.font.width(label, { font: 'tiny' }) + 8; }
function drawPrompts(g, list, cx, y) { // list of [action, label]
  const total = list.reduce((a, [ac, lb]) => a + promptW(ac, lb), 0) - 8; let x = Math.round(cx - total / 2);
  for (const [ac, lb] of list) {
    drawGlyph(g, ac, x, y); const w = glyphWidth(ac);
    E.font.text(g, lb, x + w + 3, y + 3, '#e8e4f8', { font: 'tiny', outline: '#000' }); x += promptW(ac, lb);
  }
}

/* ---- focus list: big cards you move through with stick / d-pad / keys / mouse ---- */
class FocusList {
  constructor(items, o = {}) { this.items = items; this.i = 0; this.o = o; this.hover = -1; this.rects = []; this.t = 0; }
  update(dt) {
    this.t += dt; const I = game.input, n = this.items.length; if (!n) return null;
    const dis = k => this.items[k] && this.items[k].disabled;
    const step = d => { let k = this.i; for (let tries = 0; tries < n; tries++) { k = (k + d + n) % n; if (!dis(k)) { this.i = k; sfx('tick', { vol: 1.5 }); return; } } };
    if (this.o.horizontal) { if (I.repeat('left', .3, .12)) step(-1); if (I.repeat('right', .3, .12)) step(1); }
    else { if (I.repeat('up', .3, .12)) step(-1); if (I.repeat('down', .3, .12)) step(1); }
    const m = mouseHud();
    if (m) { const k = this.rects.findIndex(r => m[0] >= r[0] && m[0] <= r[0] + r[2] && m[1] >= r[1] && m[1] <= r[1] + r[3]); if (k >= 0 && k !== this.hoverK && !dis(k)) { this.i = k; sfx('tick', { vol: 1.5 }); } this.hoverK = k; }
    const c = I.clicked && I.clicked();
    if (c) { const k = this.rects.findIndex(r => c[0] >= r[0] && c[0] <= r[0] + r[2] && c[1] >= r[1] && c[1] <= r[1] + r[3]); if (k >= 0 && !dis(k)) { this.i = k; return this.pickIt(); } }
    if (I.pressed('confirm') || I.pressed('start')) { I.consume && I.consume('confirm'); I.consume && I.consume('start'); if (!dis(this.i)) return this.pickIt(); }
    if (I.pressed('cancel') && this.o.onCancel) { I.consume('cancel'); sfx('cancel' in game.audio.presets ? 'tick' : 'tick'); this.o.onCancel(); }
    return null;
  }
  pickIt() { sfx('perfect', { vol: .6 }); const it = this.items[this.i]; if (it.fn) it.fn(it, this.i); return it; }
  // draws vertical big buttons from (x, y), width w
  draw(g, x, y, w, h = 20, gap = 4) {
    this.rects = [];
    this.items.forEach((it, k) => {
      const yy = y + k * (h + gap), foc = k === this.i, dis = it.disabled, pulse = foc ? Math.sin(this.t * 8) * .5 + .5 : 0;
      this.rects.push([x, yy, w, h]);
      const bg = dis ? ['#15151e', '#101018'] : foc ? ['#ffb830', '#e8601a'] : ['#2a2c44', '#1a1c30'];
      E.ui.box(g, x + (foc ? 4 : 0), yy, w - (foc ? 4 : 0), h, { bg, border: foc ? '#fff6c0' : dis ? '#2a2a38' : '#5a5e88', alpha: 1 });
      E.font.text(g, it.label, x + 12 + (foc ? 4 : 0), yy + (it.sub ? 3 : (h - 7) / 2 | 0), dis ? '#5a5a6a' : foc ? '#2a1204' : '#e8e8ff', { outline: false, shadow: foc ? '#ffe8a0' : '#000' });
      if (it.sub) E.font.text(g, it.sub, x + 12 + (foc ? 4 : 0), yy + 12, dis ? '#4a4a58' : foc ? '#5a2a0a' : '#9a9ac8', { font: 'tiny', outline: false });
      if (foc) px.poly(g, [[x - 2 + (pulse * 2 | 0), yy + h / 2 - 4], [x - 2 + (pulse * 2 | 0), yy + h / 2 + 4], [x + 3 + (pulse * 2 | 0), yy + h / 2]], '#fff6c0');
    });
  }
}
// a row selector value cycler: left/right changes values (for setup screens)
function cycle(I, n, i) { if (I.repeat('left', .35, .15)) { sfx('tick', { vol: 1.5 }); return (i + n - 1) % n; } if (I.repeat('right', .35, .15)) { sfx('tick', { vol: 1.5 }); return (i + 1) % n; } return i; }
const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1c1e36', '#10121e'], border: '#6a6ea8', alpha: .94 }, o));
const bigText = (g, s, x, y, o = {}) => E.font.title(g, s, x, y, Object.assign({ scale: 2, colors: ['#fffbe8', '#ffd36a', '#ff8a2a'], depth: 2, depthColor: '#5a1a08', align: 'center' }, o));
const txt = (g, s, x, y, c = '#e8e4f8', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#000' }, o));
const ratingPips = (g, v, x, y) => { for (let i = 0; i < 10; i++) px.rect(g, x + i * 4, y, 3, 4, i < v ? (v >= 9 ? '#ff8a2a' : v >= 7 ? '#ffd36a' : '#8ad0ff') : '#2a2c44'); };
function drawPortraitOf(g, spec, tdef, x, y, size = 36) {
  spec._rig = spec._rig || makeRig(spec, tdef, { size: 1.5 });
  spec._rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 });
  try { spec._rig.drawPortrait(g, x, y, size, { zoom: 2.6, turn: .4, bg: tdef.dark, frame: tdef.color }); } catch (e) { px.rect(g, x, y, size, size, tdef.dark); }
}
