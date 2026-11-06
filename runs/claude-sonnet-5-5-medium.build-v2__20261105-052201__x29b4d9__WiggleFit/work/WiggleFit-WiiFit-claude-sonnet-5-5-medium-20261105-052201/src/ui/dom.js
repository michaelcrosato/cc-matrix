import { glyph, promptBar } from '../input/glyphs.js';
export const $ = (s, r = document) => r.querySelector(s);
export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
export function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export class UI {
  constructor(game) {
    this.game = game; this.root = el('div'); this.root.id = 'ui'; document.body.appendChild(this.root);
    const layer = (id, cls = '') => { const d = el('div', cls); d.id = id; this.root.appendChild(d); return d; };
    this.screen = layer('screen'); this.hud = layer('hud'); this.speech = layer('speech'); this.prompts = layer('prompts'); this.toastL = layer('toast'); this.extra = layer('extra');
    this.menu = null; this.promptItems = null; this.lastHover = { x: -1, y: -1 };
  }
  clear() { this.screen.innerHTML = ''; this.menu = null; }
  set(html, cls = 'center') { this.screen.className = cls; this.screen.innerHTML = html; }
  device() { return this.game.input.lastDevice; }
  g(action) { return glyph(action, this.device(), this.game.settings.glyphs); }
  setPrompts(items) { this.promptItems = items; this.renderPrompts(); }
  renderPrompts() { this.prompts.innerHTML = this.promptItems ? promptBar(this.promptItems, this.device(), this.game.settings.glyphs) : ''; }
  toast(text, ms = 2600) { const t = el('div', 'tag t', esc(text)); this.toastL.appendChild(t); this.game.after(ms / 1000, () => t.remove()); }
  // Focus menu over `container`; items: {label, sub, ok, left, right, disabled, id}
  menuOf(container, items, { onBack, cls = 'left', start = 0, vertical = true } = {}) {
    const m = new Menu(this, container, items, { onBack, start }); this.menu = m; return m;
  }
}
export class Menu {
  constructor(ui, container, items, { onBack, start = 0 }) {
    this.ui = ui; this.items = items; this.i = Math.min(start, items.length - 1); this.onBack = onBack; this.els = []; this.container = container;
    items.forEach((it, idx) => {
      const b = el(it.tag || 'button', 'tag ' + (it.cls || '') + (it.disabled ? ' dim' : '')); b.dataset.idx = idx; b.innerHTML = it.html || (esc(it.label) + (it.sub ? `<small>${esc(it.sub)}</small>` : '')); b.setAttribute('data-menu-item', it.id || idx);
      b.addEventListener('pointermove', (e) => { const L = ui.lastHover; if (e.clientX === L.x && e.clientY === L.y) return; L.x = e.clientX; L.y = e.clientY; if (e.movementX === 0 && e.movementY === 0 && e.pointerType === 'mouse' && false) return; this.focus(idx, true); });
      b.addEventListener('click', (e) => { e.preventDefault(); this.focus(idx, true); this.ok(); });
      container.appendChild(b); this.els.push(b);
    });
    this.refresh();
  }
  focus(i, quiet) { if (i === this.i && quiet) return; this.i = i; this.refresh(); if (!quiet) this.ui.game.audio.sfx('uiMove'); else this.ui.game.audio.sfx('uiMove'); }
  refresh() { this.els.forEach((e, k) => e.classList.toggle('focus', k === this.i)); }
  update(idx, html) { this.els[idx].innerHTML = html; }
  nav(a) {
    const n = this.items.length; if (!n) return false; const it = this.items[this.i];
    if (a === 'down' || a === 'right' && !(it.left || it.right)) { if (a === 'right' && it.page) { it.page(1); return true; } this.step(1); return true; }
    if (a === 'up' || a === 'left' && !(it.left || it.right)) { if (a === 'left' && it.page) { it.page(-1); return true; } this.step(-1); return true; }
    if (a === 'left' && it.left) { it.left(); return true; } if (a === 'right' && it.right) { it.right(); return true; }
    if (a === 'ok') { this.ok(); return true; } if (a === 'back') { if (this.onBack) { this.ui.game.audio.sfx('uiBack'); this.onBack(); return true; } }
    return false;
  }
  step(d) { const n = this.items.length; let k = this.i; for (let t = 0; t < n; t++) { k = (k + d + n) % n; if (!this.items[k].skip) break; } this.i = k; this.refresh(); this.ui.game.audio.sfx('uiMove'); }
  ok() { const it = this.items[this.i]; if (!it || it.disabled && !it.okDisabled) { this.ui.game.audio.sfx('uiBack'); return; } this.ui.game.audio.sfx('uiOk'); it.ok && it.ok(); }
}
