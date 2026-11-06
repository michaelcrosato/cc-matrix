// DOM overlay: layered screens, tags, glyph prompts, toasts.
import { glyphHtml } from '../input/glyphs.js';
import { Focus } from './focus.js';
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
export const txt = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
export class UI {
  constructor(input, audioHook) {
    this.input = input; this.root = el('div'); this.root.id = 'screens'; this.hud = el('div'); this.hud.id = 'hud'; this.speech = el('div'); this.speech.id = 'speechRoot'; this.toastRoot = el('div'); this.toastRoot.id = 'toast';
    document.body.append(this.hud, this.root, this.speech, this.toastRoot);
    this.stack = []; this.focus = new Focus(input, audioHook); this.toasts = []; this.device = input.lastDevice;
    // Hover moves the focus, but only when the pointer actually moved.
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || !this.input.hoverMoved) return; this.input.hoverMoved = false;
      const t = document.elementFromPoint(e.clientX, e.clientY); const f = t && t.closest && t.closest('[data-focus]');
      if (f && this.top() && this.top().el.contains(f)) this.focus.set(f);
    });
    addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-focus]'); if (t && this.top() && this.top().el.contains(t)) { this.focus.set(t, true); this.focus.activate(t); } else if (this.onWorldClick && (!this.top() || !this.top().el.contains(e.target))) this.onWorldClick(e); });
    addEventListener('contextmenu', () => { const t = this.top(); if (t && t.onBack) { if (this.focus.hook) this.focus.hook('back'); t.onBack(); } });
    this.setScale(1);
    addEventListener('resize', () => this.setScale(this.scale));
  }
  setScale(s) { this.scale = s; document.documentElement.style.setProperty('--s', s); document.documentElement.style.setProperty('--vh', Math.min(innerHeight / 1080, innerWidth / 1920)); }
  top() { return this.stack[this.stack.length - 1] || null; }
  topId() { const t = this.top(); return t ? t.id : null; }
  /** Open a layered screen. build(el, layer) fills it. */
  open(id, build, opts = {}) {
    const layer = { id, el: el('div', `screen ${opts.cls || ''}`), onBack: opts.onBack, onLeft: opts.onLeft, onRight: opts.onRight, onMore: opts.onMore, tick: opts.tick, rebuild: null };
    layer.el.dataset.screen = id; layer.build = build;
    layer.rebuild = (keepIndex = true) => {
      const items0 = this.focus.items(); const idx = this.focus.cur ? items0.indexOf(this.focus.cur) : 0;
      layer.el.innerHTML = ''; build(layer.el, layer); this.refreshGlyphs();
      if (this.top() === layer) { const items = this.focus.items(); if (keepIndex && items.length) this.focus.set(items[Math.max(0, Math.min(idx, items.length - 1))], true); else this.focus.refresh(true); }
    };
    if (opts.replace && this.stack.length) this.close();
    this.stack.push(layer); this.root.appendChild(layer.el); build(layer.el, layer); this.refreshGlyphs(); this.focus.setLayer(layer);
    return layer;
  }
  close() { const l = this.stack.pop(); if (l) l.el.remove(); this.focus.cur = null; this.focus.setLayer(this.top()); }
  closeAll() { while (this.stack.length) { this.stack.pop().el.remove(); } this.focus.cur = null; this.focus.setLayer(null); }
  closeTo(id) { while (this.stack.length && this.topId() !== id) { this.stack.pop().el.remove(); } this.focus.cur = null; this.focus.setLayer(this.top()); }
  has(id) { return this.stack.some(l => l.id === id); }
  btn(label, act, opts = {}) { const b = el('div', `tag ${opts.cls || ''}`); if (opts.html) b.innerHTML = label; else b.textContent = label; b.dataset.focus = '1'; b._act = act; if (opts.def) b.dataset.default = '1'; return b; }
  cardBtn(cls, act, build) { const b = el('div', cls); b.dataset.focus = '1'; b._act = act; build(b); return b; }
  slider(label, get, set, min, max, step, fmt = (v) => v) {
    const b = el('div', 'tag slider'); b.dataset.focus = '1'; const l = txt('span', '', label), bar = el('div', 'bar'), fill = el('div', 'fill'), val = txt('span', 'val', '');
    bar.appendChild(fill); b.append(l, bar, val);
    const draw = () => { const v = get(); fill.style.width = `${(v - min) / (max - min) * 100}%`; val.textContent = fmt(v); };
    b._adj = (d) => { const n = Math.round((Math.max(min, Math.min(max, get() + d * step))) / step) * step; set(+n.toFixed(5)); draw(); };
    b._act = () => b._adj(1);
    const drag = (e) => { const r = bar.getBoundingClientRect(); const a = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); const n = Math.round((min + a * (max - min)) / step) * step; set(+n.toFixed(5)); draw(); };
    bar.addEventListener('pointerdown', (e) => { drag(e); e.stopPropagation(); bar.setPointerCapture?.(e.pointerId); });
    bar.addEventListener('pointermove', (e) => { if (e.buttons & 1) drag(e); });
    bar.addEventListener('click', (e) => e.stopPropagation());
    draw(); return b;
  }
  toggle(label, get, set, on = 'On', off = 'Off') {
    const b = el('div', 'tag slider'); b.dataset.focus = '1'; const l = txt('span', '', label), v = txt('span', 'val', ''); b.append(l, v);
    const draw = () => { v.textContent = get() ? on : off; }; b._act = () => { set(!get()); draw(); }; b._adj = () => b._act(); draw(); return b;
  }
  choice(label, opts, get, set) {
    const b = el('div', 'tag slider'); b.dataset.focus = '1'; const l = txt('span', '', label), v = txt('span', 'val', ''); b.append(l, v);
    const draw = () => { const f = opts.find(o => o[0] === get()); v.textContent = f ? f[1] : ''; };
    b._adj = (d) => { const i = opts.findIndex(o => o[0] === get()); set(opts[(i + d + opts.length) % opts.length][0]); draw(); }; b._act = () => b._adj(1); draw(); return b;
  }
  /** A prompt: verb glyph + words. Re-renders the same frame the device changes. */
  promptEl(verb, words) { const p = el('span', 'prompt'); const g = el('span', 'pg'); g.dataset.verb = verb; p.append(g, txt('span', '', words)); return p; }
  promptBar(list) { const bar = el('div', 'promptbar'); for (const [v, w] of list) bar.appendChild(this.promptEl(v, w)); return bar; }
  bottom(list) { const b = el('div', 'bottomprompts'); b.appendChild(this.promptBar(list)); return b; }
  refreshGlyphs(root = document) { const d = this.input.lastDevice; for (const n of root.querySelectorAll('[data-verb]')) n.innerHTML = glyphHtml(n.dataset.verb, n.dataset.dev || d); }
  toast(text, sec = 2.4) { const t = txt('div', 't', text); this.toastRoot.appendChild(t); this.toasts.push({ t, left: sec }); }
  tick(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) { const o = this.toasts[i]; o.left -= dt; if (o.left <= 0) { o.t.remove(); this.toasts.splice(i, 1); } }
    const t = this.top(); if (t && t.tick) t.tick(dt);
    const cover = !!(t && (t.el.classList.contains('dim') || t.el.querySelector(':scope > .bottomprompts'))); if (cover !== this.hudCovered) { this.hudCovered = cover; this.hud.style.visibility = cover ? 'hidden' : ''; }
    if (this.top()) this.focus.tick(dt);
  }
}
