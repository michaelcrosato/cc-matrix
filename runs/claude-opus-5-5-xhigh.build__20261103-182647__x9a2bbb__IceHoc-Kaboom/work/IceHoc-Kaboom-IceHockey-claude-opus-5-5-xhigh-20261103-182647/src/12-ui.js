/* ---- UI (section 12): 10-foot widgets. Big tiles (at most 6 choices showing), focus by d-pad, stick, arrows, WASD and
 * mouse hover, a click or ✕ / Enter picks, ○ / Esc goes back; an animated gold border with a slight scale-up and an
 * organ blip. The legend at the bottom names the buttons for the device used last. Idle tracks the attract mode's
 * 10 seconds ---- */
const UI = (() => {
  const GOLD = '#ffd36a', INK = '#eef4ff', MUTED = '#9fb2cc', PANEL = ['#0e1830', '#060a16'];
  /** any player's press this step (menus answer to every player) */
  const anyP = a => game.players.some(I => I.pressed(a));
  const anyRep = a => game.players.some(I => I.repeat(a, .32, .09));
  let lastMouse = null, prevMouse = null, mouseMoved = false;
  /** the mouse in HUD pixels (r.W x r.H, no camera), or null */
  const mousePt = () => { const I = game.input; return I.mouse && I.mouse.active && I.screenPoint ? I.screenPoint(I.mouse.cx, I.mouse.cy) : null; };
  /** input this step: keys, buttons, clicks, wheel, the mouse moved more than 8 px, a stick or trigger past .3 (the
   *  attract mode's idle rule); mouseMoved: the pointer moved at all this step (hover focus) */
  function anyInput() {
    const I = game.input, ms = mousePt();
    mouseMoved = !!(ms && prevMouse && (ms[0] !== prevMouse[0] || ms[1] !== prevMouse[1])); prevMouse = ms ? ms.slice() : null;
    let far = false;
    if (ms) { if (!lastMouse) lastMouse = ms.slice(); else if (Math.hypot(ms[0] - lastMouse[0], ms[1] - lastMouse[1]) > 8) { far = true; lastMouse = ms.slice(); I.lastDevice = 'mouse'; } }   // (a moving mouse is the device in use: prompts show mouse buttons)
    if (far) return true;
    for (const P2 of game.players) { if (P2.anyPressed()) return true; if ((P2.padAxes || []).some(a => Math.abs(a) > .3)) return true; if (P2.clicked && P2.clicked()) return true; }
    return false;
  }
  const Idle = { t: 0, step(dt) { if (anyInput()) Idle.t = 0; else Idle.t += dt; return Idle.t; }, reset() { Idle.t = 0; } };
  const pointer = () => mousePt();
  /** a box with a gradient and a border; focused ones glow gold */
  function panel(g, x, y, w, h, o = {}) {
    E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || PANEL, border: o.border || (o.focus ? GOLD : '#3a4a6a'), alpha: o.alpha === undefined ? .94 : o.alpha });
    if (o.focus) { const t = game.real, k = Math.floor(t * 10) % 4; px.rect(g, x - 1, y - 1, w + 2, 1, k < 2 ? GOLD : '#fff2c0'); px.rect(g, x - 1, y + h, w + 2, 1, k < 2 ? GOLD : '#fff2c0'); px.rect(g, x - 1, y, 1, h, k % 2 ? GOLD : '#fff2c0'); px.rect(g, x + w, y, 1, h, k % 2 ? GOLD : '#fff2c0'); }
  }
  /** the legend at the bottom: [['confirm', 'SELECT'], ['cancel', 'BACK']] as chips */
  function legend(g, r, items, y) {
    const str = items.map(([a, t]) => '{' + a + '} ' + t).join('     ');
    Glyphs.text(g, str, r.W / 2, y === undefined ? r.H - 14 : y, { align: 'center', color: MUTED });
  }
  const title = (g, text, x, y, sc = 3, colors) => E.font.title(g, text, Math.round(x), Math.round(y), { align: 'center', scale: sc, colors: colors || ['#ffffff', '#cfe8ff', '#7ab8ff', '#2a5ab8'], depth: 2, depthColor: '#0a1430' });
  /** a grid of big tiles: items [{ id, label, sub, icon(g, x, y, w, h, focus), disabled, color }] */
  class Tiles {
    constructor(items, o = {}) { this.items = items; this.cols = o.cols || 3; this.i = o.i || 0; this.w = o.w || 120; this.h = o.h || 56; this.gap = o.gap || 8; this.onPick = o.onPick || null; this.onBack = o.onBack || null; this.pulse = 0; this.rects = []; this.y = o.y || 80; this.x = o.x; this.enabled = true; }
    move(d) { const n = this.items.length; let j = this.i; for (let k = 0; k < n; k++) { j = (j + d + n) % n; if (!this.items[j].disabled) break; } if (j !== this.i) { this.i = j; this.pulse = 1; Synth.sfx('menuMove'); } }
    update(dt) {
      if (!this.enabled) return null;
      this.pulse = Math.max(0, this.pulse - dt * 4);
      const c = this.cols, n = this.items.length;
      if (anyRep('left')) this.move(-1); if (anyRep('right')) this.move(1);
      if (anyRep('up') && this.i - c >= 0) { this.i -= c; this.pulse = 1; Synth.sfx('menuMove'); } if (anyRep('down') && this.i + c < n) { this.i += c; this.pulse = 1; Synth.sfx('menuMove'); }
      const p = pointer(); if (p && mouseMoved) { const k = this.rects.findIndex(q => p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; this.pulse = 1; Synth.sfx('menuMove'); } }
      const ck = game.input.clicked(); if (ck) { const k = this.rects.findIndex(q => ck[0] >= q[0] && ck[0] < q[0] + q[2] && ck[1] >= q[1] && ck[1] < q[1] + q[3]); if (k >= 0 && !this.items[k].disabled) { this.i = k; return this.pick(); } }
      if (anyP('confirm') || anyP('start')) return this.pick();
      if (anyP('cancel') && this.onBack) { Synth.sfx('menuBack'); game.players.forEach(I => I.consumeAll()); this.onBack(); }
      return null;
    }
    pick() { const it = this.items[this.i]; if (!it || it.disabled) return null; Synth.sfx('menuSel'); game.players.forEach(I => I.consumeAll()); if (this.onPick) this.onPick(it, this.i); return it; }
    draw(g, r) {
      const c = this.cols, rows = Math.ceil(this.items.length / c), tw = c * this.w + (c - 1) * this.gap, x0 = this.x === undefined ? Math.round(r.W / 2 - tw / 2) : this.x;
      this.rects = [];
      this.items.forEach((it, k) => {
        const cx = k % c, cy = Math.floor(k / c), f = k === this.i, grow = f ? 2 + Math.round(this.pulse * 2) : 0;
        const x = x0 + cx * (this.w + this.gap) - grow, y = this.y + cy * (this.h + this.gap) - grow, w = this.w + grow * 2, h = this.h + grow * 2;
        this.rects.push([x0 + cx * (this.w + this.gap), this.y + cy * (this.h + this.gap), this.w, this.h]);
        panel(g, x, y, w, h, { focus: f, bg: it.disabled ? ['#141820', '#0a0c12'] : f ? ['#1c3260', '#0a1430'] : PANEL });
        if (it.icon) it.icon(g, x, y, w, h, f);
        E.font.text(g, it.label, x + w / 2, y + h - (it.sub ? 21 : 13), it.disabled ? '#5a6478' : f ? GOLD : INK, { align: 'center', scale: it.big === false ? 1 : 1, outline: '#000' });
        if (it.sub) E.font.text(g, it.sub, x + w / 2, y + h - 11, it.disabled ? '#4a5466' : MUTED, { align: 'center', font: 'tiny', outline: false });
      });
      void rows;
    }
  }
  /** a toast queue (objectives met, unlocks, items): drawn under the score bug */
  const toasts = [];
  const toast = (text, color = GOLD, t = 2.6) => { toasts.push({ text, color, t, max: t }); if (toasts.length > 3) toasts.shift(); };
  function drawToasts(g, r, y = 60) { let k = 0; for (const q of toasts) { q.t -= 1 / 60; const a = Math.min(1, q.t * 2), w = E.font.width(q.text) + 16; px.blend(g, .8 * a, 'normal', () => panel(g, r.W / 2 - w / 2, y + k * 16, w, 14, { border: q.color })); E.font.text(g, q.text, r.W / 2, y + k * 16 + 4, q.color, { align: 'center', outline: false }); k++; } for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t <= 0) toasts.splice(i, 1); }
  return { Idle, anyInput, anyP, anyRep, pointer, panel, legend, title, Tiles, toast, drawToasts, GOLD, INK, MUTED, PANEL, get mouseMoved() { return mouseMoved; } };
})();
