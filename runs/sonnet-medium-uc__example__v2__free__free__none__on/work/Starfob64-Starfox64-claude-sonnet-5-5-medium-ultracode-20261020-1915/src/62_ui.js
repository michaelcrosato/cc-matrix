// ===================================================================
//  UI  -  controller-first menus (focus list, big targets, glyph prompts, mouse mirrors the pad)
// ===================================================================
const UI = {
  root: null, stack: [], cur: null, focus: 0, active: false, gateOn: false, scrollEl: null, canvasStick: null,
  init() { this.root = $('#ui'); },
  hideAll() { this.scrollEl = null; this.stack.length = 0; this.cur = null; this.active = false; this.root.innerHTML = ''; this.root.classList.remove('on'); },
  reset(id, data) { this.stack.length = 0; this.open(id, data); },
  open(id, data) {
    const def = SCREENS[id](data || {});
    def.id = id; def.data = data;
    this.stack.push(def);
    this.show(def);
  },
  back() {
    const top = this.stack[this.stack.length - 1];
    if (!top || top.noBack) return;
    if (top.onBack) { top.onBack(); return; }
    this.stack.pop();
    Snd.play('uiBack', { vol: 0.8 });
    const prev = this.stack[this.stack.length - 1];
    if (prev) { prev.rebuild ? this.show(prev.rebuild()) : this.show(prev); }
    else this.hideAll();
  },
  show(def) {
    this.scrollEl = null;
    this.cur = def; this.active = true; this.focus = def.focus || 0;
    this.root.classList.add('on'); this.root.innerHTML = '';
    const s = el('div', 'screen ' + (def.cls || '')); this.root.appendChild(s);
    if (def.logo) s.appendChild(el('div', 'logo', `<span>STAR</span><span class="fob">FOB</span><span class="n64">64</span>`));
    if (def.title) s.appendChild(el('h1', '', def.title));
    if (def.sub) s.appendChild(el('div', 'sub', def.sub));
    if (def.build) def.build(s, def);
    if (def.items && def.items.length) {
      const m = el('div', 'menu'); s.appendChild(m);
      def.items.forEach((it, i) => {
        const d = el('div', 'item ' + (it.type || 'button') + (it.disabled ? ' disabled' : ''));
        d.innerHTML = `<span class="lab">${it.label}</span><span class="val"></span>`;
        d.addEventListener('mouseenter', () => { if (this.focus !== i && !it.disabled) { this.focus = i; this.refresh(); Snd.play('uiMove', { vol: 0.5 }); } });
        d.addEventListener('click', (ev) => { this.focus = i; if (it.type === 'slider' || it.type === 'choice') { const r = d.getBoundingClientRect(); this.adjust(ev.clientX > r.left + r.width * 0.62 ? 1 : ev.clientX < r.left + r.width * 0.38 ? -1 : 1); } else this.activate(); });
        m.appendChild(d); it.el = d;
      });
    }
    s.appendChild(el('div', 'desc', ''));
    const f = el('div', 'footer'); s.appendChild(f);
    def.footEl = f; def.descEl = $('.desc', s); def.scr = s;
    this.refresh();
    if (def.onShow) def.onShow(def);
  },
  refresh() {
    const def = this.cur; if (!def) return;
    const g = glyphSet();
    if (def.items) {
      while (def.items[this.focus] && def.items[this.focus].disabled) this.focus = (this.focus + 1) % def.items.length;
      def.items.forEach((it, i) => {
        it.el.classList.toggle('focus', i === this.focus);
        const v = $('.val', it.el);
        if (it.type === 'toggle') v.innerHTML = `<span class="tg ${it.get() ? 'on' : ''}">${it.get() ? 'ON' : 'OFF'}</span>`;
        else if (it.type === 'slider') { const val = it.get(); const pct = (val - it.min) / (it.max - it.min); v.innerHTML = `<span class="arr">◀</span><span class="sl"><i style="width:${pct * 100}%"></i></span><span class="arr">▶</span><span class="sv">${it.fmt ? it.fmt(val) : Math.round(val * 100) + '%'}</span>`; }
        else if (it.type === 'choice') { const c = it.choices.find((x) => x[0] === it.get()) || it.choices[0]; v.innerHTML = `<span class="arr">◀</span><span class="cv">${c[1]}</span><span class="arr">▶</span>`; }
        else v.textContent = it.value ? it.value() : '';
      });
      const it = def.items[this.focus];
      def.descEl.textContent = it && it.desc ? (typeof it.desc === 'function' ? it.desc() : it.desc) : (def.desc || '');
    }
    const adj = def.items && def.items[this.focus] && ['slider', 'choice', 'toggle'].includes(def.items[this.focus].type);
    def.footEl.innerHTML = def.footer ? def.footer(g) : `<span><b>${g.confirm}</b> ${adj ? 'Change' : 'Select'}</span>${adj ? '<span><b>◀ ▶</b> Adjust</span>' : ''}<span><b>▲ ▼</b> Move</span>${def.noBack ? '' : `<span><b>${g.back}</b> Back</span>`}`;
    if (def.onRefresh) def.onRefresh(def);
  },
  activate() {
    const it = this.cur && this.cur.items && this.cur.items[this.focus];
    if (!it || it.disabled) return;
    if (it.type === 'toggle') { it.set(!it.get()); this.changed(); Snd.play('uiConfirm', { vol: 0.7 }); }
    else if (it.type === 'choice') this.adjust(1);
    else if (it.type === 'slider') this.adjust(1);
    else { Snd.play('uiConfirm'); if (it.onSelect) it.onSelect(); }
    if (this.cur && this.cur.items) this.refresh();
  },
  adjust(dir) {
    const it = this.cur && this.cur.items && this.cur.items[this.focus];
    if (!it) return;
    if (it.type === 'slider') { const v = clamp(Math.round((it.get() + dir * it.step) / it.step) * it.step, it.min, it.max); it.set(+v.toFixed(3)); this.changed(); Snd.play('uiMove', { vol: 0.6 }); }
    else if (it.type === 'choice') { const i = it.choices.findIndex((x) => x[0] === it.get()); it.set(it.choices[(i + dir + it.choices.length) % it.choices.length][0]); this.changed(); Snd.play('uiMove', { vol: 0.6 }); }
    else if (it.type === 'toggle') { it.set(!it.get()); this.changed(); Snd.play('uiMove', { vol: 0.6 }); }
    this.refresh();
  },
  changed() { applySettings(); },
  fade(cb) {
    const f = $('#fade'); f.classList.add('on');
    setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 120); }, 380);
  },
  update(dt) {
    const def = this.cur; if (!def || !this.active) return;
    const nv = Input.nav;
    if (def.update) def.update(dt, def);
    if (this.scrollEl) { if (nv.up) this.scrollEl.scrollTop -= 90; if (nv.down) this.scrollEl.scrollTop += 90; }
    else if (def.items && def.items.length) {
      if (nv.up || nv.down) {
        const d = nv.up ? -1 : 1; let n = this.focus;
        for (let k = 0; k < def.items.length; k++) { n = (n + d + def.items.length) % def.items.length; if (!def.items[n].disabled) break; }
        if (n !== this.focus) { this.focus = n; this.refresh(); Snd.play('uiMove', { vol: 0.7 }); }
      }
      if (nv.left) this.adjust(-1);
      if (nv.right) { const it = def.items[this.focus]; if (it && ['slider', 'choice', 'toggle'].includes(it.type)) this.adjust(1); }
      if (nv.confirm) this.activate();
    } else if (nv.confirm && def.onConfirm) def.onConfirm();
    if (nv.back) this.back();
    // glyph label refresh when the input device changes
    const dv = Input.device + (Input.isPS ? 'p' : '');
    if (dv !== this._dv) { this._dv = dv; this.refresh(); }
  },
};

// ---------------------------------------------------------------- settings plumbing
function applySettings() {
  Snd.applyVolumes();
  if (R.camera) { R.camera.fov = S.fov; R.camera.updateProjectionMatrix(); }
  if (R.scene) setOutlines(S.outlines);
  if (R.sun) R.sun.castShadow = S.shadows;
  applyBloom();
  document.documentElement.style.setProperty('--hud', S.hudScale);
  saveSettings();
}
const pct = (v) => Math.round(v * 100) + '%';
const settingsItems = {
  controls: () => [
    { type: 'toggle', label: 'Invert Horizontal Axis', desc: 'Gamepad quirk fix: turn on if left/right feels reversed. Check the stick test above.', get: () => S.invH, set: (v) => { S.invH = v; } },
    { type: 'toggle', label: 'Invert Vertical Axis', desc: 'Gamepad quirk fix: turn on if up/down feels reversed (also flips flight-style pitch).', get: () => S.invV, set: (v) => { S.invV = v; } },
    { type: 'toggle', label: 'Flight-Sim Pitch (All-Range)', desc: 'Push the stick forward to dive and pull back to climb during All-Range dogfights.', get: () => S.flightPitch, set: (v) => { S.flightPitch = v; } },
    { type: 'slider', label: 'Stick Deadzone', min: 0, max: 0.4, step: 0.02, get: () => S.deadzone, set: (v) => { S.deadzone = v; }, fmt: pct, desc: 'Ignore small stick drift.' },
    { type: 'toggle', label: 'Controller Rumble', get: () => S.rumble, set: (v) => { S.rumble = v; } },
    { type: 'toggle', label: 'Mouse Steering (Keyboard & Mouse)', desc: 'Steer with the mouse position like a stick. Left click fires, right click drops a bomb.', get: () => S.mouse, set: (v) => { S.mouse = v; } },
    { type: 'choice', label: 'Button Prompts', choices: [['auto', 'Auto'], ['ps', 'PlayStation'], ['xbox', 'Xbox'], ['kb', 'Keyboard']], get: () => S.glyphs, set: (v) => { S.glyphs = v; } },
  ],
  audio: () => [
    { type: 'slider', label: 'Master Volume', min: 0, max: 1, step: 0.05, get: () => S.master, set: (v) => { S.master = v; } },
    { type: 'slider', label: 'Music', min: 0, max: 1, step: 0.05, get: () => S.music, set: (v) => { S.music = v; } },
    { type: 'slider', label: 'Sound Effects', min: 0, max: 1, step: 0.05, get: () => S.sfx, set: (v) => { S.sfx = v; } },
    { type: 'slider', label: 'Radio Voices', min: 0, max: 1, step: 0.05, get: () => S.voice, set: (v) => { S.voice = v; } },
    { type: 'toggle', label: 'Radio Chatter Sound', desc: 'Subtitles always show; this only toggles the voice blips.', get: () => S.radio, set: (v) => { S.radio = v; } },
  ],
  display: () => [
    { type: 'slider', label: 'Field of View', min: 50, max: 90, step: 5, get: () => S.fov, set: (v) => { S.fov = v; }, fmt: (v) => v + '°' },
    { type: 'slider', label: 'HUD Size', min: 0.8, max: 1.4, step: 0.1, get: () => S.hudScale, set: (v) => { S.hudScale = v; }, fmt: (v) => Math.round(v * 100) + '%' },
    { type: 'toggle', label: 'Bloom', get: () => S.bloom, set: (v) => { S.bloom = v; } },
    { type: 'toggle', label: 'Ink Outlines', get: () => S.outlines, set: (v) => { S.outlines = v; } },
    { type: 'toggle', label: 'Shadows', get: () => S.shadows, set: (v) => { S.shadows = v; } },
    { type: 'slider', label: 'Screen Shake', min: 0, max: 1.5, step: 0.25, get: () => S.shake, set: (v) => { S.shake = v; }, fmt: pct },
    { type: 'toggle', label: 'Reduce Screen Flashes', get: () => S.reduceFlash, set: (v) => { S.reduceFlash = v; } },
  ],
  gameplay: () => [
    { type: 'toggle', label: 'Aim Assist', desc: 'Gently bends your lasers toward targets near the reticle.', get: () => S.aimAssist, set: (v) => { S.aimAssist = v; } },
    { type: 'toggle', label: 'Auto-Fire (hold)', desc: 'Hold the fire button to keep shooting. Off = tap per shot.', get: () => S.autoFire, set: (v) => { S.autoFire = v; } },
  ],
};

const SCREENS = {
  title: () => ({
    logo: true, noBack: true, cls: 'title',
    sub: 'A spiritual successor to the N64 rail-shooter classic',
    items: [
      { label: 'START MISSION', desc: 'Fly the full campaign: canyon, belt or rift, then the Armada.', onSelect: () => UI.fade(() => { G.score = 0; G.lives = 3; G.campaign = { route: 'a' }; G.carry = null; startStage('s1'); }) },
      { label: 'MISSION SELECT', desc: 'Jump into any stage to practice.', onSelect: () => UI.open('missions') },
      { label: 'SETTINGS', onSelect: () => UI.open('settings') },
      { label: 'CONTROLS', onSelect: () => UI.open('controls') },
      { label: 'ABOUT / CREDITS', onSelect: () => UI.open('about') },
    ],
    footer: (g) => `<span><b>▲ ▼</b> Move</span><span><b>${g.confirm}</b> Select</span><span class="dim">Idle for 10 seconds to watch the demo</span>`,
  }),
  gate: () => ({
    cls: 'gate', noBack: true,
    build: (s) => { s.appendChild(el('div', 'logo small', `<span>STAR</span><span class="fob">FOB</span><span class="n64">64</span>`)); s.appendChild(el('div', 'gatemsg', 'Controller or keyboard required')); s.appendChild(el('div', 'sub', 'Touch controls are not supported. Connect a gamepad (PS5 recommended) or use a keyboard.')); },
    items: [{ label: 'SETTINGS', onSelect: () => UI.open('settings') }],
    footer: () => '',
  }),
  missions: () => ({
    title: 'MISSION SELECT', cls: 'missions',
    build: (s) => {
      const map = el('div', 'routemap');
      map.innerHTML = `<svg viewBox="0 0 560 240"><g class="lines"><path d="M60 120 L190 120 L290 60 L430 60 L500 120"/><path d="M190 120 L290 180 L430 180 L500 120"/></g>
        ${[['s1', 60, 120], ['s2a', 290, 60], ['s2b', 290, 180], ['s3', 500, 120]].map(([id, x, y]) => `<g class="node" data-id="${id}"><circle cx="${x}" cy="${y}" r="26"/><text x="${x}" y="${y + 6}">${id === 's1' ? '1' : id === 's3' ? '3' : id === 's2a' ? '2A' : '2B'}</text></g>`).join('')}</svg>`;
      s.appendChild(map);
    },
    items: ['s1', 's2a', 's2b', 's3'].map((id) => ({
      label: STAGES[id].name, desc: () => `${STAGES[id].sub}  •  ${STAGES[id].mode === 'ar' ? 'All-Range dogfight' : 'On-rails'}  •  Best ${(SAVE.best[id] || 0).toLocaleString()}${SAVE.medals[id] ? '  •  ★ MEDAL' : ''}`,
      value: () => (SAVE.medals[id] ? '★' : ''),
      onSelect: () => UI.fade(() => { G.score = 0; G.lives = 3; G.campaign = { route: id === 's2b' ? 'b' : 'a' }; G.carry = null; startStage(id); }),
    })).concat([{ label: 'BACK', onSelect: () => UI.back() }]),
    onRefresh: (d) => { const id = ['s1', 's2a', 's2b', 's3'][UI.focus]; for (const n of d.scr.querySelectorAll('.node')) n.classList.toggle('on', n.dataset.id === id); },
  }),
  settings: () => ({
    title: 'SETTINGS', cls: 'settings',
    items: [
      { label: 'Controls & Axis Fixes', onSelect: () => UI.open('set-controls') },
      { label: 'Audio', onSelect: () => UI.open('set-audio') },
      { label: 'Display', onSelect: () => UI.open('set-display') },
      { label: 'Gameplay', onSelect: () => UI.open('set-gameplay') },
      { label: 'Reset to Defaults', onSelect: () => { Object.assign(S, DEFAULTS); applySettings(); UI.refresh(); } },
      { label: 'BACK', onSelect: () => UI.back() },
    ],
  }),
  'set-controls': () => ({
    title: 'CONTROLS & AXIS FIXES', cls: 'settings stick',
    build: (s) => {
      const w = el('div', 'sticktest', `<canvas width="220" height="220"></canvas><div class="sttxt"><b>Stick test</b><br>Push the stick <u>up</u> and <u>right</u>.<br>The dot should move up and right.<br>If not, flip an axis below.<span class="pad"></span></div>`);
      s.appendChild(w); UI.canvasStick = $('canvas', w); UI.padTxt = $('.pad', w);
    },
    items: settingsItems.controls().concat([{ label: 'BACK', onSelect: () => UI.back() }]),
    update: () => {
      const cv = UI.canvasStick; if (!cv) return;
      const c = cv.getContext('2d'), m = Input.act.move;
      c.clearRect(0, 0, 220, 220); c.strokeStyle = 'rgba(140,230,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(110, 110, 100, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(110, 10); c.lineTo(110, 210); c.moveTo(10, 110); c.lineTo(210, 110); c.strokeStyle = 'rgba(140,230,255,.25)'; c.stroke();
      c.fillStyle = '#ffd060'; c.beginPath(); c.arc(110 + m.x * 90, 110 - m.y * 90, 12, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.font = '16px sans-serif'; c.textAlign = 'center'; c.fillText('UP', 110, 28);
      if (UI.padTxt) UI.padTxt.textContent = Input.pad ? '  Controller: ' + (Input.isPS ? 'PlayStation' : 'detected') : '  (No controller detected — use WASD)';
    },
  }),
  'set-audio': () => ({ title: 'AUDIO', cls: 'settings', items: settingsItems.audio().concat([{ label: 'BACK', onSelect: () => UI.back() }]) }),
  'set-display': () => ({ title: 'DISPLAY', cls: 'settings', items: settingsItems.display().concat([{ label: 'BACK', onSelect: () => UI.back() }]) }),
  'set-gameplay': () => ({ title: 'GAMEPLAY', cls: 'settings', items: settingsItems.gameplay().concat([{ label: 'BACK', onSelect: () => UI.back() }]) }),
  controls: () => ({
    title: 'FLIGHT CONTROLS', cls: 'controls',
    build: (s) => {
      const rows = [
        ['Steer ship', 'Left Stick', 'WASD / Arrows'], ['Fire lasers', '✕', 'Space / J'], ['Lock-on charge shot (hold, release)', '□', 'K / X'], ['Nova bomb', '○', 'B / L'],
        ['Boost / Brake', 'R2 / L2', 'Shift / C'], ['Bank (tight turns)', 'L1 / R1', 'Q / E'], ['Barrel roll (reflects shots)', 'Double-tap L1 / R1', 'Double-tap Q / E'],
        ['All-Range: Somersault', '△', 'F'], ['All-Range: U-Turn', 'Hold stick back + △', 'S + F'], ['Pause', 'OPTIONS', 'Esc / P'],
      ];
      s.appendChild(el('div', 'ctable', `<div class="r h"><span></span><span>Controller</span><span>Keyboard</span></div>` + rows.map((r) => `<div class="r"><span>${r[0]}</span><span>${r[1]}</span><span>${r[2]}</span></div>`).join('')));
      s.appendChild(el('div', 'tips', `<b>Tips</b> — Deflect bullets with a barrel roll · Grab 3 gold rings in a stage for a shield upgrade and a hidden route · Bosses expose weak points after you break their shields · Wrenches repair wings.`));
    },
    items: [{ label: 'BACK', onSelect: () => UI.back() }],
  }),
  about: () => ({
    title: 'ABOUT / CREDITS', cls: 'about',
    build: (s) => { const sc = el('div', 'scroll', ABOUT_HTML()); s.appendChild(sc); UI.scrollEl = sc; },
    onShow: () => { UI.scrollEl = $('.scroll', UI.root); },
    onBack: () => { UI.scrollEl = null; UI.stack.pop(); const prev = UI.stack[UI.stack.length - 1]; Snd.play('uiBack'); if (prev) UI.show(prev); else UI.hideAll(); },
    footer: (g) => `<span><b>▲ ▼</b> Scroll</span><span><b>${g.back}</b> Back</span>`,
  }),
  pause: () => ({
    title: 'PAUSED', cls: 'pause', noBack: false,
    onBack: () => resumeGame(),
    items: [
      { label: 'RESUME', onSelect: () => resumeGame() },
      { label: 'RESTART FROM CHECKPOINT', desc: 'Costs one life.', onSelect: () => { resumeGame(); if (G.pl && !G.pl.dead) { G.pl.hp = 0; killPlayer(); } } },
      { label: 'SETTINGS', onSelect: () => UI.open('settings') },
      { label: 'CONTROLS', onSelect: () => UI.open('controls') },
      { label: 'QUIT TO TITLE', onSelect: () => UI.fade(() => enterTitle()) },
    ],
    footer: (g) => `<span><b>▲ ▼</b> Move</span><span><b>${g.confirm}</b> Select</span><span><b>${g.pause}</b> Resume</span>`,
  }),
  results: () => {
    const r = G.results;
    const rows = [
      ['Enemy hits', `${r.hits} / ${r.spawned}  (${Math.round(r.pct * 100)}%)`], ['Time', fmtTime(r.time)], ['Wingmen standing', `${r.wingAlive} / 3`], ['Wingmen rescued', r.rescues], ['Barrel-roll deflects', r.stats.deflects],
      ['Stage score', G.stageScore.toLocaleString()], ['Time bonus', '+' + r.timeBonus], ['No-death bonus', '+' + r.survive], ['Wingman bonus', '+' + r.wingBonus],
    ];
    return {
      title: 'MISSION COMPLETE', sub: G.def.name, cls: 'results', noBack: true,
      build: (s) => {
        const box = el('div', 'resbox');
        box.innerHTML = `<div class="grade g${r.grade}">${r.grade}<small>RANK</small></div><div class="rows">${rows.map((x, i) => `<div class="rr" style="animation-delay:${0.15 * i + 0.3}s"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>`;
        s.appendChild(box);
        s.appendChild(el('div', 'medals', `${r.medal ? '<span class="medal on">★ HIT MEDAL</span>' : `<span class="medal">☆ Hit medal: ${G.def.medalHits} hits needed</span>`}${G.gold >= 3 ? '<span class="medal on">★ GOLD RINGS</span>' : `<span class="medal">☆ Gold rings ${G.gold}/3</span>`}`));
        s.appendChild(el('div', 'total', `TOTAL <b>${Math.round(G.score).toLocaleString()}</b>${SAVE.best[G.stageId] === G.score ? ' <em>NEW BEST</em>' : ''}`));
      },
      items: [{ label: 'CONTINUE', onSelect: () => UI.fade(() => nextAfterResults()) }],
    };
  },
  branch: () => ({
    title: 'CHOOSE YOUR ROUTE', sub: 'The gold rings revealed a hidden warp lane', cls: 'branch', noBack: true,
    items: [
      { label: 'ROUTE A — RUBBLE BELT', desc: 'The standard lane. Asteroids, wrecks and a rotating Gloom fortress.', onSelect: () => UI.fade(() => startStage('s2a', { carry: true, keepLives: true })) },
      { label: 'ROUTE B — NEBULA RIFT', desc: 'Harder. Energy gates, mine swarms and the Rift Leviathan.', onSelect: () => UI.fade(() => { G.campaign.route = 'b'; startStage('s2b', { carry: true, keepLives: true }); }) },
    ],
  }),
  gameover: () => ({
    title: 'GAME OVER', sub: 'The Gloom Fleet advances...', cls: 'gameover', noBack: true,
    items: [
      { label: 'RETRY STAGE', onSelect: () => UI.fade(() => { G.score = G.cpScore ? 0 : 0; G.lives = 3; startStage(G.stageId); }) },
      { label: 'QUIT TO TITLE', onSelect: () => UI.fade(() => enterTitle()) },
    ],
  }),
  ending: () => ({
    title: 'DEMO COMPLETE', sub: 'The Gloom Armada is broken — Lumen is safe, for now.', cls: 'ending', noBack: true,
    build: (s) => { s.appendChild(el('div', 'total big', `FINAL SCORE <b>${Math.round(G.score).toLocaleString()}</b>`)); s.appendChild(el('div', 'tips', 'Thanks for flying with Fob Squadron! Try the other route, grab every gold ring and rack up bigger combos.')); },
    items: [{ label: 'ABOUT / CREDITS', onSelect: () => UI.open('about') }, { label: 'RETURN TO TITLE', onSelect: () => UI.fade(() => enterTitle()) }],
  }),
};
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }
function resumeGame() { G.paused = false; UI.hideAll(); Snd.play('uiBack', { vol: 0.6 }); }
