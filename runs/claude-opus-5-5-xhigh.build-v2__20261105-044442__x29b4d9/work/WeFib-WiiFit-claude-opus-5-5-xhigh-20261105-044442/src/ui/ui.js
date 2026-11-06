import { h, rotJitter } from './dom.js';
import { promptHTML } from '../input/glyphs.js';

/** A screen: a DOM layer with focusable items. Hover moves focus; pad, keys and mouse all work. */
export class Screen {
  constructor(ui, def) {
    this.ui = ui; this.def = def; this.name = def.name;
    this.el = h(`div.screen${def.className ? `.${def.className}` : ''}`);
    this.el.dataset.screen = def.name;
    this.items = []; this.focus = -1; this.promptList = def.prompts || null;
    this.page = 0; this.pages = 0; this.onPage = null;
    this.onBack = def.back || null; this.onAlt = def.alt || null;
    this.promptEl = null; this.updateFn = def.update || null;
    this.passive = !!def.passive;
  }
  /** Register a focusable. handlers: use, left, right, focus. */
  item(el, handlers = {}) {
    const it = { el, ...handlers, index: this.items.length };
    el.classList.add('item');
    el.style.setProperty('--r', `${rotJitter(this.items.length)}deg`);
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const inp = this.ui.game.input;
      if (e.clientX === inp.lastHoverX && e.clientY === inp.lastHoverY) return;
      inp.lastHoverX = e.clientX; inp.lastHoverY = e.clientY;
      const i = this.items.indexOf(it);
      if (i >= 0 && i !== this.focus && !this.ui.inert) this.setFocus(i);
    });
    el.addEventListener('click', (e) => {
      if (this.ui.top !== this) return;
      e.stopPropagation();
      this.ui.game.input.clickQueue.push(() => { const i = this.items.indexOf(it); if (i >= 0) { this.setFocus(i, true); this.use(i); } });
    });
    this.items.push(it);
    return el;
  }
  clearItems() { this.items = []; this.focus = -1; }
  setFocus(i, silent) {
    if (this.items[this.focus]) this.items[this.focus].el.classList.remove('focus');
    this.focus = i;
    const it = this.items[i];
    if (it) { it.el.classList.add('focus'); if (it.focusFn) it.focusFn(); }
    if (!silent) this.ui.game.audio.sfx('uiMove');
  }
  use(i = this.focus) {
    const it = this.items[i];
    if (it && it.use) { this.ui.game.audio.sfx(it.silent ? 'uiMove' : 'uiConfirm'); it.use(); }
  }
  move(dir) {
    if (!this.items.length) return false;
    if (this.focus < 0) { this.setFocus(0); return true; }
    const cur = this.items[this.focus].el.getBoundingClientRect();
    const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    let best = -1, score = 1e9;
    this.items.forEach((it, i) => {
      if (i === this.focus) return;
      const r = it.el.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      let along, off;
      if (dir === 'up') { along = -y; off = Math.abs(x); } else if (dir === 'down') { along = y; off = Math.abs(x); } else if (dir === 'left') { along = -x; off = Math.abs(y); } else { along = x; off = Math.abs(y); }
      if (along <= 1) return;
      const s = along + off * 2.2;
      if (s < score) { score = s; best = i; }
    });
    if (best >= 0) { this.setFocus(best); return true; }
    return false;
  }
  /** A page switcher: not counted among a screen's choices. */
  pager(n, onPage, start = 0) {
    this.pages = n; this.page = start; this.onPage = onPage;
    const label = h('span');
    const prev = h('button', { 'data-pager': '1', onclick: (e) => { e.stopPropagation(); this.ui.game.input.clickQueue.push(() => this.turn(-1)); } }, '◄');
    const next = h('button', { 'data-pager': '1', onclick: (e) => { e.stopPropagation(); this.ui.game.input.clickQueue.push(() => this.turn(1)); } }, '►');
    const el = h('div.pager', prev, label, next);
    this.pagerLabel = label;
    this.el.append(el);
    this._label();
    return el;
  }
  _label() { if (this.pagerLabel) this.pagerLabel.textContent = `${this.page + 1} / ${this.pages}`; }
  turn(d) {
    if (this.pages < 2) return false;
    this.page = (this.page + d + this.pages) % this.pages;
    this._label();
    if (this.onPage) this.onPage(this.page);
    this.ui.game.audio.sfx('uiMove');
    return true;
  }
  setPrompts(list) { this.promptList = list; this._renderPrompts(); }
  _renderPrompts() {
    if (!this.promptList) { if (this.promptEl) this.promptEl.innerHTML = ''; return; }
    if (!this.promptEl) { this.promptEl = h('div.prompts'); this.el.append(this.promptEl); }
    const { input, save } = this.ui.game;
    this.promptEl.innerHTML = this.promptList.map(([v, t]) => promptHTML(v, t, input.lastDevice, save.settings.glyphs)).join('');
  }
}

export class UI {
  constructor(game, root) {
    this.game = game; this.root = root;
    this.stack = []; this.inert = false;
    this.layer = h('div.layer'); root.append(this.layer);
    this.lastDevice = null; this.lastGlyphs = null;
    this.toastEl = null; this.toastT = 0;
    this.deviceListeners = new Set();
  }
  get top() { return this.stack[this.stack.length - 1] || null; }
  /** Open a screen on top. def: { name, className, build(screen), back, alt, prompts, update, passive }. */
  open(def) {
    const s = new Screen(this, def);
    this.stack.push(s);
    this.layer.append(s.el);
    this.refresh();
    if (def.build) def.build(s);
    s._renderPrompts();
    if (s.items.length && s.focus < 0) s.setFocus(def.focus ?? 0, true);
    return s;
  }
  /** Replace everything with one screen. */
  only(def) { this.clear(); return this.open(def); }
  close(s = this.top) {
    if (!s) return;
    const i = this.stack.indexOf(s);
    if (i >= 0) this.stack.splice(i, 1);
    s.el.remove();
    this.refresh();
    if (s.def.onClose) s.def.onClose();
  }
  /** One menu at a time: passive layers stay, covered menus hide until they are on top again. */
  refresh() {
    let topSeen = false;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const s = this.stack[i];
      if (s.passive) { s.el.style.display = ''; continue; }
      s.el.style.display = topSeen ? 'none' : '';
      topSeen = true;
    }
  }
  clear() { while (this.stack.length) this.close(this.stack[this.stack.length - 1]); }
  has(name) { return this.stack.some((s) => s.name === name); }
  toast(text, sec = 2.6) {
    if (this.toastEl) this.toastEl.remove();
    this.toastEl = h('div.toast.tag', text);
    this.root.append(this.toastEl);
    this.toastT = sec;
  }
  fixed(dt) {
    const input = this.game.input;
    const queue = input.clickQueue;
    if (queue.length) { input.clickQueue = []; if (!this.inert) for (const f of queue) f(); }
    const s = this.top;
    if (!s || s.passive || this.inert) return;
    if (input.verb('up')) this._dir(s, 'up');
    if (input.verb('down')) this._dir(s, 'down');
    if (input.verb('left')) this._dir(s, 'left');
    if (input.verb('right')) this._dir(s, 'right');
    if (input.verb('pageL')) s.turn(-1);
    if (input.verb('pageR')) s.turn(1);
    if (input.verb('confirm')) s.use();
    if (input.verb('back') || input.verb('rightclick')) {
      if (s.onBack) { this.game.audio.sfx('uiBack'); s.onBack(); }
    }
    if (input.verb('alt') && s.onAlt) s.onAlt();
  }
  _dir(s, dir) {
    const it = s.items[s.focus];
    if (it) {
      if (dir === 'left' && it.left) { it.left(); return; }
      if (dir === 'right' && it.right) { it.right(); return; }
    }
    const moved = s.move(dir);
    if (!moved && (dir === 'left' || dir === 'right')) s.turn(dir === 'left' ? -1 : 1);
    if (s.def.onDir) s.def.onDir(dir, moved);
  }
  frame(dt) {
    const { input, save } = this.game;
    if (input.lastDevice !== this.lastDevice || save.settings.glyphs !== this.lastGlyphs) {
      this.lastDevice = input.lastDevice; this.lastGlyphs = save.settings.glyphs;
      for (const s of this.stack) s._renderPrompts();
      for (const f of this.deviceListeners) f();
    }
    for (const s of this.stack) if (s.updateFn) s.updateFn(dt, s);
    if (this.toastEl) { this.toastT -= dt; if (this.toastT <= 0) { this.toastEl.remove(); this.toastEl = null; } }
  }
  /** A left/right value control, dragged with the mouse. */
  slider(s, label, get, set, { min = 0, max = 100, step = 5, format = (v) => String(Math.round(v)), onChange = null } = {}) {
    const fill = h('div.fill'), track = h('div.track', fill), val = h('div.val');
    const el = h('div.slider', h('span', label), track, val);
    const render = () => {
      const v = get();
      fill.style.width = `${(100 * (v - min)) / (max - min)}%`;
      val.textContent = format(v);
    };
    const put = (v) => {
      const q = Math.round((Math.max(min, Math.min(max, v)) - min) / step) * step + min;
      set(+q.toFixed(5));
      render();
      if (onChange) onChange();
    };
    let dragging = false;
    const dragTo = (e) => { const r = track.getBoundingClientRect(); put(min + ((e.clientX - r.left) / r.width) * (max - min)); };
    track.style.pointerEvents = 'auto';
    track.addEventListener('pointerdown', (e) => { dragging = true; dragTo(e); e.stopPropagation(); if (track.setPointerCapture) { try { track.setPointerCapture(e.pointerId); } catch (x) { /* synthetic pointers have no capture */ } } });
    track.addEventListener('pointermove', (e) => { if (dragging) dragTo(e); });
    track.addEventListener('pointerup', () => { dragging = false; });
    render();
    s.item(el, { left: () => { put(get() - step); this.game.audio.sfx('uiMove'); }, right: () => { put(get() + step); this.game.audio.sfx('uiMove'); }, render, silent: true });
    return el;
  }
  /** Cycle through named options with left, right or use. */
  choice(s, label, options, get, set) {
    const val = h('span.val');
    const el = h('div.toggle', h('span', label), val);
    const idx = () => Math.max(0, options.findIndex((o) => o[0] === get()));
    const render = () => { val.textContent = options[idx()][1]; };
    const shift = (d) => { set(options[(idx() + d + options.length) % options.length][0]); render(); this.game.audio.sfx('uiMove'); };
    render();
    s.item(el, { left: () => shift(-1), right: () => shift(1), use: () => shift(1), silent: true });
    return el;
  }
}
