// 53-ui: the 10-foot interface: big cards in a list or a grid; the d-pad, a stick, the arrows or WASD move the focus, the
// mouse moves it by hovering, a click or confirm picks, cancel goes back; a prompt bar names confirm and back in the
// glyphs of the device used last. Every player's pad can drive it.
const UISND = { focus: () => G.sfx && G.sfx.play('focus'), pick: () => G.sfx && G.sfx.play('confirm'), back: () => G.sfx && G.sfx.play('back') };
function uiInputs() { return (G.game.players && G.game.players.length ? G.game.players : [G.game.input]); }
function uiPressed(a) { return uiInputs().some(I => I.pressed(a)); }
function uiRepeat(a) { return uiInputs().some(I => I.repeat(a, .32, .1)); }
class UIList {
  constructor(o) { Object.assign(this, { items: [], i: 0, x: 'center', y: 60, w: 260, h: 30, gap: 6, cols: 1, title: '', sub: '', t: 0, rects: [], onPick: null, onBack: null, onFocus: null }, o); this.i = Math.min(this.i, Math.max(0, this.items.length - 1)); this._mouse = null; }
  get focused() { return this.items[this.i]; }
  update(dt) {
    this.t += dt; const n = this.items.length; if (!n) return null;
    const I = G.game.input, move = d => { let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled) break; } if (j !== this.i) { this.i = j; UISND.focus(); if (this.onFocus) this.onFocus(this.focused); } };
    if (uiRepeat('up')) move(-this.cols); if (uiRepeat('down')) move(this.cols);
    if (this.cols > 1) { if (uiRepeat('left')) move(-1); if (uiRepeat('right')) move(1); }
    else if (this.focused && this.focused.choices) { if (uiRepeat('left')) this.turn(-1); if (uiRepeat('right')) this.turn(1); }
    // the mouse: hovering moves the focus, a click picks
    const m = I.pointer && I.pointer();
    if (m && (!this._mouse || Math.abs(m[0] - this._mouse[0]) + Math.abs(m[1] - this._mouse[1]) > 1)) { this._mouse = m.slice(); const j = this.rects.findIndex(r => r && m[0] >= r[0] && m[0] < r[0] + r[2] && m[1] >= r[1] && m[1] < r[1] + r[3]); if (j >= 0 && j !== this.i && !this.items[j].disabled) { this.i = j; UISND.focus(); if (this.onFocus) this.onFocus(this.focused); } }
    const c = I.clicked && I.clicked();
    if (c && this.t > .25) { const j = this.rects.findIndex(r => r && c[0] >= r[0] && c[0] < r[0] + r[2] && c[1] >= r[1] && c[1] < r[1] + r[3]); if (j >= 0 && !this.items[j].disabled) { this.i = j; return this.pick(c); } if (this.backRect && c[0] >= this.backRect[0] && c[0] < this.backRect[0] + this.backRect[2] && c[1] >= this.backRect[1] && c[1] < this.backRect[1] + this.backRect[3]) return this.back(); }
    if (this.t > .2 && uiPressed('confirm')) return this.pick();
    if (this.t > .2 && uiPressed('cancel')) return this.back();
    return null;
  }
  turn(d) { const it = this.focused, ch = it.choices; if (!ch) return; it.ci = ((it.ci || 0) + d + ch.length) % ch.length; UISND.focus(); if (it.onTurn) it.onTurn(ch[it.ci], it.ci); }
  pick(at) { const it = this.focused; if (!it || it.disabled) return null; if (it.choices && at && this.rects[this.i]) { const r = this.rects[this.i]; this.turn(at[0] < r[0] + r[2] / 2 ? -1 : 1); return null; } if (it.choices && !it.act) { this.turn(1); return null; } UISND.pick(); if (it.act) it.act(it); if (this.onPick) this.onPick(it, this.i); return it; }
  back() { UISND.back(); if (this.onBack) this.onBack(); return 'back'; }
  draw(g, W, Ht) {
    const n = this.items.length, cols = this.cols, rows = Math.ceil(n / cols), cw = this.w, ch = this.h, gap = this.gap;
    const tw = cols * cw + (cols - 1) * gap, x0 = this.x === 'center' ? Math.round(W / 2 - tw / 2) : this.x, y0 = this.y === 'center' ? Math.round(Ht / 2 - (rows * (ch + gap)) / 2) : this.y;
    if (this.title) E.font.title(g, this.title, W / 2, y0 - 34, { scale: 2, colors: ['#fff6d8', '#f0b050', '#c86a20'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10', align: 'center' });
    if (this.sub) E.font.text(g, this.sub, W / 2, y0 - 12, '#d8c8a8', { align: 'center', outline: false, shadow: '#000' });
    this.rects.length = 0;
    this.items.forEach((it, j) => {
      const cx = x0 + (j % cols) * (cw + gap), cy = y0 + Math.floor(j / cols) * (ch + gap), on = j === this.i, pulse = on ? Math.sin(this.t * 6) * .5 + .5 : 0;
      this.rects.push([cx, cy, cw, ch]);
      drawCard(g, cx + (on ? -2 : 0), cy, cw + (on ? 4 : 0), ch, on, pulse, it.disabled);
      let tx = cx + 12; if (it.icon) { it.icon(g, cx + 8, cy + ch / 2, ch - 8, on); tx = cx + ch + 6; }
      const lbl = it.choices ? it.label + ':' : it.label, room = cx + cw - 8 - tx - (it.right ? E.font.width(it.right) + 8 : 0), sc = ch >= 28 && E.font.width(lbl, { scale: 2 }) <= room ? 2 : 1;   // (a label too long for its card drops a size rather than run off it)
      E.font.text(g, lbl, tx, cy + (it.sub ? (sc === 2 ? 3 : 5) : ch / 2 - 3.5 * sc), it.disabled ? '#7a6a58' : on ? '#ffffff' : '#f0e0c8', { scale: sc, shadow: '#1a0c08', outline: false });
      if (it.choices) { const v = it.choices[it.ci || 0], vx = cx + cw - 14; E.font.text(g, '‹ ' + v + ' ›', vx, cy + ch / 2 - 3.5 * sc, on ? '#ffd040' : '#d8c8a8', { align: 'right', scale: sc, outline: false, shadow: '#1a0c08' }); }
      if (it.sub) E.font.text(g, it.sub, tx, cy + ch - 10, on ? '#ffe0b0' : '#b8a488', { outline: false });
      if (it.right) E.font.text(g, it.right, cx + cw - 10, cy + 6, '#ffd040', { align: 'right', outline: false });
      if (on) { const ax = cx - 10 - Math.round(pulse * 2); px.poly(g, [[ax, cy + ch / 2 - 5], [ax + 6, cy + ch / 2], [ax, cy + ch / 2 + 5]], '#ff8a3a'); }
    });
  }
}
function drawCard(g, x, y, w, h, on, pulse, dis) {
  const wood = E.tones(dis ? '#3a2e24' : on ? '#7a4a24' : '#4a3020');
  px.rect(g, x + 2, y + 3, w, h, '#0a0604');
  px.rect(g, x, y, w, h, on ? '#ffa040' : '#a8742a'); px.rect(g, x + 1, y + 1, w - 2, h - 2, '#1a0e06');
  px.rect(g, x + 2, y + 2, w - 4, h - 4, wood.base); px.rect(g, x + 2, y + 2, w - 4, 2, wood.lt); px.rect(g, x + 2, y + h - 4, w - 4, 2, wood.sh);
  for (let yy = y + 7; yy < y + h - 5; yy += 6) px.rect(g, x + 4, yy, w - 8, 1, wood.sh);
  for (const [bx, by] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) { px.rect(g, bx, by, 2, 2, '#e8c070'); px.dot(g, bx, by, '#fff0c0'); }
  if (on) { px.rect(g, x - 1, y - 1, w + 2, 1, pulse > .5 ? '#ffe0a0' : '#ff8a3a'); px.rect(g, x - 1, y + h, w + 2, 1, '#ff8a3a'); px.rect(g, x - 1, y, 1, h, '#ff8a3a'); px.rect(g, x + w, y, 1, h, '#ff8a3a'); }
}
/** the prompt bar: confirm and back, in the glyphs of the device used last */
function promptBar(g, W, Ht, pairs) {
  let x = W / 2 - pairs.reduce((s, [a, t]) => s + Glyph.measure(a, G.game.input) + 8 + E.font.width(t) + 18, 0) / 2;
  const y = Ht - 14;
  px.blend(g, .5, 'normal', () => px.rect(g, 0, Ht - 26, W, 26, '#0a0604'));
  for (const [a, t] of pairs) x += Glyph.cue(g, a, t, x, y, G.game.input, { align: 'left' }) + 18;
}
