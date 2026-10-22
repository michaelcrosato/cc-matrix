/* ============================== comm / portraits ============================== */
const CHARS = {
  control: { name: 'COMMAND', col: '#3d8fe0', kind: 'visor', pitch: 0.9 },
  wick: { name: 'WICK', col: '#8d96b4', kind: 'wolf', pitch: 0.7 },
  juno: { name: 'JUNO', col: '#2cc4a0', kind: 'cat', pitch: 1.25 },
  pike: { name: 'PIKE', col: '#d0384a', kind: 'bird', pitch: 1.05 },
};
function drawPortrait(ctx, ch, open, t) {
  const c = ch.col; ctx.clearRect(0, 0, 96, 96);
  const g = ctx.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#0f2038'); g.addColorStop(1, '#1d3a5c'); ctx.fillStyle = g; ctx.fillRect(0, 0, 96, 96);
  ctx.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < 96; y += 4) ctx.fillRect(0, y, 96, 1);
  const bob = Math.sin(t * 3) * 1.2;
  ctx.save(); ctx.translate(0, bob);
  if (ch.kind === 'wolf' || ch.kind === 'cat') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(18, 40); ctx.lineTo(24, 8); ctx.lineTo(42, 26); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(78, 40); ctx.lineTo(72, 8); ctx.lineTo(54, 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffb0b0'; ctx.beginPath(); ctx.moveTo(24, 34); ctx.lineTo(26, 17); ctx.lineTo(36, 28); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(72, 34); ctx.lineTo(70, 17); ctx.lineTo(60, 28); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(48, 52, 29, 30, 0, 0, 7); ctx.fill();
  if (ch.kind === 'bird') { ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.moveTo(40, 54); ctx.lineTo(56, 54); ctx.lineTo(48, 70); ctx.closePath(); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(30, 28); ctx.lineTo(48, 10); ctx.lineTo(66, 28); ctx.fill(); }
  if (ch.kind === 'visor') { ctx.fillStyle = '#10243e'; ctx.fillRect(20, 38, 56, 18); ctx.fillStyle = '#6fe0ff'; ctx.fillRect(24, 42, 48, 8); ctx.fillStyle = '#e8eef8'; ctx.fillRect(14, 74, 68, 18); }
  else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(37, 48, 7, 8, 0, 0, 7); ctx.ellipse(59, 48, 7, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(38, 49, 3.6, 0, 7); ctx.arc(58, 49, 3.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(48, 60, 3, 0, 7); ctx.fill();
  }
  if (ch.kind !== 'bird') { ctx.fillStyle = '#2a0f10'; ctx.beginPath(); ctx.ellipse(48, 72, 8, open ? 6 : 1.6, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}
const Comm = {
  q: [], cur: null, t: 0, shown: 0, hold: 0, ctx: null, el: null,
  init() { this.ctx = $('commPic').getContext('2d'); this.el = $('comm'); },
  clear() { this.q = []; this.cur = null; this.el.classList.remove('on'); },
  say(key, text, dur = 3) { if (!CHARS[key]) key = 'control'; if (this.q.length > 4) this.q.shift(); this.q.push({ key, text, dur }); if (!this.cur) this.next(); },
  next() {
    this.cur = this.q.shift(); if (!this.cur) { this.el.classList.remove('on'); return; }
    this.t = 0; this.shown = 0; this.hold = this.cur.dur;
    $('commName').textContent = CHARS[this.cur.key].name; $('commText').textContent = ''; this.el.classList.add('on'); Snd.comm();
  },
  update(dt) {
    if (!this.cur) return;
    this.t += dt; const ch = CHARS[this.cur.key], n = this.cur.text.length;
    const want = Math.min(n, Math.floor(this.t * 38));
    if (want !== this.shown) { if (want % 2 === 0) Snd.voice(ch.pitch); this.shown = want; $('commText').textContent = this.cur.text.slice(0, want); }
    drawPortrait(this.ctx, ch, this.shown < n && Math.floor(this.t * 9) % 2 === 0, this.t);
    if (this.shown >= n) { this.hold -= dt; if (this.hold <= 0) this.next(); }
  },
};

/* ============================== HUD ============================== */
const HUD = {
  els: {}, pool: [], hintT: 0, warnT: 0, msgT: 0, msg: '', obj: '', dmg: 0, heal: 0, lastBossName: '', rets: null,
  init() {
    const ids = ['hud', 'shieldFill', 'shieldBar', 'boostFill', 'bombs', 'laserLvl', 'score', 'hits', 'phase', 'progFill', 'boss', 'bossName', 'bossBar', 'objective', 'warn', 'hint', 'dmg', 'heal', 'tailWarn', 'allies', 'ret', 'demoTop', 'demoTag', 'whiteout'];
    ids.forEach((i) => { this.els[i] = $(i); });
    const ret = this.els.ret;
    this.near = document.createElement('div'); this.near.className = 'ret near'; this.far = document.createElement('div'); this.far.className = 'ret far';
    ret.append(this.near, this.far);
    for (let i = 0; i < 8; i++) { const d = document.createElement('div'); d.className = 'lock'; ret.appendChild(d); this.pool.push(d); }
    for (const w of WING) { const d = document.createElement('div'); d.className = 'ally'; d.dataset.k = w.name; d.innerHTML = `<div class="lbl">${w.name}</div><div class="bar"><i></i></div>`; this.els.allies.appendChild(d); }
    Comm.init();
  },
  show(b) { this.els.hud.classList.toggle('on', b); },
  reset() {
    Comm.clear(); this.hintT = this.warnT = this.msgT = 0; this.els.hint.classList.remove('on'); this.els.warn.classList.remove('on'); this.obj = ''; this.els.objective.style.opacity = 0;
    this.els.boss.style.display = 'none'; this.dmg = this.heal = 0;
  },
  say(key, text, dur) { Comm.say(key, text, dur); },
  hint(text, dur = 5) { if (!S.hints || G.demo) return; this.els.hint.innerHTML = text; this.els.hint.classList.add('on'); this.hintT = dur; },
  warn(text, dur = 2) { this.els.warn.textContent = text; this.els.warn.classList.add('on'); this.warnT = dur; },
  flashText(text, dur = 2.2) { this.msg = text; this.msgT = dur; },
  objective(t) { this.obj = t; },
  phase(name) { this.els.phase.textContent = name; this.flashText(name, 2.8); },
  checkpoint(n, silent) { if (!silent) { saveCheckpoint(n); this.flashText('CHECKPOINT REACHED'); } G.cp = Math.max(G.cp, n); },
  flashDamage() { this.dmg = 1; }, flashHeal() { this.heal = 1; },
  px(ndc) { return [(ndc.x * 0.5 + 0.5) * window.innerWidth, (-ndc.y * 0.5 + 0.5) * window.innerHeight]; },
  update(dt) {
    const E = this.els; Comm.update(dt);
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) E.hint.classList.remove('on'); }
    if (this.warnT > 0) { this.warnT -= dt; if (this.warnT <= 0) E.warn.classList.remove('on'); }
    if (this.msgT > 0) { this.msgT -= dt; E.objective.textContent = this.msg; E.objective.style.opacity = 1; }
    else { E.objective.textContent = this.obj; E.objective.style.opacity = this.obj ? 0.95 : 0; }
    this.dmg = Math.max(0, this.dmg - dt * 2.2); this.heal = Math.max(0, this.heal - dt * 2); E.dmg.style.opacity = this.dmg + (P.hp / P.max < 0.25 ? 0.25 + 0.15 * Math.sin(G.t * 8) : 0); E.heal.style.opacity = this.heal;
    E.whiteout.style.opacity = clamp(G.whiteout, 0, 1);
    E.shieldBar.style.width = `${(P.max / 140) * 100}%`; E.shieldFill.style.width = `${clamp(P.hp / P.max, 0, 1) * 100}%`; E.shieldBar.classList.toggle('low', P.hp / P.max < 0.3);
    E.boostFill.style.width = `${P.boost * 100}%`; E.boostFill.style.opacity = P.boostLock ? 0.35 : 1;
    E.bombs.textContent = '◆'.repeat(P.bombs) + '◇'.repeat(Math.max(0, 5 - P.bombs));
    E.laserLvl.textContent = ['', 'LASER: SINGLE', 'LASER: TWIN', 'LASER: HYPER'][P.laser];
    E.score.textContent = G.score.toLocaleString('en-US');
    E.hits.innerHTML = G.hits > 1 ? `${G.hits} <small>HITS</small>` : '';
    // progress
    let prog = 0;
    if (G.mode === 'rail') prog = clamp(-G.railZ / (BOSS_D + 600), 0, 1) * 0.7; else prog = 0.7 + 0.3 * clamp(((G.arena && G.arena.stage) || 1) / 4, 0, 1);
    E.progFill.style.width = `${prog * 100}%`;
    // boss bar
    let bf = null, name = '';
    if (G.boss && G.boss.parts) { bf = G.boss.parts.reduce((a, p) => a + Math.max(0, p.hp), 0) / G.boss.maxTotal; name = G.boss.name; }
    else if (G.arena && G.arena.stage >= 2 && G.arena.stage < 4) { const gh = G.arena.gens.reduce((a, g) => a + Math.max(0, g.hp), 0), gm = G.arena.gens.reduce((a, g) => a + g.maxHp, 0), c = G.arena.core; bf = G.arena.stage === 2 ? gh / gm : Math.max(0, c.hp) / c.maxHp; name = G.arena.stage === 2 ? 'LEVIATHAN SHIELD GRID' : 'GLOOM LEVIATHAN CORE'; }
    if (bf === null) E.boss.style.display = 'none'; else { E.boss.style.display = 'block'; E.bossBar.style.width = `${clamp(bf, 0, 1) * 100}%`; E.bossName.textContent = name; }
    // allies
    for (const d of E.allies.children) {
      const a = G.allies.find((q) => q.name === d.dataset.k); let vis = false;
      if (a) { if (G.mode === 'free') vis = true; else vis = !!(G.juno && !G.juno.done && a === G.juno.ally); }
      d.style.display = vis ? 'block' : 'none';
      if (vis) { d.firstElementChild.textContent = a.respawn > 0 ? `${a.name} — RECOVERING` : a.name; d.querySelector('i').style.width = `${clamp(a.hp / a.max, 0, 1) * 100}%`; }
    }
    E.allies.style.top = G.boss ? '19vh' : '19vh';
    E.tailWarn.style.display = G.tailCount > 0 && !P.dead ? 'block' : 'none';
    E.demoTop.style.display = G.demo ? 'block' : 'none'; E.demoTag.style.display = G.demo ? 'block' : 'none';
    if (G.demo) E.demoTag.textContent = 'PRESS ANY BUTTON TO PLAY';
    // reticles
    const show = !P.dead && !G.finished;
    this.near.style.display = this.far.style.display = show ? 'block' : 'none';
    if (show) {
      toNDC(reticlePos(false), _rn); let [x, y] = this.px(_rn); this.near.style.left = `${x}px`; this.near.style.top = `${y}px`; this.near.classList.toggle('charging', P.charging);
      toNDC(reticlePos(true), _rn); [x, y] = this.px(_rn); this.far.style.left = `${x}px`; this.far.style.top = `${y}px`;
    }
    this.pool.forEach((d, i) => {
      const e = P.charging && !P.dead ? P.locks[i] : null;
      if (e && !e.dead && toNDC(e.pos, _re)) { const [x, y] = this.px(_re); d.style.display = 'block'; d.style.left = `${x}px`; d.style.top = `${y}px`; } else d.style.display = 'none';
    });
  },
};

/* ============================== menu system ============================== */
const UI = {
  root: null, def: null, stack: [], sel: 0, active: false, itemEls: [], bodyEl: null, stickDot: null, logo: null,
  init() { this.root = $('screen'); this.logo = $('logo'); },
  isOpen() { return this.active; },
  show(def, push = false) {
    if (push && this.def) this.stack.push({ def: this.def, sel: this.sel });
    this.def = def; this.sel = def.sel || 0; this.active = true; this.render();
  },
  closeAll() { this.active = false; this.def = null; this.stack = []; this.root.style.display = 'none'; this.root.innerHTML = ''; },
  back() {
    const d = this.def; if (!d) return;
    if (d.onBack) { d.onBack(); return; }
    const prev = this.stack.pop(); if (prev) { this.def = prev.def; this.sel = prev.sel; this.render(); }
  },
  render() {
    const d = this.def, r = this.root; r.style.display = 'flex'; r.className = d.cls || '';
    const gld = (a) => gl(a);
    let h = `<div class="menu ${d.left ? 'left' : ''}"><h1>${d.title || ''}</h1>${d.sub ? `<div class="sub">${d.sub}</div>` : ''}`;
    if (d.body) h += `<div class="body" id="menuBody">${typeof d.body === 'function' ? d.body() : d.body}</div>`;
    h += '<ul class="items" id="menuItems"></ul>';
    h += `<div class="foot"><span>${gld('nav')} Navigate</span><span>${gld('confirm')} Select</span><span>${gld('back')} Back</span></div></div>`;
    r.innerHTML = h; this.bodyEl = $('menuBody'); this.stickDot = r.querySelector('.stick i');
    const ul = $('menuItems'); this.itemEls = [];
    d.items.forEach((it, i) => {
      const li = document.createElement('li'); li.className = 'item'; li.innerHTML = `<span>${it.label}</span><span class="val"></span>`; ul.appendChild(li); this.itemEls.push(li);
      li.addEventListener('mouseenter', () => { if (this.sel !== i) { this.sel = i; this.refresh(); Snd.menu(); } });
      li.addEventListener('click', (ev) => {
        this.sel = i;
        if (ev.target.classList.contains('arr')) { this.adjust(ev.target.dataset.dir === 'l' ? -1 : 1); return; }
        if (it.kind === 'slider') { const tr = li.querySelector('.track'); if (tr) { const rc = tr.getBoundingClientRect(); const u = clamp((ev.clientX - rc.left) / rc.width, 0, 1); if (ev.clientX >= rc.left - 6) { it.set(this.snap(it, it.min + u * (it.max - it.min))); Snd.menu(); this.refresh(); return; } } }
        this.activate();
      });
    });
    this.refresh();
  },
  snap(it, v) { const s = it.step || 0.1; return clamp(Math.round(v / s) * s, it.min, it.max); },
  refresh() {
    const d = this.def; if (!d) return;
    d.items.forEach((it, i) => {
      const li = this.itemEls[i]; li.classList.toggle('sel', i === this.sel); li.classList.toggle('dim', !!(it.disabled && it.disabled()));
      const v = li.querySelector('.val'); let t = '';
      if (it.kind === 'toggle') t = `<span class="arr" data-dir="l">◀</span>${it.get() ? 'ON' : 'OFF'}<span class="arr" data-dir="r">▶</span>`;
      else if (it.kind === 'choice') t = `<span class="arr" data-dir="l">◀</span>${it.opts[it.get()]}<span class="arr" data-dir="r">▶</span>`;
      else if (it.kind === 'slider') { const val = it.get(), u = (val - it.min) / (it.max - it.min); t = `<span class="arr" data-dir="l">◀</span><span class="track"><i style="width:${u * 100}%"></i></span><span>${it.fmt ? it.fmt(val) : val.toFixed(2)}</span><span class="arr" data-dir="r">▶</span>`; }
      v.innerHTML = t;
    });
    const sel = this.itemEls[this.sel]; if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  },
  adjust(dir) {
    const it = this.def.items[this.sel]; if (!it) return;
    if (it.kind === 'toggle') it.set(!it.get());
    else if (it.kind === 'choice') it.set((it.get() + dir + it.opts.length) % it.opts.length);
    else if (it.kind === 'slider') it.set(this.snap(it, it.get() + dir * (it.step || 0.1)));
    else return;
    Snd.menu(); this.refresh(); Snd.applyVolumes();
  },
  activate() {
    const it = this.def.items[this.sel]; if (!it || (it.disabled && it.disabled())) return;
    if (it.kind === 'toggle' || it.kind === 'choice') { this.adjust(1); return; }
    if (it.kind === 'slider') return;
    Snd.select(); if (it.action) it.action();
  },
  update(dt) {
    if (!this.active || !this.def) return;
    const I = Input, d = this.def, n = d.items.length;
    if (d.live) d.live();
    if (this.stickDot) this.stickDot.style.transform = `translate(calc(-50% + ${I.rawL[0] * 4.2}vh), calc(-50% + ${-I.rawL[1] * 4.2}vh))`;
    if (d.scrollBody && this.bodyEl && (I.nav.up || I.nav.down) && n <= 1) { this.bodyEl.scrollBy({ top: (I.nav.down ? 1 : -1) * 90, behavior: 'smooth' }); return; }
    if (I.nav.up) { this.sel = (this.sel - 1 + n) % n; Snd.menu(); this.refresh(); }
    if (I.nav.down) { this.sel = (this.sel + 1) % n; Snd.menu(); this.refresh(); }
    if (I.nav.left) this.adjust(-1);
    if (I.nav.right) this.adjust(1);
    if (I.p.confirm) this.activate();
    else if (I.p.back || (d.pauseBack && I.p.pause)) { Snd.back(); this.back(); }
  },
};
