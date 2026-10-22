// One menu component for every screen. Works the same with a controller, keyboard or mouse.
// Items are actions, toggles or sliders. Text screens scroll with the stick.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class Menu {
  constructor(root, onAudio) {
    this.root = root;
    this.onAudio = onAudio || (() => {});
    this.screen = null;
    this.focus = 0;
    this.items = [];
    this.scroll = 0;
    this.body = null;
  }

  // screen: { title, subtitle, items, body, footer, onBack, className }
  show(screen) {
    this.screen = screen;
    this.items = screen.items || [];
    this.focus = Math.max(0, this.items.findIndex((i) => !i.disabled));
    this.scroll = 0;
    this.root.className = screen.className || '';
    this.root.classList.remove('hidden');
    this.render();
  }

  hide() {
    this.root.classList.add('hidden');
    this.screen = null;
  }

  get visible() {
    return !this.root.classList.contains('hidden') && !!this.screen;
  }

  render() {
    const s = this.screen;
    const rows = this.items.map((it, i) => {
      const value = it.kind === 'toggle' ? (it.get() ? 'ON' : 'OFF') : it.kind === 'slider' ? it.fmt(it.get()) : it.value ?? '';
      const hint = it.hint ? `<span class="hint">${esc(it.hint)}</span>` : '';
      return `<div class="item ${i === this.focus ? 'focus' : ''} ${it.disabled ? 'disabled' : ''}" data-i="${i}">
        <span>${esc(it.label)}${hint ? `<br>${hint}` : ''}</span><span class="val">${esc(value)}</span></div>`;
    }).join('');
    const body = s.body ? `<div class="body"><div class="scroller"><div class="scrollInner" style="transform:translateY(${-this.scroll}px)">${s.body}</div></div></div>` : '';
    this.root.innerHTML = `<div class="panel">
      ${s.title ? `<h1>${esc(s.title)}</h1>` : ''}
      ${s.subtitle ? `<div class="sub">${esc(s.subtitle)}</div>` : ''}
      ${body}
      ${rows ? `<div class="items">${rows}</div>` : ''}
      ${s.footer ? `<div class="footer"><span>${esc(s.footer)}</span></div>` : ''}
    </div>`;
    this.root.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.i);
        if (this.items[i].disabled) return;
        this.focus = i;
        this.activate();
      });
      el.addEventListener('mouseenter', () => {
        this.focus = Number(el.dataset.i);
        this.paintFocus();
      });
    });
    this.body = this.root.querySelector('.scrollInner');
  }

  paintFocus() {
    this.root.querySelectorAll('.item').forEach((el) => {
      el.classList.toggle('focus', Number(el.dataset.i) === this.focus);
    });
  }

  // Called each frame with the Input object.
  update(input) {
    if (!this.visible) return;
    const nav = input.nav();
    if (this.screen.body && nav.y !== 0 && !this.items.length) {
      this.scroll = Math.max(0, this.scroll + nav.y * 60);
      if (this.body) this.body.style.transform = `translateY(${-this.scroll}px)`;
      return;
    }
    if (nav.y !== 0 && this.items.length) {
      this.moveFocus(nav.y);
      this.onAudio('move');
    }
    const it = this.items[this.focus];
    if (it && nav.x !== 0) {
      if (it.kind === 'slider') {
        const v = Math.max(it.min, Math.min(it.max, +(it.get() + nav.x * it.step).toFixed(3)));
        it.set(v);
        this.onAudio('move');
        this.refreshValues();
      } else if (it.kind === 'toggle') {
        it.set(!it.get());
        this.onAudio('move');
        this.refreshValues();
      }
    }
    if (input.pressed('confirm') && it) this.activate();
    else if (input.pressed('back') && this.screen.onBack) {
      this.onAudio('back');
      this.screen.onBack();
    }
  }

  moveFocus(dir) {
    const n = this.items.length;
    let i = this.focus;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!this.items[i].disabled) break;
    }
    this.focus = i;
    this.paintFocus();
  }

  refreshValues() {
    this.root.querySelectorAll('.item').forEach((el) => {
      const it = this.items[Number(el.dataset.i)];
      const value = it.kind === 'toggle' ? (it.get() ? 'ON' : 'OFF') : it.kind === 'slider' ? it.fmt(it.get()) : it.value ?? '';
      el.querySelector('.val').textContent = value;
    });
  }

  activate() {
    const it = this.items[this.focus];
    if (!it || it.disabled) return;
    if (it.kind === 'toggle') {
      it.set(!it.get());
      this.refreshValues();
      this.onAudio('select');
    } else if (it.onSelect) {
      this.onAudio('select');
      it.onSelect();
    }
  }
}
