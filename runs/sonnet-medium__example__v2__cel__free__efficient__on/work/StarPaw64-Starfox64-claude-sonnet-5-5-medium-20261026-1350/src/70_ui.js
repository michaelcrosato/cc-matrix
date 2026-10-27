// ---------------------------------------------------------------- Menus (DOM). Controller-first focus navigation; keyboard/mouse map onto the same actions.
const ABOUT_TEXT = __ABOUT_JSON__;
const MISSIONS = [
  { id: 'full', name: 'Full Demo', sub: 'Catnip Coast → Dread Belt', tag: 'RECOMMENDED', stages: ['catnip', 'belt'], desc: 'Both missions back to back: a rail shooter run, then all-range dogfights. About 8 minutes.', c: ['#ff9a3a', '#7a3cff'] },
  { id: 'catnip', name: 'Catnip Coast', sub: 'Rail Mission', tag: 'RAIL · ~4 MIN', stages: ['catnip'], desc: 'Fly the coast and canyon, save Pip, then take down Gnarlbot Mk-IV.', c: ['#4aa3ff', '#ffe9c4'] },
  { id: 'belt', name: 'Dread Belt', sub: 'All-Range Mission', tag: 'ALL-RANGE · ~4 MIN', stages: ['belt'], desc: 'Free-flight dogfight. Master the U-turn and loop, then face Night Claw.', c: ['#1a0a44', '#ff5ab0'] },
];
const UI = {
  root: null, cur: null, stack: [], tabIdx: 0, mission: null, mode: 'solo', slots: [null, null, null, null], briefPage: 0, testCv: null, hintBar: null,
  init() { this.root = $('#ui'); },
  toast(msg) { const t = h('div', 'toast', msg); $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200); },
  hide() { this.root.innerHTML = ''; this.cur = null; this.stack = []; },
  visible() { return !!this.cur; },
  show(name, params, push) {
    if (push && this.cur) this.stack.push({ name: this.cur.name, params: this.cur.params });
    else if (!push) this.stack = this.stack.filter((x) => false);
    this.root.innerHTML = ''; const scr = this.screens[name](params || {}); scr.name = name; scr.params = params; this.cur = scr; this.root.appendChild(scr.el);
    if (scr.hints) this.setHints(scr.el, scr.hints); if (scr.refresh) scr.refresh();
  },
  back() { const p = this.stack.pop(); if (p) { this.root.innerHTML = ''; const scr = this.screens[p.name](p.params || {}); scr.name = p.name; scr.params = p.params; this.cur = scr; this.root.appendChild(scr.el); if (scr.hints) this.setHints(scr.el, scr.hints); if (scr.refresh) scr.refresh(); } else this.show('title'); },
  setHints(el, list) { const d = h('div', 'hints'); el.appendChild(d); this.hintBar = { d, list }; this.refreshHints(); },
  refreshHints() { if (this.cur && this.cur.refresh) this.cur.refresh(); if (!this.hintBar) return; this.hintBar.d.innerHTML = this.hintBar.list.map(([a, t]) => `<span>${Input.label(a)} ${t}</span>`).join(''); },
  handle(ev) { if (this.cur && this.cur.onEvent) this.cur.onEvent(ev); },
  update(dt) { if (this.cur && this.cur.update) this.cur.update(dt); },
  // generic focus list
  list(opts) {
    const el = h('div', 'screen ' + (opts.bg || 'dim')); if (opts.logo) { el.appendChild(h('div', 'logo', 'STAR PAW <b>64</b>')); if (opts.tagline) el.appendChild(h('div', 'tagline', opts.tagline)); }
    if (opts.title) el.appendChild(h('h2', 'title', opts.title)); if (opts.extra) el.appendChild(opts.extra); if (opts.tabs) { const tb = h('div', 'tabs'); el.appendChild(tb); opts.tabEl = tb; }
    const box = h('div', 'list'); el.appendChild(box); const desc = h('div', 'desc'); el.appendChild(desc);
    const scr = { el, items: opts.items, focus: 0, box, desc, opts }; if (opts.after) opts.after(el, scr);
    scr.render = () => {
      box.innerHTML = ''; scr.items = typeof opts.items === 'function' ? opts.items() : opts.items;
      scr.items.forEach((it, i) => {
        const b = h('div', 'btn' + (i === scr.focus ? ' focus' : '') + (it.off ? ' off' : '')); const left = h('span', '', it.label);
        if (it.sub) left.appendChild(h('div', 'sub', it.sub)); b.appendChild(left);
        const v = this.valueEl(it); if (v) b.appendChild(v);
        b.addEventListener('mouseenter', () => { if (scr.focus !== i) { scr.focus = i; scr.render(); A.play('ui_move'); } });
        b.addEventListener('click', (e) => { scr.focus = i; const r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; if ((it.type === 'slider' || it.type === 'choice') && x < 0.55) this.adjust(scr, -1); else if (it.type === 'slider' || it.type === 'choice') this.adjust(scr, 1); else this.activate(scr); });
        box.appendChild(b);
      });
      const f = scr.items[scr.focus]; desc.innerHTML = (f && f.desc) || '';
      if (opts.tabs) { opts.tabEl.innerHTML = `<span>${Input.label('tabL')}</span>` + opts.tabs.map((t, i) => `<div class="tab${i === UI.tabIdx ? ' on' : ''}">${t}</div>`).join('') + `<span>${Input.label('tabR')}</span>`; }
    };
    scr.refresh = scr.render;
    scr.onEvent = (ev) => {
      const n = scr.items.length; const f = () => scr.items[scr.focus];
      if (ev.a === 'up' || ev.a === 'down') { let k = scr.focus; do { k = (k + (ev.a === 'down' ? 1 : -1) + n) % n; } while (scr.items[k].off && k !== scr.focus); scr.focus = k; A.play('ui_move'); scr.render(); }
      else if (ev.a === 'left') this.adjust(scr, -1); else if (ev.a === 'right') this.adjust(scr, 1);
      else if (ev.a === 'ok') this.activate(scr); else if (ev.a === 'back') { if (opts.onBack) { A.play('ui_back'); opts.onBack(); } }
      else if (opts.tabs && (ev.a === 'tabL' || ev.a === 'tabR')) { UI.tabIdx = (UI.tabIdx + (ev.a === 'tabR' ? 1 : -1) + opts.tabs.length) % opts.tabs.length; scr.focus = 0; A.play('ui_tab'); if (opts.onTab) opts.onTab(); scr.render(); }
      else if (opts.onEvent) opts.onEvent(ev, scr);
    };
    scr.hints = opts.hints || [['nav', 'Move'], ['ok', 'Select'], ['back', 'Back']]; scr.render(); return scr;
  },
  valueEl(it) {
    if (it.type === 'toggle') return h('div', 'val', `<span class="arrow">◀</span><b>${it.get() ? 'ON' : 'OFF'}</b><span class="arrow">▶</span>`);
    if (it.type === 'slider') { const pct = Math.round((it.get() - it.min) / (it.max - it.min) * 100); return h('div', 'val', `<div class="bar"><i style="width:${pct}%"></i></div><b>${it.fmt ? it.fmt(it.get()) : Math.round(it.get() * 100) + '%'}</b>`); }
    if (it.type === 'choice') return h('div', 'val', `<span class="arrow">◀</span><b>${it.options[it.get()]}</b><span class="arrow">▶</span>`);
    return null;
  },
  adjust(scr, d) {
    const it = scr.items[scr.focus]; if (!it) return;
    if (it.type === 'toggle') { it.set(!it.get()); } else if (it.type === 'slider') { const step = it.step || 0.05; it.set(clamp(Math.round((it.get() + d * step) / step) * step, it.min, it.max)); } else if (it.type === 'choice') { it.set((it.get() + d + it.options.length) % it.options.length); } else return;
    Settings.save(); A.applyVolumes(); A.play('ui_move'); scr.render();
  },
  activate(scr) { const it = scr.items[scr.focus]; if (!it || it.off) { A.play('ui_err'); return; } if (it.type === 'toggle' || it.type === 'slider' || it.type === 'choice') { this.adjust(scr, 1); return; } A.play(it.snd || 'ui_ok'); if (it.action) it.action(); },
  portrait(who, size = 120) { const cv = h('canvas'); cv.width = cv.height = size * 2; drawFace(cv.getContext('2d'), who, size, size, size - 8, 0); return cv; },
  screens: {},
};
const closeSettings = () => { if (UI.cur && UI.cur.params && UI.cur.params.touch) { UI.hide(); UI.root.classList.remove('raised'); } else UI.back(); };
const settingsItems = (tab) => {
  const S = Settings, back = { label: 'Back', action: () => closeSettings() };
  const sl = (label, key, desc, o = {}) => Object.assign({ type: 'slider', label, desc, min: 0, max: 1, step: 0.05, get: () => S[key], set: (v) => { S[key] = v; } }, o);
  const tg = (label, key, desc) => ({ type: 'toggle', label, desc, get: () => S[key], set: (v) => { S[key] = v; } });
  const ch = (label, key, options, desc) => ({ type: 'choice', label, desc, options, get: () => S[key], set: (v) => { S[key] = v; } });
  if (tab === 0) return [sl('Master Volume', 'master', 'Overall loudness.'), sl('Music Volume', 'music', 'Background music level.'), sl('Effects Volume', 'sfx', 'Lasers, explosions, and radio blips.'), back];
  if (tab === 1) return [tg('Invert Horizontal Axis', 'invH', 'Gamepad fix: flips left/right on both sticks. Use it if your controller steers backwards. Test it below!'), tg('Invert Vertical Axis', 'invV', 'Gamepad fix: flips up/down on both sticks. Use it if your controller steers backwards. Test it below!'),
    { type: 'choice', label: 'Flight Pitch', desc: 'Standard: stick up pitches your nose up. Flight stick: stick up dives.', options: ['Stick Up = Up', 'Stick Up = Dive'], get: () => (S.pitchInv ? 1 : 0), set: (v) => { S.pitchInv = !!v; } },
    sl('Aim Sensitivity', 'sens', 'How far the right stick moves your reticle.', { min: 0.5, max: 1.5, step: 0.1, fmt: (v) => Math.round(v * 100) + '%' }), sl('Stick Deadzone', 'deadzone', 'Ignore tiny stick movement. Raise it if the ship drifts.', { min: 0.05, max: 0.35, step: 0.025, fmt: (v) => Math.round(v * 100) + '%' }), tg('Vibration', 'rumble', 'Controller rumble on hits and bombs.'), back];
  if (tab === 2) return [{ type: 'choice', label: 'Aim Assist', desc: 'Gently bends your shots toward nearby targets.', options: ['Off', 'Low', 'High'], get: () => S.assist, set: (v) => { S.assist = v; } }, tg('Control Hints', 'hints', 'Show button tips the first time they matter.'),
    { type: 'choice', label: 'Radio Text Speed', desc: 'How fast squadmate chatter is typed out.', options: ['Slow', 'Normal', 'Fast', 'Instant'], get: () => [0.6, 1, 1.8, 99].indexOf(S.textSpeed) < 0 ? 1 : [0.6, 1, 1.8, 99].indexOf(S.textSpeed), set: (v) => { S.textSpeed = [0.6, 1, 1.8, 99][v]; } }, back];
  return [tg('Reduce Flashing', 'reduceFlash', 'Softens screen flashes from hits and bombs.'), tg('Screen Shake', 'shake', 'Camera shake on explosions and hits.'), { label: 'Reset To Defaults', desc: 'Restore every setting to its original value.', action: () => { Settings.reset(); A.applyVolumes(); UI.cur.render(); UI.toast('Settings reset'); } }, back];
};
Object.assign(UI.screens, {
  title() {
    const sv = Save.get(), medals = Object.keys(sv.medals || {}).length;
    const scr = UI.list({ bg: 'clear', logo: true, tagline: 'THE GALAXY NEEDS A BRAVE CAT', hints: [['nav', 'Move'], ['ok', 'Select']],
      items: [{ label: 'Solo Mission', sub: medals ? '★ x' + medals + ' gold paw medals earned' : 'Fly alone against the mutt militia', action: () => { UI.mode = 'solo'; UI.show('mission', {}, true); } },
        { label: 'Squad Mode', sub: '2-4 players, same screen', action: () => { UI.mode = 'squad'; UI.show('mission', {}, true); } },
        { label: 'Settings', action: () => UI.show('settings', {}, true) }, { label: 'Controls', action: () => UI.show('controls', { from: 'title' }, true) }, { label: 'About & Credits', action: () => UI.show('about', {}, true) }] });
    scr.el.appendChild(h('div', '', '')); return scr;
  },
  mission() {
    const el = h('div', 'screen dim'); el.appendChild(h('h2', 'title', UI.mode === 'solo' ? 'Select Mission' : 'Squad Mission')); const cards = h('div', 'cards'); el.appendChild(cards); const desc = h('div', 'desc'); el.appendChild(desc);
    const scr = { el, focus: 0 }; const sv = Save.get();
    const render = () => { cards.innerHTML = ''; MISSIONS.forEach((m, i) => { const c = h('div', 'card' + (i === scr.focus ? ' focus' : '')); const cv = h('canvas'); cv.width = cv.height = 260; const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, m.c[1]); g.addColorStop(1, m.c[0]); x.fillStyle = g; x.fillRect(0, 0, 260, 260); x.fillStyle = 'rgba(21,15,43,.85)'; x.beginPath(); x.moveTo(40, 220); x.lineTo(130, 60); x.lineTo(220, 220); x.lineTo(130, 190); x.closePath(); x.fill(); x.fillStyle = m.c[0]; x.beginPath(); x.moveTo(130, 90); x.lineTo(190, 200); x.lineTo(130, 180); x.lineTo(70, 200); x.closePath(); x.fill(); c.appendChild(cv); c.appendChild(h('h3', '', m.name)); c.appendChild(h('p', '', m.sub)); c.appendChild(h('div', 'tag', m.tag)); if ((sv.medals || {})[m.id] || (m.id === 'full' && sv.medals && sv.medals.catnip && sv.medals.belt)) c.appendChild(h('p', '', '★ Gold Paw')); c.addEventListener('mouseenter', () => { scr.focus = i; render(); }); c.addEventListener('click', () => { scr.focus = i; go(); }); cards.appendChild(c); }); desc.innerHTML = MISSIONS[scr.focus].desc; };
    const go = () => { A.play('ui_ok'); UI.mission = MISSIONS[scr.focus]; if (UI.mode === 'squad') UI.show('lobby', {}, true); else { const dev = UI.lastOkDev || (Input.lastKind === 'pad' ? Input.lastPadId : 'kb'); UI.slots = [{ dev }, null, null, null]; UI.show('briefing', {}, true); } };
    scr.onEvent = (ev) => { if (ev.a === 'left') { scr.focus = (scr.focus + 2) % 3; A.play('ui_move'); render(); } else if (ev.a === 'right') { scr.focus = (scr.focus + 1) % 3; A.play('ui_move'); render(); } else if (ev.a === 'ok') { UI.lastOkDev = ev.dev; go(); } else if (ev.a === 'back') { A.play('ui_back'); UI.back(); } };
    scr.hints = [['nav', 'Choose'], ['ok', 'Launch'], ['back', 'Back']]; scr.refresh = render; return scr;
  },
  lobby() {
    const el = h('div', 'screen dim'); el.appendChild(h('h2', 'title', 'Squad Roster')); const note = h('div', 'desc', ''); const cards = h('div', 'cards'); el.appendChild(cards); el.appendChild(note); UI.slots = [null, null, null, null];
    const scr = { el };
    const devName = (d) => (d === 'kb' ? 'Keyboard' : 'Controller ' + (parseInt(d.slice(3)) + 1));
    const render = () => { cards.innerHTML = ''; UI.slots.forEach((s, i) => { const c = h('div', 'slot' + (s ? ' in' : '')); const col = PLAYER_COLORS[i]; if (s) { c.style.borderColor = col.hex; c.innerHTML = `<div class="pn" style="color:${col.hex}">P${i + 1}</div><div>READY!</div><div class="dv">${devName(s.dev)}</div>`; } else c.innerHTML = `<div class="pn" style="opacity:.4">P${i + 1}</div><div>Press ${Input.label('ok', Input.lastKind)} to join</div>`; cards.appendChild(c); });
      const n = UI.slots.filter(Boolean).length; note.innerHTML = n ? `${n} pilot${n > 1 ? 's' : ''} ready. Press ${Input.label('start')} to launch. ${Input.label('back')} leaves.` : `Each player joins with their own controller. Keyboard can play too.`; };
    scr.onEvent = (ev) => {
      const joined = UI.slots.findIndex((s) => s && s.dev === ev.dev);
      if (ev.a === 'ok' && ev.enter && joined >= 0 && UI.slots.some(Boolean)) { A.play('ui_ok'); UI.show('briefing', {}, true); }
      else if (ev.a === 'ok' && joined < 0) { const free = UI.slots.findIndex((s) => !s); if (free >= 0) { UI.slots[free] = { dev: ev.dev }; A.play('ui_ok'); render(); } else A.play('ui_err'); }
      else if (ev.a === 'back') { A.play('ui_back'); if (joined >= 0) { UI.slots[joined] = null; render(); } else UI.back(); }
      else if (ev.a === 'start' && UI.slots.some(Boolean)) { A.play('ui_ok'); UI.show('briefing', {}, true); }
    };
    scr.hints = [['ok', 'Join'], ['start', 'Launch'], ['back', 'Leave']]; scr.refresh = render; return scr;
  },
  briefing() {
    const st = STAGES[UI.mission.stages[0]], el = h('div', 'screen dim'); const page = UI.briefPage = UI.briefPage || 0;
    el.appendChild(h('h2', 'title', UI.mission.id === 'full' ? 'Mission Briefing' : st.name)); const panel = h('div', 'panel'); el.appendChild(panel);
    st.brief.forEach(([who, text]) => { const row = h('div', 'brief'); row.style.marginBottom = '1.6vh'; row.appendChild(UI.portrait(who, 100)); const t = h('div', '', `<h3>${WHO[who].name}</h3><p>${text}</p>`); row.appendChild(t); panel.appendChild(row); });
    const scr = { el }; scr.onEvent = (ev) => { if (ev.a === 'ok' || ev.a === 'start') { A.play('ui_ok'); UI.show('controls', { launch: true }, true); } else if (ev.a === 'back') { A.play('ui_back'); UI.back(); } };
    scr.hints = [['ok', 'Continue'], ['back', 'Back']]; return scr;
  },
  controls(params) {
    const el = h('div', 'screen dim'); el.appendChild(h('h2', 'title', 'Flight Controls')); const panel = h('div', 'panel');
    const rows = [['move', 'Steer your ship'], ['aim', 'Move the reticle (fine aim)'], ['fire', 'Lasers (hold for auto-fire)'], ['charge', 'Hold to charge and lock on, release to fire'], ['bomb', 'Nova bomb'], ['rollL', 'Barrel roll left (reflects shots)'], ['rollR', 'Barrel roll right'], ['boost', 'Boost (hold). With stick down: U-turn. Up: loop'], ['brake', 'Brake'], ['advice', 'Ask for advice'], ['pause', 'Pause']];
    const render = () => { panel.innerHTML = rows.map(([a, t]) => `<div class="stat"><span>${Input.label(a)}</span><b style="color:#fff4d6;font-size:.8em">${t}</b></div>`).join(''); }; render(); el.appendChild(panel);
    const scr = { el, refresh: render }; scr.onEvent = (ev) => { if (ev.a === 'ok' || ev.a === 'start') { if (params.launch) { A.play('ui_ok'); Flow.launch(); } else { A.play('ui_back'); UI.back(); } } else if (ev.a === 'back') { A.play('ui_back'); UI.back(); } };
    scr.hints = [['ok', params.launch ? 'Launch!' : 'Back'], ['back', 'Back']]; return scr;
  },
  settings(params) {
    const scr = UI.list({ title: 'Settings', tabs: ['Audio', 'Controls', 'Gameplay', 'Access'], items: () => settingsItems(UI.tabIdx), onBack: () => closeSettings(), hints: [['nav', 'Move'], ['ok', 'Change'], ['tabL', 'Tab'], ['back', 'Back']],
      onTab: () => scr.refresh(), after: (el, sc) => { const t = h('div', 'pad-test hidden'); t.innerHTML = '<canvas width="220" height="220"></canvas><div><b>Controller test</b><br>Move your sticks: the dots show where the game thinks they point.<br>If up/left feel flipped, switch the invert toggles above.<div id="padtxt"></div></div>'; el.appendChild(t); sc.testEl = t; } });
    const baseRender = scr.render; scr.render = () => { baseRender(); if (scr.testEl) scr.testEl.classList.toggle('hidden', UI.tabIdx !== 1); }; scr.refresh = scr.render; scr.render();
    scr.update = () => { if (UI.tabIdx !== 1 || !scr.testEl) return; const cv = scr.testEl.querySelector('canvas'), x = cv.getContext('2d'); x.clearRect(0, 0, 220, 220); const id = Input.lastPadId, ax = Input.rawAxes[id] || { lx: 0, ly: 0, rx: 0, ry: 0 };
      [[55, ax.lx, ax.ly, '#38e8ff'], [165, ax.rx, ax.ry, '#ff9ae0']].forEach(([cx, px, py, col]) => { x.strokeStyle = '#5d4aa8'; x.lineWidth = 3; x.beginPath(); x.arc(cx, 110, 48, 0, TAU); x.stroke(); x.fillStyle = col; x.beginPath(); x.arc(cx + px * 44, 110 + py * 44, 9, 0, TAU); x.fill(); });
      const d = (v, neg, pos) => (Math.abs(v) < 0.25 ? '·' : v < 0 ? neg : pos); const tx = $('#padtxt'); if (tx) tx.innerHTML = id ? `Left: ${d(ax.ly, '↑', '↓')}${d(ax.lx, '←', '→')} &nbsp; Right: ${d(ax.ry, '↑', '↓')}${d(ax.rx, '←', '→')}` : 'No controller detected.'; };
    return scr;
  },
  pause() {
    return UI.list({ bg: 'dim', title: 'Paused', hints: [['nav', 'Move'], ['ok', 'Select'], ['start', 'Resume']], onBack: () => Flow.resume(), onEvent: (ev) => { if (ev.a === 'start') Flow.resume(); },
      items: [{ label: 'Resume', action: () => Flow.resume() }, { label: 'Controls', action: () => UI.show('controls', {}, true) }, { label: 'Settings', action: () => UI.show('settings', {}, true) }, { label: 'Restart Stage', action: () => Flow.restart() }, { label: 'Quit To Title', action: () => Flow.quit() }] });
  },
  results() {
    const r = Game.results, el = h('div', 'screen dim'); el.appendChild(h('h2', 'title', 'Mission Complete')); const panel = h('div', 'panel'); el.appendChild(panel);
    const mm = Math.floor(r.time / 60), ss = Math.floor(r.time % 60).toString().padStart(2, '0');
    let html = `<div class="stat"><span>${r.stage.name}</span><b>${r.kills} / ${r.total} downed</b></div><div class="stat"><span>Time</span><b>${mm}:${ss}</b></div>`;
    r.pilots.forEach((p) => { html += `<div class="stat"><span style="color:${PLAYER_COLORS[p.slot].hex}">P${p.slot + 1}</span><b>${String(Math.floor(p.score)).padStart(7, '0')} pts · ${p.kills} hits</b></div>`; });
    if (r.pipSaved !== null && r.pipSaved !== undefined) html += `<div class="stat"><span>Pip</span><b>${r.pipSaved ? 'Rescued!' : 'Shot down'}</b></div>`;
    html += `<div class="medal">${r.gold ? '★ GOLD PAW MEDAL ★' : 'Downed ' + Math.ceil(r.total * r.stage.medalAt) + ' for a Gold Paw medal'}</div>`; panel.innerHTML = html; if (r.gold) A.play('medal');
    const scr = { el }; const go = () => { A.play('ui_ok'); Game.nextStage(); if (!Game.paused) UI.hide(); }; scr.onEvent = (ev) => { if (ev.a === 'ok' || ev.a === 'start') go(); };
    scr.hints = [['ok', r.last ? 'Finish' : 'Next Mission']]; return scr;
  },
  finale() {
    const el = h('div', 'screen dim'); el.appendChild(h('div', 'big', 'DEMO COMPLETE!')); const panel = h('div', 'panel'); panel.style.marginTop = '2vh'; el.appendChild(panel);
    const total = Game.pilots.reduce((s, p) => s + p.score, 0); const golds = Game.runStats.filter((r) => r.gold).length;
    let html = `<p>General Gnarl's mutt militia is scattered, and the Pawlon System is safe. For now. Thanks for flying with the Star Paw Squadron!</p>`;
    Game.pilots.forEach((p) => { html += `<div class="stat"><span style="color:${p.color.hex}">P${p.slot + 1}</span><b>${String(Math.floor(p.score)).padStart(7, '0')} pts</b></div>`; }); html += `<div class="stat"><span>Squad total</span><b>${String(Math.floor(total)).padStart(8, '0')}</b></div><div class="medal">${golds ? '★'.repeat(golds) + ' Gold Paw medals: ' + golds : 'Try for a Gold Paw medal next time!'}</div>`; panel.innerHTML = html;
    const scr = { el }; scr.onEvent = (ev) => { if (ev.a === 'ok' || ev.a === 'start' || ev.a === 'back') { A.play('ui_ok'); Flow.quit(); } }; scr.hints = [['ok', 'Back to Title']]; Music.play('calm'); return scr;
  },
  gameover() {
    return UI.list({ bg: 'dim', title: 'Mission Failed', hints: [['nav', 'Move'], ['ok', 'Select']], items: [{ label: 'Try Again', sub: 'Restart this stage with fresh lives', action: () => Flow.restart() }, { label: 'Quit To Title', action: () => Flow.quit() }] });
  },
  about() {
    const el = h('div', 'screen dim'); el.appendChild(h('h2', 'title', 'About & Credits')); const panel = h('div', 'panel scroll'); panel.tabIndex = -1;
    panel.innerHTML = ABOUT_TEXT.split(/\n\n+/).map((blk) => { const lines = blk.split('\n'); const first = lines[0]; if (/^[A-Z][A-Za-z ]+$/.test(first) && lines.length > 1) return `<h3>${first}</h3>` + lines.slice(1).map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join(''); return lines.map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join(''); }).join(''); el.appendChild(panel);
    const scr = { el }; scr.onEvent = (ev) => { if (ev.a === 'up') panel.scrollBy({ top: -90, behavior: 'smooth' }); else if (ev.a === 'down') panel.scrollBy({ top: 90, behavior: 'smooth' }); else if (ev.a === 'back' || ev.a === 'ok') { A.play('ui_back'); UI.back(); } };
    scr.hints = [['nav', 'Scroll'], ['back', 'Back']]; return scr;
  },
  attract() { const el = h('div', 'screen'); el.style.pointerEvents = 'none'; el.innerHTML = `<div class="attract-tag">DEMO PLAY &nbsp;·&nbsp; PRESS ANY BUTTON</div>`; el.style.justifyContent = 'flex-start'; const lg = h('div', 'logo', 'STAR PAW <b>64</b>'); lg.style.fontSize = 'calc(var(--u)*6)'; lg.style.marginTop = 'calc(var(--u)*30)'; lg.style.alignSelf = 'flex-end'; lg.style.marginRight = 'calc(var(--u)*4)'; lg.style.transform = 'rotate(-3deg)'; el.insertBefore(lg, el.firstChild); return { el }; },
});
