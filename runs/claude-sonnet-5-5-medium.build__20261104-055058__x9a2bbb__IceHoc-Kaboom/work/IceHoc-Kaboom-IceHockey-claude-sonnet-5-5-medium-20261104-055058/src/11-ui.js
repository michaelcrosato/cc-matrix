/* ---- GLYPHS + 10-FOOT UI ---- */
const Glyphs = (() => {
  const PS = { '✕': '#7aa7ff', '○': '#ff6b6b', '□': '#ff8ad8', '△': '#4fe3a1' }, XB = { A: '#5fd35f', B: '#ff6b6b', X: '#6aa8ff', Y: '#ffd24a' };
  const XMAP = { '✕': 'A', '○': 'B', '□': 'X', '△': 'Y', L1: 'LB', R1: 'RB', L2: 'LT', R2: 'RT' };
  const dev = (I) => { const d = (I || game.input).lastDevice || 'keyboard'; return d === 'touch' ? 'keyboard' : d; };
  function label(I, action, d) { let l = ''; try { l = (I || game.input).label(action, d); } catch (e) { l = '?'; } return String(l || '?'); }
  /** draw a chip; returns its width */
  function chip(g, action, x, y, o = {}) {
    const I = o.input || game.input, d = o.device || dev(I); let l = label(I, action, d); const xbox = S('glyphs') === 'Xbox';
    if (d === 'gamepad') {
      if (xbox && XMAP[l]) l = XMAP[l];
      const sh = /^(L1|R1|L2|R2|LB|RB|LT|RT)$/.test(l), col = PS[l] || XB[l] || '#e8f0ff';
      if (sh) { const w = l.length * 6 + 6; px.rect(g, x, y - 5, w, 10, '#26304a'); px.rect(g, x, y - 5, w, 1, '#8a9ac8'); E.font.text(g, l, x + 3, y - 3, '#ffffff', { outline: false }); return w + 2; }
      px.disc(g, x + 6, y, 6, '#1a2038'); px.disc(g, x + 6, y, 5, '#2c3658'); E.font.text(g, l, x + 6, y - 3, col, { align: 'center', outline: false, shadow: '#000' }); return 14;
    }
    if (d === 'mouse' || /^(Mouse|Click|LMB|RMB|MMB)/i.test(l)) {
      const lit = /0|Left|LMB/.test(l) ? 0 : /2|Right|RMB/.test(l) ? 2 : 1; px.rect(g, x, y - 6, 8, 12, '#d8dce8'); px.rect(g, x, y - 6, 8, 12, '#d8dce8'); px.rect(g, x + 3, y - 6, 1, 5, '#556'); px.rect(g, x + (lit === 0 ? 0 : lit === 2 ? 4 : 3), y - 6, lit === 1 ? 2 : 4, 5, '#ffd36a'); px.rect(g, x, y, 8, 1, '#556'); return 11;
    }
    const w = Math.max(11, E.font.width(l) + 6); px.rect(g, x, y - 6, w, 12, '#aab4d0'); px.rect(g, x + 1, y - 5, w - 2, 9, '#e8edf8'); px.rect(g, x + 1, y + 4, w - 2, 1, '#8a96b8'); E.font.text(g, l, x + w / 2, y - 4, '#1a2038', { align: 'center', outline: false }); return w + 2;
  }
  let _dummy = null; const dummy = () => { if (_dummy === null) { try { _dummy = E.mkCanvas(8, 8).getContext('2d'); } catch (e) { _dummy = false; } } return _dummy; };
  const chipW = (I, action, o) => { const d = dummy(); if (!d) return 16; try { return chip(d, action, 0, 0, Object.assign({}, o, { input: I })); } catch (e) { return 16; } };
  const width = (str, o = {}) => String(str).split(/(\{[a-z]+\})/).reduce((a, p) => a + (!p ? 0 : /^\{[a-z]+\}$/.test(p) ? chipW(o.input, p.slice(1, -1), o) : E.font.width(p, { scale: o.scale || 1 })), 0);
  /** text with {action} tokens; returns width. o.align 'center'|'left' */
  function text(g, str, x, y, o = {}) {
    const parts = String(str).split(/(\{[a-z]+\})/), col = o.color || '#e8f0ff', total = width(str, o);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    for (const p of parts) { if (!p) continue; if (/^\{[a-z]+\}$/.test(p)) cx += chip(g, p.slice(1, -1), cx, y + 3, o); else { E.font.text(g, p, Math.round(cx), y - 3, col, { outline: false, shadow: '#000', scale: o.scale || 1 }); cx += E.font.width(p, { scale: o.scale || 1 }); } }
    return total;
  }
  return { chip, text, dev, width };
})();

const UI = (() => {
  const GOLD = '#ffd36a', ICE = '#e8f4ff', PANEL = ['#141a30', '#0a0e1e'];
  let pt = [0, 0], lastPt = [-9, -9], moved = false;
  function pointer() { try { const p = game.input.pointer(); return p && p.length ? p : null; } catch (e) { return null; } }
  function box(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: PANEL, border: '#4a5a8a', alpha: .92 }, o)); }
  const txt = (g, s, x, y, c = ICE, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
  const title = (g, s, x, y, scale = 2, cols) => E.font.title(g, s, Math.round(x), Math.round(y), { scale, align: 'center', colors: cols || ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], depth: 2 });
  /** a grid of big tiles. items: [{label, sub, color, disabled, logo}] */
  class Tiles {
    constructor(items, o = {}) { this.items = items; this.i = o.i || 0; this.cols = o.cols || items.length; this.w = o.w || 92; this.h = o.h || 56; this.gap = o.gap || 8; this.y = o.y; this.onPick = o.onPick; this.onCancel = o.onCancel; this.rects = []; this.t = 0; this.input = o.input; }
    update(dt) {
      const I = this.input || game.input; this.t += dt; const n = this.items.length, c = this.cols; let i = this.i;
      if (I.repeat('left', .3, .12) || I.pressed('left')) i = (i % c === 0) ? Math.min(n - 1, i + c - 1) : i - 1; if (I.repeat('right', .3, .12) || I.pressed('right')) i = (i % c === c - 1 || i === n - 1) ? i - (i % c) : i + 1;
      if (I.repeat('up', .3, .12) || I.pressed('up')) i = i - c >= 0 ? i - c : Math.min(n - 1, i + c * Math.floor((n - 1 - (i % c)) / c)); if (I.repeat('down', .3, .12) || I.pressed('down')) i = i + c < n ? i + c : i % c;
      if (i !== this.i) { this.i = i; Synth.sfx('mv'); }
      const p = pointer(), ck = I.clicked && I.clicked();
      if (p && this.rects.length && (Math.abs(p[0] - lastPt[0]) + Math.abs(p[1] - lastPt[1]) > 1)) { lastPt = [p[0], p[1]]; this.rects.forEach((rc, k) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3] && !this.items[k].disabled) { if (this.i !== k) { this.i = k; Synth.sfx('mv'); } } }); }
      if (ck) this.rects.forEach((rc, k) => { if (ck[0] >= rc[0] && ck[0] < rc[0] + rc[2] && ck[1] >= rc[1] && ck[1] < rc[1] + rc[3] && !this.items[k].disabled) { this.i = k; this.pick(); } });
      else if (I.pressed('confirm')) this.pick(); else if (I.pressed('cancel') && this.onCancel) { Synth.sfx('back'); this.onCancel(); }
    }
    pick() { const it = this.items[this.i]; if (it.disabled) { Synth.sfx('bonk'); return; } Synth.sfx('ok'); if (it.onPick) it.onPick(it, this.i); else if (this.onPick) this.onPick(it, this.i); }
    draw(g, r) {
      const n = this.items.length, c = this.cols, rows = Math.ceil(n / c), tw = c * this.w + (c - 1) * this.gap, th = rows * this.h + (rows - 1) * this.gap, x0 = (r.W - tw) / 2, y0 = this.y != null ? this.y : (r.H - th) / 2; this.rects = [];
      this.items.forEach((it, k) => {
        const cx = k % c, cy = (k / c) | 0, x = x0 + cx * (this.w + this.gap), y = y0 + cy * (this.h + this.gap), foc = k === this.i, sc = foc ? 1 + Math.sin(this.t * 6) * .01 : 1;
        this.rects.push([x, y, this.w, this.h]); const pad = foc ? 3 : 0;
        box(g, x - pad, y - pad, this.w + pad * 2, this.h + pad * 2, { bg: it.disabled ? ['#1a1a24', '#10101a'] : foc ? ['#2a3a6a', '#141c3c'] : PANEL, border: foc ? GOLD : '#4a5a8a', alpha: .95 });
        if (foc) { const q = (Math.sin(this.t * 8) + 1) / 2; px.rect(g, x - pad - 1, y - pad - 1, this.w + pad * 2 + 2, 1, `rgba(255,211,106,${.4 + q * .5})`); }
        if (it.draw) it.draw(g, x, y, this.w, this.h, foc); else { const sc2 = E.font.width(it.label, { scale: 2 }) <= this.w - 6 ? 2 : 1; txt(g, it.label, x + this.w / 2, y + this.h / 2 - (it.sub ? 10 : 5) + (sc2 === 1 ? 3 : 0), it.disabled ? '#667' : foc ? GOLD : ICE, { align: 'center', scale: sc2 }); if (it.sub) txt(g, it.sub, x + this.w / 2, y + this.h / 2 + 8, '#9ab', { align: 'center' }); }
      });
    }
  }
  /** vertical list with optional sliders: rows [{label, value(), set(d), toggle, action, disabled, reset}] */
  class List {
    constructor(rows, o = {}) { this.rows = rows; this.i = 0; this.o = o; this.rects = []; this.scroll = 0; this.t = 0; this.input = o.input; this.vis = o.vis || 9; }
    update(dt) {
      const I = this.input || game.input, n = this.rows.length; this.t += dt; let i = this.i;
      if (I.repeat('up', .3, .1)) i = (i + n - 1) % n; if (I.repeat('down', .3, .1)) i = (i + 1) % n; if (i !== this.i) { this.i = i; Synth.sfx('mv'); }
      const r = this.rows[this.i]; let d = 0; if (I.repeat('left', .3, .06)) d = -1; if (I.repeat('right', .3, .06)) d = 1;
      if (d) { const big = I.down('turbo') || I.down('Pad6') ? 10 : 1; if (r.adjust) r.adjust(d * (this.hold = Math.min(10, (this.hold || 1) + .1)) * big); else if (r.toggle) { r.toggle(); Synth.sfx('mv'); } } else this.hold = 1;
      if ((I.pressed('lob') || I.pressed('skill')) && r.reset) r.reset();
      if (I.pressed('confirm')) { if (r.action) { Synth.sfx('ok'); r.action(); } else if (r.toggle) { r.toggle(); Synth.sfx('mv'); } }
      const p = pointer(), ck = I.clicked && I.clicked();
      if (p && (Math.abs(p[0] - lastPt[0]) + Math.abs(p[1] - lastPt[1]) > 1)) { lastPt = [p[0], p[1]]; this.rects.forEach(([rc, k]) => { if (p[0] >= rc[0] && p[0] < rc[0] + rc[2] && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) this.i = k; }); }
      if (ck) this.rects.forEach(([rc, k]) => { if (ck[0] >= rc[0] && ck[0] < rc[0] + rc[2] && ck[1] >= rc[1] && ck[1] < rc[1] + rc[3]) { this.i = k; const rr = this.rows[k]; if (rr.slider) { const f = clamp((ck[0] - (rc[0] + rc[2] * .5)) / (rc[2] * .45), 0, 1); rr.slider(f); } else if (rr.action) { Synth.sfx('ok'); rr.action(); } else if (rr.toggle) rr.toggle(); } });
      if (this.o.onCancel && I.pressed('cancel')) { Synth.sfx('back'); this.o.onCancel(); }
      if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + this.vis) this.scroll = this.i - this.vis + 1;
      const pd = I.down('Mouse0') && p; if (pd) this.rects.forEach(([rc, k]) => { const rr = this.rows[k]; if (rr.slider && this.i === k && p[0] >= rc[0] + rc[2] * .5 && p[0] <= rc[0] + rc[2] * .95 && p[1] >= rc[1] && p[1] < rc[1] + rc[3]) rr.slider(clamp((p[0] - (rc[0] + rc[2] * .5)) / (rc[2] * .45), 0, 1)); });
    }
    draw(g, x, y, w, rh = 15) {
      this.rects = []; const end = Math.min(this.rows.length, this.scroll + this.vis);
      for (let k = this.scroll; k < end; k++) {
        const r = this.rows[k], yy = y + (k - this.scroll) * (rh + 2), foc = k === this.i; this.rects.push([[x, yy, w, rh], k]);
        box(g, x, yy, w, rh, { bg: foc ? ['#2a3a6a', '#16204a'] : ['#10162a', '#0a0e1c'], border: foc ? GOLD : '#2a3558', alpha: .9, gradient: true });
        txt(g, r.label, x + 6, yy + rh / 2 - 3, r.disabled ? '#667' : foc ? GOLD : ICE);
        if (r.value) { const v = r.value(); if (r.frac) { const f = r.frac(), bx = x + w * .5, bw = w * .32; px.rect(g, bx, yy + rh / 2 - 2, bw, 4, '#0a0e1c'); px.rect(g, bx, yy + rh / 2 - 2, bw * clamp(f, 0, 1), 4, foc ? GOLD : '#6a7aaa'); txt(g, v, x + w - 6, yy + rh / 2 - 3, foc ? '#fff' : '#9ab', { align: 'right' }); } else txt(g, (foc && r.adjust || foc && r.toggle ? '← ' : '') + v + (foc && (r.adjust || r.toggle) ? ' ▸' : ''), x + w - 6, yy + rh / 2 - 3, foc ? '#fff' : '#9ab', { align: 'right' }); }
      }
      if (this.scroll > 0) txt(g, '↑', x + w - 8, y - 8, '#9ab'); if (end < this.rows.length) txt(g, '↓', x + w - 8, y + this.vis * (rh + 2), '#9ab');
    }
  }
  function legend(g, r, parts) { // parts: ['{pass} SELECT', '{deke} BACK']
    let total = 0; const items = parts.map(p => p); const y = r.H - 12; box(g, 0, y - 8, r.W, 20, { bg: ['#0a0e1e', '#05070f'], border: '#1a2038', alpha: .85 });
    let x = 10; for (const p of items) { x += Glyphs.text(g, p, x, y, { color: '#c8d4f0' }) + 14; }
  }
  const banners = []; // {text, t, dur, color, size}
  function banner(text, o = {}) { banners.push(Object.assign({ text, t: 0, dur: 1.6, color: ['#fffbe8', '#ffe08a', '#ffb347'], size: 3, y: .28 }, o)); if (banners.length > 4) banners.shift(); }
  function drawBanners(g, r, dt) { let yo = 0; for (let k = banners.length - 1; k >= 0; k--) { const b = banners[k]; b.t += dt; if (b.t > b.dur) { banners.splice(k, 1); continue; } const u = b.t / b.dur, sc = b.size * (u < .12 ? .5 + u / .12 * .6 : 1.1 - Math.min(.1, (u - .12) * .3)), sh = game.settings.reduceMotion ? 0 : Math.sin(b.t * 50) * (1 - u) * 1.5; const cols = b.color; E.font.title(g, b.text, Math.round(r.W / 2 + sh), Math.round(r.H * b.y + yo), { scale: Math.max(1, Math.round(sc)), align: 'center', colors: cols, depth: 2 }); yo += Math.round(b.size * 10 + 6); } }
  const toasts = [];
  function toast(text, color = GOLD, dur = 3) { toasts.push({ text, t: 0, dur, color }); if (toasts.length > 3) toasts.shift(); }
  function drawToasts(g, r, dt) { let y = 52; for (let k = toasts.length - 1; k >= 0; k--) { const b = toasts[k]; b.t += dt; if (b.t > b.dur) { toasts.splice(k, 1); continue; } const w = E.font.width(b.text) + 16, a = Math.min(1, (b.dur - b.t) * 2, b.t * 4); box(g, r.W / 2 - w / 2, y, w, 14, { border: b.color, alpha: .9 * a }); txt(g, b.text, r.W / 2, y + 4, b.color, { align: 'center' }); y += 17; } }
  return { Tiles, List, box, txt, title, legend, banner, drawBanners, toast, drawToasts, GOLD, ICE, pointer, clearBanners() { banners.length = 0; toasts.length = 0; } };
})();
