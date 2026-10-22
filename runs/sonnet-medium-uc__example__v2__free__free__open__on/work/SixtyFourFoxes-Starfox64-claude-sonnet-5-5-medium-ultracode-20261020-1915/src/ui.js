// Controller-first menu system (focus navigation, sliders, tabs) + screens.
import { CSS } from './style.js';
import { HUD } from './hud.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { settings, saveSettings, DEFAULTS } from './settings.js';
import { store, clamp } from './util.js';
import { ABOUT_HTML } from './about.js';
import { STAGES } from './level.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const G = (a) => `<kbd>${input.glyph(a)}</kbd>`;

export class UI {
  constructor() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    this.root = el('div'); this.root.id = 'ui'; document.body.appendChild(this.root);
    this.hud = new HUD(this.root);
    this.screenEl = null; this.stack = []; this.cur = null; this.focus = 0; this.items = [];
    this.prompts = el('div', 'prompts hidden'); this.root.appendChild(this.prompts);
    this.fade = el('div', 'fade'); this.root.appendChild(this.fade);
    this.actions = {};
    this.testPad = null;
  }
  setActions(a) { this.actions = a; }
  get open() { return !!this.cur; }
  fadeTo(on, ms = 350) { this.fade.style.transitionDuration = ms + 'ms'; this.fade.classList.toggle('on', on); return new Promise((r) => setTimeout(r, ms)); }
  close() { if (this.screenEl) this.screenEl.remove(); this.screenEl = null; this.cur = null; this.stack = []; this.prompts.classList.add('hidden'); this.items = []; }
  // def: {name, build(ui) -> {title, items, html, cls, onBack, prompts, tabs}}
  show(name, params = {}, push = false) {
    if (push && this.cur) this.stack.push({ name: this.cur.name, params: this.cur.params, focus: this.focus });
    else if (!push) this.stack = [];
    this.render(name, params);
  }
  back() {
    if (this.cur && this.cur.def.onBack) { audio.sfx('back'); this.cur.def.onBack(); return; }
    const prev = this.stack.pop(); if (!prev) return;
    audio.sfx('back'); this.render(prev.name, prev.params, prev.focus);
  }
  render(name, params, focus = 0) {
    if (this.screenEl) this.screenEl.remove();
    const def = SCREENS[name](this, params); def.name = name;
    this.cur = { name, params, def }; this.focus = focus;
    const s = this.screenEl = el('div', 'screen ' + (def.dim === false ? '' : 'dim')); this.root.insertBefore(s, this.prompts);
    const panel = el('div', 'panel ' + (def.cls || '') + (def.rowItems ? ' rowitems' : '')); s.appendChild(panel);
    if (def.logo) panel.appendChild(el('div', 'logo', def.logo));
    if (def.title) panel.appendChild(el('div', 'title-h', def.title));
    if (def.tabs) {
      const t = el('div', 'tabs'); def.tabs.list.forEach((n, i) => { const d = el('div', 'tab' + (i === def.tabs.cur ? ' on' : ''), n); d.onclick = () => { def.tabs.set(i); }; t.appendChild(d); }); panel.appendChild(t);
    }
    if (def.html) { const h = el('div', def.htmlCls || 'card', def.html); panel.appendChild(h); this.htmlEl = h; }
    this.list = el('div', 'items'); panel.appendChild(this.list); this.items = def.items || [];
    this.items.forEach((it, i) => {
      if (it.section) { this.list.appendChild(el('div', 'sect', it.section)); it.el = null; return; }
      const d = it.el = el('div', 'item'); this.list.appendChild(d);
      d.onmouseenter = () => { if (this.focus !== i && !it.disabled) { this.focus = i; this.refresh(); } };
      d.onclick = (ev) => { this.focus = i; if (it.type === 'slider') { const r = d.querySelector('.slider').getBoundingClientRect(); if (ev.clientX >= r.left && ev.clientX <= r.right) { it.set(Math.round(((it.min + (ev.clientX - r.left) / r.width * (it.max - it.min)) / it.step)) * it.step); this.refresh(); audio.sfx('ui'); return; } } this.activate(it); };
    });
    if (!this.items[this.focus] || this.items[this.focus].section || this.items[this.focus].disabled) this.focus = this.nextFocus(-1, 1);
    this.refresh();
    this.prompts.classList.remove('hidden'); this.renderPrompts(def);
    if (def.onShow) def.onShow(this, params);
    this.scrollEl = this.screenEl.querySelector('.about');
  }
  renderPrompts(def) {
    const p = def.prompts || [['confirm', 'Select'], ['back', 'Back']];
    this.prompts.innerHTML = p.map(([a, t]) => `<span>${G(a)}${t}</span>`).join('');
  }
  nextFocus(from, dir) {
    const n = this.items.length; let i = from;
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; const it = this.items[i]; if (it && !it.section && !it.disabled) return i; }
    return from;
  }
  refresh() {
    this.items.forEach((it, i) => {
      if (!it.el) return;
      it.el.classList.toggle('focus', i === this.focus); it.el.classList.toggle('disabled', !!it.disabled);
      let right = '';
      if (it.type === 'toggle') right = `<div class="val">${it.get() ? 'ON' : 'OFF'}</div>`;
      else if (it.type === 'slider') right = `<div class="slider"><i style="width:${((it.get() - it.min) / (it.max - it.min)) * 100}%"></i></div><div class="val" style="min-width:3.2em">${it.fmt ? it.fmt(it.get()) : Math.round(it.get() * 100) + '%'}</div>`;
      else if (it.type === 'choice') right = `<div class="val">◀ ${it.options[it.get()]} ▶</div>`;
      else if (it.right) right = `<div class="val">${it.right}</div>`;
      it.el.innerHTML = `<div>${it.label}${it.sub ? `<span class="sub">${it.sub}</span>` : ''}</div>${right}`;
    });
    const f = this.items[this.focus]; if (f && f.el) f.el.scrollIntoView({ block: 'nearest' });
  }
  activate(it) {
    if (it.disabled) return;
    if (it.type === 'toggle') { it.set(!it.get()); audio.sfx('ui'); this.refresh(); }
    else if (it.type === 'choice') { it.set((it.get() + 1) % it.options.length); audio.sfx('ui'); this.refresh(); }
    else if (it.type === 'slider') { /* adjust with left/right */ }
    else if (it.action) { audio.sfx('select'); it.action(); }
  }
  adjust(it, dir) {
    if (it.type === 'toggle') { it.set(!it.get()); }
    else if (it.type === 'slider') { it.set(clamp(Math.round((it.get() + dir * it.step) / it.step * 1e3) / 1e3 * it.step / it.step, it.min, it.max)); audio.sfx('tick'); }
    else if (it.type === 'choice') it.set((it.get() + dir + it.options.length) % it.options.length);
    else return;
    audio.sfx('ui'); this.refresh();
  }
  // per-frame navigation
  update(dt, inp) {
    if (!this.cur) return;
    const def = this.cur.def;
    if (def.anyKey && (inp.confirm || inp.any)) { def.anyKey(); return; }
    if (def.tabs && (inp.tabL || inp.tabR)) { def.tabs.set((def.tabs.cur + (inp.tabR ? 1 : -1) + def.tabs.list.length) % def.tabs.list.length); audio.sfx('ui'); return; }
    if (def.rowItems && inp.navX) { this.focus = this.nextFocus(this.focus, inp.navX); audio.sfx('ui'); this.refresh(); }
    if (this.scrollEl) { const sy = input.real ? input.real.rawY : 0; this.scrollEl.scrollTop -= sy * dt * 700 + (inp.navY || 0) * 80; }
    else if (inp.navY && this.items.length && !def.rowItems) { this.focus = this.nextFocus(this.focus, -inp.navY); audio.sfx('ui'); this.refresh(); }
    if (inp.navX && !def.rowItems) { const it = this.items[this.focus]; if (it) this.adjust(it, inp.navX); }
    if (inp.confirm) { const it = this.items[this.focus]; if (it) this.activate(it); else if (def.onConfirm) def.onConfirm(); }
    if (inp.back) this.back();
    if (def.tick) def.tick(dt, this);
  }
}

// ---------------- screens ----------------
function slider(label, key, min = 0, max = 1, step = 0.05, fmt) { return { type: 'slider', label, min, max, step, fmt, get: () => settings[key], set: (v) => { settings[key] = v; saveSettings(); audio.applyVolumes(); } }; }
function toggle(label, key, sub) { return { type: 'toggle', label, sub, get: () => settings[key], set: (v) => { settings[key] = v; saveSettings(); } }; }
let settingsTab = 0;
const bestKey = (id) => 'best' + id;
export const SCREENS = {
  press: (ui) => ({
    logo: 'Sixty-Four<br>Foxes<small>A SPIRITUAL SUCCESSOR TO STAR FOX 64</small>', dim: false, items: [], cls: 'logo-only',
    onShow: (u) => { const p = el('div', 'press', 'PRESS ANY BUTTON'); u.screenEl.appendChild(p); },
    anyKey: () => ui.actions.toMain(), prompts: [], onBack: () => ui.actions.toMain(),
  }),
  main: (ui) => ({
    logo: 'Sixty-Four<br>Foxes<small>A SPIRITUAL SUCCESSOR TO STAR FOX 64</small>', dim: false,
    items: [
      { label: 'Start Mission', sub: 'Stage 1 → Stage 2 campaign', action: () => ui.actions.begin(1, true) },
      { label: 'Stage Select', action: () => ui.show('stages', {}, true) },
      { label: 'Settings', action: () => ui.show('settings', {}, true) },
      { label: 'Controls', action: () => ui.show('controls', {}, true) },
      { label: 'Records', action: () => ui.show('records', {}, true) },
      { label: 'About & Credits', action: () => ui.show('about', {}, true) },
    ], onBack: () => {},
  }),
  stages: (ui) => ({
    title: 'Stage Select',
    items: [1, 2].map((id) => { const d = STAGES[id](); const best = store.get(bestKey(id), 0); return { label: `${id}. ${d.name}`, sub: d.subtitle + (best ? ' — Best ' + String(best).padStart(7, '0') : ''), action: () => ui.actions.begin(id, false) }; }),
  }),
  briefing: (ui, { id, campaign }) => {
    const d = STAGES[id]();
    const rail = d.mode === 'rail';
    return {
      title: d.name, cls: 'wide', rowItems: true,
      html: `<div style="font-size:calc(var(--u)*1.8);color:var(--cy);letter-spacing:.2em;margin-bottom:.3em">${d.subtitle.toUpperCase()}</div>
      <div style="font-size:calc(var(--u)*1.7);margin-bottom:.5em">${rail ? 'Fly the Arwing down the coastal rail, shoot down the defence line, rescue your wingmen and bring down the Warden Carrier.' : 'Free-flight dogfight over the Gale Rift. Hunt every Silver Jackal — the leader wears a red canopy. Use the radar and U-turn.'}</div>
      <table class="bind" style="font-size:calc(var(--u)*1.5)"><tr><td>${G('move')}</td><td>Fly the ship</td></tr><tr><td>${G('fire')}</td><td>Laser (hold for rapid fire)</td></tr><tr><td>${G('lock')}</td><td>Hold to charge &amp; lock on, release to fire missiles</td></tr>
      <tr><td>${G('rollL')} ${G('rollR')}</td><td>Tap: Barrel Roll (reflects shots) · Hold: Tilt</td></tr><tr><td>${G('bomb')}</td><td>Smart Bomb</td></tr><tr><td>${G('boost')} / ${G('brake')}</td><td>Boost / Brake</td></tr>${rail ? '' : `<tr><td>${G('uturn')}</td><td>U-Turn (Immelmann) · ${G('somer')} Somersault</td></tr>`}</table>`,
      items: [{ label: 'Launch', action: () => ui.actions.launch(id, campaign) }, { label: 'Back', action: () => ui.back() }],
    };
  },
  settings: (ui) => {
    const tabs = { list: ['Input', 'Audio', 'Display'], cur: settingsTab, set: (i) => { settingsTab = i; ui.render('settings', {}, 0); } };
    let items = [];
    if (settingsTab === 0) items = [
      toggle('Invert Horizontal', 'invertH', 'Fix for gamepads that report left/right inverted'),
      toggle('Invert Vertical', 'invertV', 'Fix for gamepads that report up/down inverted'),
      { type: 'choice', label: 'Flight Pitch', options: ['Standard', 'Flight-stick'], get: () => (settings.flightPitch ? 1 : 0), set: (v) => { settings.flightPitch = !!v; saveSettings(); } },
      slider('Sensitivity', 'sensitivity', 0.5, 1.5, 0.05), slider('Deadzone', 'deadzone', 0.05, 0.4, 0.01),
      toggle('Aim Assist', 'aimAssist'), toggle('Controller Rumble', 'rumble'),
      { label: 'Reset to Defaults', action: () => { Object.assign(settings, DEFAULTS); saveSettings(); audio.applyVolumes(); ui.render('settings', {}, 0); } },
    ];
    else if (settingsTab === 1) items = [slider('Master Volume', 'masterVol'), slider('Music Volume', 'musicVol'), slider('Effects Volume', 'sfxVol'), slider('Radio Voice Volume', 'voiceVol')];
    else items = [toggle('Screen Shake', 'shake', 'Camera shake on hits and explosions'), toggle('Reduced Flash', 'reducedFlash', 'Disables full-screen bomb flash'), toggle('Radio Subtitles', 'subtitles'), toggle('Tutorial Hints', 'hints')];
    items.push({ label: 'Back', action: () => ui.back() });
    return {
      title: 'Settings', tabs, items, cls: 'wide', prompts: [['confirm', 'Select'], ['tabs', 'Tab'], ['back', 'Back']],
      html: settingsTab === 0 ? `<div style="display:flex;gap:calc(var(--u)*2);align-items:center"><div class="testpad"><i id="tpdot"></i></div><div style="font-size:calc(var(--u)*1.8)">Move the left stick. The dot should follow it.<br>If it is mirrored, switch on the matching <b>Invert</b> option.</div></div>` : null,
      tick: () => { const d = document.getElementById('tpdot'); if (d && input.real) { d.style.left = (41 + (input.real.rawX * (settings.invertH ? 1 : 1)) * 36) + '%'; d.style.top = (41 - input.real.rawY * 36) + '%'; } },
    };
  },
  controls: (ui) => ({
    title: 'Controls', cls: 'wide', rowItems: true,
    html: `<table class="bind"><tr><td>Action</td><td>Controller (DualSense)</td><td>Keyboard / Mouse</td></tr>
    <tr><td>Fly</td><td>Left stick</td><td>WASD / Arrows</td></tr><tr><td>Aim reticle</td><td>Right stick</td><td>Mouse</td></tr>
    <tr><td>Laser</td><td>✕</td><td>Space / J / Left click</td></tr><tr><td>Lock-on missiles</td><td>R2 (hold, release)</td><td>L / C / Right click</td></tr>
    <tr><td>Barrel Roll</td><td>L1 / R1 (tap)</td><td>Q / E (tap)</td></tr><tr><td>Tilt</td><td>L1 / R1 (hold)</td><td>Q / E (hold)</td></tr>
    <tr><td>Smart Bomb</td><td>○</td><td>K / B</td></tr><tr><td>Boost / Brake</td><td>□ / L2</td><td>Shift / X</td></tr>
    <tr><td>U-Turn / Somersault</td><td>△ / L3 (all-range)</td><td>R / F</td></tr><tr><td>Skip radio</td><td>△</td><td>Tab</td></tr><tr><td>Pause</td><td>OPTIONS</td><td>Esc / P</td></tr></table>
    <div style="margin-top:.6em;font-size:calc(var(--u)*1.7);opacity:.85">Menus: D-pad / left stick to move, ✕ select, ○ back, L1/R1 switch tabs. Gamepad axes inverted? Use Settings → Input.</div>`,
    items: [{ label: 'Back', action: () => ui.back() }],
  }),
  records: (ui) => ({
    title: 'Records', cls: 'wide', rowItems: true,
    html: `<div class="rows">${[1, 2].map((id) => { const d = STAGES[id](); const b = store.get(bestKey(id), 0), r = store.get('rank' + id, '-'); return `<div class="row"><span>${id}. ${d.name}</span><b>${b ? String(b).padStart(7, '0') + ' · Rank ' + r : '— not cleared —'}</b></div>`; }).join('')}</div>`,
    items: [{ label: 'Clear Records', action: () => { [1, 2].forEach((i) => { store.set(bestKey(i), 0); store.set('rank' + i, '-'); }); ui.render('records', {}, 0); } }, { label: 'Back', action: () => ui.back() }],
  }),
  about: (ui) => ({
    title: 'About & Credits', cls: 'wide', rowItems: true, html: ABOUT_HTML, htmlCls: 'card about', items: [{ label: 'Back', action: () => ui.back() }],
    prompts: [['move', 'Scroll'], ['back', 'Back']],
  }),
  pause: (ui) => ({
    title: 'Paused', onBack: () => ui.actions.resume(),
    items: [
      { label: 'Resume', action: () => ui.actions.resume() },
      { label: 'Restart from Checkpoint', action: () => ui.actions.retry() },
      { label: 'Settings', action: () => ui.show('settings', {}, true) },
      { label: 'Controls', action: () => ui.show('controls', {}, true) },
      { label: 'Quit to Title', action: () => ui.actions.quit() },
    ],
  }),
  dead: (ui) => ({
    title: 'Mission Failed', onBack: () => {},
    items: [{ label: 'Retry from Checkpoint', action: () => ui.actions.retry() }, { label: 'Restart Stage', action: () => ui.actions.restart() }, { label: 'Quit to Title', action: () => ui.actions.quit() }],
  }),
  results: (ui, r) => ({
    title: 'Mission Complete', cls: 'wide', dim: true, rowItems: true,
    html: `<div style="display:flex;gap:calc(var(--u)*4);align-items:center"><div class="rank" id="rankv">?</div><div class="rows" style="flex:1">
      <div class="row"><span>Stage</span><b>${r.name}</b></div><div class="row"><span>Hits</span><b>${r.kills}</b></div>
      <div class="row"><span>Wingmen Saved</span><b>${r.saved} / ${r.lost + r.saved + r.safe}</b></div>
      <div class="row"><span>Shield Remaining</span><b>${Math.round(r.shield)}%</b></div>
      <div class="row"><span>Time</span><b>${r.time}</b></div>
      <div class="row"><span>Bonus</span><b>${r.bonus}</b></div>
      <div class="row"><span>Total Score</span><b style="font-size:1.2em">${String(r.total).padStart(7, '0')}</b></div>
      ${r.newBest ? '<div class="row"><span style="color:var(--gr)">★ NEW BEST</span><b></b></div>' : ''}</div></div>`,
    onShow: () => { setTimeout(() => { const e = document.getElementById('rankv'); if (e) { e.textContent = r.rank; audio.sfx('medal'); } }, 700); },
    items: [r.next ? { label: 'Next Stage', action: () => ui.actions.next() } : { label: 'Finish Demo', action: () => ui.show('complete') }, { label: 'Replay Stage', action: () => ui.actions.restart() }, { label: 'Quit to Title', action: () => ui.actions.quit() }],
    onBack: () => {},
  }),
  complete: (ui) => ({
    title: 'Demo Complete', cls: 'center', dim: true, rowItems: true,
    html: `<div style="font-size:calc(var(--u)*2.4);max-width:60vw">Thanks for flying with the Sixty-Four Foxes!<br><br>Everything you just played — rail shooter, all-range dogfights, wingmen, bosses, lock-on, checkpoints — is driven by data-defined stages, so the rest of the Lylat campaign can be built out with ordinary level tools.</div>`,
    items: [{ label: 'About & Credits', action: () => ui.show('about', {}, true) }, { label: 'Return to Title', action: () => ui.actions.quit() }],
  }),
  touch: (ui) => ({
    title: 'Controller or keyboard required', cls: 'center', dim: true,
    html: `<div style="font-size:calc(var(--u)*2.4);max-width:70vw">This game has no touch controls.<br>Connect a gamepad or use a keyboard to play.</div>`,
    items: [{ label: 'Settings', action: () => ui.show('settings', {}, true) }], prompts: [['confirm', 'Select']], onBack: () => {},
  }),
};
export function showError(msg) {
  const d = el('div', 'err', `<div><h1>WebGPU Required</h1><div>${msg}</div><div style="margin-top:1em;opacity:.7;font-size:.7em">Use a recent Chrome, Edge or Safari with WebGPU enabled. This game has no fallback renderer.</div></div>`);
  document.getElementById('ui').appendChild(d);
}
