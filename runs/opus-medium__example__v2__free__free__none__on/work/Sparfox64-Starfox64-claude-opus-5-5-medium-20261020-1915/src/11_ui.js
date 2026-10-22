// ===== 11_ui.js — controller-first 10-foot menus =====
const CREDITS = /*@@CREDITS@@*/null;
const UI = {
  root: null, stack: [], sel: 0, el: null, scrollY: 0,
  init() { this.root = document.getElementById('screens'); },
  get top() { return this.stack[this.stack.length - 1]; },
  open(def, replace = false) { if (replace) this.stack.length = 0; this.stack.push(def); this.sel = def.startSel || 0; this.scrollY = 0; this.render(); },
  back() {
    const t = this.top; if (!t) return;
    if (t.onBack) { Audio_.play('menuBack'); t.onBack(); return; }
    if (this.stack.length > 1) { Audio_.play('menuBack'); this.stack.pop(); this.sel = 0; this.render(); }
  },
  closeAll() { this.stack.length = 0; this.root.innerHTML = ''; },
  onPadChange() { if (this.top) this.render(); Game.updateTouchGate(); },
  render() {
    const t = this.top; this.root.innerHTML = ''; if (!t) return;
    const el = document.createElement('div'); el.className = 'screen' + (t.dim !== false ? ' dim' : '');
    let html = t.head ? t.head() : '';
    const items = t.items ? t.items() : [];
    t._items = items;
    if (items.length) {
      html += '<div class="menu">' + items.map((it, i) => `<div class="item${i === this.sel ? ' sel' : ''}${it.disabled ? ' disabled' : ''}" data-i="${i}"><span class="label">${it.label}</span>${this.valueHtml(it)}</div>`).join('') + '</div>';
      const d = items[this.sel] && items[this.sel].desc; html += `<div class="desc">${d || '&nbsp;'}</div>`;
    }
    if (t.body) html += t.body();
    html += `<div class="footer">${t.footer ? t.footer() : this.defaultFooter(items)}</div>`;
    el.innerHTML = html;
    el.querySelectorAll('.item').forEach(n => {
      const i = +n.dataset.i;
      n.addEventListener('mouseenter', () => { if (this.sel !== i) { this.sel = i; this.render(); } });
      n.addEventListener('click', e => { this.sel = i; const it = items[i]; if (it.kind === 'range' || it.kind === 'choice') { const r = n.getBoundingClientRect(); this.adjust(it, e.clientX > r.left + r.width / 2 ? 1 : -1); } else this.activate(it); });
    });
    this.root.appendChild(el); this.el = el;
    // keep the selection visible in long lists
    const menu = el.querySelector('.menu'), selEl = menu && menu.querySelector('.sel');
    if (selEl) { const top = selEl.offsetTop - menu.offsetTop, h = menu.clientHeight; if (top + selEl.offsetHeight > h) menu.scrollTop = top + selEl.offsetHeight - h + 8; }
    const sc = el.querySelector('.scroll .inner'); if (sc) sc.style.transform = `translateY(${-this.scrollY}px)`;
  },
  valueHtml(it) {
    if (it.kind === 'toggle') return `<span class="val">${it.get() ? 'ON' : 'OFF'}</span>`;
    if (it.kind === 'range') { const v = it.get(), f = (v - it.min) / (it.max - it.min); return `<span class="val"><span class="bar"><i style="width:${Math.round(f * 100)}%"></i></span>${it.fmt ? it.fmt(v) : Math.round(f * 100) + '%'}</span>`; }
    if (it.kind === 'choice') return `<span class="val">◀ ${it.options[it.get()]} ▶</span>`;
    return '';
  },
  defaultFooter(items) {
    const hasAdjust = items.some(i => i.kind === 'range' || i.kind === 'choice');
    return `<span>${G('confirm')} Select</span>${hasAdjust ? `<span>${G('change')} Adjust</span>` : ''}${this.stack.length > 1 || (this.top && this.top.onBack) ? `<span>${G('back')} Back</span>` : ''}`;
  },
  activate(it) {
    if (!it || it.disabled) return;
    if (it.kind === 'toggle') { it.set(!it.get()); Audio_.play('menuOk'); saveSettings(); this.render(); return; }
    if (it.kind === 'range' || it.kind === 'choice') { this.adjust(it, 1); return; }
    Audio_.play('menuOk'); it.act && it.act();
  },
  adjust(it, dir) {
    if (it.kind === 'range') { it.set(clamp(Math.round((it.get() + dir * it.step) * 100) / 100, it.min, it.max)); }
    else if (it.kind === 'choice') { const n = it.options.length; it.set((it.get() + dir + n) % n); }
    else if (it.kind === 'toggle') it.set(!it.get());
    else return;
    Audio_.play('menuMove'); saveSettings(); this.render();
  },
  update(dt) {
    const t = this.top; if (!t) return;
    if (t.update) t.update(dt);
    if (this.top !== t) return;
    const items = t._items || [];
    if (items.length) {
      if (Input.nav.up) { this.sel = (this.sel - 1 + items.length) % items.length; Audio_.play('menuMove'); this.render(); }
      if (Input.nav.down) { this.sel = (this.sel + 1) % items.length; Audio_.play('menuMove'); this.render(); }
      const it = items[this.sel];
      if (it && (it.kind === 'range' || it.kind === 'choice' || it.kind === 'toggle')) { if (Input.nav.left) this.adjust(it, -1); if (Input.nav.right) this.adjust(it, 1); }
      if (Input.pressed('confirm')) this.activate(items[this.sel]);
    } else if (t.scroll) {
      const sc = this.el && this.el.querySelector('.scroll'), inner = sc && sc.querySelector('.inner');
      if (inner) {
        const maxS = Math.max(0, inner.scrollHeight - sc.clientHeight);
        const dir = (Input.held('down') || Input.rawPadY > 0.5 ? 1 : 0) - (Input.held('up') || Input.rawPadY < -0.5 ? 1 : 0);
        if (dir) { this.scrollY = clamp(this.scrollY + dir * dt * innerHeight * 0.6, 0, maxS); inner.style.transform = `translateY(${-this.scrollY}px)`; }
      }
      if (Input.pressed('confirm') && t.onConfirm) t.onConfirm();
    } else if (Input.pressed('confirm') && t.onConfirm) t.onConfirm();
    if (Input.pressed('back')) this.back();
  },
};
addEventListener('wheel', e => { const t = UI.top; if (!t || !t.scroll || !UI.el) return; const sc = UI.el.querySelector('.scroll'), inner = sc && sc.querySelector('.inner'); if (!inner) return; UI.scrollY = clamp(UI.scrollY + e.deltaY, 0, Math.max(0, inner.scrollHeight - sc.clientHeight)); inner.style.transform = `translateY(${-UI.scrollY}px)`; }, { passive: true });

// ---------- screens ----------
const Screens = {
  press: () => ({
    dim: false,
    head: () => `<div class="logo">SPARFOX<span>64</span></div><div class="subtitle">Verdant Reach · Demo</div><div class="press">${Input.device === 'pad' ? 'PRESS ' + G('confirm') : 'PRESS ENTER'}</div>`,
    footer: () => `<span style="opacity:.7">A spiritual successor to Star Fox 64 · Best with a PS5 DualSense controller</span>`,
    onConfirm: () => { Audio_.play('start'); UI.open(Screens.main(), true); },
    update: () => { if (Input.pressed('fire') || Input.pressed('pause') || Input.mouseClicked || (Input.anyNew && Input.keys.size)) { Audio_.play('start'); UI.open(Screens.main(), true); } },
  }),
  main: () => ({
    dim: false,
    head: () => `<div class="logo" style="font-size:min(10vh,10vw)">SPARFOX<span>64</span></div>`,
    items: () => [
      { label: 'Start Mission', desc: 'Stage 1 — Verdant Reach. Two routes, a carrier and a boss.', act: () => UI.open(Screens.difficulty()) },
      ...(Game.checkpoint && Game.checkpoint.d > 0 ? [{ label: 'Continue from Checkpoint', desc: `Resume at ${Game.checkpoint.label}`, act: () => { UI.closeAll(); Game.startFromCheckpoint(); } }] : []),
      { label: 'Settings', desc: 'Controls, inversion fixes, audio, difficulty, accessibility', act: () => UI.open(Screens.settings()) },
      { label: 'Controls', desc: 'How to fly', act: () => UI.open(Screens.controls()) },
      { label: 'About & Credits', desc: 'Source information, engine & prompt feedback', act: () => UI.open(Screens.about()) },
    ],
    onBack: () => UI.open(Screens.press(), true),
    footer: () => `<span>${G('confirm')} Select</span><span>${G('back')} Back</span><span style="opacity:.7">Best ${Game.best.hits} hits</span>`,
  }),
  difficulty: () => ({
    head: () => `<div class="title2">SELECT DIFFICULTY</div>`,
    startSel: Settings.difficulty,
    items: () => DIFF.map((d, i) => ({ label: d.name, desc: ['Half damage, more shield, gentler enemy fire. Great for learning.', 'The intended experience.', 'Enemies hit harder and shoot more often. For veterans.'][i], act: () => { Settings.difficulty = i; saveSettings(); UI.closeAll(); Game.newGame(); } })),
  }),
  settings: () => ({
    head: () => `<div class="title2">SETTINGS</div>`,
    items: () => [
      { label: 'Invert Horizontal (Stick)', kind: 'toggle', desc: 'Quick fix if your controller reports left/right reversed. Applies to menus and flight.', get: () => Settings.invertX, set: v => Settings.invertX = v },
      { label: 'Invert Vertical (Stick)', kind: 'toggle', desc: 'Quick fix if your controller reports up/down reversed. Applies to menus and flight.', get: () => Settings.invertY, set: v => Settings.invertY = v },
      { label: 'Pilot Pitch (pull back to climb)', kind: 'toggle', desc: 'Classic flight-sim pitch for all input devices.', get: () => Settings.pilotPitch, set: v => Settings.pilotPitch = v },
      { label: 'Stick Sensitivity', kind: 'range', min: 0.6, max: 1.6, step: 0.1, fmt: v => v.toFixed(1) + '×', get: () => Settings.sensitivity, set: v => Settings.sensitivity = v },
      { label: 'Stick Dead Zone', kind: 'range', min: 0.05, max: 0.35, step: 0.05, fmt: v => Math.round(v * 100) + '%', get: () => Settings.deadzone, set: v => Settings.deadzone = v },
      { label: 'Difficulty', kind: 'choice', options: DIFF.map(d => d.name), desc: 'Takes effect on next mission start.', get: () => Settings.difficulty, set: v => Settings.difficulty = v },
      { label: 'Aim Assist', kind: 'toggle', desc: 'Gently bends lasers toward targets near your reticle.', get: () => Settings.aimAssist, set: v => Settings.aimAssist = v },
      { label: 'Master Volume', kind: 'range', min: 0, max: 1, step: 0.1, get: () => Settings.master, set: v => Settings.master = v },
      { label: 'Music Volume', kind: 'range', min: 0, max: 1, step: 0.1, get: () => Settings.music, set: v => Settings.music = v },
      { label: 'Effects Volume', kind: 'range', min: 0, max: 1, step: 0.1, get: () => Settings.sfx, set: v => Settings.sfx = v },
      { label: 'Vibration', kind: 'toggle', desc: 'Controller rumble (DualSense / Xbox in supporting browsers).', get: () => Settings.rumble, set: v => { Settings.rumble = v; if (v) Input.rumble(0.5, 0.5, 200); } },
      { label: 'Screen Shake', kind: 'range', min: 0, max: 1, step: 0.25, get: () => Settings.shake, set: v => Settings.shake = v },
      { label: 'HUD Size', kind: 'range', min: 0.8, max: 1.3, step: 0.1, fmt: v => Math.round(v * 100) + '%', get: () => Settings.hudScale, set: v => Settings.hudScale = v },
      { label: 'Large Subtitles', kind: 'toggle', get: () => Settings.bigText, set: v => Settings.bigText = v },
      { label: 'Tutorial Hints', kind: 'toggle', get: () => Settings.hints, set: v => Settings.hints = v },
      { label: 'Reset to Defaults', desc: 'Restore every setting', act: () => { Object.assign(Settings, DEFAULT_SETTINGS); saveSettings(); UI.render(); } },
      { label: 'Done', act: () => UI.back() },
    ],
  }),
  controls: () => ({
    head: () => {
      const rows = [['Fly', 'Left Stick', 'WASD / Arrows'], ['Fire laser', '✕ Cross', 'Space / J'], ['Charge lock-on shot', 'Hold ✕', 'Hold Space'], ['Smart bomb (again = detonate)', '□ Square', 'B / K'], ['Somersault / U-turn', '△ Triangle', 'F / I'], ['Bank (hold) · Barrel roll (double-tap)', 'L1 / R1', 'Q / E'], ['Boost', 'R2', 'Shift'], ['Brake', 'L2 / ○ Circle', 'C / L'], ['Pause', 'Options', 'Esc / P'], ['Skip radio message', 'Touchpad / Create', 'Tab']];
      return `<div class="title2">CONTROLS</div><div class="panel controls"><span class="h">ACTION</span><span class="h">CONTROLLER</span><span class="h">KEYBOARD</span>${rows.map(r => `<span>${r[0]}</span><span style="color:var(--acc2)">${r[1]}</span><span style="color:#cfe0ff">${r[2]}</span>`).join('')}</div>`;
    },
    body: () => `<div class="desc">Keyboard mirrors the controller layout. Inversion toggles live in Settings.</div>`,
    footer: () => `<span>${G('back')} Back</span>`,
    onConfirm: () => UI.back(),
  }),
  about: () => ({
    scroll: true,
    head: () => `<div class="title2">ABOUT & CREDITS</div>`,
    body: () => `<div class="scroll panel"><div class="inner">${CREDITS.html}</div></div>`,
    footer: () => `<span>${G('nav')} Scroll</span><span>${G('back')} Back</span>`,
  }),
  pause: () => ({
    head: () => `<div class="title2">PAUSED</div><div class="desc">${Game.mode === 'allrange' ? 'All-Range Mode · Basalt Leviathan' : `Verdant Reach · ${Game.route === 'beta' && Game.d > L.BRANCH ? 'Rustvein Canyon' : Game.d > L.CHECK ? 'Port Halcyon' : 'Emerald Sea'}`} · Hits ${Game.hits}</div>`,
    items: () => [
      { label: 'Resume', act: () => Game.resume() },
      { label: 'Restart from Checkpoint', desc: Game.checkpoint ? `Back to ${Game.checkpoint.label} (costs nothing)` : '', act: () => { UI.closeAll(); Game.startFromCheckpoint(); } },
      { label: 'Restart Mission', act: () => { UI.closeAll(); Game.newGame(); } },
      { label: 'Settings', act: () => UI.open(Screens.settings()) },
      { label: 'Controls', act: () => UI.open(Screens.controls()) },
      { label: 'Quit to Title', act: () => Game.toTitle() },
    ],
    onBack: () => Game.resume(),
    update: () => { if (Input.pressed('pause') && !Input.pressed('back')) Game.resume(); },
  }),
  gameover: () => ({
    head: () => `<div class="title2" style="color:var(--bad)">GAME OVER</div><div class="desc">Hits ${Game.hits} · The Dominion holds Verdant Reach... for now.</div>`,
    items: () => [
      { label: 'Continue from Checkpoint', desc: 'Lives refilled. Hits reset to checkpoint value.', act: () => { UI.closeAll(); Player.lives = 3; Game.startFromCheckpoint(); } },
      { label: 'Restart Mission', act: () => { UI.closeAll(); Game.newGame(); } },
      { label: 'Quit to Title', act: () => Game.toTitle() },
    ],
  }),
  results: (r) => ({
    head: () => `<div class="title2">MISSION ACCOMPLISHED</div><div class="desc">Verdant Reach liberated via ${r.route}</div>
      <div class="results">
        <span>Enemies hit</span><span class="v">${r.hits}</span>
        <span>Accuracy</span><span class="v">${r.acc}%</span>
        <span>Rings collected</span><span class="v">${r.rings}</span>
        <span>Wingmen rescued</span><span class="v">${r.rescues}</span>
        <span>Team status</span><span class="v">${r.team}</span>
        <span>Time</span><span class="v">${r.time}</span>
        <span>Score</span><span class="v">${r.score.toLocaleString()}</span>
      </div>
      <div class="medal ${r.medal ? '' : 'none'}">${r.medal ? '★ MEDAL EARNED ★' : `Medal: ${r.medalNeed}`}</div>
      ${r.newBest ? '<div class="desc" style="color:var(--acc)">NEW BEST!</div>' : ''}`,
    items: () => [
      { label: 'Fly Again', desc: r.route.includes('Canyon') ? 'Try the city route next time — skip a gate.' : 'Hint: fly through all 5 gates in Port Halcyon to find the hidden canyon.', act: () => { UI.closeAll(); Game.newGame(); } },
      { label: 'Title Screen', act: () => Game.toTitle() },
    ],
    body: () => `<div class="desc" style="margin-top:2vh;opacity:.8">Thanks for playing the Sparfox 64 demo. The rest of the Varn system awaits in the full game.</div>`,
  }),
};
