// MASH TV: UI kit: bulb frames, focus lists, sliders, banners, lower thirds, cards. Widgets work headless (state only).
const UI = MT.ui = {};
const F = E.font;
UI.t = 0;
UI.pointer = () => { const g = MT.game; try { return g.input.pointer ? g.input.pointer() : null; } catch (e) { return null; } };
UI.clicked = () => { const g = MT.game; try { return g.input.clicked ? g.input.clicked() : null; } catch (e) { return null; } };
UI.anyPressed = a => MT.game.players.some(p => p.pressed(a));
UI.anyRepeat = a => MT.game.players.some(p => p.repeat && p.repeat(a, .35, .09));
UI.promptInput = () => MT.lastInput();
UI.inRect = (p, x, y, w, h) => p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;
// a bulb-framed box
UI.bulbs = function (g, x, y, w, h, t, color, on) {
  const n = Math.max(4, Math.floor((w + h) / 5)); let per = 2 * (w + h);
  for (let i = 0; i < n; i++) { const d = i / n * per; let bx, by; if (d < w) { bx = x + d; by = y; } else if (d < w + h) { bx = x + w; by = y + d - w; } else if (d < 2 * w + h) { bx = x + w - (d - w - h); by = y + h; } else { bx = x; by = y + h - (d - 2 * w - h); } const lit = on ? ((Math.floor(t * 8 - i * .6) % 3) === 0) : (i % 2 === 0); px.rect(g, Math.round(bx) - 1, Math.round(by) - 1, 2, 2, lit ? (color || '#fff7a0') : '#6a4a10'); }
};
UI.panel = function (g, x, y, w, h, o = {}) {
  E.ui.box(g, x, y, w, h, { bg: o.bg || ['#2a1446', '#140a24'], border: o.border || '#ffcc33', alpha: o.alpha === undefined ? .92 : o.alpha });
  if (o.bulbs) UI.bulbs(g, x - 1, y - 1, w + 2, h + 2, UI.t, o.color, o.chase);
};
UI.text = (g, s, x, y, c, o) => F.text(g, s, Math.round(x), Math.round(y), c || '#fff7e8', Object.assign({ shadow: '#000', outline: false }, o));
UI.title = (g, s, x, y, scale, o) => F.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: scale || 3, align: 'center', colors: ['#ff2e88', '#ffcc33'], depth: 2, depthColor: '#5a1a50' }, o));
// prompt bar at the bottom of the screen
UI.promptBar = function (r, pairs) { r.overlay(g => { E.px.rect(g, 0, r.H - 17, r.W, 17, 'rgba(10,4,20,.8)'); MT.glyph.prompt(g, r.W / 2, r.H - 14, pairs, UI.promptInput(), { align: 'center' }); }); };
// ---- Menu: vertical focus list ----
class Menu {
  constructor(items, o = {}) { this.items = items; this.i = o.start || 0; this.o = Object.assign({ y: 100, rowH: 22, w: 190, scale: 2 }, o); this.rects = []; this.t = 0; this.moved = false; }
  get cur() { return this.items[this.i]; }
  setItems(items) { this.items = items; this.i = Math.min(this.i, items.length - 1); }
  update(dt) {
    this.t += dt; const n = this.items.length; if (!n) return;
    if (UI.anyRepeat('up')) { this.move(-1); } if (UI.anyRepeat('down')) { this.move(1); }
    const it = this.cur;
    if (it && it.adjust) { if (UI.anyRepeat('left')) it.adjust(-1); if (UI.anyRepeat('right')) it.adjust(1); }
    const p = UI.pointer(), mv = this._pp && p && (Math.abs(p[0] - this._pp[0]) + Math.abs(p[1] - this._pp[1]) > 0.5); this._pp = p;
    if (p && mv) for (let k = 0; k < this.rects.length; k++) if (UI.inRect(p, ...this.rects[k]) && !this.items[k].disabled) { if (this.i !== k) { this.i = k; MT.sfx('blip'); } }
    const c = UI.clicked(); if (c) for (let k = 0; k < this.rects.length; k++) if (UI.inRect(c, ...this.rects[k]) && !this.items[k].disabled) { this.i = k; this.pick(); return; }
    if (UI.anyPressed('confirm') || UI.anyPressed('start')) this.pick();
    else if (UI.anyPressed('cancel') && this.o.onCancel) { MT.sfx('back'); this.o.onCancel(); }
  }
  move(d) { const n = this.items.length; let k = this.i; for (let s = 0; s < n; s++) { k = (k + d + n) % n; if (!this.items[k].disabled) break; } if (k !== this.i) { this.i = k; MT.sfx('blip'); } }
  pick() { const it = this.cur; if (!it || it.disabled) return; MT.sfx('confirm'); if (it.onPick) it.onPick(this.i, it); }
  draw(r) {
    const o = this.o, W = r.W; this.rects = [];
    r.overlay(g => {
      const x = o.x === undefined ? (W - o.w) / 2 : o.x;
      this.items.forEach((it, k) => {
        const y = o.y + k * o.rowH, foc = k === this.i, rect = [x, y, o.w, o.rowH - 3]; this.rects[k] = rect;
        if (foc) { const bump = 1 + Math.sin(UI.t * 6) * .01; UI.panel(g, x - 4, y - 2, o.w + 8, o.rowH, { bulbs: true, chase: true, color: '#fff7a0', bg: ['#5a1a66', '#2a0f40'] }); }
        else E.ui.box(g, x, y, o.w, o.rowH - 3, { bg: ['#2a1446', '#1a0c2c'], border: '#4a2a6a', alpha: .75 });
        const label = typeof it.label === 'function' ? it.label() : it.label; const col = it.disabled ? '#6a5a80' : foc ? '#ffe068' : '#fff7e8';
        UI.text(g, label, x + (it.value ? 8 : o.w / 2), y + (o.rowH - 3 - 7 * o.scale) / 2, col, { align: it.value ? 'left' : 'center', scale: o.scale });
        if (it.value) UI.text(g, typeof it.value === 'function' ? it.value() : it.value, x + o.w - 8, y + (o.rowH - 3 - 7 * o.scale) / 2, foc ? '#7affb0' : '#c8c0e0', { align: 'right', scale: o.scale });
      });
    });
  }
}
UI.Menu = Menu;
// ---- banners (centre, big, bulb-framed) ----
const banners = UI.banners = [];
UI.banner = function (text, color, secs) { banners.push({ text, color: color || '#ffcc33', t: 0, dur: secs || 1.6 }); if (banners.length > 3) banners.shift(); };
UI.updateBanners = dt => { for (const b of banners) b.t += dt; for (let i = banners.length - 1; i >= 0; i--) if (banners[i].t > banners[i].dur) banners.splice(i, 1); };
UI.drawBanners = function (r) {
  if (!banners.length) return;
  r.overlay(g => {
    let y = r.H * .3;
    for (const b of banners) {
      const u = Math.min(1, b.t / .25), out = Math.max(0, (b.t - (b.dur - .3)) / .3), k = E.ease.outBack(u), sc = text => text.length > 24 ? 1 : 2; const s = sc(b.text);
      const w = F.width(b.text, { scale: s }) + 24, h = 7 * s + 14, x = r.W / 2 - w / 2 * k, ww = w * k;
      if (ww < 4) continue; g.save && g.save(); const a = 1 - out;
      px.blend(g, a, 'normal', () => { UI.panel(g, Math.round(r.W / 2 - ww / 2), Math.round(y), Math.round(ww), h, { bulbs: true, chase: true, color: b.color, bg: ['#240a40', '#0c0418'], border: b.color }); if (u > .6) UI.text(g, b.text, r.W / 2, y + 7, b.color, { align: 'center', scale: s }); });
      y += h + 4;
    }
  });
};
// ---- lower third ----
UI.drawLowerThird = function (r) {
  const c = MT.lines.cur; if (!c || (MT.game.settings.subtitles === false)) return; const txt = MT.lines.shown();
  r.overlay(g => {
    const w = Math.min(r.W - 24, 330), x = (r.W - w) / 2, lines = F.wrap(txt || ' ', w - 16, {}), h = 18 + lines.length * 9 + (c.hint ? 10 : 0), y = r.H - h - 22;
    UI.panel(g, Math.round(x), Math.round(y), Math.round(w), h, { bulbs: false, bg: ['#240a40', '#0c0418'], alpha: .82 });
    const nameCol = { LANCE: '#ff2e88', PENNY: '#2ee6ff', ANNC: '#ffcc33', MASHY: '#d8b878', NETWORK: '#7affb0', SPONSOR: '#ffcc33' }[c.spk] || '#fff';
    const nm = { LANCE: 'LANCE LUSTRE', PENNY: 'PENNY PRIZE', ANNC: 'ANNOUNCER', MASHY: 'MASHY', NETWORK: 'THE NETWORK', SPONSOR: 'SPONSOR' }[c.spk] || c.spk;
    px.rect(g, Math.round(x + 6), Math.round(y - 5), F.width(nm) + 10, 10, nameCol); UI.text(g, nm, x + 11, y - 3, '#14081c', { shadow: false });
    lines.forEach((l, i) => UI.text(g, l, x + 8, y + 8 + i * 9, '#fff7e8'));
    if (c.hint && c.t > c.dur * .5) UI.text(g, c.hint, x + 8, y + h - 12, '#7affb0');
  });
};
// ---- popups, tutorial prompts ----
MT.hud = { banner: UI.banner, tut: null, popups: [] };
// ---- cards: a TV title card ----
UI.card = function (r, big, small, sub, t, color) {
  r.overlay(g => {
    E.px.rect(g, 0, 0, r.W, r.H, '#05020c');
    for (let i = 0; i < 30; i++) E.px.rect(g, 0, (i * 9 + t * 40) % r.H, r.W, 1, 'rgba(255,255,255,.05)');
    const k = E.ease.outBounce(Math.min(1, t / .7));
    UI.bulbs(g, 14, 14, r.W - 28, r.H - 28, t, color || '#fff7a0', true);
    UI.text(g, big, r.W / 2, r.H / 2 - 50 - (1 - k) * 80, color || '#ff2e88', { align: 'center', scale: 3 });
    UI.title(g, small, r.W / 2, r.H / 2 - 18 + (1 - k) * 40, 3);
    if (sub) UI.text(g, sub, r.W / 2, r.H / 2 + 36, '#c8c0e0', { align: 'center' });
  });
};
// ---- TV static wipe ----
UI.static = function (r, t, a) { r.overlay(g => { px.blend(g, a, 'normal', () => { for (let i = 0; i < 140; i++) E.px.rect(g, Math.floor(MT.fxr() * r.W), Math.floor(MT.fxr() * r.H), 1 + Math.floor(MT.fxr() * 20), 1 + Math.floor(MT.fxr() * 2), MT.fxr() < .5 ? '#fff' : '#555'); E.px.rect(g, 0, Math.floor((t * 300) % r.H), r.W, 3, '#ccc'); }); }); };
// ---- slider-ish value row used by dev mode ----
UI.bar = (g, x, y, w, h, u, c) => { E.px.rect(g, x, y, w, h, '#14081c'); E.px.rect(g, x + 1, y + 1, Math.round((w - 2) * MT.clamp(u, 0, 1)), h - 2, c || '#ffcc33'); };
