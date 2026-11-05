// ---------------------------------------------------------------- the UI kit: 10-foot canvas widgets, focus handled once (any player, mouse hover, clicks)
MT.ui = (() => {
  const F = E.font;
  const T = (g, s, x, y, c = '#fff7e8', o = {}) => F.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
  let wheel = 0, lastPtr = null, ptrMoved = false;
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('wheel', e => { wheel += Math.sign(e.deltaY); }, { passive: true });
  const api = {
    T,
    lastI() { return MT.lastInput || (MT.game && MT.game.input); },
    nav(a) { const g = MT.game; if (!g) return false; for (const p of g.players) { if (a === 'up' || a === 'down' || a === 'left' || a === 'right' ? p.repeat(a, .32, .1) : p.pressed(a)) { MT.lastInput = p; return true; } } return false; },
    held(a) { const g = MT.game; return !!g && g.players.some(p => p.down(a)); },
    takeWheel() { const w = wheel; wheel = 0; return w; },
    tick() {   // once a step: the pointer's motion (hover moves focus only when it moved)
      const g = MT.game, p = g && g.input.pointer ? g.input.pointer() : null;
      ptrMoved = !!p && (!lastPtr || Math.abs(p[0] - lastPtr[0]) + Math.abs(p[1] - lastPtr[1]) > .5); lastPtr = p ? p.slice() : null;
      for (const q of g.players) if (q.anyPressed()) MT.lastInput = q;
    },
    pointer() { return MT.game && MT.game.input.pointer ? MT.game.input.pointer() : null; },
    ptrMoved() { return ptrMoved; },
    clicked() { const g = MT.game; return g && g.input.clicked ? g.input.clicked() : null; },
    inRect(p, r) { return p && r && p[0] >= r[0] && p[0] < r[0] + r[2] && p[1] >= r[1] && p[1] < r[1] + r[3]; },
    panel(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || ['#2a1446', '#140a24'], border: o.border || '#ffcc33', alpha: o.alpha === undefined ? .9 : o.alpha }); },
    // the marquee-bulb frame chasing round a rectangle
    bulbs(g, x, y, w, h, t, col = '#ffcc33', dim = '#5a4020', gap = 5) {
      const per = 2 * (w + h), n = Math.floor(per / gap), k = Math.floor(t * 12);
      for (let i = 0; i < n; i++) {
        let d = i * gap, px0, py0;
        if (d < w) { px0 = x + d; py0 = y; } else if ((d -= w) < h) { px0 = x + w; py0 = y + d; } else if ((d -= h) < w) { px0 = x + w - d; py0 = y + h; } else { d -= w; px0 = x; py0 = y + h - d; }
        px.rect(g, Math.round(px0) - 1, Math.round(py0) - 1, 2, 2, (i + k) % 3 === 0 ? col : dim);
      }
    },
    promptBar(g, r, items, I) {
      I = I || api.lastI(); const y = r.H - 16;
      px.blend(g, .7, 'normal', () => px.rect(g, 0, y - 4, r.W, 20, '#0a0612'));
      MT.glyph.prompt(g, r.W / 2, y, items, I, { align: 'center' });
    },
    title(g, r, s, y = 14, col = '#ffcc33') { F.title(g, s, r.W / 2, y, { scale: 2, align: 'center', colors: [col, '#ff7a5a'], outline: '#1a0a24', depth: 1, depthColor: '#5a0a3a' }); },
    backdrop(r, tn) {   // the studio behind every front-end screen: dark velvet, sweeping spotlights
      r.sky(['#0c0618', '#1c0c30', '#2a1446']);
      r.overlay(g => {
        for (let i = 0; i < 4; i++) {
          const a = Math.sin(tn * .5 + i * 1.7) * .5, x = r.W * (i + .5) / 4;
          px.blend(g, .12, 'add', () => px.poly(g, [[x - 3, 0], [x + 3, 0], [x + Math.sin(a) * r.H + 40, r.H], [x + Math.sin(a) * r.H - 40, r.H]], ['#ff2e88', '#2ee6ff', '#ffcc33', '#9a7aff'][i]));
        }
        for (let i = 0; i < r.W; i += 6) px.dot(g, i, r.H - 3, (i / 6 + Math.floor(tn * 8)) % 3 === 0 ? '#ffcc33' : '#4a3018');
      });
    }
  };
  // a vertical list of items, each { label, act, left, right, value: () => string, disabled, h }
  class FocusList {
    constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.rects = []; this.o = o; this.t = 0; this.onCancel = o.onCancel || null; }
    get cur() { return this.items[this.i]; }
    update(dt) {
      this.t += dt; const n = this.items.length; if (!n) return;
      const mv = d => { let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; MT.sfx('blip'); } };
      if (api.nav('up')) mv(-1); if (api.nav('down')) mv(1);
      const w = api.takeWheel(); if (w) { if (this.cur.left && this.cur.right) (w < 0 ? this.cur.right : this.cur.left)(); else mv(w > 0 ? 1 : -1); }
      const p = api.pointer();
      if (api.ptrMoved() && p) for (let k = 0; k < this.rects.length; k++) if (api.inRect(p, this.rects[k]) && !this.items[k].disabled && k !== this.i) { this.i = k; MT.sfx('blip'); }
      const it = this.cur;
      if (it.left && api.nav('left')) { it.left(); MT.sfx('slider'); }
      if (it.right && api.nav('right')) { it.right(); MT.sfx('slider'); }
      const c = api.clicked();
      if (c) for (let k = 0; k < this.rects.length; k++) if (api.inRect(c, this.rects[k]) && !this.items[k].disabled) { this.i = k; this.fire(); return; }
      if (api.nav('confirm')) { this.fire(); return; }
      if (api.nav('cancel') && this.onCancel) { MT.sfx('back'); this.onCancel(); }
    }
    fire() { const it = this.cur; if (it && !it.disabled && it.act) { MT.sfx('bell'); it.act(); } }
    draw(g, r, x, y, w, o = {}) {
      const rowH = o.rowH || 22, s = o.scale || 1; this.rects = [];
      this.items.forEach((it, k) => {
        const yy = y + k * rowH, on = k === this.i, h = rowH - 4, label = it.label + (it.value ? '  ' + it.value() : '');
        this.rects.push([x, yy, w, h]);
        api.panel(g, x, yy, w, h, { alpha: on ? .95 : .75, border: on ? '#ffcc33' : '#5a3a6a', bg: on ? ['#4a1a5c', '#2a0e3a'] : ['#24123a', '#140a24'] });
        if (on) api.bulbs(g, x - 2, yy - 2, w + 4, h + 4, this.t);
        const c = it.disabled ? '#6a5a7a' : on ? '#ffcc33' : '#fff7e8';
        T(g, label, o.align === 'left' ? x + 8 : x + w / 2, yy + h / 2 - 3.5 * s, c, { align: o.align === 'left' ? 'left' : 'center', scale: s });
        if (on && it.left) { T(g, '←', x + 4, yy + h / 2 - 3.5, '#ffcc33'); T(g, '→', x + w - 9, yy + h / 2 - 3.5, '#ffcc33'); }
      });
    }
  }
  api.FocusList = FocusList;
  // the lower third: name plate, the line typing, a live portrait
  api.lowerThird = (g, r) => {
    const L = MT.lines.current; if (!L || MT.game.settings.subtitles === false && L.prio < 3) return;
    const w = Math.min(r.W - 20, 380), x = Math.round(r.W / 2 - w / 2), y = r.H - 50, h = 40;
    api.panel(g, x, y, w, h, { alpha: .9 });
    MT.cast.drawPortrait(g, L.speaker, x + 4, y + 4, 32);
    const name = MT.TEXT.speakers[L.speaker] || L.speaker;
    px.rect(g, x + 40, y - 6, F.width(name) + 8, 11, '#ff2e88'); T(g, name, x + 44, y - 4, '#ffffff');
    const lines = F.wrap(MT.lines.shown(), w - 48); lines.slice(0, 3).forEach((s, i) => T(g, s, x + 42, y + 6 + i * 9, '#fff7e8'));
    if (L.hint) { const hw = F.width(L.hint) + 10; api.panel(g, r.W / 2 - hw / 2, y - 22, hw, 13, { alpha: .9, border: '#2ee6ff' }); T(g, L.hint, r.W / 2, y - 19, '#2ee6ff', { align: 'center' }); }
  };
  api.banners = (g, r) => {
    MT.banner.list.forEach((b, i) => {
      const u = b.t, sl = Math.min(1, u / .25), out = Math.max(0, (u - b.dur + .3) / .3), y = Math.round(r.H * .3 + i * 30 - (1 - sl) * 20 - out * 10);
      const sc = b.big ? 2 : 1, w = F.width(b.text) * sc + 24, x = Math.round(r.W / 2 - w / 2);
      if (out >= 1) return;
      api.panel(g, x, y, w, 14 * sc + (b.sub ? 10 : 0) + 6, { alpha: .9, border: b.color });
      api.bulbs(g, x - 2, y - 2, w + 4, 14 * sc + (b.sub ? 10 : 0) + 10, MT.game.real, b.color);
      T(g, b.text, r.W / 2, y + 4, b.color, { align: 'center', scale: sc });
      if (b.sub) T(g, b.sub, r.W / 2, y + 6 + 7 * sc + 4, '#fff7e8', { align: 'center' });
    });
  };
  // the TV-static wipe between rooms
  api.static = (g, r, k) => {
    if (k <= 0) return;
    px.blend(g, Math.min(1, k), 'normal', () => { px.rect(g, 0, 0, r.W, r.H, '#202028'); for (let i = 0; i < r.W * r.H / 40; i++) px.dot(g, Math.random() * r.W, Math.random() * r.H, Math.random() < .5 ? '#ffffff' : '#606070'); });
    const roll = (MT.game.real * 200) % r.H; px.blend(g, .3 * k, 'add', () => px.rect(g, 0, roll, r.W, 10, '#ffffff'));
  };
  return api;
})();
