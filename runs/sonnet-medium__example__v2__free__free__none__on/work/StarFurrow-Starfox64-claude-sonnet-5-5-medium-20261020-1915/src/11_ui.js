// ===== 11_ui: 10-foot controller-first UI — menu stack, HUD, comms with portraits, tutorial prompts, overlays =====
function drawPortrait(ctx, key, t, talk) {
  const c = CAST[key]; if (!c) return; const W = 128;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, W);
  const g = ctx.createLinearGradient(0, 0, 0, W); g.addColorStop(0, c.accent); g.addColorStop(1, '#2a1a56'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  ctx.save(); ctx.translate(64, 78);
  for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(120, -18); ctx.lineTo(120, 18); ctx.fill(); }
  ctx.restore();
  ctx.translate(0, Math.sin(t * 3) * 1.5);
  ctx.lineWidth = 4.5; ctx.strokeStyle = '#140c26'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const blob = (x, y, rx, ry, fill, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const col = c.color; const sp = c.species;
  // species back-layer
  if (sp === 'hare') { blob(44, 24, 9, 30, col, -0.12); blob(44, 26, 4.5, 21, '#ffa0c0', -0.12); blob(84, 24, 9, 30, col, 0.12); blob(84, 26, 4.5, 21, '#ffa0c0', 0.12); }
  if (sp === 'goat') { ctx.strokeStyle = '#140c26'; ctx.lineWidth = 11; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(64 + s * 22, 48); ctx.quadraticCurveTo(64 + s * 44, 18, 64 + s * 30, 6); ctx.stroke(); } ctx.strokeStyle = '#e8d8a0'; ctx.lineWidth = 6; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(64 + s * 22, 48); ctx.quadraticCurveTo(64 + s * 44, 18, 64 + s * 30, 6); ctx.stroke(); } ctx.strokeStyle = '#140c26'; ctx.lineWidth = 4.5; }
  if (sp === 'tortoise') blob(64, 100, 50, 38, '#6aa050');
  if (sp === 'moth') { ctx.beginPath(); ctx.moveTo(52, 40); ctx.quadraticCurveTo(34, 8, 22, 14); ctx.moveTo(76, 40); ctx.quadraticCurveTo(94, 8, 106, 14); ctx.stroke(); }
  if (sp === 'sheep') { for (const [x, y] of [[38, 52], [52, 36], [70, 34], [88, 50], [64, 30], [30, 70], [98, 70]]) blob(x, y, 17, 15, '#ffffff'); }
  // head
  blob(64, 76, sp === 'sheep' ? 28 : 38, sp === 'sheep' ? 32 : 34, sp === 'sheep' ? '#4a3a58' : col);
  if (sp === 'goat') { ctx.beginPath(); ctx.moveTo(52, 104); ctx.lineTo(64, 126); ctx.lineTo(76, 104); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); }
  if (sp === 'mole') { blob(64, 88, 13, 10, '#ff90a8'); }
  if (sp === 'sheep') { blob(40, 76, 8, 12, '#4a3a58', -0.5); blob(88, 76, 8, 12, '#4a3a58', 0.5); }
  // eyes
  const blink = (t % 3.4) < 0.12;
  const eye = (x, y) => {
    if (sp === 'mole') { ctx.fillStyle = '#140c26'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); return; }
    if (blink) { ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.stroke(); return; }
    blob(x, y, 9, 10, sp === 'moth' ? '#ff3a5a' : '#ffffff');
    ctx.fillStyle = '#140c26';
    if (sp === 'goat') ctx.fillRect(x - 5, y - 2, 10, 4); else { ctx.beginPath(); ctx.arc(x + 1, y + 1, 4.2, 0, TAU); ctx.fill(); }
  };
  eye(49, 68); eye(79, 68);
  if (sp === 'tortoise') { ctx.beginPath(); ctx.arc(49, 68, 13, 0, TAU); ctx.moveTo(92, 68); ctx.arc(79, 68, 13, 0, TAU); ctx.moveTo(62, 68); ctx.lineTo(66, 68); ctx.stroke(); }
  if (sp === 'moth') { ctx.beginPath(); ctx.moveTo(38, 56); ctx.lineTo(58, 64); ctx.moveTo(90, 56); ctx.lineTo(70, 64); ctx.stroke(); }
  // nose + mouth
  if (sp !== 'mole') { ctx.fillStyle = '#ff8aa8'; ctx.beginPath(); ctx.arc(64, 82, 4, 0, TAU); ctx.fill(); }
  const open = talk ? Math.abs(Math.sin(t * 17)) : 0;
  if (open > 0.15) { blob(64, 96, 10, 4 + open * 8, '#5a1a30'); if (sp === 'moth') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(56, 92); ctx.lineTo(59, 99); ctx.lineTo(62, 92); ctx.moveTo(66, 92); ctx.lineTo(69, 99); ctx.lineTo(72, 92); ctx.fill(); } }
  else { ctx.beginPath(); ctx.arc(64, 92, 10, 0.2, Math.PI - 0.2); ctx.stroke(); }
}

const SCREENS = {};
const UI = {
  stack: [], cur: null, focus: 0, def: null, hudOn: false, commQ: [], comm: null, tip: null, tipT: 0, bossRef: null,
  flashA: 0, vigA: 0, delay: 0, skip: false, ghostHp: 100, lastHud: {}, retPool: [], hintsKey: '', touchOnly: false, retEls: null,

  build() {
    const ui = $('#ui');
    ui.innerHTML = `
    <div id="hud">
      <div class="hud-box" id="hudL">
        <div class="shield-lbl disp ink"><span>SHIELD</span><span id="hpNum">100</span></div>
        <div class="shield"><i class="ghost" id="hpGhost"></i><i id="hpBar"></i></div>
        <div class="bombs" id="bombs"></div>
        <div class="shield-lbl disp ink" style="margin-top:1.2vh"><span>BOOST</span></div>
        <div class="boostbar" id="boostBar"><i id="boostFill"></i></div>
        <div class="wings" id="wings"></div>
      </div>
      <div class="hud-box" id="hudC"><div class="stagebar disp ink" id="stageName"></div><div class="prog"><i id="progFill"></i></div></div>
      <div class="hud-box" id="hudR"><div class="score disp ink" id="score">0</div><div class="hits disp ink" id="hits">HITS 0</div><div class="combo disp ink" id="combo"></div><div class="small" id="diffTag"></div></div>
      <div id="reticles"><div class="ret" id="retNear"></div><div class="ret far" id="retFar"></div></div>
      <div id="bossbar"><div class="t disp ink" id="bossName"></div><div class="bb"><i id="bossFill"></i></div></div>
      <div id="low"></div>
    </div>
    <div id="vig"></div><div id="flash"></div>
    <div id="letter"></div><div id="letter2"></div>
    <div id="comm"><canvas id="portrait" width="128" height="128"></canvas><div class="box"><div class="who disp ink" id="commWho"></div><div class="txt" id="commTxt"></div></div></div>
    <div id="tip"></div><div id="banner" class="disp ink"></div><div id="warn" class="disp"></div>
    <div id="attractTitle" class="disp ink hidden">DEMO</div><div id="attract" class="disp ink hidden">PRESS ANY BUTTON<small>Attract mode — the AI is flying with infinite shields</small></div>
    <div id="menu" style="z-index:60"><div class="wrap" id="menuWrap"></div></div>
    <div class="hints" id="hints" style="z-index:70"></div>
    <div class="overlay hidden" id="touchOv"><h1 class="disp ink">Controller or keyboard required</h1><p>${GAME_TITLE} cannot be played with touch alone. Connect a gamepad (PS5 DualSense recommended) or a keyboard.</p><button id="touchSettings">Settings</button></div>
    <div class="overlay hidden" id="errOv"><h1 class="disp ink" id="errTitle"></h1><p id="errMsg"></p></div>
    <div class="overlay" id="loading"><h1 class="disp ink">${GAME_TITLE}</h1><p id="loadMsg">Plowing the fields…</p><div class="bar"><i id="loadFill" style="width:10%"></i></div></div>`;
    this.el = {};
    for (const id of ['hud', 'hudL', 'hudC', 'hudR', 'hpNum', 'hpBar', 'hpGhost', 'bombs', 'boostBar', 'boostFill', 'wings', 'stageName', 'progFill', 'score', 'hits', 'combo', 'diffTag', 'reticles', 'retNear', 'retFar', 'bossbar', 'bossName', 'bossFill', 'low', 'vig', 'flash', 'comm', 'portrait', 'commWho', 'commTxt', 'tip', 'banner', 'warn', 'attract', 'attractTitle', 'menu', 'menuWrap', 'hints', 'touchOv', 'touchSettings', 'errOv', 'errTitle', 'errMsg', 'loading', 'loadMsg', 'loadFill']) this.el[id] = document.getElementById(id);
    this.pctx = this.el.portrait.getContext('2d');
    this.el.touchSettings.addEventListener('click', () => { Sfx.resume(); if (!this.cur || this.cur.id !== 'settings') this.go('settings'); });
    this.wingEls = ['buckle', 'clover', 'marrow'].map((k) => { const d = el('div', 'wing', `<span class="n disp ink">${CAST[k].name}</span><div class="wb"><i></i></div>`); this.el.wings.appendChild(d); return d; });
    this.lockEls = []; this.tagEls = [];
    this.applyHudScale();
    Settings.listeners.push((k) => { if (k === 'hudScale' || k === '*') this.applyHudScale(); });
  },
  applyHudScale() { document.documentElement.style.setProperty('--hud', S().hudScale); },
  loadProgress(p, msg) { this.el.loadFill.style.width = Math.round(p * 100) + '%'; if (msg) this.el.loadMsg.textContent = msg; },
  hideLoading() { this.el.loading.classList.add('hidden'); },
  fatal(title, msg) { this.el.errTitle.textContent = title; this.el.errMsg.innerHTML = msg; this.el.errOv.classList.remove('hidden'); this.el.loading.classList.add('hidden'); },

  // ---------- menu stack ----------
  set(id, params) { this.stack = []; this.open(id, params); },
  go(id, params) { if (this.cur) this.stack.push({ id: this.cur.id, params: this.cur.params, focus: this.focus }); this.open(id, params); },
  open(id, params, focus = 0) {
    const def = SCREENS[id](params || {});
    this.cur = { id, params }; this.def = def; this.focus = focus;
    this.items = def.items || [];
    this.delay = def.delay || 0; this.skip = true;
    if (!this.items[this.focus] || this.items[this.focus].type === 'info') this.focus = Math.max(0, this.items.findIndex((i) => i.type !== 'info'));
    if (def.focusIndex !== undefined && focus === 0) this.focus = def.focusIndex;
    this.renderMenu();
  },
  back() {
    if (this.def && this.def.onBack) { this.def.onBack(); return; }
    const p = this.stack.pop();
    if (p) { Sfx.uiBack(); this.open(p.id, p.params, p.focus); } else if (this.def && this.def.root) { /* root: no-op */ } else this.close();
  },
  close() { this.cur = null; this.def = null; this.stack = []; this.el.menu.classList.add('hidden'); this.el.hints.classList.add('hidden'); },
  renderMenu() {
    const d = this.def; const wrap = this.el.menuWrap;
    this.el.menu.classList.remove('hidden'); this.el.hints.classList.remove('hidden');
    this.el.menu.classList.toggle('dim', !!d.dim);
    wrap.innerHTML = '';
    if (d.header) { const h = el('div', d.headerClass || '', d.header); wrap.appendChild(h); }
    if (d.scroll) { const s = el('div', 'panel scroll', d.scroll); wrap.appendChild(s); this.scrollEl = s; } else this.scrollEl = null;
    if (d.body) { const b = el('div', 'panel ' + (d.bodyClass || ''), d.body); wrap.appendChild(b); }
    if (this.items.length) {
      const list = el('div', 'panel list' + (d.listClass ? ' ' + d.listClass : '')); wrap.appendChild(list); this.listEl = list;
      this.rowEls = this.items.map((it, i) => {
        const r = el('div', 'row' + (it.type === 'info' ? ' info' : ''));
        if (it.type !== 'info') {
          r.addEventListener('mouseenter', () => { if (this.focus !== i) { this.focus = i; Sfx.uiMove(); this.refreshFocus(); } });
          r.addEventListener('click', (e) => { Sfx.resume(); this.focus = i; this.refreshFocus(); if (e.target.dataset && e.target.dataset.dir) { this.adjust(it, +e.target.dataset.dir); } else this.activate(it); });
        }
        list.appendChild(r); this.paintRow(i, r); return r;
      });
    }
    if (d.footer) wrap.appendChild(el('div', 'small', d.footer));
    this.refreshFocus();
  },
  paintRow(i, r = this.rowEls[i]) {
    const it = this.items[i]; let v = '';
    if (it.type === 'toggle') { const on = it.get(); v = `<span class="toggle ${on ? '' : 'off'}">${on ? 'ON' : 'OFF'}</span>`; }
    else if (it.type === 'slider') { const x = it.get(); const pct = Math.round((x - it.min) / (it.max - it.min) * 100); v = `<span class="arr" data-dir="-1">◀</span><div class="bar"><i style="width:${pct}%"></i></div><span style="min-width:7vh;text-align:right">${it.fmt ? it.fmt(x) : pct + '%'}</span><span class="arr" data-dir="1">▶</span>`; }
    else if (it.type === 'select') { const x = it.get(); v = `<span class="arr" data-dir="-1">◀</span><span style="min-width:14vh;text-align:center">${it.options[x]}</span><span class="arr" data-dir="1">▶</span>`; }
    else if (it.type === 'info') { r.innerHTML = typeof it.text === 'function' ? it.text() : it.text; return; }
    if (it.html) r.innerHTML = it.html + (v ? `<div class="val">${v}</div>` : ''); else r.innerHTML = `<span class="lbl">${it.label}</span>${v ? `<div class="val">${v}</div>` : ''}`;
  },
  refreshFocus() {
    if (!this.rowEls) return;
    this.rowEls.forEach((r, i) => r.classList.toggle('focus', i === this.focus && this.items[i].type !== 'info'));
    const r = this.rowEls[this.focus]; if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
  },
  move(dir) {
    const n = this.items.length; if (!n) return;
    let i = this.focus;
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (this.items[i].type !== 'info') break; }
    if (i !== this.focus) { this.focus = i; Sfx.uiMove(); this.refreshFocus(); }
  },
  adjust(it, dir) {
    if (it.type === 'slider') {
      const step = it.step || 0.05; const v = clamp(Math.round((it.get() + dir * step) / step) * step, it.min, it.max);
      if (Math.abs(v - it.get()) > 1e-6) { it.set(+v.toFixed(3)); Sfx.uiSlide(); }
    } else if (it.type === 'select') { const n = it.options.length; it.set((it.get() + dir + n) % n); Sfx.uiSlide(); }
    else if (it.type === 'toggle') { it.set(!it.get()); Sfx.uiSlide(); }
    this.paintRow(this.focus);
  },
  activate(it) {
    if (!it) return;
    if (it.type === 'toggle') { it.set(!it.get()); Sfx.uiOk(); this.paintRow(this.focus); }
    else if (it.type === 'select') { this.adjust(it, 1); }
    else if (it.type === 'slider') { /* adjust with left/right */ }
    else if (it.onSelect) { Sfx.uiOk(); it.onSelect(); }
  },

  // ---------- per-frame ----------
  update(dt) {
    const dpr = Input.device;
    // touch-only gate
    const coarse = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const touchOnly = coarse && !Input.anyKeyboard && !Input.hasController();
    if (touchOnly !== this.touchOnly) { this.touchOnly = touchOnly; this.el.touchOv.classList.toggle('hidden', !touchOnly); }
    // menu input
    if (this.cur) {
      if (this.delay > 0) this.delay -= dt;
      if (this.skip) { this.skip = false; }
      else if (this.delay <= 0 && !touchOnly) {
        const it = this.items[this.focus];
        if (this.scrollEl && !this.items.length) { /* none */ }
        if (this.scrollEl) {
          if (Input.nav('down')) this.scrollEl.scrollTop += 90; if (Input.nav('up')) this.scrollEl.scrollTop -= 90;
          if (Input.nav('down') || Input.nav('up')) { /* scroll only */ }
        } else {
          if (Input.nav('up')) this.move(-1);
          if (Input.nav('down')) this.move(1);
        }
        if (it && (Input.nav('left') || Input.nav('right'))) { const dir = Input.nav('right') ? 1 : -1; if (it.type === 'slider' || it.type === 'select' || it.type === 'toggle') this.adjust(it, dir); }
        if (Input.pressed('confirm')) { if (this.scrollEl && this.items.length === 1) this.items[0].onSelect && (Sfx.uiOk(), this.items[0].onSelect()); else this.activate(it); }
        else if (Input.pressed('back')) this.back();
      }
      // live rows
      if (this.rowEls) this.items.forEach((x, i) => { if (x.type === 'info' && typeof x.text === 'function') this.rowEls[i].innerHTML = x.text(); });
      // hints
      const key = dpr + (this.def && this.def.hintKey || '');
      const hint = `<span><b>${Input.glyph('confirm')}</b>Select</span><span><b>${Input.glyph('back')}</b>Back</span><span><b>${dpr === 'kb' ? '↑ ↓' : 'D-Pad / Stick'}</b>Navigate</span><span><b>◀ ▶</b>Adjust</span>`;
      if (this.hintsKey !== key) { this.hintsKey = key; this.el.hints.innerHTML = hint; }
    }
    this.updateHud(dt);
    this.updateComm(dt);
    // flashes
    this.flashA = Math.max(0, this.flashA - dt * 1.8); this.vigA = Math.max(0, this.vigA - dt * 1.6);
    this.el.flash.style.opacity = this.flashA; this.el.vig.style.opacity = this.vigA;
  },

  // ---------- HUD ----------
  onLevelStart(L, o) {
    this.close(); this.hudOn = true; this.el.hud.classList.add('on');
    this.el.stageName.textContent = `STAGE ${L.num} · ${L.name.toUpperCase()}`;
    this.el.diffTag.textContent = DIFF[S().difficulty].name.toUpperCase();
    this.el.attract.classList.toggle('hidden', !o.attract); this.el.attractTitle.classList.toggle('hidden', !o.attract);
    this.ghostHp = Player.hp; this.clearTip(); this.hideBoss();
    this.commQ.length = 0; this.comm = null; this.el.comm.classList.remove('on'); Sfx.voiceStop();
    if (!o.noIntro) { this.banner(`STAGE ${L.num}`, '#ffd447', 3, L.name.toUpperCase()); }
    document.body.classList.toggle('cine', !o.noIntro);
    if (!o.noIntro) setTimeout(() => document.body.classList.remove('cine'), 3000);
    this.hudShowAttract = !!o.attract;
  },
  hideHud() { this.hudOn = false; this.el.hud.classList.remove('on'); this.el.attract.classList.add('hidden'); this.el.attractTitle.classList.add('hidden'); this.clearTip(); this.hideBoss(); this.commQ.length = 0; this.comm = null; this.el.comm.classList.remove('on'); document.body.classList.remove('cine'); Sfx.voiceStop(); },
  proj(v, out) {
    const p = _c.copy(v).project(Gfx.camera);
    out.x = (p.x * 0.5 + 0.5) * innerWidth; out.y = (-p.y * 0.5 + 0.5) * innerHeight; out.vis = p.z < 1 && p.z > -1;
  },
  updateHud(dt) {
    if (!this.hudOn) return;
    const P = Player, st = Game.stats, E = this.el;
    // bars
    const hpPct = clamp(P.hp / P.maxHp, 0, 1);
    E.hpBar.style.width = (hpPct * 100).toFixed(1) + '%'; E.hpBar.classList.toggle('lo', hpPct < 0.3);
    this.ghostHp = Math.max(P.hp, damp(this.ghostHp, P.hp, 1.5, dt));
    E.hpGhost.style.width = clamp(this.ghostHp / P.maxHp, 0, 1) * 100 + '%';
    E.hpNum.textContent = Math.ceil(P.hp);
    const lowOn = hpPct < 0.25 && P.state === 'alive'; E.low.classList.toggle('on', lowOn); E.low.style.opacity = lowOn ? 1 : 0;
    const bk = P.bombs + '|' + (Game.cheat ? 'c' : '');
    if (this.lastHud.bombs !== bk) { this.lastHud.bombs = bk; E.bombs.innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="b ${i < P.bombs ? '' : 'off'}"></span>`).join('') + `<span class="small" style="margin-left:1vh">${Input.glyph('bomb')}</span>`; }
    E.boostFill.style.width = P.boost + '%'; E.boostBar.classList.toggle('lock', P.boostLock);
    E.score.textContent = st.score.toLocaleString();
    E.hits.textContent = `HITS ${st.hits}`;
    E.combo.textContent = Game.combo >= 6 ? `COMBO x${(1 + Math.min(4, Math.floor(Game.combo / 6)) * 0.25).toFixed(2)}` : '';
    const len = Game.lvl ? Game.lvl.length : 1;
    E.progFill.style.width = clamp(Game.dist / len * 100, 0, 100) + '%';
    // wingmen
    Game.wingmen.forEach((w, i) => {
      const d = this.wingEls[i]; d.classList.toggle('help', w.state === 'chased'); d.classList.toggle('gone', w.state === 'gone');
      d.lastChild.firstChild.style.width = clamp(w.hp / w.maxHp, 0, 1) * 100 + '%';
    });
    // reticles
    Gfx.camera.updateMatrixWorld(true);
    const pr = {};
    if (P.state === 'alive' && Game.phase !== 'intro' && Game.phase !== 'outro') {
      this.proj(_a.set(P.pos.x, P.pos.y, P.pos.z - 55), pr); E.retNear.style.display = pr.vis ? 'block' : 'none'; E.retNear.style.left = pr.x + 'px'; E.retNear.style.top = pr.y + 'px';
      E.retNear.classList.toggle('charging', P.charge > 0);
      E.retNear.style.transform = P.charge > 0 ? `rotate(${performance.now() * 0.25 % 360}deg) scale(${1 + P.charge * 0.4})` : 'none';
      this.proj(_a.set(P.pos.x, P.pos.y, P.pos.z - 115), pr); E.retFar.style.display = pr.vis ? 'block' : 'none'; E.retFar.style.left = pr.x + 'px'; E.retFar.style.top = pr.y + 'px';
    } else { E.retNear.style.display = 'none'; E.retFar.style.display = 'none'; }
    // lock markers
    const locks = P.state === 'alive' ? P.locks : [];
    while (this.lockEls.length < locks.length) { const d = el('div', 'lock'); E.reticles.appendChild(d); this.lockEls.push(d); }
    this.lockEls.forEach((d, i) => {
      const t = locks[i]; if (!t || !t.alive) { d.style.display = 'none'; return; }
      this.proj(t.wpos(_b), pr); d.style.display = pr.vis ? 'block' : 'none'; d.style.left = pr.x + 'px'; d.style.top = pr.y + 'px';
    });
    // ally help tags
    Game.wingmen.forEach((w, i) => {
      let d = this.tagEls[i]; if (!d) { d = el('div', 'ally-tag disp', 'HELP!'); E.reticles.appendChild(d); this.tagEls[i] = d; }
      if (w.state === 'chased') { this.proj(w.pos, pr); d.style.display = pr.vis ? 'block' : 'none'; d.style.left = pr.x + 'px'; d.style.top = pr.y + 'px'; d.textContent = CAST[w.cast].name.toUpperCase() + ' — HELP!'; } else d.style.display = 'none';
    });
    // boss
    if (this.bossRef) { E.bossFill.style.width = (this.bossRef.healthFrac() * 100) + '%'; }
    // tip text refresh (glyphs follow the active device)
    if (this.tip && !this.tip.done) { this.tipT -= dt; if (this.tipT <= 0) { this.tipT = 0.3; E.tip.innerHTML = this.fmt(this.tip.tpl); } }
  },
  fmt(tpl) {
    return tpl.replace(/\{(\w+)\}/g, (m, a) => `<span class="key ${Input.device === 'kb' ? '' : 'pad'}">${Input.glyph(a)}</span>`);
  },
  showBoss(b) { this.bossRef = b; this.el.bossName.textContent = b.title; this.el.bossbar.classList.add('on'); },
  hideBoss() { this.bossRef = null; if (this.el) this.el.bossbar.classList.remove('on'); },
  showTip(id, tpl) { this.tip = { id, tpl, done: false }; this.tipT = 0; this.el.tip.classList.remove('done'); this.el.tip.innerHTML = this.fmt(tpl); this.el.tip.classList.add('on'); },
  tipDone(ok) { if (!this.tip) return; this.tip.done = true; this.el.tip.classList.add('done'); this.el.tip.innerHTML = ok ? '✓ Nice!' : 'Moving on…'; },
  clearTip() { this.tip = null; if (this.el) { this.el.tip.classList.remove('on'); this.el.tip.classList.remove('done'); } },
  banner(text, color = '#ffd447', dur = 1.4, sub) {
    const b = this.el.banner; b.innerHTML = text + (sub ? `<div style="font-size:5vh;color:#fff4d6">${sub}</div>` : ''); b.style.color = color;
    b.classList.remove('show'); void b.offsetWidth; b.style.animationDuration = Math.max(1.1, dur) + 's'; b.classList.add('show');
  },
  warn(text) { const w = this.el.warn; w.textContent = text; w.classList.remove('show'); void w.offsetWidth; w.classList.add('show'); },
  flash(color, a = 0.7) { if (S().reduceFlash) a *= 0.25; this.el.flash.style.background = color; this.flashA = a; },
  hitFlash() { this.vigA = S().reduceFlash ? 0.45 : 1; },

  // ---------- comms ----------
  say(who, text, dur = 3.4, quick = false) {
    if (!CAST[who]) return;
    if (quick && this.commQ.length > 1) this.commQ.length = 1;
    this.commQ.push({ who, text, dur });
    if (!this.comm) this.nextComm();
  },
  nextComm() {
    const m = this.commQ.shift();
    if (!m) { this.comm = null; this.el.comm.classList.remove('on'); return; }
    this.comm = { ...m, t: 0 };
    const c = CAST[m.who];
    this.el.commWho.textContent = `${c.name.toUpperCase()}  ·  ${c.role}`; this.el.commWho.style.color = c.accent;
    this.el.commTxt.textContent = S().subtitles ? m.text : '';
    this.el.comm.classList.add('on');
    Sfx.voice(c.pitch, Math.min(m.dur * 0.85, m.text.length * 0.06), c.kind);
  },
  updateComm(dt) {
    if (!this.comm) return;
    this.comm.t += dt;
    drawPortrait(this.pctx, this.comm.who, this.comm.t, this.comm.t < this.comm.dur * 0.85);
    if (this.comm.t > this.comm.dur) { Sfx.voiceStop(); this.nextComm(); }
  },

  // ---------- flow screens ----------
  openPause() { Game.paused = true; Sfx.engineStop(); Sfx.chargeUpdate(0, false); this.set('pause'); },
  resumeGame() { this.close(); Game.paused = false; Sfx.engineStart(); },
  showGameOver() { Music.stop(); this.set('gameover'); },
  showResults(r) { this.set('results', r); },
};

// ===== screens =====
const back = (label = 'Back') => ({ label, onSelect: () => UI.back() });
const slider = (label, key, o = {}) => ({ label, type: 'slider', min: o.min ?? 0, max: o.max ?? 1, step: o.step ?? 0.05, fmt: o.fmt, get: () => S()[key], set: (v) => Settings.set(key, v) });
const toggle = (label, key) => ({ label, type: 'toggle', get: () => S()[key], set: (v) => Settings.set(key, v) });

SCREENS.title = () => ({
  root: true, hintKey: 'title',
  header: `<div class="logo"><span class="l1 disp">${GAME_TITLE.toUpperCase()}</span><span class="l2 disp ink">FURROW SQUADRON · HARVEST DEFENSE</span></div>`,
  items: [
    { label: 'Start Mission', onSelect: () => UI.go('briefing', { idx: 0 }) },
    { label: 'Stage Select', onSelect: () => UI.go('stages') },
    { label: 'Settings', onSelect: () => UI.go('settings') },
    { label: 'Controls', onSelect: () => UI.go('controls') },
    { label: 'About & Credits', onSelect: () => UI.go('about') },
  ],
  listClass: 'title-list', footer: `v1.0 · built ${BUILD_STAMP} · idle for 10 s to watch the demo`,
});
SCREENS.stages = () => ({
  dim: true, header: '<h1 class="menu-title disp ink">Stage Select</h1>',
  items: [...LEVELS.map((L, i) => ({
    html: `<div class="card"><span class="name disp ink">${L.num}. ${L.name}</span><span class="desc">${L.sub} — boss: ${L.boss}</span></div><div class="medal disp">${SaveData.data.medals[L.id] || '–'}</div>`,
    onSelect: () => UI.go('briefing', { idx: i }),
  })), back()],
});
SCREENS.briefing = ({ idx }) => {
  const L = LEVELS[idx];
  const best = SaveData.data.scores[L.id];
  return {
    dim: true,
    header: `<h1 class="menu-title disp ink">Stage ${L.num} — ${L.name}</h1><div class="menu-sub">${L.sub}</div>`,
    body: `<div style="padding:2.4vh 4vh;font-size:2.8vh;line-height:1.4;max-width:min(70vw,900px)"><b style="color:var(--gold)">Granny Mulch:</b> ${L.brief.join(' ')}<br><br><b style="color:var(--teal)">Boss:</b> ${L.boss}${best ? `<br><b style="color:var(--teal)">Best score:</b> ${best.toLocaleString()}` : ''}</div>`,
    items: [
      { label: 'Launch!', onSelect: () => { UI.close(); Attract.stop(true); Game.startLevel(idx, { fresh: true }); } },
      { label: 'Difficulty', type: 'select', options: DIFF.map((d) => d.name), get: () => S().difficulty, set: (v) => Settings.set('difficulty', v) },
      back(),
    ],
  };
};
SCREENS.settings = () => ({
  dim: true, header: '<h1 class="menu-title disp ink">Settings</h1>',
  items: [
    { label: 'Input & Controller', onSelect: () => UI.go('set-input') },
    { label: 'Audio', onSelect: () => UI.go('set-audio') },
    { label: 'Display', onSelect: () => UI.go('set-display') },
    { label: 'Gameplay & Accessibility', onSelect: () => UI.go('set-game') },
    { label: 'Reset to Defaults', onSelect: () => { Settings.reset(); UI.renderMenu(); } },
    back(),
  ],
});
SCREENS['set-input'] = () => ({
  dim: true, header: '<h1 class="menu-title disp ink">Input & Controller</h1><div class="menu-sub">Stick feels backwards? Flip an axis below and watch the live test.</div>',
  items: [
    toggle('Invert horizontal axis (gamepad)', 'invertH'),
    toggle('Invert vertical axis (gamepad)', 'invertV'),
    toggle('Flight-stick pitch (pull back = climb)', 'flightInvert'),
    slider('Stick dead zone', 'deadzone', { min: 0, max: 0.4, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' }),
    slider('Steering sensitivity', 'sensitivity', { min: 0.5, max: 1.5, step: 0.05, fmt: (v) => v.toFixed(2) + 'x' }),
    toggle('Controller rumble', 'rumble'),
    { type: 'info', text: () => `<span>Live test — stick right/up should show positive: X <b>${Input.move.x.toFixed(2)}</b> · Y <b>${Input.move.y.toFixed(2)}</b> · ${Input.hasController() ? 'controller connected' : 'no controller detected'}</span>` },
    back(),
  ],
});
SCREENS['set-audio'] = () => ({
  dim: true, header: '<h1 class="menu-title disp ink">Audio</h1>',
  items: [slider('Master volume', 'masterVol'), slider('Music', 'musicVol'), slider('Sound effects', 'sfxVol'), slider('Voices', 'voiceVol'), back()],
});
SCREENS['set-display'] = () => ({
  dim: true, header: '<h1 class="menu-title disp ink">Display</h1>',
  items: [
    toggle('Shadows', 'shadows'), toggle('Bloom glow', 'bloom'), toggle('Ink outlines', 'outlines'),
    slider('Screen shake', 'shake', { fmt: (v) => Math.round(v * 100) + '%' }), slider('HUD size', 'hudScale', { min: 0.7, max: 1.4, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' }),
    toggle('Reduce screen flashes', 'reduceFlash'), back(),
  ],
});
SCREENS['set-game'] = () => ({
  dim: true, header: '<h1 class="menu-title disp ink">Gameplay & Accessibility</h1>',
  items: [
    { label: 'Difficulty', type: 'select', options: DIFF.map((d) => d.name), get: () => S().difficulty, set: (v) => Settings.set('difficulty', v) },
    slider('Aim assist', 'aimAssist', { fmt: (v) => Math.round(v * 100) + '%' }),
    toggle('Tutorial prompts', 'tutorial'), toggle('Subtitles', 'subtitles'), back(),
  ],
});
SCREENS.controls = () => {
  const row = (a, pad, kb) => `<div>${a}</div><div><span class="key pad">${pad}</span></div><div><span class="key">${kb}</span></div>`;
  const ps = Input.device === 'xbox' ? 'xbox' : 'ps'; const G = GLYPHS[ps], K = GLYPHS.kb;
  return {
    dim: true, header: '<h1 class="menu-title disp ink">Controls</h1>',
    body: `<div class="ctrl-grid"><div class="h">Action</div><div class="h">${ps === 'ps' ? 'DualSense' : 'Gamepad'}</div><div class="h">Keyboard</div>
      ${row('Steer ship', 'Left Stick / D-Pad', 'WASD / Arrows')}
      ${row('Fire laser (tap)', G.fire, K.fire)}
      ${row('Charge & lock-on (hold, release)', 'Hold ' + G.fire, 'Hold ' + K.fire)}
      ${row('Nova Bomb', G.bomb, K.bomb)}
      ${row('Boost', G.boost, K.boost)}
      ${row('Brake', G.brake, K.brake)}
      ${row('Barrel Roll (reflects shots)', G.roll + ' · double-tap', 'Q / E · double-tap')}
      ${row('Pause', G.pause, K.pause)}
      ${row('Menus: select / back', G.confirm + ' / ' + G.back, 'Enter / Esc')}</div>`,
    items: [back()],
  };
};
SCREENS.about = () => ({ dim: true, header: '<h1 class="menu-title disp ink">About & Credits</h1>', scroll: aboutHTML(), items: [back()], hintKey: 'about' });
SCREENS.pause = () => ({
  dim: true, root: true, header: '<h1 class="menu-title disp ink">Paused</h1>', onBack: () => UI.resumeGame(),
  items: [
    { label: 'Resume', onSelect: () => UI.resumeGame() },
    { label: 'Restart from checkpoint', onSelect: () => { UI.close(); Game.paused = false; Game.startLevel(Game.lvlIdx, { startAt: Game.checkpoint, keepStats: true }); } },
    { label: 'Controls', onSelect: () => UI.go('controls-pause') },
    { label: 'Settings', onSelect: () => UI.go('settings') },
    { label: 'Quit to Title', onSelect: () => { UI.close(); Game.exitToTitle(); UI.set('title'); } },
  ],
});
SCREENS['controls-pause'] = SCREENS.controls;
SCREENS.gameover = () => ({
  dim: true, root: true, delay: 0.8, header: '<h1 class="menu-title disp ink" style="color:var(--red)">Shield Down!</h1><div class="menu-sub">Hazel\'s Furrow fighter has been shot down.</div>',
  items: [
    ...(Game.continues > 0 ? [{ label: `Retry from checkpoint  (${Game.continues} continue${Game.continues > 1 ? 's' : ''} left)`, onSelect: () => { UI.close(); Game.retryFromCheckpoint(); } }] : []),
    { label: 'Restart stage', onSelect: () => { UI.close(); Game.restartStage(); } },
    { label: 'Quit to Title', onSelect: () => { UI.close(); Game.exitToTitle(); UI.set('title'); } },
  ],
});
SCREENS.results = (r) => {
  const st = r.stats;
  return {
    dim: true, root: true, delay: 1.0,
    header: `<h1 class="menu-title disp ink">Stage Clear!</h1><div class="menu-sub">${r.level.name}</div><div class="bigmedal disp ink">${r.medal}</div>`,
    body: `<div class="stats"><span>Score</span><span class="v">${st.score.toLocaleString()}</span><span>Enemies downed</span><span class="v">${st.kills} (${Math.round(r.killPct * 100)}%)</span><span>Wingmen saved / lost</span><span class="v">${st.alliesSaved} / ${st.alliesLost}</span><span>Shots reflected</span><span class="v">${st.deflected}</span><span>Rings · Bombs used</span><span class="v">${st.rings} · ${st.bombsUsed}</span><span>Rating bonus</span><span class="v">+${(st.bonus || 0).toLocaleString()}</span><span>Best</span><span class="v">${(r.best || st.score).toLocaleString()}</span></div>`,
    items: [
      ...(r.hasNext ? [{ label: 'Next Stage', onSelect: () => UI.go('briefing', { idx: Game.lvlIdx + 1 }) }] : [{ label: 'Finish Demo', onSelect: () => UI.set('ending') }]),
      { label: 'Replay Stage', onSelect: () => { UI.close(); Game.restartStage(); } },
      { label: 'Quit to Title', onSelect: () => { UI.close(); Game.exitToTitle(); UI.set('title'); } },
    ],
  };
};
SCREENS.ending = () => ({
  dim: true, root: true, header: '<h1 class="menu-title disp ink">Demo Complete!</h1><div class="menu-sub">The Blight retreats… for now.</div>',
  body: `<div style="padding:3vh 5vh;font-size:3vh;line-height:1.45;max-width:min(70vw,900px);text-align:center">Thank you for flying with Furrow Squadron.<br>The Orchard Belt and Dustbowl Gorge are safe, but Baron Blight's fleet is still out there. More harvest worlds await in the full game.</div>`,
  items: [{ label: 'Back to Title', onSelect: () => { UI.close(); Game.exitToTitle(); UI.set('title'); } }],
});
