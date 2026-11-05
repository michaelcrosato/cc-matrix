// The 10-foot canvas UI: button chips for the device used last (PlayStation glyphs by default, Xbox letters as a setting,
// keycaps, the mouse), big buttons and cards, panels, comic bursts, a focus manager that the d-pad, the stick, the keys
// and the mouse (hover moves the focus, a click picks) all drive.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game;
const PS = { '✕': '#7aa8ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#5ae0a0' }, XB = { A: '#4ac85a', B: '#e8483a', X: '#3a7ae8', Y: '#f0c030' };
const PS_OF = { Pad0: '✕', Pad1: '○', Pad2: '□', Pad3: '△' }, XB_OF = { Pad0: 'A', Pad1: 'B', Pad2: 'X', Pad3: 'Y' };
const SHOULDER = { playstation: { Pad4: 'L1', Pad5: 'R1', Pad6: 'L2', Pad7: 'R2', Pad8: 'CREATE', Pad9: 'OPTIONS' }, xbox: { Pad4: 'LB', Pad5: 'RB', Pad6: 'LT', Pad7: 'RT', Pad8: 'VIEW', Pad9: 'MENU' } };
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: o.shadow === undefined ? '#000' : o.shadow }, o));
const glyph = FF.glyph = {
  /** the device whose prompts a player sees: 'gamepad' | 'keyboard' | 'mouse' */
  device(I) { const d = (I || game.input).lastDevice; return d === 'gamepad' ? 'gamepad' : d === 'mouse' ? 'mouse' : 'keyboard'; },
  style() { return game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation'; },
  /** the code a player's action is bound to on a device */
  code(I, a, dev) {
    I = I || game.input; const m = I.map[a]; if (!m) return null;
    const real = m.filter(c => !c.startsWith('Act:') && !c.startsWith('PadAxis'));
    return dev === 'gamepad' ? real.find(c => c.startsWith('Pad')) || null : real.find(c => !c.startsWith('Pad') && !c.startsWith('Mouse')) || real[0] || null;
  },
  /** a chip's text and look for an action: { kind: 'face' | 'shoulder' | 'key' | 'mouse' | 'stick', text, color } */
  look(I, a, dev) {
    dev = dev || glyph.device(I);
    if (a === 'move') return dev === 'gamepad' ? { kind: 'stick', text: 'L' } : { kind: 'key', text: I && I.half === 'right' ? '↑↓←→' : 'WASD' };
    if (a === 'aim') return dev === 'gamepad' ? { kind: 'stick', text: '←→' } : { kind: 'key', text: '←→' };
    if (a === 'click') return { kind: 'mouse', text: 'L' };
    const code = glyph.code(I, a, dev === 'mouse' ? 'keyboard' : dev);
    if (!code) return { kind: 'key', text: '?' };
    if (dev === 'gamepad') {
      const st = glyph.style();
      if (PS_OF[code]) return st === 'xbox' ? { kind: 'face', text: XB_OF[code], color: XB[XB_OF[code]] } : { kind: 'face', text: PS_OF[code], color: PS[PS_OF[code]] };
      if (SHOULDER[st][code]) return { kind: 'shoulder', text: SHOULDER[st][code] };
      return { kind: 'shoulder', text: (I || game.input).codeLabel(code).toUpperCase() };
    }
    let t = (I || game.input).codeLabel(code); if (/^Key[A-Z]$/.test(code)) t = code.slice(3); if (/^Digit\d$/.test(code)) t = code.slice(5);
    return { kind: 'key', text: t.toUpperCase() };
  },
  /** draw a chip at (x, y) (its left, vertically centred); returns its width. o: { I, dev, scale, dim } */
  chip(g, x, y, a, o = {}) {
    const I = o.I || game.input, L = o.look || glyph.look(I, a, o.dev), s = o.scale || 1, h = 9 * s, dim = o.dim;
    if (L.kind === 'face') {
      const r = Math.round(h / 2) + 1, cx = Math.round(x + r), cy = Math.round(y);
      px.disc(g, cx, cy + 1, r, '#05050a'); px.disc(g, cx, cy, r, dim ? '#3a3a44' : '#1c1c26'); px.disc(g, cx - 1, cy - 1, r - 2, dim ? '#3a3a44' : '#2c2c3a');
      T(g, L.text, cx + 1, cy - 3 * s, dim ? '#7a7a88' : L.color, { align: 'center', scale: s, shadow: false });
      return r * 2 + 1;
    }
    if (L.kind === 'stick') { const r = Math.round(h / 2) + 1, cx = Math.round(x + r), cy = Math.round(y); px.disc(g, cx, cy + 1, r, '#05050a'); px.disc(g, cx, cy, r, '#3a3a48'); px.disc(g, cx, cy, r - 2, '#22222e'); T(g, L.text, cx + 1, cy - 3 * s, '#e8e4f0', { align: 'center', scale: s, shadow: false, font: L.text.length > 1 ? 'tiny' : undefined }); return r * 2 + 1; }
    if (L.kind === 'mouse') { const w = 7 * s, hh = 10 * s, X = Math.round(x), Y = Math.round(y - hh / 2); px.rect(g, X, Y, w, hh, '#e8e4f0'); px.rect(g, X + 1, Y + 1, w - 2, hh - 2, '#c8c4d0'); px.rect(g, X + 1, Y + 1, Math.floor(w / 2) - 1, Math.floor(hh / 2) - 1, L.text === 'L' ? '#ffb02e' : '#a8a4b0'); px.rect(g, X + Math.floor(w / 2), Y + 1, 1, Math.floor(hh / 2), '#6a6878'); return w + 1; }
    const tw = E.font.width(L.text, { scale: s }) + 6 * s, w = Math.max(h + 2, tw), X = Math.round(x), Y = Math.round(y - h / 2);
    if (L.kind === 'shoulder') { px.rect(g, X + 1, Y, w - 2, h + 1, '#05050a'); px.rect(g, X, Y + 1, w, h - 1, '#05050a'); px.rect(g, X + 1, Y + 1, w - 2, h - 2, dim ? '#3a3a44' : '#3a3a4e'); T(g, L.text, X + w / 2, Y + 1 + (h - 2 - 7 * s) / 2, dim ? '#7a7a88' : '#f0ecff', { align: 'center', scale: s, shadow: false }); return w + 1; }
    // a keycap: light top with a darker bottom edge
    px.rect(g, X, Y, w, h + 2, '#2a2830'); px.rect(g, X + 1, Y + 1, w - 2, h, dim ? '#8a8894' : '#e8e4dc'); px.rect(g, X + 1, Y + h - 1, w - 2, 2, dim ? '#6a6874' : '#a8a49c');
    T(g, L.text, X + w / 2, Y + 1 + (h - 2 - 7 * s) / 2, '#1e1c24', { align: 'center', scale: s, shadow: false });
    return w + 1;
  },
  /** several chips joined by '+' */
  combo(g, x, y, acts, o = {}) { let w = 0; acts.forEach((a, i) => { if (i) { T(g, '+', x + w + 1, y - 3, '#e8e4f0', { scale: o.scale || 1 }); w += 7; } w += glyph.chip(g, x + w, y, a, o); }); return w; },
  /** width of a chip without drawing it */
  width(a, o = {}) { const I = o.I || game.input, L = glyph.look(I, a, o.dev), s = o.scale || 1, h = 9 * s; if (L.kind === 'face' || L.kind === 'stick') return Math.round(h / 2) * 2 + 3; if (L.kind === 'mouse') return 8 * s; return Math.max(h + 2, E.font.width(L.text, { scale: s }) + 6 * s) + 1; },
  /** the text label a prompt line uses for an action (for help screens and the hub card): ✕ / Space / A */
  text(I, a, dev) { const L = glyph.look(I, a, dev); return L.text; }
};

/* ---- panels, buttons, text, bursts ---- */
const ui = FF.ui = {
  T,
  panel(g, x, y, w, h, o = {}) { E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || ['#1c1a34', '#0e0e1c'], border: o.border || '#ffb02e', alpha: o.alpha === undefined ? .9 : o.alpha }); },
  /** a big button: focus pulses its border, ▸ marks it */
  button(g, x, y, w, h, label, o = {}) {
    const f = o.focus, t = game.real, pulse = f ? (Math.sin(t * 6) + 1) / 2 : 0, dis = o.disabled;
    const bg = dis ? ['#2a2a34', '#1c1c24'] : f ? ['#4a2a6a', '#2a1640'] : ['#24223c', '#141428'];
    E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg, border: f ? E.mix('#ffb02e', '#fff4c0', pulse) : '#5a5878', alpha: .95 });
    const s = o.scale || 2, ty = Math.round(y + (h - 7 * s) / 2);
    if (f) T(g, '▸', x + 6, ty, '#ffb02e', { scale: s });
    T(g, label, o.align === 'left' ? x + (f ? 8 + 6 * s : 10) : x + w / 2, ty, dis ? '#6a6878' : f ? '#fff4d8' : '#e8e4f0', { scale: s, align: o.align === 'left' ? 'left' : 'center', shadow: '#000' });
    if (o.sub) T(g, o.sub, x + w / 2, y + h - 10, '#a9a6c0', { align: 'center' });
  },
  /** a jagged comic burst with a word in it, scaling in */
  burst(g, x, y, text, o = {}) {
    const t = o.t === undefined ? 1 : o.t, k = t < .3 ? E.ease.outBack(t / .3) : 1, s = o.scale || 2, w = E.font.width(text, { scale: s }) + 14, h = 7 * s + 12;
    const rx = w / 2 * k, ry = h / 2 * k * 1.3, pts = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? .72 : 1.08; pts.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]); }
    px.poly(g, pts.map(([a, b]) => [a + 2, b + 2]), '#0a0610');
    px.poly(g, pts, o.bg || '#ffd84a'); px.poly(g, pts.map(([a, b]) => [x + (a - x) * .86, y + (b - y) * .86]), o.bg2 || '#ff8a2a');
    if (k > .6) E.font.title(g, text, Math.round(x), Math.round(y - 7 * s / 2), { scale: s, colors: o.colors || ['#ffffff', '#fff4c0'], outline: '#1a0a14', align: 'center', depth: 1 });
  },
  /** the strip of prompts: [[action, word], ...] at the bottom right (align 'right') or left */
  prompts(g, list, x, y, o = {}) {
    const I = o.I || game.input, s = o.scale || 1, gap = 8;
    const parts = list.map(([a, w]) => ({ a, w, cw: ui.chipsWidth(a, I, s), tw: E.font.width(w, { scale: s }) }));
    const total = parts.reduce((t, p) => t + p.cw + 3 + p.tw + gap, -gap);
    let cx = o.align === 'right' ? x - total : o.align === 'center' ? x - total / 2 : x;
    if (o.bg !== false && list.length) E.ui.box(g, Math.round(cx - 5), Math.round(y - 8), Math.round(total + 10), 16, { bg: '#0c0c18', border: '#3a3858', alpha: .78 });
    for (const p of parts) { ui.chips(g, cx, y, p.a, I, s); cx += p.cw + 3; T(g, p.w, cx, y - 3 * s, '#f4f0e6', { scale: s }); cx += p.tw + gap; }
    return total;
  },
  chips(g, x, y, a, I, s = 1) {
    if (a === 'recv') { let w = 0; for (const k of ['b1', 'b2', 'b3']) w += glyph.chip(g, x + w, y, glyph.device(I) === 'gamepad' ? k : k.replace('b', 'r'), { I, scale: s }); return w; }
    if (a === 'chord') return glyph.combo(g, x, y, ['lb', 'rb'], { I, scale: s });
    if (a === 'turboB1') return glyph.combo(g, x, y, ['turbo', 'b1'], { I, scale: s });
    return glyph.chip(g, x, y, a, { I, scale: s });
  },
  chipsWidth(a, I, s = 1) {
    if (a === 'recv') return ['b1', 'b2', 'b3'].reduce((w, k) => w + glyph.width(glyph.device(I) === 'gamepad' ? k : k.replace('b', 'r'), { I, scale: s }), 0);
    if (a === 'chord') return glyph.width('lb', { I, scale: s }) + 7 + glyph.width('rb', { I, scale: s });
    if (a === 'turboB1') return glyph.width('turbo', { I, scale: s }) + 7 + glyph.width('b1', { I, scale: s });
    return glyph.width(a, { I, scale: s });
  },
  /** a team logo (12 x 12 sprite) at a scale */
  logo(g, team, x, y, s = 1) { const L = team.logo; for (let r = 0; r < L.rows.length; r++) for (let c = 0; c < L.rows[r].length; c++) { const ch = L.rows[r][c]; if (ch !== '.') px.rect(g, Math.round(x + c * s), Math.round(y + r * s), s, s, L.pal[ch]); } },
  bar(g, x, y, w, h, v, c, bg = '#14141e') { px.rect(g, x - 1, y - 1, w + 2, h + 2, '#05050a'); px.rect(g, x, y, w, h, bg); px.rect(g, x, y, Math.round(w * Math.max(0, Math.min(1, v))), h, c); px.rect(g, x, y, Math.round(w * Math.max(0, Math.min(1, v))), 1, E.shade(c, .3)); }
};

/** a focus manager: items { x, y, w, h, id, disabled }; the d-pad, stick and keys move by geometry, the mouse hovers and
 *  clicks; returns the picked item on a confirm or click. Shared by every canvas menu */
class Focus {
  constructor(o = {}) { this.i = 0; this.items = []; this.o = o; this.moved = false; this._last = null; }
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); while (this.items[this.i] && this.items[this.i].disabled && this.i < this.items.length - 1) this.i++; return this; }
  get item() { return this.items[this.i]; }
  /** move to the nearest item in a direction */
  step(dx, dy) {
    const c = this.item; if (!c) return;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = -1, bs = 1e9;
    this.items.forEach((it, k) => { if (k === this.i || it.disabled) return; const x = it.x + it.w / 2, y = it.y + it.h / 2, ddx = x - cx, ddy = y - cy; if (dx && Math.sign(ddx) !== dx) return; if (dy && Math.sign(ddy) !== dy) return; const along = dx ? Math.abs(ddx) : Math.abs(ddy), across = dx ? Math.abs(ddy) : Math.abs(ddx); if (along < 1) return; const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = k; } });
    if (best < 0 && this.o.wrap !== false) { const order = this.items.map((it, k) => k).filter(k => !this.items[k].disabled); const p = order.indexOf(this.i); if (dy || dx) { const n = order[(p + (dy || dx) + order.length) % order.length]; if (n !== undefined && (this.o.wrap || (dy && this.o.wrapV))) best = n; } }
    if (best >= 0) { this.i = best; this.moved = true; game.audio.sfx('menuMove'); }
  }
  /** this step's input from any player (or one: I) — returns the picked item, or null */
  update(I) {
    const P = I ? [I] : game.players;
    this.moved = false;
    for (const p of P) {
      if (p.repeat('up', .32, .09)) this.step(0, -1); if (p.repeat('down', .32, .09)) this.step(0, 1);
      if (p.repeat('left', .32, .09)) this.step(-1, 0); if (p.repeat('right', .32, .09)) this.step(1, 0);
    }
    // the mouse: hover moves the focus, a click picks
    const ptr = game.input.pointer();
    if (ptr && game.input.lastDevice === 'mouse' && (!this._last || ptr[0] !== this._last[0] || ptr[1] !== this._last[1])) { const k = this.hit(ptr[0], ptr[1]); if (k >= 0 && k !== this.i && !this.items[k].disabled) { this.i = k; game.audio.sfx('menuMove'); } }
    this._last = ptr ? ptr.slice() : null;
    const c = game.input.clicked(); if (c) { const k = this.hit(c[0], c[1]); if (k >= 0 && !this.items[k].disabled) { this.i = k; game.audio.sfx('menuSelect'); return this.items[k]; } }
    for (const p of P) if (p.pressed('confirm') || p.pressed('b1')) { p.consume && p.consume('confirm'); const it = this.item; if (it && !it.disabled) { game.audio.sfx('menuSelect'); this.by = p; return it; } }
    return null;
  }
  hit(x, y) { return this.items.findIndex(it => x >= it.x && x < it.x + it.w && y >= it.y && y < it.y + it.h); }
  back(I) { const P = I ? [I] : game.players; for (const p of P) if (p.pressed('cancel') || p.pressed('b2')) { game.audio.sfx('menuBack'); return true; } return false; }
}
ui.Focus = Focus;
/** a BACK button drawn at the bottom left of a screen (a mouse needs a way back too); returns its rect */
ui.backButton = (g, r, focus) => { const w = 54, h = 16, x = 8 + (FF.T.safeMargin || 8) - 8, y = r.H - h - 8; ui.button(g, x, y, w, h, 'BACK', { scale: 1, focus }); return { x, y, w, h }; };
ui.backClicked = rect => { const c = game.input.clicked(); return !!(c && rect && c[0] >= rect.x && c[0] < rect.x + rect.w && c[1] >= rect.y && c[1] < rect.y + rect.h); };
})();
