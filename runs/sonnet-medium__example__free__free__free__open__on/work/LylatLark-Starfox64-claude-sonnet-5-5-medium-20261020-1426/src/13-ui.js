'use strict';
/* ===== UI: controller-first menu system. Every screen is data: items + hints; navigated by D-pad/stick/arrows, ✕/Enter, ○/Backspace ===== */
const UI = {
  root: null, stack: [], cur: null, sel: 0, ignoreUntil: 0, tick: null, scrollEl: null, el: null,
  init(root) { this.root = root; },
  open(screen, keepStack = true) { if (this.cur && keepStack) this.stack.push({ s: this.cur, sel: this.sel }); this.cur = screen; this.sel = this.firstEnabled(0, 1); this.render(); if (screen.onOpen) screen.onOpen(); },
  replace(screen) { this.cur = screen; this.sel = this.firstEnabled(0, 1); this.render(); if (screen.onOpen) screen.onOpen(); },
  back() { if (this.cur && this.cur.onBack) { this.cur.onBack(); return; } this.pop(); },
  pop() { const p = this.stack.pop(); if (p) { this.cur = p.s; this.sel = p.sel; this.render(); } else this.closeAll(); },
  closeAll() { this.stack = []; this.cur = null; this.tick = null; this.root.innerHTML = ''; },
  items() { return this.cur && this.cur.items ? this.cur.items() : []; },
  firstEnabled(from, dir) { const it = this.items(); for (let i = 0; i < it.length; i++) { const k = (from + i * dir + it.length * 4) % it.length; if (!it[k].disabled && it[k].type !== 'label') return k; } return 0; },
  render() {
    const s = this.cur; if (!s) { this.root.innerHTML = ''; return; }
    const items = this.items();
    const hints = (s.hints || [['confirm', 'Select'], ['back', 'Back']]).map(([a, t]) => `<span class="hint"><b class="gl">${Input.glyph(a)}</b>${t}</span>`).join('') + (s.noNav ? '' : `<span class="hint"><b class="gl">${Input.last === 'pad' ? 'D-PAD' : '↑↓'}</b>Navigate</span>`);
    this.root.innerHTML = `<div class="screen ${s.cls || ''}">${s.pre ? s.pre() : ''}<div class="panel">${s.title ? `<h1>${s.title}</h1>` : ''}${s.sub ? `<p class="sub">${typeof s.sub === 'function' ? s.sub() : s.sub}</p>` : ''}${s.body ? `<div class="body">${s.body()}</div>` : ''}<div class="menu"></div><div class="desc"></div></div>${s.extra ? `<div class="extra">${s.extra()}</div>` : ''}<div class="hints">${hints}</div></div>`;
    this.el = this.root.firstElementChild; this.menuEl = $('.menu', this.root);
    items.forEach((it, i) => {
      const d = el('div', 'item ' + (it.type || 'button') + (it.disabled ? ' disabled' : '') + (it.cls ? ' ' + it.cls : ''));
      d.innerHTML = this.itemHtml(it);
      d.addEventListener('mouseenter', () => { if (!it.disabled && this.sel !== i && it.type !== 'label') { this.sel = i; this.refresh(); Audio.sfx('menuMove'); } });
      d.addEventListener('click', (e) => { if (Input.touchSeen === false && false) return; this.sel = i; this.activate(it, e, d); });
      this.menuEl.appendChild(d);
    });
    this.scrollEl = $('.scroll', this.root); this.refresh();
    if (s.afterRender) s.afterRender(this.root);
  },
  itemHtml(it) {
    const lb = `<span class="lb">${it.label}</span>`;
    if (it.type === 'toggle') return lb + `<span class="val"><i class="arr">◀</i><em>${it.get() ? 'ON' : 'OFF'}</em><i class="arr">▶</i></span>`;
    if (it.type === 'choice') return lb + `<span class="val"><i class="arr">◀</i><em>${it.options[it.get()]}</em><i class="arr">▶</i></span>`;
    if (it.type === 'slider') { const v = it.get(), k = (v - it.min) / (it.max - it.min); return lb + `<span class="val"><i class="arr">◀</i><span class="sl"><u style="width:${k * 100}%"></u></span><em>${it.fmt ? it.fmt(v) : Math.round(v * 100) + '%'}</em><i class="arr">▶</i></span>`; }
    return lb + (it.value ? `<span class="val"><em>${it.value}</em></span>` : '');
  },
  refresh() {
    const items = this.items(); if (!this.menuEl) return;
    [...this.menuEl.children].forEach((d, i) => { d.classList.toggle('sel', i === this.sel); d.innerHTML = this.itemHtml(items[i]); });
    const it = items[this.sel]; const ds = $('.desc', this.root); if (ds) ds.textContent = it && it.desc ? it.desc : '';
    const se = $('.item.sel', this.root); if (se && se.scrollIntoView) se.scrollIntoView({ block: 'nearest' });
  },
  adjust(it, dir) {
    if (it.type === 'toggle') it.set(!it.get());
    else if (it.type === 'choice') it.set((it.get() + dir + it.options.length) % it.options.length);
    else if (it.type === 'slider') { const st = it.step || 0.05; it.set(clamp(Math.round((it.get() + dir * st) / st) * st, it.min, it.max)); }
    else return false;
    Audio.sfx('menuMove'); Audio.applyVolumes(); Settings.save(); this.refresh(); return true;
  },
  activate(it, e, d) {
    if (it.disabled || it.type === 'label') { Audio.sfx('menuBack'); return; }
    if (!it.type || it.type === 'button') { Audio.sfx('menuOk'); this.refresh(); if (it.action) it.action(); return; }
    if (e && d) { // mouse: click on arrows / slider bar
      const r = d.getBoundingClientRect(), rel = (e.clientX - r.left) / r.width;
      if (it.type === 'slider') { const sl = $('.sl', d).getBoundingClientRect(); if (e.clientX >= sl.left && e.clientX <= sl.right) { const k = (e.clientX - sl.left) / sl.width; const st = it.step || 0.05; it.set(clamp(Math.round((it.min + k * (it.max - it.min)) / st) * st, it.min, it.max)); Audio.sfx('menuMove'); Audio.applyVolumes(); Settings.save(); this.refresh(); return; } }
      this.adjust(it, rel < 0.72 && e.target.classList.contains('arr') ? -1 : 1); return;
    }
    this.adjust(it, 1);
  },
  update(dt) {
    if (!this.cur) return;
    if (performance.now() < this.ignoreUntil) return;
    const n = Input.nav, items = this.items(), s = this.cur;
    if (s.update) s.update(dt);
    if (this.tick) this.tick(dt);
    if (s.scroll) { const sc = $('.scroll', this.root); if (sc) { const v = (Input.down.down ? 1 : 0) - (Input.down.up ? 1 : 0) + (Input.my ? -Input.my : 0) * 0; sc.scrollTop += (Input.down.down ? 520 : 0) * dt - (Input.down.up ? 520 : 0) * dt; } }
    if (!s.scroll && items.length) {
      if (n.up) { this.sel = this.firstEnabled(this.sel - 1, -1); this.refresh(); Audio.sfx('menuMove'); }
      if (n.down) { this.sel = this.firstEnabled(this.sel + 1, 1); this.refresh(); Audio.sfx('menuMove'); }
      const it = items[this.sel];
      if (it && (n.left || n.right) && it.type && it.type !== 'button') { this.adjust(it, n.right ? 1 : -1); }
      if (n.confirm && it) { this.activate(it); }
    } else if (s.scroll && n.confirm) { const it = items[this.sel]; if (it) this.activate(it); }
    if (n.back) { Audio.sfx('menuBack'); this.back(); }
  },
};

/* ---------- screen factory ---------- */
const medalCol = { GOLD: '#ffd24a', SILVER: '#d8e2f0', BRONZE: '#d98a4a' };
const Screens = {
  title() {
    return {
      id: 'title', cls: 'title', noNav: false, hints: [['confirm', 'Select'], ['back', 'Back']],
      pre: () => `<div class="logo"><div class="l1">LYLAT</div><div class="l2">LARK</div><div class="l3">A rail-shooter dogfight · inspired by Star Fox 64</div></div>`,
      items: () => [
        { label: Save.unlocked > 1 ? 'CAMPAIGN' : 'START CAMPAIGN', desc: 'Fly Sector 1 and onward with your squad.', action: () => Main.openBriefing(0, null, true) },
        { label: 'STAGE SELECT', desc: 'Replay any stage you have unlocked and chase medals.', action: () => UI.open(Screens.stages()) },
        { label: 'SETTINGS', desc: 'Axis inversion, sensitivity, audio, difficulty.', action: () => UI.open(Screens.settings()) },
        { label: 'CONTROLS', desc: 'See the controller and keyboard layout.', action: () => UI.open(Screens.controls()) },
        { label: 'ABOUT & CREDITS', desc: 'Source information, engine and prompt feedback.', action: () => UI.open(Screens.about()) },
      ],
      extra: () => `<div class="best"><div class="lbl">BEST SCORES</div>${LEVELS.map((l) => `<div class="brow"><span>${l.sub} · ${l.name}</span><b>${Save.best[l.id] ? pad(Save.best[l.id], 7) : '— — —'}</b><i style="color:${medalCol[Save.medals[l.id]] || '#556'}">${Save.medals[l.id] ? '★ ' + Save.medals[l.id] : '☆'}</i></div>`).join('')}</div>`,
      onBack: () => { },
    };
  },
  stages() {
    return {
      id: 'stages', title: 'STAGE SELECT', sub: 'Choose a sector.',
      items: () => LEVELS.map((l, i) => ({ label: `${l.sub} · ${l.name}`, value: i < Save.unlocked ? (Save.medals[l.id] ? '★ ' + Save.medals[l.id] : 'READY') : 'LOCKED', disabled: i >= Save.unlocked, desc: i < Save.unlocked ? l.brief : 'Clear the previous stage to unlock.', action: () => Main.openBriefing(i, null, false) })).concat([{ label: 'BACK', action: () => UI.back() }]),
    };
  },
  briefing(idx, carry, campaign) {
    const l = LEVELS[idx];
    return {
      id: 'briefing', cls: 'briefing', title: l.sub + ' · ' + l.name, sub: 'MISSION BRIEFING',
      body: () => `<div class="bwrap"><canvas id="bp" width="160" height="160"></canvas><div><p>${l.brief}</p><ul>${l.objectives.map((o) => `<li>${o}</li>`).join('')}</ul></div></div>`,
      afterRender: (r) => { const c = $('#bp', r).getContext('2d'); let t = 0; UI.tick = (dt) => { t += dt; drawPortrait(c, 'quill', Math.sin(t * 0.7) > -0.2, t); }; },
      items: () => [{ label: 'LAUNCH', desc: 'Begin the mission.', action: () => Main.startLevel(idx, carry) }, { label: 'BACK', action: () => { UI.tick = null; UI.back(); } }],
      onBack: () => { UI.tick = null; if (UI.stack.length) UI.pop(); else Main.toTitle(); },
    };
  },
  settings() {
    const S = Settings;
    return {
      id: 'settings', cls: 'settings', title: 'SETTINGS', sub: 'Changes save automatically.',
      items: () => [
        { type: 'toggle', label: 'INVERT HORIZONTAL (GAMEPAD)', desc: 'Turn on if left/right on your controller feels reversed. Watch the stick test on the right.', get: () => S.invertX, set: (v) => { S.invertX = v; } },
        { type: 'toggle', label: 'INVERT VERTICAL (GAMEPAD)', desc: 'Turn on if up/down feels reversed (flight-stick style).', get: () => S.invertY, set: (v) => { S.invertY = v; } },
        { type: 'slider', label: 'STICK DEADZONE', min: 0, max: 0.4, step: 0.02, desc: 'Raise this if the ship drifts while you are not touching the stick.', get: () => S.deadzone, set: (v) => { S.deadzone = v; } },
        { type: 'slider', label: 'AIM SENSITIVITY', min: 0.5, max: 1.5, step: 0.05, get: () => S.sens, set: (v) => { S.sens = v; } },
        { type: 'choice', label: 'DIFFICULTY', options: ['RELAXED', 'STANDARD', 'VETERAN'], desc: 'Changes enemy fire rate, speed and damage.', get: () => S.difficulty, set: (v) => { S.difficulty = v; } },
        { type: 'slider', label: 'MUSIC VOLUME', min: 0, max: 1, get: () => S.music, set: (v) => { S.music = v; } },
        { type: 'slider', label: 'EFFECTS VOLUME', min: 0, max: 1, get: () => S.sfx, set: (v) => { S.sfx = v; Audio.sfx('laser'); } },
        { type: 'slider', label: 'SCREEN SHAKE', min: 0, max: 1, get: () => S.shake, set: (v) => { S.shake = v; } },
        { type: 'slider', label: 'CONTROLLER RUMBLE', min: 0, max: 1, get: () => S.rumble, set: (v) => { S.rumble = v; Input.rumble(0.7, 0.7, 200); } },
        { type: 'choice', label: 'HUD SIZE', options: ['SMALL', 'NORMAL', 'LARGE'], get: () => (S.hudScale < 0.95 ? 0 : S.hudScale > 1.05 ? 2 : 1), set: (v) => { S.hudScale = [0.85, 1, 1.18][v]; HUD.root.style.setProperty('--hs', S.hudScale); } },
        { type: 'toggle', label: 'COMMS VOICE BLIPS', get: () => S.voice, set: (v) => { S.voice = v; } },
        { type: 'toggle', label: 'BRIGHT FLASH EFFECTS', desc: 'Turn off to soften explosion light flashes.', get: () => S.flash, set: (v) => { S.flash = v; } },
        { label: 'RESET TO DEFAULTS', desc: 'Restore every setting.', action: () => { Settings.reset(); Audio.applyVolumes(); HUD.root.style.setProperty('--hs', 1); UI.refresh(); } },
        { label: 'BACK', action: () => UI.back() },
      ],
      extra: () => `<div class="stick"><div class="lbl">STICK TEST</div><canvas id="st" width="260" height="260"></canvas><p>Push the stick left and up. The <b style="color:#7dffb0">green dot</b> is what the ship receives; the grey ring is the raw stick.</p></div>`,
      afterRender: (r) => {
        const c = $('#st', r).getContext('2d');
        UI.tick = () => {
          c.clearRect(0, 0, 260, 260); c.strokeStyle = '#4a5a78'; c.lineWidth = 2; c.beginPath(); c.arc(130, 130, 100, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(30, 130); c.lineTo(230, 130); c.moveTo(130, 30); c.lineTo(130, 230); c.stroke();
          c.strokeStyle = '#4a5a78'; c.setLineDash([4, 6]); c.beginPath(); c.arc(130, 130, 100 * Settings.deadzone / 1, 0, TAU); c.stroke(); c.setLineDash([]);
          c.fillStyle = '#8894ad'; c.beginPath(); c.arc(130 + Input.rawX * 100, 130 - Input.rawY * 100, 9, 0, TAU); c.fill();
          c.fillStyle = '#7dffb0'; c.beginPath(); c.arc(130 + Input.mx * 100, 130 - Input.my * 100, 12, 0, TAU); c.fill();
          c.fillStyle = '#9fb0d0'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText('UP', 130, 22); c.fillText('DOWN', 130, 252); c.textAlign = 'left'; c.fillText('LEFT', 6, 136); c.textAlign = 'right'; c.fillText('RIGHT', 254, 136);
          c.textAlign = 'center'; c.fillStyle = '#6a7894'; c.font = '16px sans-serif'; c.fillText(Input.padConnected ? 'Controller connected' : 'No controller (keyboard)', 130, 190);
        };
      },
      onBack: () => { UI.tick = null; UI.pop(); },
    };
  },
  controls() {
    const rows = [['Steer ship', 'L-STICK', 'WASD / Arrows'], ['Fire laser (tap)', '✕', 'Space / J'], ['Charge + lock-on (hold)', 'HOLD ✕', 'Hold Space / J'], ['Nova bomb', '○', 'K / X'], ['Barrel roll (deflects shots)', 'L1 / R1', 'Q / E'], ['Boost', 'R2', 'Shift'], ['Brake', 'L2', 'Ctrl / C'], ['Squad call (when ready)', '△', 'R / L'], ['Pause', 'OPTIONS', 'Esc / P']];
    return {
      id: 'controls', cls: 'controls', title: 'CONTROLS', sub: 'DualSense layout · keyboard mirrors it',
      body: () => `<table><tr><th></th><th>PS5 CONTROLLER</th><th>KEYBOARD</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td><b class="gl">${r[1]}</b></td><td><b class="gl k">${r[2]}</b></td></tr>`).join('')}</table><p class="note">Menus: D-pad / stick to move, ✕ select, ○ back. Mouse works in menus. Shoot chasers off your wingmates — they shoot back. Roll through enemy fire to reflect it.</p>`,
      items: () => [{ label: 'BACK', action: () => UI.back() }],
    };
  },
  about() {
    return {
      id: 'about', cls: 'about', title: 'ABOUT & CREDITS', scroll: true, hints: [['back', 'Back']],
      body: () => `<div class="scroll"><pre>${ABOUT_TEXT.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></div>`,
      items: () => [{ label: 'BACK', action: () => UI.back() }],
    };
  },
  pause() {
    return {
      id: 'pause', cls: 'pause', title: 'PAUSED', sub: () => (Game.level ? Game.level.name : ''),
      items: () => [
        { label: 'RESUME', action: () => Main.resume() },
        { label: 'RESTART FROM CHECKPOINT', desc: 'Return to the last checkpoint (costs nothing).', action: () => UI.open(Screens.confirm('Restart from the last checkpoint?', () => { Main.resume(); Game.respawn(); })) },
        { label: 'SETTINGS', action: () => UI.open(Screens.settings()) },
        { label: 'CONTROLS', action: () => UI.open(Screens.controls()) },
        { label: 'QUIT TO TITLE', action: () => UI.open(Screens.confirm('Quit to the title screen? Progress in this stage is lost.', () => Main.toTitle())) },
      ],
      onBack: () => Main.resume(),
    };
  },
  confirm(text, yes) {
    return { id: 'confirm', cls: 'confirm', title: text, items: () => [{ label: 'NO', action: () => UI.pop() }, { label: 'YES', action: yes }], onBack: () => UI.pop() };
  },
  results(r) {
    const last = r.idx >= LEVELS.length - 1;
    return {
      id: 'results', cls: 'results', title: 'MISSION COMPLETE', sub: r.level, noNav: false,
      body: () => `<div class="medal" style="color:${medalCol[r.medal]}">★ ${r.medal} MEDAL</div><table class="stats"><tr><td>ENEMIES DOWNED</td><td>${r.hits}</td></tr><tr><td>WINGMATES SAVED</td><td>${r.wingmen} / 3</td></tr><tr><td>GOLD RINGS</td><td>${r.rings}</td></tr><tr><td>SHOTS DEFLECTED</td><td>${r.deflects}</td></tr><tr><td>TIME</td><td>${Math.floor(r.time / 60)}:${pad(r.time % 60, 2)}</td></tr><tr><td>BONUS</td><td>${pad(r.bonus, 6)}</td></tr><tr class="tot"><td>SCORE</td><td>${pad(r.score, 7)}</td></tr></table>`,
      items: () => [
        { label: last ? 'FINISH CAMPAIGN' : 'NEXT STAGE', action: () => Main.afterResults(r) },
        { label: 'RETRY STAGE', action: () => Main.openBriefing(r.idx, null, false) },
        { label: 'TITLE', action: () => Main.toTitle() },
      ],
      onBack: () => { },
    };
  },
  gameOver() {
    return {
      id: 'over', cls: 'over', title: 'GAME OVER', sub: 'The squadron needs you, Lark.',
      items: () => [
        { label: 'CONTINUE FROM CHECKPOINT', desc: '2 lives, score reduced.', action: () => Main.continueGame() },
        { label: 'RESTART STAGE', action: () => Main.startLevel(Game.levelIdx, null) },
        { label: 'TITLE', action: () => Main.toTitle() },
      ],
      onBack: () => { },
    };
  },
  touch() {
    return {
      id: 'touch', cls: 'touch', title: 'CONTROLLER OR KEYBOARD REQUIRED', sub: 'Lylat Lark has no touch controls. Connect a gamepad (PS5 DualSense recommended) or use a keyboard.',
      items: () => [{ label: 'SETTINGS', action: () => UI.open(Screens.settings()) }], noNav: true, hints: [],
      onBack: () => { },
    };
  },
};
UI.gameOver = () => UI.open(Screens.gameOver(), false);
UI.results = (r) => UI.open(Screens.results(r), false);
