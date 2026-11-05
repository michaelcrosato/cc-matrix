/* 04-ui: the DOM interface kit for case-file screens (Board, notebook, cipher, box, affidavit, wire, menus).
   Controller first: spatial focus with the d-pad/stick, ✕ selects, ○ backs out, L1/R1 page, □ alt, △ info; the mouse
   focuses on hover and selects on click; every screen has a legend that follows the device. Headless-safe: with no DOM
   the stack and specs still work (tests call spec.onSelect directly). */
const UI = {
  root: null, stack: [], _held: null,
  init() {
    if (HEADLESS) return;
    this.root = document.getElementById('ui');
    const R = this.root;
    R.addEventListener('click', e => { const n = e.target.closest('[data-f]'); const s = this.top(); if (!n || !s || !s.el.contains(n)) return; e.preventDefault(); this.setFocus(s, n); this.activate(s, n); });
    R.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const n = e.target.closest('[data-f]'); const s = this.top(); if (n && s && s.el.contains(n) && s.focus !== n) this.setFocus(s, n, true); });
    R.addEventListener('contextmenu', e => e.preventDefault());
    // hover moves focus in the engine's own E.Shell screens too (it navigates by document.activeElement)
    document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const b = e.target.closest && e.target.closest('.esh-sh button, .esh-sh [tabindex], .esh-sh select, .esh-sh input'); if (b) b.focus({ preventScroll: true }); });
  },
  get active() { return this.stack.length > 0; },
  top() { return this.stack[this.stack.length - 1] || null; },
  /** open a screen: { cls, html(), onSelect(id, node), onBack, onTab(dir), onAlt(id), onInfo(id), keys: { action: fn }, legend: [[act, label]], tick(dt), allowPause, focus } */
  open(spec) {
    const s = { spec, el: null, focus: null, id: spec.id || 'scr' };
    if (this.root) { s.el = document.createElement('div'); s.el.className = 'scr ' + (spec.cls || ''); this.root.appendChild(s.el); }
    for (const o of this.stack) if (o.el) o.el.classList.add('under');
    this.stack.push(s); this.render(s, spec.focus);
    this._pause();
    Snd.play('ui_tick', { vol: .6 });
    return s;
  },
  close(s = this.top(), quiet) {
    if (!s) return; const i = this.stack.indexOf(s); if (i < 0) return;
    this.stack.splice(i, 1); if (s.el) s.el.remove();
    const nt = this.top(); if (nt && nt.el) nt.el.classList.remove('under');
    if (s.spec.onClose) try { s.spec.onClose(); } catch (e) { game.fail('ui close', e); }
    this._pause(); if (!quiet) Snd.play('cancel', { vol: .4 });
    game.input.consumeAll();
  },
  closeAll() { while (this.stack.length) this.close(this.top(), true); },
  /** the scene can't pause on Escape while a screen that uses Escape as "back" is open */
  _pause() {
    const sc = game.scene, t = this.top(), need = t && !t.spec.allowPause;
    if (need && sc && sc.pausable && !this._held) { this._held = sc; sc.pausable = false; }
    if (!need && this._held) { this._held.pausable = true; this._held = null; }
  },
  render(s = this.top(), keepId) {
    if (!s || !s.el) return;
    const fid = keepId !== undefined ? keepId : s.focus && s.focus.dataset.f;
    const body = typeof s.spec.html === 'function' ? s.spec.html() : (s.spec.html || '');
    s.el.innerHTML = body + (s.spec.legend ? `<div class="legend">${this.legend(typeof s.spec.legend === 'function' ? s.spec.legend() : s.spec.legend)}</div>` : '');
    this.fillGlyphs(s.el);
    const list = this.focusables(s), n = (fid != null && list.find(x => x.dataset.f === String(fid))) || list[0] || null;
    s.focus = null; if (n) this.setFocus(s, n, true);
  },
  refresh() { this.render(this.top()); },
  legend(pairs) { return pairs.filter(Boolean).map(([a, l]) => `<span class="lg">${Prompts.html(a)}<b>${esc(l)}</b></span>`).join(''); },
  fillGlyphs(el) { if (!el) return; for (const n of el.querySelectorAll('[data-g]')) n.innerHTML = Prompts.html(n.dataset.g); },
  /** prompts follow the device: re-draw every legend and glyph */
  relegend() {
    for (const s of this.stack) {
      if (!s.el) continue; const lg = s.el.querySelector(':scope > .legend');
      if (lg && s.spec.legend) lg.innerHTML = this.legend(typeof s.spec.legend === 'function' ? s.spec.legend() : s.spec.legend);
      this.fillGlyphs(s.el);
    }
    if (this.root) this.fillGlyphs(document.getElementById('hudx'));
  },
  focusables(s) { return s.el ? [...s.el.querySelectorAll('[data-f]')].filter(n => !n.classList.contains('off') && n.offsetParent !== null) : []; },
  setFocus(s, n, quiet) {
    if (s.focus === n) return; if (s.focus) s.focus.classList.remove('is-f');
    s.focus = n; n.classList.add('is-f'); n.scrollIntoView && n.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!quiet) Snd.play('ui_tick');
    if (s.spec.onFocus) s.spec.onFocus(n.dataset.f, n);
  },
  activate(s, n) {
    if (!n || n.classList.contains('dis')) { Snd.play('bump', { vol: .3 }); return; }
    Snd.play('confirm', { vol: .5 });
    if (s.spec.onSelect) try { s.spec.onSelect(n.dataset.f, n); } catch (e) { game.fail('ui select', e); }
  },
  /** spatial navigation: the nearest focusable in the pressed direction, by rect centres with an angle penalty */
  move(s, dx, dy) {
    const list = this.focusables(s); if (!list.length) return;
    if (!s.focus || !list.includes(s.focus)) { this.setFocus(s, list[0]); return; }
    const r0 = s.focus.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = 1e9;
    for (const n of list) {
      if (n === s.focus) continue; const r = n.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy; if (along <= 4) continue;
      const across = Math.abs(x * dy - y * dx), sc = along + across * 2.2;
      if (sc < bs) { bs = sc; best = n; }
    }
    if (best) this.setFocus(s, best); else if (s.spec.onEdge) s.spec.onEdge(dx, dy);
  },
  tick(dt) {
    const s = this.top(); if (!s) return;
    if (Prompts.dirty) { Prompts.dirty = false; this.relegend(); }
    if (s.spec.tick) try { s.spec.tick(dt); } catch (e) { game.fail('ui tick', e); }
    if (game.paused || (game.shell && game.shell.screen) || this.top() !== s) return;
    const I = game.input, rep = a => I.repeat(a, .32, .09);
    let used = false;
    if (s.spec.keys) for (const a in s.spec.keys) if (I.pressed(a)) { used = true; try { s.spec.keys[a](s.focus && s.focus.dataset.f); } catch (e) { game.fail('ui key ' + a, e); } break; }
    if (used || this.top() !== s) return;
    if (!s.spec.noNav) {
      if (rep('up')) this.move(s, 0, -1); else if (rep('down')) this.move(s, 0, 1);
      else if (rep('left')) this.move(s, -1, 0); else if (rep('right')) this.move(s, 1, 0);
    }
    if (I.pressed('confirm') && s.focus && !s.spec.noConfirm) this.activate(s, s.focus);
    else if (I.pressed('cancel') && s.spec.onBack !== null) { if (s.spec.onBack) s.spec.onBack(); else this.close(s); }
    else if (I.pressed('tabPrev') && s.spec.onTab) { Snd.play('ui_tick'); s.spec.onTab(-1); }
    else if (I.pressed('tabNext') && s.spec.onTab) { Snd.play('ui_tick'); s.spec.onTab(1); }
    else if (I.pressed('uiAlt') && s.spec.onAlt) s.spec.onAlt(s.focus && s.focus.dataset.f);
    else if (I.pressed('uiInfo') && s.spec.onInfo) s.spec.onInfo(s.focus && s.focus.dataset.f);
  },
  /** a simple choice screen: title, text, up to 6 cards. choose({ kicker, title, text, cards: [{ id, label, sub, disabled, why }] }, fn) */
  choose(o, fn) {
    const s = this.open({ cls: 'choice ' + (o.cls || ''), allowPause: o.allowPause, onBack: o.back === false ? null : o.back,
      html: () => `<div class="panel"><div class="kicker">${esc(o.kicker || '')}</div><h1>${esc(o.title || '')}</h1>${o.text ? `<p class="lede">${esc(o.text)}</p>` : ''}
        <div class="cards n${o.cards.length}">${o.cards.map(c => `<button class="card${c.disabled ? ' dis' : ''}" data-f="${esc(c.id)}"><b>${esc(c.label)}</b>${c.sub ? `<span>${esc(c.sub)}</span>` : ''}${c.disabled && c.why ? `<em>${esc(c.why)}</em>` : ''}</button>`).join('')}</div></div>`,
      legend: [['confirm', 'Choose'], o.back !== false && ['cancel', 'Back']],
      onSelect: id => { const c = o.cards.find(x => String(x.id) === id); if (!c || c.disabled) return; this.close(s, true); fn(c.id); } });
    return s;
  },
  /** a full-screen notice with one button */
  notice(o, fn) {
    const s = this.open({ cls: 'notice ' + (o.cls || ''), allowPause: o.allowPause, onBack: () => { this.close(s, true); if (fn) fn(); },
      html: () => `<div class="panel narrow"><div class="kicker">${esc(o.kicker || '')}</div><h1>${esc(o.title || '')}</h1>${(o.lines || []).map(l => `<p>${esc(l)}</p>`).join('')}<button class="btn primary" data-f="ok">${esc(o.ok || 'Continue')}</button></div>`,
      legend: [['confirm', o.ok || 'Continue']], onSelect: () => { this.close(s, true); if (fn) fn(); } });
    return s;
  }
};
