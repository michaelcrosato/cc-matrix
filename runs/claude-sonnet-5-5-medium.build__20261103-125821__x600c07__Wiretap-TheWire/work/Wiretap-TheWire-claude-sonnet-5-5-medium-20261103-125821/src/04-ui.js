// 04-ui: the DOM screen kit (case-file look). Controller-first focus navigation, hover focuses, click selects, legend footer follows the device.
const HAS_DOM = typeof document !== 'undefined' && !!document.getElementById;
const UI = {
  root: null, stack: [], cur: null, lastHover: 0,
  init() { if (!HAS_DOM) return; this.root = document.getElementById('ui'); if (!this.root) return;
    document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.esh-sh button, .esh-sh [tabindex], .esh-sh select, .esh-sh input'); if (b) b.focus({ preventScroll: true }); });
    bus.on('device', () => this.refresh()); },
  get isOpen() { return !!this.cur; },
  open(spec) { if (this.cur) this.stack.push(this.cur); this.cur = Object.assign({ focus: 0, items: [], legend: [['confirm', 'Select'], ['cancel', 'Back']] }, spec); this.render(); return this.cur; },
  close() { this.cur = this.stack.pop() || null; if (this.cur) this.render(); else if (this.root) { this.root.innerHTML = ''; this.root.classList.remove('on'); } },
  closeAll() { this.stack = []; this.cur = null; if (this.root) { this.root.innerHTML = ''; this.root.classList.remove('on'); } },
  replace(spec) { this.cur = null; this.open(spec); },
  refresh() { if (this.cur) this.render(true); },
  // rerender: keeps focus index; body may be a function (live)
  render(keep) {
    const s = this.cur; if (!this.root || !s) return; this.root.classList.add('on');
    const body = typeof s.body === 'function' ? s.body(s) : (s.body || ''), tabs = s.tabs ? `<div class="tabs">${s.tabs.map((t, i) => `<span class="tab${i === s.tab ? ' on' : ''}">${esc(t)}</span>`).join('')}</div>` : '';
    const items = s.items.map((it, i) => `<button class="it${it.disabled ? ' dis' : ''}${i === s.focus ? ' focus' : ''}${it.cls ? ' ' + it.cls : ''}" data-i="${i}">${it.html || esc(it.label)}${it.sub ? `<small>${it.sub}</small>` : ''}</button>`).join('');
    const legend = (s.legend || []).map(([a, t]) => `<span class="lg">${a === 'move' ? glyphHTML(game.input.lastDevice === 'gamepad' ? 'D-pad' : '↑↓') : glyph(a)} ${esc(t)}</span>`).join('');
    this.root.innerHTML = `<div class="scr ${s.cls || ''}"><div class="card">${s.kicker ? `<div class="kick">${esc(s.kicker)}</div>` : ''}<h1>${esc(s.title || '')}</h1>${tabs}<div class="body">${body}</div><div class="items cols${s.cols || 1}">${items}</div></div><div class="legend">${legend}</div></div>`;
    const sc = this.root.querySelectorAll('.it'); sc.forEach(b => { b.addEventListener('pointerenter', e => { if (e.pointerType === 'touch') return; this.setFocus(+b.dataset.i, true); }); b.addEventListener('click', () => { this.setFocus(+b.dataset.i, true); this.activate(); }); });
    const body2 = this.root.querySelector('.body'); if (body2) body2.addEventListener('wheel', e => { body2.scrollTop += e.deltaY; }, { passive: true });
    if (s.onRender) s.onRender(this.root, s);
  },
  setFocus(i, quiet) { const s = this.cur; if (!s || i === s.focus || i < 0 || i >= s.items.length) return; s.focus = i; const bs = this.root && this.root.querySelectorAll('.it'); if (bs) bs.forEach((b, k) => b.classList.toggle('focus', k === i)); if (!quiet) Sound.sfx('focus'); else Sound.sfx('tick'); if (s.onFocus) s.onFocus(s.items[i], i); },
  activate() { const s = this.cur; if (!s) return; const it = s.items[s.focus]; if (!it || it.disabled) { Sound.sfx('deny'); return; } Sound.sfx('good', { vol: .5 }); if (it.fn) it.fn(it, s); },
  nav(dx, dy) {
    const s = this.cur, bs = this.root ? Array.from(this.root.querySelectorAll('.it')) : []; if (!s || !s.items.length) return;
    if (!bs.length) { this.setFocus(clamp(s.focus + (dy || dx), 0, s.items.length - 1)); return; }
    const c = bs[s.focus].getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2; let best = -1, bs2 = 1e9;
    bs.forEach((b, i) => { if (i === s.focus) return; const r = b.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy; const along = x * dx + y * dy; if (along <= 2) return; const side = Math.abs(x * dy - y * dx); const sc = along + side * 2.2; if (sc < bs2) { bs2 = sc; best = i; } });
    if (best >= 0) this.setFocus(best); else if (dy) this.setFocus(clamp(s.focus + dy, 0, s.items.length - 1));
  },
  // called every step from Globals.tick: returns true while a screen owns the input
  update(dt) {
    const s = this.cur; if (!s) return false; const I = game.input;
    if (s.onUpdate && s.onUpdate(dt, s) === true) return true;
    for (const [a, dx, dy] of [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]) if (I.repeat(a, .35, .11)) { if (s.onKey && s.onKey(a, s)) continue; this.nav(dx, dy); }
    for (const a of ['tabPrev', 'tabNext', 'uiAlt', 'uiInfo', 'boxTop', 'boxLeft', 'boxRight', 'boxBottom']) if (I.pressed(a) && s.onKey && s.onKey(a, s)) { /* handled */ }
    if (I.pressed('confirm')) { if (!(s.onKey && s.onKey('confirm', s))) this.activate(); }
    if (I.pressed('cancel') || I.pressed('pause')) { if (s.onKey && s.onKey('cancel', s)) return true; if (s.onBack) { s.onBack(s); } else if (s.back !== false) this.close(); Sound.sfx('tick'); }
    return true;
  }
};
// number keys 1-4 pick items when the card says so
if (typeof document !== 'undefined') document.addEventListener('keydown', e => { Devices.sawKey = true; const s = UI.cur; if (!s || !s.numberKeys) return; const n = +e.key; if (n >= 1 && n <= s.items.length) { UI.setFocus(n - 1); UI.activate(); } });
// HUD-ish DOM helpers
const Hud = { el: null,
  init() { if (!HAS_DOM) return; this.el = document.createElement('div'); this.el.id = 'hud2'; document.body.appendChild(this.el); const t = document.createElement('div'); t.id = 'toasts'; document.body.appendChild(t); },
  set(html) { if (!this.el) return; if (html !== this._h) { this._h = html; this.el.innerHTML = html; } },
  toast(title, text, sec = 3) { if (!this.el) return; const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<b>${esc(title)}</b> ${esc(text || '')}`; (document.getElementById('toasts') || document.body).appendChild(t); setTimeout(() => t.remove(), sec * 1000); }
};
