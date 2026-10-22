/* ===================== 07 UI: menus, HUD, comms, banners ===================== */
function drawPortrait(canvas, key, talking, t) {
  const c = CHARS[key] || CHARS.hollin, g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h); g.fillStyle = c.villain ? '#3a1040' : '#12243a'; g.fillRect(0, 0, w, h);
  // scanlines
  g.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  const cx = w / 2, cy = h * 0.54, r = w * 0.3, bob = Math.sin(t * 3) * (talking ? 1.6 : 0.6);
  g.save(); g.translate(0, bob); g.lineWidth = 4; g.strokeStyle = '#140b1c'; g.fillStyle = c.face;
  // ears
  const ear = (x, y, rw, rh, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.ellipse(0, 0, rw, rh, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); };
  if (c.ear === 'long') { ear(cx - r * 0.55, cy - r * 1.5, r * 0.28, r * 0.85, -0.15); ear(cx + r * 0.55, cy - r * 1.5, r * 0.28, r * 0.85, 0.15); }
  else if (c.ear === 'floppy') { ear(cx - r * 1.0, cy - r * 0.2, r * 0.3, r * 0.7, 0.2); ear(cx + r * 1.0, cy - r * 0.2, r * 0.3, r * 0.7, -0.2); }
  else if (c.ear === 'round') { ear(cx - r * 0.85, cy - r * 0.85, r * 0.3, r * 0.3, 0); ear(cx + r * 0.85, cy - r * 0.85, r * 0.3, r * 0.3, 0); }
  else if (c.ear === 'pointy') { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r * 0.3, cy - r * 0.8); g.lineTo(cx + s * r * 0.95, cy - r * 1.5); g.lineTo(cx + s * r * 0.95, cy - r * 0.4); g.closePath(); g.fill(); g.stroke(); } }
  g.beginPath(); g.ellipse(cx, cy, r, r * 0.95, 0, 0, TAU); g.fill(); g.stroke();
  if (c.hat) { g.fillStyle = '#1f4a60'; g.beginPath(); g.moveTo(cx - r, cy - r * 0.45); g.quadraticCurveTo(cx, cy - r * 1.7, cx + r, cy - r * 0.45); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#ffd23a'; g.fillRect(cx - 6, cy - r * 1.05, 12, 8); }
  // eyes
  g.fillStyle = '#fff'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.4, cy - r * 0.12, r * 0.2, r * 0.24, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = c.villain ? '#ff3a3a' : '#140b1c'; g.beginPath(); g.arc(cx + s * r * 0.4, cy - r * 0.08, r * 0.09, 0, TAU); g.fill(); g.fillStyle = '#fff'; }
  if (c.villain) { g.strokeStyle = '#140b1c'; g.lineWidth = 5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * r * 0.12, cy - r * 0.55); g.lineTo(cx + s * r * 0.7, cy - r * 0.35); g.stroke(); } g.lineWidth = 4; }
  // snout / beak
  if (c.beak) { g.fillStyle = '#ffb24a'; g.beginPath(); g.moveTo(cx - r * 0.2, cy + r * 0.12); g.lineTo(cx + r * 0.2, cy + r * 0.12); g.lineTo(cx, cy + r * 0.55); g.closePath(); g.fill(); g.stroke(); }
  else { g.fillStyle = '#140b1c'; g.beginPath(); g.ellipse(cx, cy + r * 0.12, r * 0.12, r * 0.08, 0, 0, TAU); g.fill(); }
  // mouth
  const open = talking ? (Math.sin(t * 22) * 0.5 + 0.5) : 0;
  g.fillStyle = '#5a1020'; g.beginPath(); g.ellipse(cx, cy + r * 0.62, r * 0.22, 3 + open * r * 0.2, 0, 0, TAU); g.fill(); g.stroke();
  g.restore();
  // frame static
  if (talking) { g.fillStyle = 'rgba(120,255,200,0.08)'; g.fillRect(0, (t * 60) % h, w, 10); }
}

const UI = {
  els: {}, cur: null, stack: [], menu: null, comms: [], commCur: null, hintShown: false, portraitT: 0, locks: [], arrows: [], lastHud: {}, toastEls: [],
  init() {
    const root = $('#ui');
    root.innerHTML = `
      <div id="hud" class="hidden">
        <div class="hud-tl panel"><div class="lbl">SHIELD</div><div class="bar shield"><i id="h-shield"></i><b id="h-shield-over"></b></div><div class="num" id="h-shield-n">100</div></div>
        <div class="hud-tr panel"><div class="row"><span class="lbl">SCORE</span><span class="num" id="h-score">0</span></div><div class="row"><span class="lbl">HITS</span><span class="num big" id="h-hits">0</span></div><div class="row small"><span class="lbl">ROUTE</span><span class="num" id="h-route">-</span></div></div>
        <div class="hud-bl panel"><div class="lbl">BOOST</div><div class="bar boost"><i id="h-boost"></i></div><div class="lbl" style="margin-top:.5rem">NOVA BOMBS</div><div class="bombs" id="h-bombs"></div><div class="lbl" style="margin-top:.5rem">LASER <span id="h-laser" class="num">I</span></div></div>
        <div class="hud-br"><div class="wings" id="h-wings"></div><canvas id="h-radar" width="220" height="220" class="hidden"></canvas></div>
        <div class="hud-top"><div id="h-boss" class="boss hidden"><div class="bn" id="h-boss-n"></div><div class="bar"><i id="h-boss-b"></i></div></div><div id="h-obj" class="obj hidden"></div></div>
        <div id="ret1" class="ret r1"></div><div id="ret2" class="ret r2"></div>
        <div id="h-locks"></div><div id="h-arrows"></div>
        <div id="comm" class="comm hidden panel"><canvas id="comm-face" width="112" height="112"></canvas><div class="ct"><div class="cn" id="comm-n"></div><div class="cx" id="comm-t"></div></div></div>
        <div id="hint" class="hint hidden panel"></div>
        <div id="banner" class="banner"><div class="b1"></div><div class="b2"></div></div>
        <div id="toasts"></div>
        <div id="warn" class="warn hidden">WARNING — ENEMY BEHIND YOU</div>
        <div id="vig" class="vig"></div><div id="flash" class="flash"></div><div id="fade" class="fade"></div>
        <div id="demo" class="demo hidden"><div class="d1">DEMO PLAY</div><div class="d2">PRESS ANY BUTTON</div></div>
      </div>
      <div id="screen" class="screen hidden"></div>
      <div id="prompts" class="prompts hidden"></div>
      <div id="loading" class="loading"><div class="ld-t">MACBETH MAYHEM</div><div class="ld-s" id="ld-s">Loading…</div></div>
      <div id="dev" class="dev hidden"></div>
      <div id="touch" class="touch hidden"><div class="t1">CONTROLLER OR KEYBOARD REQUIRED</div><div class="t2">This game has no touch controls. Connect a gamepad or keyboard to play.</div><button id="touch-set" class="bigbtn">SETTINGS</button></div>`;
    for (const id of ['hud', 'screen', 'prompts', 'loading', 'dev', 'touch', 'h-shield', 'h-shield-over', 'h-shield-n', 'h-score', 'h-hits', 'h-route', 'h-boost', 'h-bombs', 'h-laser', 'h-wings', 'h-radar', 'h-boss', 'h-boss-n', 'h-boss-b', 'h-obj', 'ret1', 'ret2', 'h-locks', 'h-arrows', 'comm', 'comm-face', 'comm-n', 'comm-t', 'hint', 'banner', 'toasts', 'warn', 'vig', 'flash', 'fade', 'demo', 'ld-s', 'touch-set']) this.els[id] = document.getElementById(id);
    this.els['touch-set'].onclick = () => { this.pushScreen('settings'); };
    for (let i = 0; i < 6; i++) { const d = el('div', 'lock'); this.els['h-locks'].appendChild(d); this.locks.push(d); }
    for (let i = 0; i < 12; i++) { const d = el('div', 'arrow'); this.els['h-arrows'].appendChild(d); this.arrows.push(d); }
    this.els.wingEls = WING.map((w) => { const d = el('div', 'wing', `<span class="wn">${CHARS[w.id].name}</span><div class="bar mini"><i></i></div>`); this.els['h-wings'].appendChild(d); return d; });
    for (let i = 0; i < 6; i++) { const b = el('span', 'bomb'); this.els['h-bombs'].appendChild(b); }
    addEventListener('keydown', (e) => { if (e.code === 'F3') { this.toggleDev(); e.preventDefault(); } });
  },
  setLoading(msg) { if (this.els['ld-s']) this.els['ld-s'].textContent = msg; },
  hideLoading() { this.els.loading.classList.add('hidden'); },
  showHUD(on) { this.els.hud.classList.toggle('hidden', !on); },
  fade(on, ms = 400) { const f = this.els.fade; f.style.transition = `opacity ${ms}ms`; f.style.opacity = on ? 1 : 0; },
  toast(text, kind = '') {
    const d = el('div', 'toast ' + kind, text); this.els.toasts.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2200); setTimeout(() => d.remove(), 2700);
    while (this.els.toasts.children.length > 4) this.els.toasts.firstChild.remove();
  },
  banner(a, b) {
    const bn = this.els.banner; bn.querySelector('.b1').textContent = a; bn.querySelector('.b2').textContent = b || '';
    bn.classList.remove('show'); void bn.offsetWidth; bn.classList.add('show');
  },
  /* ----- comms ----- */
  comm(who, text) {
    if (!CHARS[who]) who = 'hollin';
    this.comms.push({ who, text }); if (this.comms.length > 3) this.comms.splice(0, this.comms.length - 3);
  },
  commClear() { this.comms = []; this.commCur = null; this.els.comm.classList.add('hidden'); },
  updateComms(dt) {
    this.portraitT += dt; const box = this.els.comm;
    if (!this.commCur && this.comms.length) {
      const m = this.comms.shift(); this.commCur = { who: m.who, text: m.text, t: 0, dur: Math.max(2.8, m.text.length * 0.055 + 1.4), shown: 0 };
      box.classList.remove('hidden'); box.classList.toggle('villain', !!CHARS[m.who].villain);
      this.els['comm-n'].textContent = CHARS[m.who].name + ' · ' + CHARS[m.who].role; Sfx.voice(m.who, m.text);
    }
    const c = this.commCur;
    if (c) {
      c.t += dt; const n = Math.min(c.text.length, Math.floor(c.t * 48));
      if (n !== c.shown) { c.shown = n; this.els['comm-t'].textContent = c.text.slice(0, n); }
      drawPortrait(this.els['comm-face'], c.who, c.t < c.dur - 0.8 && n < c.text.length + 8, this.portraitT);
      if (c.t > c.dur) { this.commCur = null; if (!this.comms.length) box.classList.add('hidden'); }
    }
  },
  setHint(h, stage) { this.hintObj = h; const d = this.els.hint; d.innerHTML = h.text(glyph); d.classList.remove('hidden', 'done'); d.classList.add('show'); },
  clearHint(ok) { const d = this.els.hint; if (ok) { d.classList.add('done'); Sfx.menuSelect(); setTimeout(() => d.classList.add('hidden'), 700); } else d.classList.add('hidden'); d.classList.remove('show'); this.hintObj = null; },
  setBossBar(b) {
    const e = this.els['h-boss']; if (!b) { e.classList.add('hidden'); return; }
    e.classList.remove('hidden'); this.els['h-boss-n'].textContent = b.name; this.els['h-boss-b'].style.width = clamp(b.hp / b.max, 0, 1) * 100 + '%';
  },
  setObjective(t) { const o = this.els['h-obj']; if (!t) o.classList.add('hidden'); else { o.classList.remove('hidden'); o.innerHTML = t; } },
  /* ----- HUD per-frame ----- */
  updateHUD(st, dt) {
    const P = st.player, E = this.els; if (!P) return;
    const hp = clamp(P.hp / P.maxHp, 0, 1);
    E['h-shield'].style.width = hp * 100 + '%'; E['h-shield'].style.background = hp < 0.3 ? '#ff4a4a' : hp < 0.6 ? '#ffc84a' : '#5aff9a';
    E['h-shield-over'].style.width = (P.maxHp / 160 * 100) + '%';
    E['h-shield-n'].textContent = Math.ceil(P.hp);
    document.getElementById('hud').classList.toggle('lowhp', hp < 0.3 && P.alive);
    E['h-score'].textContent = String(Math.floor(W.score)).padStart(7, '0'); E['h-hits'].textContent = W.hits;
    E['h-route'].textContent = st.mode === 'rail' ? (st.route ? (st.route === 'A' ? 'A · TUNNEL' : 'B · FOUNDRY') : '—') : 'ALL-RANGE';
    E['h-boost'].style.width = P.boost * 100 + '%'; E['h-boost'].style.background = P.boostLock > 0 ? '#ff4a4a' : '#4ab6ff';
    [...E['h-bombs'].children].forEach((b, i) => { b.style.display = i < Math.max(3, P.bombs) ? '' : 'none'; b.classList.toggle('on', i < P.bombs); });
    E['h-laser'].textContent = ['I', 'II', 'III'][P.laser - 1];
    W.allies.forEach((w, i) => { const d = E.wingEls[i]; d.classList.toggle('dead', !w.alive); d.classList.toggle('panic', w.alive && w.chasers > 0); d.querySelector('i').style.width = clamp(w.hp / w.maxHp, 0, 1) * 100 + '%'; });
    // reticles
    if (st.mode === 'rail') {
      const [a, b] = st.reticles(); const show = P.alive && !st.cinematic;
      for (const [elx, r] of [[E.ret1, a], [E.ret2, b]]) { elx.style.display = show && r.vis ? 'block' : 'none'; elx.style.transform = `translate(${r.x}px,${r.y}px)`; }
    } else {
      const r = st.reticle(); E.ret1.style.display = r && r.vis ? 'block' : 'none'; if (r) E.ret1.style.transform = `translate(${r.x}px,${r.y}px)`; E.ret2.style.display = 'none';
    }
    // lock markers
    const lk = P.locks || [];
    this.locks.forEach((d, i) => { const e = lk[i]; if (!e || !e.alive) { d.style.display = 'none'; return; } const p = Gfx.project(e.pos); d.style.display = p.vis ? 'block' : 'none'; d.style.transform = `translate(${p.x}px,${p.y}px)`; });
    E.ret1.classList.toggle('hit', (W.hudHit || 0) > 0); W.hudHit = Math.max(0, (W.hudHit || 0) - dt * 5);
    // wingman / objective / flash overlays
    E.vig.style.opacity = Math.max(0, (W.hudHurt || 0)) * 0.9; W.hudHurt = Math.max(0, (W.hudHurt || 0) - dt * 2.4);
    E.flash.style.opacity = W.flashWhite || 0;
    this.updateComms(dt);
    if (this.hintObj) E.hint.innerHTML = this.hintObj.text(glyph);
    if (st.mode === 'range') this.updateRadar(st);
    E.demo.classList.toggle('hidden', !st.attract);
  },
  updateRadar(st) {
    const cv = this.els['h-radar']; cv.classList.remove('hidden'); const g = cv.getContext('2d'), w = cv.width, c = w / 2, P = st.player;
    g.clearRect(0, 0, w, w); g.fillStyle = 'rgba(14,10,28,0.72)'; g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.fill(); g.strokeStyle = '#4ab6c4'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(74,182,196,0.3)'; g.lineWidth = 1; g.beginPath(); g.arc(c, c, c * 0.5, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(c, 6); g.lineTo(c, w - 6); g.moveTo(6, c); g.lineTo(w - 6, c); g.stroke();
    const yaw = P.yaw, range = 420;
    const plot = (pos, col, r) => { const dx = pos.x - P.pos.x, dz = pos.z - P.pos.z; const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw), rz = dx * Math.sin(yaw) + dz * Math.cos(yaw); let px = rx / range * (c - 8), py = rz / range * (c - 8); const m = Math.hypot(px, py); if (m > c - 10) { px *= (c - 10) / m; py *= (c - 10) / m; } g.fillStyle = col; g.beginPath(); g.arc(c + px, c + py, r, 0, TAU); g.fill(); };
    for (const e of W.ents) if (e.alive && e.team === 'e' && e.targetable !== false && e.kind !== 'bossbody') plot(e.pos, e.kind === 'generator' || e.kind === 'core' ? '#66f0ff' : '#ff4a6a', e.kind === 'generator' || e.kind === 'core' ? 6 : 4);
    for (const a of W.allies) if (a.alive) plot(a.pos, '#5aff9a', 4);
    if (st.carrier) plot(st.carrier.pos, 'rgba(255,200,120,0.6)', 9);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(c, c - 8); g.lineTo(c - 6, c + 6); g.lineTo(c + 6, c + 6); g.closePath(); g.fill();
    const rem = st.radarHint; if (rem) { g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.textAlign = 'center'; }
  },
  updateArrows(list) { // list of screen-edge indicators {x,y,ang,col}
    this.arrows.forEach((d, i) => { const a = list[i]; if (!a) { d.style.display = 'none'; return; } d.style.display = 'block'; d.style.transform = `translate(${a.x}px,${a.y}px) rotate(${a.ang}rad)`; d.style.borderBottomColor = a.col; });
  },
  /* ---------- screens & menus ---------- */
  prompts(list) {
    const p = this.els.prompts; if (!list) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden'); p.innerHTML = list.map(([a, t]) => `<span class="pr">${glyph(a)}<em>${t}</em></span>`).join('');
  },
  refreshPrompts() { if (this.curPrompts) this.prompts(this.curPrompts); },
  hideScreen() { this.els.screen.classList.add('hidden'); this.els.screen.innerHTML = ''; this.cur = null; this.menu = null; this.stack = []; this.prompts(null); this.curPrompts = null; },
  /** generic: opts {cls, html, items, onBack, prompts, onUpdate, row} */
  showScreen(opts) {
    const s = this.els.screen; s.className = 'screen ' + (opts.cls || ''); s.innerHTML = opts.html || '';
    this.cur = opts; this.menu = null;
    if (opts.items) {
      const host = s.querySelector('.menuhost') || s;
      this.menu = new Menu(opts.items, host, opts.row); if (opts.savedIdx !== undefined) this.menu.i = opts.savedIdx; this.menu.render();
    }
    this.curPrompts = opts.prompts || [['nav', 'NAVIGATE'], ['confirm', 'SELECT'], ['back', 'BACK']]; this.prompts(this.curPrompts);
    opts.onShow && opts.onShow(s);
  },
  pushScreen(name, ctx) { if (this.cur) { if (this.menu) this.cur.savedIdx = this.menu.i; this.stack.push(this.cur); } this.showNamed(name, ctx); },
  popScreen() { const prev = this.stack.pop(); if (prev) { this.showScreen(prev); prev.onResume && prev.onResume(); } else { this.hideScreen(); } },
  handleNav(nav, dt) {
    if (!this.cur) return;
    const entered = this.cur; // actions below may swap the screen; the new screen must not receive this frame's confirm/back
    if (this.cur.onUpdate) this.cur.onUpdate(dt);
    const m = this.menu;
    if (m) {
      const row = m.row;
      if (nav[row ? 'left' : 'up']) { m.move(-1); Sfx.menuMove(); }
      if (nav[row ? 'right' : 'down']) { m.move(1); Sfx.menuMove(); }
      if (!row && nav.left) m.adjust(-1); if (!row && nav.right) m.adjust(1);
      if (nav.confirm) m.activate();
    }
    if (this.cur !== entered) return;
    if (this.cur.scroll) { const sc = this.els.screen.querySelector('.scroll'); if (sc) { if (nav.down) sc.scrollTop += 90; if (nav.up) sc.scrollTop -= 90; const pad = Input.pad; if (pad) sc.scrollTop += (pad.axes[1] || 0) * 16; if (Input.keys.has('ArrowDown')) sc.scrollTop += 6; if (Input.keys.has('ArrowUp')) sc.scrollTop -= 6; } }
    if (nav.back && this.cur && this.cur.onBack) { Sfx.menuBack(); this.cur.onBack(); }
    if (nav.confirm && this.cur && this.cur.onConfirm) this.cur.onConfirm();
  },
  /* named screens are registered by the game module */
  showNamed(name, ctx) { const f = SCREENS[name]; if (f) f(ctx); },
  toggleDev() { this.els.dev.classList.toggle('hidden'); this.devOn = !this.els.dev.classList.contains('hidden'); },
};

class Menu {
  constructor(items, host, row) { this.items = items; this.host = host; this.row = !!row; this.i = items.findIndex((it) => !it.disabled); if (this.i < 0) this.i = 0; this.els = []; }
  render() {
    this.host.innerHTML = ''; this.els = [];
    this.items.forEach((it, idx) => {
      const d = el('div', 'mi ' + (it.type || 'button') + (it.disabled ? ' disabled' : '') + (it.cls ? ' ' + it.cls : ''));
      this.paint(d, it); d.addEventListener('mouseenter', () => { if (!it.disabled && this.i !== idx && Input.mouseMoved) { this.i = idx; this.sync(); Sfx.menuMove(); } });
      d.addEventListener('click', (e) => { this.i = idx; this.sync(); if (it.type === 'slider') { const bar = d.querySelector('.sl'); const r = bar.getBoundingClientRect(); if (e.clientX >= r.left - 8) { const v = clamp((e.clientX - r.left) / r.width, 0, 1); const stp = it.step || 0.1; it.set(clamp(Math.round((it.min + v * (it.max - it.min)) / stp) * stp, it.min, it.max)); this.paint(d, it); Sfx.menuMove(); return; } } this.activate(); });
      this.host.appendChild(d); this.els.push(d);
    });
    this.sync();
  }
  paint(d, it) {
    let h = '';
    if (it.type === 'slider') { const v = it.get(), pc = (v - it.min) / (it.max - it.min); h = `<span class="ml">${it.label}</span><span class="sl"><i style="width:${pc * 100}%"></i></span><span class="mv">${it.fmt ? it.fmt(v) : Math.round(v * 100) + '%'}</span>`; }
    else if (it.type === 'toggle') { const v = it.get(); h = `<span class="ml">${it.label}</span><span class="pill ${v ? 'on' : ''}">${v ? 'ON' : 'OFF'}</span>`; }
    else if (it.type === 'choice') { h = `<span class="ml">${it.label}</span><span class="mv ch">◀ ${it.choices[it.get()]} ▶</span>`; }
    else if (it.type === 'card') h = it.html;
    else h = `<span class="ml">${it.label}</span>${it.sub ? `<span class="ms">${it.sub}</span>` : ''}`;
    d.innerHTML = h;
  }
  sync() { this.els.forEach((d, i) => d.classList.toggle('focus', i === this.i)); const f = this.items[this.i]; const desc = document.querySelector('.desc'); if (desc) desc.textContent = (f && f.desc) || ''; if (this.els[this.i] && this.els[this.i].scrollIntoView) this.els[this.i].scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  move(d) { let n = this.i; for (let k = 0; k < this.items.length; k++) { n = (n + d + this.items.length) % this.items.length; if (!this.items[n].disabled) break; } this.i = n; this.sync(); }
  adjust(d) {
    const it = this.items[this.i]; if (!it) return;
    if (it.type === 'slider') { const stp = it.step || 0.1; it.set(clamp(Math.round((it.get() + d * stp) / stp) * stp, it.min, it.max)); this.paint(this.els[this.i], it); Sfx.menuMove(); }
    else if (it.type === 'toggle') { it.set(!it.get()); this.paint(this.els[this.i], it); Sfx.menuSelect(); }
    else if (it.type === 'choice') { it.set((it.get() + d + it.choices.length) % it.choices.length); this.paint(this.els[this.i], it); Sfx.menuMove(); }
  }
  activate() {
    const it = this.items[this.i]; if (!it || it.disabled) { Sfx.menuBack(); return; }
    if (it.type === 'toggle') { this.adjust(1); return; }
    if (it.type === 'choice') { this.adjust(1); return; }
    if (it.type === 'slider') return;
    Sfx.menuSelect(); it.action && it.action();
  }
}
const SCREENS = {};
