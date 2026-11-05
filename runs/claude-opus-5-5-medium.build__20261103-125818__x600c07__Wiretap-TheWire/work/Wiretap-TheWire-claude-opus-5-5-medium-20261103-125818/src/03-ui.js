// WIRETAP: the DOM UI kit. Screens stacked over the pixels, read by the game's own input (stick, d-pad, keys) with
// spatial focus, hover focuses and click selects, a legend of glyphs that follows the device. Headless it keeps the
// screens' models and draws nothing.
function h(tag, attrs, ...kids) {
  if (!HAS_DOM) return null;
  if (attrs !== null && attrs !== undefined && (Array.isArray(attrs) || attrs.nodeType || typeof attrs !== 'object')) { kids.unshift(attrs); attrs = null; }
  const el = document.createElement(tag.replace(/[.#].*$/, '') || 'div');
  const cls = tag.match(/\.[\w-]+/g); if (cls) el.className = cls.map(c => c.slice(1)).join(' ');
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') el._act = v; else if (k === 'lr') el._lr = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v); else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
/** a focusable button: label (text), action; extra attrs */
const btn = (label, fn, cls = '', attrs = {}) => h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), Object.assign({ 'data-f': '', on: fn, type: 'button' }, attrs), label);
const legendHTML = list => list.filter(Boolean).map(([a, t]) => `<span class="lg">${glyphHTML(a)}<span>${esc(t)}</span></span>`).join('');

const UI = {
  root: null, stack: [],
  init() {
    if (!HAS_DOM) return;
    this.root = document.getElementById('ui');
    this.root.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest('[data-f]'); const s = this.top(); if (b && s && s.items && s.items.includes(b)) this.focus(s, s.items.indexOf(b), true); });
    this.root.addEventListener('click', e => { const b = e.target.closest('[data-f]'); const s = this.top(); if (!b || !s || !s.items.includes(b) || b.disabled) return; this.focus(s, s.items.indexOf(b), true); this.activate(s); });
    this.root.addEventListener('wheel', e => { const s = this.top(); if (s && s.el) { const sc = s.el.querySelector('.scroll'); if (sc) { sc.scrollTop += e.deltaY; e.preventDefault(); } } }, { passive: false });
    this.root.addEventListener('contextmenu', e => e.preventDefault());
    // hover moves the focus in the engine's own E.Shell screens too (it navigates by document.activeElement)
    document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.esh-sh button, .esh-sh [tabindex], .esh-sh select, .esh-sh input'); if (b) b.focus({ preventScroll: true }); });
    BUS.on('device', () => { for (const s of this.stack) this.legend(s); });
  },
  top() { return this.stack[this.stack.length - 1] || null; },
  busy() { return this.stack.length > 0; },
  /** open a screen: { id, cls, render(el, s), cancel(s), tab(dir, s), alt(s), info(s), fast, legend: [[act, label]], focus } */
  open(spec) {
    const s = Object.assign({ fi: 0, items: [], legendList: spec.legend || [['confirm', 'Select'], ['cancel', 'Back']] }, spec);
    if (HAS_DOM) { s.el = h('div.screen' + (spec.cls ? '.' + spec.cls.split(' ').join('.') : '')); this.root.append(s.el); }
    // while a screen is open, Esc / Options close it rather than also pausing the scene underneath
    if (!this.stack.length && game.scene && game.scene.pausable) { this._pz = game.scene; game.scene.pausable = false; }
    this.stack.push(s); this.refresh(s, spec.focus || 0); game.input.consumeAll(); sfx('ui_tick'); return s;
  },
  close(s = this.top()) {
    const i = this.stack.indexOf(s); if (i < 0) return; this.stack.splice(i, 1);
    if (s.el) s.el.remove(); if (s.onClose) s.onClose(s); game.input.consumeAll();
    if (!this.stack.length && this._pz) { this._pz.pausable = true; this._pz = null; }
  },
  closeAll() { while (this.stack.length) this.close(); },
  /** re-render a screen, keeping the focus on the same index (or fi) */
  refresh(s = this.top(), fi) {
    if (!s) return; if (fi !== undefined) s.fi = fi;
    if (!HAS_DOM) { if (s.model) s.model(s); return; }
    const sc = s.el.querySelector('.scroll'), st = sc ? sc.scrollTop : 0;
    s.el.innerHTML = ''; s.render(s.el, s);
    const sc2 = s.el.querySelector('.scroll'); if (sc2) sc2.scrollTop = st;
    s.items = Array.from(s.el.querySelectorAll('[data-f]')).filter(b => !b.closest('[hidden]'));
    const foot = h('div.legend'); s.el.append(foot); s.foot = foot; this.legend(s);
    this.focus(s, clamp(s.fi, 0, Math.max(0, s.items.length - 1)));
  },
  legend(s) { if (s.foot) s.foot.innerHTML = legendHTML(typeof s.legendList === 'function' ? s.legendList(s) : s.legendList); },
  focus(s, i, quiet) {
    if (!s.items.length) return; i = clamp(i, 0, s.items.length - 1);
    if (s.items[s.fi]) s.items[s.fi].classList.remove('focus');
    if (s.fi !== i && !quiet) sfx('ui_tick');
    s.fi = i; const b = s.items[i]; b.classList.add('focus');
    if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (s.onFocus) s.onFocus(b, s);
  },
  activate(s) { const b = s.items[s.fi]; if (!b || b.disabled || b.classList.contains('off')) { sfx('cancel'); return; } if (b._act) { sfx('confirm'); b._act(b, s); } },
  /** nearest focusable in a direction, by rect centres with an angle penalty */
  move(s, dx, dy) {
    const cur = s.items[s.fi]; if (!cur) return;
    if (cur._lr && dx) { cur._lr(dx, s); return; }
    const r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = -1, bs = 1e9;
    s.items.forEach((b, i) => {
      if (i === s.fi) return; const r = b.getBoundingClientRect(); if (!r.width) return;
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy, along = x * dx + y * dy; if (along <= 4) return;
      const across = Math.abs(x * dy - y * dx), sc = along + across * 2.2; if (sc < bs) { bs = sc; best = i; }
    });
    if (best >= 0) this.focus(s, best);
    else if (dy) { const n = s.items.length; this.focus(s, (s.fi + dy + n) % n); }
  },
  /** each step: the top screen takes the input (returns true while a screen holds it) */
  update(dt) {
    const s = this.top(); if (!s) return false;
    if (game.paused || (typeof ui !== 'undefined' && ui && ui.screen)) return true;
    const I = game.input;
    if (s.tick) s.tick(dt, s);
    if (this.top() !== s) return true;
    if (I.repeat('up')) this.move(s, 0, -1); else if (I.repeat('down')) this.move(s, 0, 1);
    else if (I.repeat('left')) this.move(s, -1, 0); else if (I.repeat('right')) this.move(s, 1, 0);
    // the box's diamond and the cipher read their own actions; a screen's keys take precedence over confirm
    if (s.keys) for (const [a, fn] of Object.entries(s.keys)) if (I.pressed(a)) { I.consumeAll(); fn(s); return true; }
    if (I.pressed('confirm')) { if (!HAS_DOM && s.confirm) s.confirm(s); else this.activate(s); }
    else if (I.pressed('cancel') && s.cancel) { sfx('cancel'); s.cancel(s); }
    else if (I.pressed('tabPrev') && s.tab) s.tab(-1, s);
    else if (I.pressed('tabNext') && s.tab) s.tab(1, s);
    else if (I.pressed('uiAlt') && s.alt) s.alt(s);
    else if (I.pressed('uiInfo') && s.info) s.info(s);
    return true;
  },
  /** a choice of 2-3 cards with their consequences spelled out (ops choices, dilemmas) */
  cards(o) {
    return this.open({ id: 'cards', cls: 'cards-screen', legend: [['confirm', 'Choose']], render(el) {
      el.append(h('div.panel.dark',
        h('div.kicker', { text: o.kicker || '' }), h('h1', { text: o.title }), o.text ? h('p.lede', { text: o.text }) : null,
        h('div.cards', o.cards.map((c, i) => h('button.card' + (c.locked ? '.off' : ''), { 'data-f': '', on: () => { if (c.locked) return; UI.close(); o.pick(i, c); } },
          h('div.card-t', { text: c.title }), h('div.card-b', { text: c.body }), c.cost ? h('div.card-c', { text: c.cost }) : null, c.locked ? h('div.card-l', { text: c.locked }) : null)))));
    }, model(s) { s.pick = i => { if (o.cards[i].locked) return; UI.close(s); o.pick(i, o.cards[i]); }; s.confirm = () => s.pick(o.cards.findIndex(c => !c.locked)); } });
  }
};
