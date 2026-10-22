// Controller-first menu system. Up/down moves focus, Cross/Enter selects,
// left/right adjusts toggles and sliders, Circle/Escape goes back. Mouse clicks work too.
import { input } from './input.js';
import { sfx } from './audio.js';

export class Menus {
  constructor(root) {
    this.root = root;
    this.screen = null;
    this.focus = 0;
    this.holdT = 0;
  }

  // screen: { id, kicker, title, subtitle, items: [{label, value?, onSelect?, onAdjust?, disabled?}], body?, footer?, scroll?, onBack? }
  show(screen, focus = 0) {
    this.screen = screen;
    this.focus = focus;
    this.root.hidden = false;
    this.render();
  }

  hide() {
    this.screen = null;
    this.root.hidden = true;
    this.root.innerHTML = '';
  }

  get open() {
    return !!this.screen;
  }

  refresh() {
    if (this.screen) this.render();
  }

  render() {
    const s = this.screen;
    const items = (s.items || []).map((it, i) => {
      const cls = ['item', i === this.focus ? 'focus' : '', it.disabled ? 'disabled' : '', it.onAdjust ? 'adjustable' : ''].join(' ');
      const val = it.value ? `<span class="value" data-v="${i}">${it.value()}</span>` : '';
      return `<button class="${cls}" data-i="${i}" tabindex="-1"><span class="label">${it.label}</span>${val}</button>`;
    }).join('');
    this.root.innerHTML = `
      <div class="panel ${s.wide ? 'wide' : ''} ${s.id}">
        ${s.kicker ? `<div class="kicker">${s.kicker}</div>` : ''}
        ${s.title ? `<h1 class="title">${s.title}</h1>` : ''}
        ${s.subtitle ? `<p class="subtitle">${s.subtitle}</p>` : ''}
        ${s.body ? `<div class="body ${s.scroll ? 'scroll' : ''}" id="menuBody">${s.body}</div>` : ''}
        ${items ? `<div class="items">${items}</div>` : ''}
        ${s.footer ? `<div class="footer">${s.footer}</div>` : ''}
      </div>`;
    this.root.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.i);
        this.focus = i;
        this.activate();
      });
      el.addEventListener('mouseenter', () => {
        if (this.focus !== Number(el.dataset.i)) {
          this.focus = Number(el.dataset.i);
          this.render();
        }
      });
    });
  }

  move(dir) {
    const items = this.screen.items || [];
    if (!items.length) return;
    let i = this.focus;
    for (let n = 0; n < items.length; n++) {
      i = (i + dir + items.length) % items.length;
      if (!items[i].disabled) break;
    }
    if (i !== this.focus) {
      this.focus = i;
      sfx.blip();
      this.render();
    }
  }

  activate() {
    const it = (this.screen.items || [])[this.focus];
    if (!it || it.disabled) return;
    sfx.select();
    it.onSelect?.();
    if (this.screen) this.refresh();
  }

  adjust(dir) {
    const it = (this.screen.items || [])[this.focus];
    if (!it || !it.onAdjust) return;
    it.onAdjust(dir);
    sfx.blip();
    this.refresh();
  }

  // Updates live values (e.g. the stick readout) without rebuilding the DOM,
  // so mouse clicks in progress are not lost.
  patch() {
    for (const it of this.screen.items || []) {
      if (!it.value || !it.live) continue;
      const i = this.screen.items.indexOf(it);
      const el = this.root.querySelector(`[data-v="${i}"]`);
      if (el) el.textContent = it.value();
    }
  }

  // Called once per frame while a menu is open.
  update(dt) {
    if (!this.screen) return;
    const s = this.screen;
    this.patch();
    if (input.tapped('up')) this.move(-1);
    if (input.tapped('down')) this.move(1);
    if (input.tapped('left')) this.adjust(-1);
    if (input.tapped('right')) this.adjust(1);
    if (input.tapped('confirm')) this.activate();
    if (input.tapped('back') && s.onBack) {
      sfx.back();
      s.onBack();
    }
    // Scrollable body (About, Results): stick or keys scroll the text.
    if (s.scroll) {
      const body = this.root.querySelector('#menuBody');
      if (body) {
        const dy = (input.held('down') ? 1 : 0) - (input.held('up') ? 1 : 0);
        if (dy) body.scrollTop += dy * 480 * dt;
      }
    }
  }
}
