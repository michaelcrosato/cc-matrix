// UI core: device tracking, screen stack, focus, mouse, repeat, drawing. Screens are data (src/ui/screens.js).
import { codes, pressed, ALL_PAD, ALL_KB } from '../core/actions.js';
import { drawGlyph, drawPrompt, promptWidth, codeFor } from './glyphs.js';

export const wrapText = (hud, text, maxW, scale = 1) => {
  const words = String(text).split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (hud.measure(t, scale).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
};
export class UISystem {
  name = 'ui';
  stack = []; frameN = 0; focus = 0; rects = []; lastPtr = null; hold = { dir: null, n: 0 }; mouseDown = false; dragging = null;
  padSeen = false;
  setup(g) {
    this.g = g; g.ui = this;
    const input = g.ctx.input;
    let wantLock = false; this.setLock = (v) => { wantLock = v; };
    try { Object.defineProperty(input, 'wantsPointerLock', { get: () => wantLock, set() {}, configurable: true }); } catch { /* already defined */ }
    if (typeof window !== 'undefined') {
      const kb = () => { if (g.device !== 'kbm') this.setDevice('kbm'); };
      window.addEventListener('keydown', (e) => { if (e.code.startsWith('Pad')) return; kb(); });
      window.addEventListener('mousedown', kb);
      window.addEventListener('mousemove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0 || !document.pointerLockElement) kb(); });
      document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && g.mode === 'play' && !this.screen && !g.cutscene) this.open('pause'); });
      const resume = () => { if (this.wantsLock() && !document.pointerLockElement) g.ctx.engine.renderer?.domElement?.requestPointerLock?.()?.catch?.(() => {}); };
      window.addEventListener('pointerup', resume);
    }
  }
  wantsLock() { const g = this.g; return (g.mode === 'play' || g.mode === 'round') && !this.screen && g.device === 'kbm' && !g.mapCursor; }
  setDevice(d) { if (this.g.device === d) return; this.g.device = d; this.g.camState.device = d; }
  get screen() { return this.stack[this.stack.length - 1] || null; }
  open(id, arg) {
    const def = this.g.screens[id]; if (!def) throw new Error('no screen ' + id);
    const sc = typeof def === 'function' ? def(this.g, arg) : def; sc.id = sc.id || id;
    this.stack.push(sc); this.focus = sc.start ?? 0; this.rects = []; this.g.screen = sc.id; sc.onOpen?.(this.g); this.applyPause(); this.g.sfx?.('ui_confirm'); return sc;
  }
  replace(id, arg) { this.stack.pop(); return this.open(id, arg); }
  back() {
    const sc = this.screen; if (!sc) return;
    if (sc.onBack && sc.onBack(this.g) === false) return;
    this.stack.pop(); this.focus = 0; this.rects = []; this.g.screen = this.screen ? this.screen.id : null; sc.onClose?.(this.g); this.applyPause(); this.g.sfx?.('ui_back');
  }
  closeAll() { while (this.stack.length) { const sc = this.stack.pop(); sc.onClose?.(this.g); } this.g.screen = null; this.applyPause(); }
  applyPause() { const need = this.stack.some((s) => s.pause); this.g.ctx.engine.timeScale = need ? 0 : 1; this.paused = need; }
  itemsOf(sc) { return (typeof sc.items === 'function' ? sc.items(this.g) : sc.items) || []; }
  // ---- input ----
  detectPad(g) {
    const input = g.ctx.input;
    if (ALL_PAD.some((c) => input.wasPressed(c)) || Math.hypot(input.padAxis.x, input.padAxis.y) > 0.35) this.setDevice('pad');
    else if (ALL_KB.some((c) => c !== 'Space' && input.wasPressed(c))) this.setDevice('kbm');
  }
  nav(g) {
    const input = g.ctx.input; let dir = null;
    const down = (a) => input.anyDown(codes(a));
    const ax = input.padAxis;
    if (down('up') || ax.y > 0.6) dir = 'up'; else if (down('down') || ax.y < -0.6) dir = 'down'; else if (down('left') || ax.x < -0.6) dir = 'left'; else if (down('right') || ax.x > 0.6) dir = 'right';
    let fire = null;
    if (dir && this.hold.dir !== dir) { this.hold = { dir, n: 0 }; fire = dir; }
    else if (dir) { this.hold.n++; if (this.hold.n > 24 && this.hold.n % 5 === 0) fire = dir; } else this.hold = { dir: null, n: 0 };
    return fire;
  }
  pointer(g) {
    const input = g.ctx.input, p = input.pointer, hud = g.ctx.hud;
    const x = (p.x + 1) / 2 * hud.width, y = (1 - p.y) / 2 * hud.height;
    return { x, y, moved: !this.lastPtr || Math.abs(p.x - this.lastPtr.x) + Math.abs(p.y - this.lastPtr.y) > 1e-4, over: p.over };
  }
  handle(g) {
    const sc = this.screen, input = g.ctx.input; if (!sc) return;
    const items = this.itemsOf(sc);
    sc.tick?.(g, this);
    if (sc.customInput && sc.customInput(g, this)) return;
    const f = this.nav(g);
    const n = items.length;
    const cur = items[this.focus];
    if (f === 'up' && n) { this.focus = (this.focus + n - 1) % n; g.sfx?.('ui_move'); }
    if (f === 'down' && n) { this.focus = (this.focus + 1) % n; g.sfx?.('ui_move'); }
    if (cur) {
      if (f === 'left' || f === 'right') this.adjust(cur, f === 'left' ? -1 : 1, this.hold.n);
      if (pressed(input, 'confirm')) this.activate(cur);
    }
    if (pressed(input, 'back') && !(sc.noBack)) this.back();
    if (pressed(input, 'tabPrev') && sc.tabs) sc.tabs(g, -1, this);
    if (pressed(input, 'tabNext') && sc.tabs) sc.tabs(g, 1, this);
    if (input.wheel && sc.wheel) sc.wheel(g, Math.sign(input.wheel), this);
    // mouse: hover focuses, click activates
    const P = this.pointer(g);
    if (P.moved && P.over && g.device === 'kbm') {
      for (const r of this.rects) if (P.x >= r.x && P.x < r.x + r.w && P.y >= r.y && P.y < r.y + r.h && !r.item?.disabled) { if (this.focus !== r.i) { this.focus = r.i; g.sfx?.('ui_move'); } break; }
    }
    this.lastPtr = { x: input.pointer.x, y: input.pointer.y };
    for (const ev of input.buttonEvents) {
      if (ev.code !== 'MouseLeft' && ev.code !== 'Touch') continue;
      const x = (ev.x + 1) / 2 * g.ctx.hud.width, y = (1 - ev.y) / 2 * g.ctx.hud.height;
      if (ev.down) {
        this.setDevice(ev.code === 'Touch' ? g.device : 'kbm');
        let hit = null; for (const r of this.rects) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) { hit = r; break; }
        if (hit) { this.focus = hit.i; const it = hit.item; if (it.slider) { this.dragging = hit; this.setSlider(it, hit, x); } else if (!it.disabled) this.activate(it, hit, x); }
        else sc.onClick?.(g, x, y, this);
      } else this.dragging = null;
    }
    if (this.dragging && input.isDown('MouseLeft')) { const r = this.dragging; this.setSlider(r.item, r, (input.pointer.x + 1) / 2 * g.ctx.hud.width); }
  }
  setSlider(it, r, x) { const s = it.slider; const bx = r.sx ?? r.x, bw = r.sw ?? r.w; const f = Math.max(0, Math.min(1, (x - bx) / bw)); const v = s.min + f * (s.max - s.min); s.set(Math.round(v / s.step) * s.step); }
  adjust(it, d, held) {
    const g = this.g;
    if (it.slider) { const s = it.slider, k = held > 60 ? 5 : held > 30 ? 2 : 1; const v = Math.max(s.min, Math.min(s.max, +(s.get() + d * s.step * k).toFixed(4))); s.set(v); g.sfx?.('ui_move'); }
    else if (it.choice) { const o = it.choice.options, i = o.indexOf(it.choice.get()); it.choice.set(o[(i + d + o.length) % o.length]); g.sfx?.('ui_move'); }
    else if (it.left && d < 0) it.left(g, this); else if (it.right && d > 0) it.right(g, this);
  }
  activate(it, hit, x) {
    const g = this.g; if (it.disabled) return;
    if (it.choice && !it.run) return this.adjust(it, 1, 0);
    if (it.slider && !it.run) return;
    if (it.run) { g.sfx?.('ui_confirm'); it.run(g, this); }
  }
  // ---- draw ----
  frame(g, dt) {
    this.frameN++;
    const hud = g.ctx.hud;
    this.detectPad(g);
    g.ctx.input.preventKeys.add('Tab');
    hud.clear();
    if (this.setLock) this.setLock(this.wantsLock());
    if (!this.screen) { g.hudDraw?.(hud, dt); if (g.mode === 'play' && pressed(g.ctx.input, 'pause') && !g.cutscene && !(g.input_blockPause)) { if (!(g.device === 'pad' && g.ctx.input.isDown('PadCreate'))) this.open('pause'); } }
    else {
      this.rects = [];
      if (this.screen.hud) g.hudDraw?.(hud, dt);
      this.handle(g);
      if (this.screen) this.drawScreen(g, hud, this.screen);
    }
    g.overlayDraw?.(hud);
  }
  drawScreen(g, hud, sc) {
    const W = hud.width, H = hud.height;
    if (sc.cover) hud.rect(0, 0, W, H, 'night'); else if (sc.dim !== false) { hud.rect(0, 0, W, H, 0x0d1020); }
    if (sc.draw) sc.draw(g, hud, this, { W, H });
    if (sc.noItems) return;
    const items = this.itemsOf(sc);
    const rowH = sc.rowH || 18, pw = sc.panelW || 250;
    const top = sc.top ?? Math.max(24, Math.round((H - items.length * rowH) / 2) + (sc.offsetY || 0)), left = Math.round((W - pw) / 2);
    items.forEach((it, i) => {
      const y = top + i * rowH, focused = i === this.focus;
      const label = typeof it.label === 'function' ? it.label(g) : it.label;
      this.rects.push({ x: left, y, w: pw, h: rowH - 2, i, item: it });
      if (focused) { hud.rect(left, y, pw, rowH - 2, it.disabled ? 'slate' : 'orange'); hud.rect(left - 6, y + 5, 3, 5, 'sand'); }
      const col = it.disabled ? 'slate' : focused ? 'ink' : 'sand';
      hud.text(left + 8, y + 2, String(label).toUpperCase(), { scale: 2, color: col, shadow: focused ? false : 'ink' });
      if (it.value) { const v = String(typeof it.value === 'function' ? it.value(g) : it.value).toUpperCase(); const vw = hud.measure(v, 1).width; hud.text(left + pw - vw - 8, y + 6, v, { color: focused ? 'ink' : 'white', shadow: focused ? false : 'ink' }); }
      if (it.slider) { const s = it.slider, bw = 70, bx = left + pw - bw - 56, f = (s.get() - s.min) / (s.max - s.min); hud.rect(bx, y + 7, bw, 4, focused ? 'ink' : 'night'); hud.rect(bx, y + 7, Math.round(bw * f), 4, focused ? 'sand' : 'orange'); const t = s.fmt ? s.fmt(s.get()) : String(Math.round(s.get() * 100)) + '%'; hud.text(bx + bw + 4, y + 6, t.toUpperCase(), { color: focused ? 'ink' : 'white', shadow: false }); const r = this.rects[this.rects.length - 1]; r.sx = bx; r.sw = bw; }
    });
    // bottom hints
    const hints = sc.hints || [['confirm', 'SELECT'], ['back', 'BACK']];
    let hx = 24; const hy = H - 22;
    for (const [a, label] of hints) { const w = drawPrompt(hud, hx, hy, a, label, g.device, g.glyphSet); hx += w + 14; }
  }
  state() { return { screen: this.screen ? this.screen.id : null, focus: this.focus, stack: this.stack.map((s) => s.id) }; }
}
