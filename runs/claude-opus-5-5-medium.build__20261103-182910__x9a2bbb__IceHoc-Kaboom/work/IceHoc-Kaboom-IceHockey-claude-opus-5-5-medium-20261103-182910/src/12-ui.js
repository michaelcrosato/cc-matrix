/* ---- UI: 10-foot widgets. Big tiles with focus by d-pad, stick, keys and mouse hover; a click picks; a bottom legend ---- */
const UI = (() => {
  const GOLD = '#ffd36a', INK = '#eef4ff', MUTED = '#9fb0c8', PANEL = ['#141c30', '#0a0f1c'], EDGE = '#3a4a6a';
  const panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || PANEL, border: o.border || EDGE, alpha: o.alpha === undefined ? .94 : o.alpha });
  const title = (g, str, x, y, scale = 3, colors) => E.font.title(g, str, Math.round(x), Math.round(y), { align: 'center', scale, colors: colors || ['#ffffff', '#ffe9a8', '#ffb347', '#e0662a'], depth: 2 });
  const text = (g, str, x, y, color = INK, o = {}) => E.font.text(g, str, Math.round(x), Math.round(y), color, Object.assign({ outline: false, shadow: '#000' }, o));
  /** any local player's press of an action (menus answer to every controller and keyboard half) */
  const anyPressed = a => game.players.some(p => p.pressed(a));
  const anyRepeat = a => game.players.some(p => p.repeat ? p.repeat(a, .35, .11) : p.pressed(a));
  /**
   * a menu of tiles: items [{ label, sub, disabled, draw(g, x, y, w, h, focused), pick() , left(), right() }], laid out by
   * layout(r) -> [{ x, y, w, h }] per item. Arrow keys / d-pad / stick move by geometry; confirm picks; mouse hover focuses
   */
  class Tiles {
    constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = o; this.rects = []; this._hp = null; this.t = 0; this.cancel = o.cancel || null; }
    move(dx, dy) {
      const a = this.rects[this.i]; if (!a) return;
      let best = -1, bd = 1e9;
      this.rects.forEach((b, j) => {
        if (j === this.i || this.items[j].hidden) return;
        const vx = (b.x + b.w / 2) - (a.x + a.w / 2), vy = (b.y + b.h / 2) - (a.y + a.h / 2);
        const along = vx * dx + vy * dy; if (along <= 2) return;
        const across = Math.abs(vx * dy - vy * dx), d = along + across * 2.2;
        if (d < bd) { bd = d; best = j; }
      });
      if (best >= 0) { this.i = best; A.sfx('move'); }
      else if (this.o.wrap !== false && this.rects.length > 1) {   // wrap around along the axis
        const order = this.rects.map((b, j) => [j, (b.x + b.w / 2) * dx + (b.y + b.h / 2) * dy]).filter(([j]) => !this.items[j].hidden).sort((p, q) => p[1] - q[1]);
        if (order.length) { this.i = order[0][0]; A.sfx('move'); }
      }
    }
    update(dt, r) {
      this.t += dt;
      const it = this.items[this.i];
      if (it && it.hidden) this.i = this.items.findIndex(x => !x.hidden);
      if (it && it.adjust && (anyRepeat('left') || anyRepeat('right'))) { it.adjust(anyRepeat('left') ? -1 : 1); A.sfx('move'); }
      else {
        if (anyRepeat('up')) this.move(0, -1); else if (anyRepeat('down')) this.move(0, 1);
        else if (anyRepeat('left')) this.move(-1, 0); else if (anyRepeat('right')) this.move(1, 0);
      }
      // the mouse: hover focuses (only when it moved), a click picks what's under it
      const inp = game.input, p = inp.pointer();
      if (p && (!this._hp || Math.abs(p[0] - this._hp[0]) + Math.abs(p[1] - this._hp[1]) > .5)) {
        const j = this.rects.findIndex((b, k) => !this.items[k].hidden && p[0] >= b.x && p[0] < b.x + b.w && p[1] >= b.y && p[1] < b.y + b.h);
        if (j >= 0 && j !== this.i) { this.i = j; A.sfx('move'); }
      }
      this._hp = p ? p.slice() : null;
      const c = inp.clicked();
      if (c) {
        const j = this.rects.findIndex((b, k) => !this.items[k].hidden && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h);
        if (j >= 0) { this.i = j; const t = this.items[j]; if (t.click) { t.click(c); return true; } return this.pick(); }
      }
      if (anyPressed('confirm') || anyPressed('start')) { if (this.o.noStart && !anyPressed('confirm')) return false; return this.pick(); }
      if (anyPressed('cancel') && this.cancel) { game.players.forEach(p => p.consumeAll()); A.sfx('back'); this.cancel(); return true; }
      return false;
    }
    pick() {
      const it = this.items[this.i]; game.players.forEach(p => p.consumeAll());
      if (!it || it.disabled) { A.sfx('deny'); return false; }
      A.sfx('pick'); if (it.pick) it.pick(); return true;
    }
    draw(g, r) {
      if (this.o.layout) this.rects = this.o.layout(r, this.items);
      this.items.forEach((it, j) => {
        const b = this.rects[j]; if (!b || it.hidden) return;
        const f = j === this.i, pulse = f ? Math.round(1 + Math.sin(this.t * 6)) : 0;
        if (it.draw) { it.draw(g, b.x, b.y, b.w, b.h, f); }
        else {
          panel(g, b.x - pulse, b.y - pulse, b.w + pulse * 2, b.h + pulse * 2, { border: f ? GOLD : EDGE, bg: f ? ['#2a3a5a', '#121a2e'] : PANEL });
          const sc = b.h >= 30 ? 2 : 1;
          text(g, it.label, b.x + b.w / 2, b.y + b.h / 2 - (it.sub ? 7 * sc : 3.5 * sc) , it.disabled ? '#5a6478' : f ? GOLD : INK, { align: 'center', scale: sc });
          if (it.sub) text(g, it.sub, b.x + b.w / 2, b.y + b.h / 2 + 3 * sc, it.disabled ? '#4a5468' : MUTED, { align: 'center' });
        }
        if (f) { const t = this.t * 8, c = Math.floor(t) % 2 ? GOLD : '#fff1c0'; px.rect(g, b.x - 2 - pulse, b.y - 2 - pulse, b.w + 4 + pulse * 2, 1, c); px.rect(g, b.x - 2 - pulse, b.y + b.h + 1 + pulse, b.w + 4 + pulse * 2, 1, c); px.rect(g, b.x - 2 - pulse, b.y - 2 - pulse, 1, b.h + 4 + pulse * 2, c); px.rect(g, b.x + b.w + 1 + pulse, b.y - 2 - pulse, 1, b.h + 4 + pulse * 2, c); }
      });
    }
  }
  /** a grid layout helper: n items in cols columns, centered in a box */
  const grid = (n, cols, cx, top, w, h, gx = 8, gy = 8) => {
    const rows = Math.ceil(n / cols), out = [];
    for (let i = 0; i < n; i++) { const rr = Math.floor(i / cols), cc = i % cols, inRow = Math.min(cols, n - rr * cols), x0 = cx - (inRow * w + (inRow - 1) * gx) / 2; out.push({ x: Math.round(x0 + cc * (w + gx)), y: Math.round(top + rr * (h + gy)), w, h }); }
    return out;
  };
  /** the bottom legend: [['pass', 'SELECT'], ['deke', 'BACK']] as chips, centered */
  function legend(g, r, items, y) {
    const parts = items.map(([a, l]) => '{' + a + '} ' + l).join('    ');
    y = y === undefined ? r.H - 16 : y;
    const w = Glyphs.text(null, parts, 0, 0);
    px.rect(g, Math.round(r.W / 2 - w / 2 - 6), y - 4, Math.round(w + 12), 15, '#05070c');
    Glyphs.text(g, parts, r.W / 2, y, '#d8e0f0', { align: 'center' });
  }
  /* idle: 10 s with no input on the title and menus starts the attract mode (PLAN 15.1) */
  const Idle = { t: 0, last: null, reset() { this.t = 0; },
    update(dt) {
      let active = false;
      for (const p of game.players) {
        if (p.anyPressed()) active = true;
        const m = p.move(); if (Math.hypot(m[0], m[1]) > .3) active = true;
        if (p.padAim) active = true;
        if (p.padAxes && p.padAxes.some(a => Math.abs(a) > .3)) active = true;
      }
      const pt = game.input.pointer();
      if (pt && this.last && Math.hypot(pt[0] - this.last[0], pt[1] - this.last[1]) > 8 * (game.r ? 1 : 1) / 3) active = true;
      if (pt && (!this.last || active)) this.last = pt.slice();
      if (game.input.clicked()) active = true;
      if (wheelT > 0) { active = true; wheelT = 0; }
      if (active) this.t = 0; else this.t += dt;
      return this.t;
    } };
  let wheelT = 0;
  if (typeof addEventListener === 'function') try { addEventListener('wheel', () => { wheelT = 1; }, { passive: true }); addEventListener('keydown', () => { Touch.sawKey(); }); addEventListener('gamepadconnected', () => { Touch.sawKey(); }); } catch (e) { /* no DOM */ }
  /* toasts: short notes that stack top-left of the bottom area */
  const toasts = [];
  const toast = (title, sub, color = GOLD) => { toasts.push({ title, sub, color, t: 0 }); if (toasts.length > 3) toasts.shift(); };
  function drawToasts(g, r, dt) {
    toasts.forEach((t, i) => {
      t.t += dt; const a = t.t < .25 ? t.t / .25 : t.t > 3.2 ? Math.max(0, 1 - (t.t - 3.2) / .4) : 1, w = Math.max(E.font.width(t.title) + 16, E.font.width(t.sub || '') + 16);
      const x = Math.round(r.W - w - 8 + (1 - a) * 40), y = 46 + i * 30;
      panel(g, x, y, w, 26, { border: t.color, alpha: .9 }); text(g, t.title, x + 8, y + 4, t.color); if (t.sub) text(g, t.sub, x + 8, y + 14, MUTED);
    });
    for (let i = toasts.length - 1; i >= 0; i--) if (toasts[i].t > 3.6) toasts.splice(i, 1);
  }
  return { GOLD, INK, MUTED, EDGE, PANEL, panel, title, text, Tiles, grid, legend, Idle, toast, drawToasts, anyPressed, anyRepeat };
})();

/* ---- Touch: a touch-only device gets no touch controls, a banner and the settings button (PLAN 15.2) ---- */
const Touch = (() => {
  let keySeen = false;
  const mm = q => { try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch (e) { return false; } };
  const padSeen = () => { try { return typeof navigator !== 'undefined' && navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(p => p && p.connected); } catch (e) { return false; } };
  return {
    sawKey() { keySeen = true; },
    get only() { return !HUB && !keySeen && mm('(pointer: coarse)') && !mm('(any-pointer: fine)') && !padSeen(); }
  };
})();
