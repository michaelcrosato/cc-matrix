// ===================================================================
//  HUD, RADIO, HINTS  -  DOM overlay, big readable 10-foot layout
// ===================================================================
const SPEAKERS = {
  fob: { name: 'FOB', pitch: 210, c1: '#ff9a40', c2: '#3a2a5a' },
  bolt: { name: 'BOLT', pitch: 270, c1: '#f4e6a0', c2: '#3a3a1a' },
  kestrel: { name: 'KESTREL', pitch: 150, c1: '#8aa8e0', c2: '#1a2a4a' },
  newt: { name: 'NEWT', pitch: 340, c1: '#6ad08a', c2: '#103a22' },
  gen: { name: 'GEN. HOUND', pitch: 105, c1: '#b88a5a', c2: '#2a1a10' },
  vex: { name: 'WARLORD VEX', pitch: 80, c1: '#a050e0', c2: '#2a0a3a' },
};
function drawPortrait(cv, id, talking = 0) {
  const c = cv.getContext('2d'), w = cv.width, h = cv.height, sp = SPEAKERS[id] || SPEAKERS.fob;
  const g = c.createRadialGradient(w / 2, h * 0.45, 4, w / 2, h / 2, w * 0.75);
  g.addColorStop(0, sp.c2); g.addColorStop(1, '#05060e');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h * 0.56); const k = w / 100; c.scale(k, k);
  const ink = '#0c0a1a';
  const ell = (x, y, rx, ry, fill, stroke = true) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke(); } };
  const poly = (pts, fill) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 2.5; c.strokeStyle = ink; c.stroke(); };
  const mouth = talking ? 3 + Math.abs(Math.sin(performance.now() * 0.02)) * 5 : 1.5;
  if (id === 'fob') {
    poly([[-34, -10], [-28, -52], [-8, -26]], '#ff9a40'); poly([[34, -10], [28, -52], [8, -26]], '#ff9a40');
    poly([[-27, -14], [-26, -40], [-14, -24]], '#ffd9b0'); poly([[27, -14], [26, -40], [14, -24]], '#ffd9b0');
    ell(0, 0, 38, 34, '#ff9a40'); ell(0, 12, 22, 17, '#fff0dc'); ell(0, 3, 6, 4.5, '#2a1a20');
    ell(-15, -6, 6, 7, '#fff'); ell(15, -6, 6, 7, '#fff'); ell(-14, -5, 3, 4, '#1a2a5a'); ell(14, -5, 3, 4, '#1a2a5a');
    c.fillStyle = 'rgba(80,200,255,.35)'; c.fillRect(-30, -14, 60, 14); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(-30, -14, 60, 14);
    ell(0, 20, 7, mouth, '#5a1a2a');
  } else if (id === 'bolt') {
    poly([[-22, -10], [-34, -64], [-10, -22]], '#f4e6a0'); poly([[22, -10], [34, -64], [10, -22]], '#f4e6a0');
    poly([[-22, -16], [-30, -54], [-14, -22]], '#f09aa0'); poly([[22, -16], [30, -54], [14, -22]], '#f09aa0');
    ell(0, 0, 34, 32, '#f4e6a0'); ell(0, 14, 17, 13, '#fffbe8'); ell(0, 6, 5, 4, '#e06a80');
    ell(-14, -6, 7, 8, '#fff'); ell(14, -6, 7, 8, '#fff'); ell(-13, -5, 3.5, 5, '#2a1a3a'); ell(13, -5, 3.5, 5, '#2a1a3a');
    poly([[-22, -18], [-8, -14], [-8, -12], [-22, -12]], '#e5b81a'); poly([[22, -18], [8, -14], [8, -12], [22, -12]], '#e5b81a');
    ell(0, 20, 6, mouth, '#5a1a2a');
  } else if (id === 'kestrel') {
    ell(0, 0, 36, 34, '#8aa8e0'); poly([[-36, -4], [-20, -34], [-6, -24]], '#5a78b8'); poly([[36, -4], [20, -34], [6, -24]], '#5a78b8');
    ell(-14, -6, 8, 6, '#fff7d0'); ell(14, -6, 8, 6, '#fff7d0'); ell(-13, -6, 3.5, 4, '#1a1a2a'); ell(13, -6, 3.5, 4, '#1a1a2a');
    poly([[-18, -14], [-4, -9], [-18, -9]], '#2a3a6a'); poly([[18, -14], [4, -9], [18, -9]], '#2a3a6a');
    poly([[-9, 4], [9, 4], [0, 24 + mouth]], '#ffc840'); c.beginPath(); c.moveTo(-9, 6); c.lineTo(9, 6); c.lineWidth = 2; c.strokeStyle = ink; c.stroke();
  } else if (id === 'newt') {
    ell(-18, -22, 13, 13, '#6ad08a'); ell(18, -22, 13, 13, '#6ad08a'); ell(0, 2, 38, 30, '#6ad08a'); ell(0, 14, 28, 14, '#b8f0c0');
    ell(-18, -23, 9, 9, '#fff'); ell(18, -23, 9, 9, '#fff'); ell(-17, -22, 4.5, 5.5, '#10301a'); ell(17, -22, 4.5, 5.5, '#10301a');
    c.beginPath(); c.moveTo(-20, 18); c.quadraticCurveTo(0, 22 + mouth * 1.4, 20, 18); c.lineWidth = 3; c.strokeStyle = ink; c.stroke();
    ell(-26, 4, 4, 3, '#40a060', false); ell(26, 4, 4, 3, '#40a060', false);
  } else if (id === 'gen') {
    poly([[-38, -6], [-46, 34], [-24, 14]], '#7a5a3a'); poly([[38, -6], [46, 34], [24, 14]], '#7a5a3a');
    ell(0, 0, 36, 33, '#b88a5a'); ell(0, 14, 20, 15, '#e8d0b0'); ell(0, 6, 7, 5, '#201010');
    ell(-14, -6, 6, 6, '#fff'); ell(14, -6, 6, 6, '#fff'); ell(-13, -6, 3, 3.5, '#201010'); ell(13, -6, 3, 3.5, '#201010');
    poly([[-26, -26], [26, -26], [22, -38], [-22, -38]], '#2a4a2a'); ell(0, -32, 4, 4, '#ffd030');
    ell(0, 22, 8, mouth, '#4a1a1a');
  } else {
    poly([[-36, 20], [-40, -22], [0, -50], [40, -22], [36, 20], [0, 34]], '#2a1a3a');
    ell(-14, -4, 8, 4, '#ff3040'); ell(14, -4, 8, 4, '#ff3040'); ell(-14, -4, 3, 3, '#fff'); ell(14, -4, 3, 3, '#fff');
    c.fillStyle = '#7a3fb5'; c.fillRect(-18, 14, 36, 5 + mouth * 0.4); c.strokeStyle = ink; c.lineWidth = 2; c.strokeRect(-18, 14, 36, 5 + mouth * 0.4);
  }
  c.restore();
  c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
}

const Radio = {
  q: [], cur: null, t: 0, shown: 0, seen: new Set(), el: null, cv: null,
  say(id, text, opts = {}) {
    if (G.attract && !S.radio) return;
    const line = { id, text, dur: Math.max(2.6, 1.3 + text.length * 0.048), pri: opts.pri || 0 };
    if (this.q.length > 3) this.q.shift();
    this.q.push(line);
  },
  once(key, id, text) { if (this.seen.has(key)) return; this.seen.add(key); this.say(id, text); },
  reset() { this.q.length = 0; this.cur = null; this.seen.clear(); if (this.el) this.el.classList.remove('on'); },
  update(dt) {
    if (!this.el) return;
    if (!this.cur && this.q.length) {
      this.cur = this.q.shift(); this.t = 0; this.shown = 0;
      this.el.classList.add('on');
      $('.rname', this.el).textContent = SPEAKERS[this.cur.id].name;
      $('.rtext', this.el).textContent = '';
      Snd.play('radioOn', { vol: 0.7 });
    }
    if (!this.cur) return;
    this.t += dt;
    const target = Math.min(this.cur.text.length, Math.floor(this.t * 42));
    if (target > this.shown) {
      for (let i = this.shown; i < target; i += 3) if (S.radio) Snd.voice(SPEAKERS[this.cur.id].pitch, (i - this.shown) * 0.012);
      this.shown = target; $('.rtext', this.el).textContent = this.cur.text.slice(0, target);
    }
    drawPortrait(this.cv, this.cur.id, this.shown < this.cur.text.length ? 1 : 0);
    if (this.t > this.cur.dur) { this.cur = null; this.el.classList.remove('on'); Snd.play('radioOff', { vol: 0.6 }); }
  },
};
const Hint = {
  fn: null, t: 0, el: null,
  show(fn, dur = 6.5) { this.fn = fn; this.t = dur; if (this.el) this.el.classList.add('on'); },
  clear() { this.fn = null; this.t = 0; if (this.el) this.el.classList.remove('on'); },
  update(dt) {
    if (!this.el) return;
    if (this.fn && this.t > 0) { this.t -= dt; this.el.textContent = this.fn(); if (this.t <= 0) this.el.classList.remove('on'); }
  },
};

const HUD = {
  root: null, e: {}, toasts: [], lockEls: [], helpEls: {}, popupLayer: null, bossOn: false, centerWarn: null, shieldTrail: 100,
  init() {
    const r = this.root = $('#hud');
    r.innerHTML = `
      <div class="hud-tl panel">
        <div class="lbl">SHIELD <span class="num" id="h-hp">100</span></div>
        <div class="bar shield"><b id="h-hp-trail"></b><i id="h-hp-fill"></i></div>
        <div class="row"><span class="wing" id="h-wl">◤</span><span class="wing" id="h-wr">◥</span><span class="lives" id="h-lives">♥ ×3</span></div>
      </div>
      <div class="hud-tr panel">
        <div class="lbl">SCORE</div><div class="big" id="h-score">0000000</div>
        <div class="row"><span class="lbl">HITS</span><span class="num" id="h-hits">0</span><span class="combo" id="h-combo"></span></div>
      </div>
      <div class="hud-bl panel">
        <div class="lbl">BOOST <span id="h-boostlbl"></span></div>
        <div class="bar boost"><i id="h-boost"></i></div>
        <div class="row"><span class="bombs" id="h-bombs"></span><span class="laser" id="h-laser"></span></div>
      </div>
      <div class="hud-wing panel" id="h-wing"></div>
      <div class="boss" id="h-boss"><div class="bname" id="h-bname"></div><div class="bar bossbar"><i id="h-bfill"></i></div></div>
      <div class="radio" id="h-radio"><canvas width="132" height="132"></canvas><div class="rbody"><div class="rname"></div><div class="rtext"></div></div></div>
      <div class="hint" id="h-hint"></div>
      <div class="toasts" id="h-toasts"></div>
      <div class="centerwarn" id="h-cwarn"></div>
      <div class="banner" id="h-banner"></div>
      <div class="card" id="h-card"><div class="c1"></div><div class="c2"></div></div>
      <div class="arinfo panel" id="h-ar"></div>
      <canvas class="radar" id="h-radar" width="260" height="260"></canvas>
      <div class="ret near" id="h-ret1"></div><div class="ret far" id="h-ret2"></div>
      <div class="chargering" id="h-charge"></div>
      <div id="h-popups"></div>
      <div id="h-locks"></div>`;
    for (const id of ['hp', 'hp-trail', 'hp-fill', 'wl', 'wr', 'lives', 'score', 'hits', 'combo', 'boost', 'boostlbl', 'bombs', 'laser', 'wing', 'boss', 'bname', 'bfill', 'radio', 'hint', 'toasts', 'cwarn', 'banner', 'card', 'ar', 'radar', 'ret1', 'ret2', 'charge', 'popups', 'locks']) this.e[id] = $('#h-' + id);
    Radio.el = this.e.radio; Radio.cv = $('canvas', this.e.radio);
    Hint.el = this.e.hint;
    this.show(false);
  },
  show(on) { this.root.style.display = on ? 'block' : 'none'; this.visible = on; },
  toast(text, kind = '', dur = 1.4) {
    const d = el('div', 'toast ' + kind, text); this.e.toasts.appendChild(d);
    while (this.e.toasts.children.length > 3) this.e.toasts.removeChild(this.e.toasts.firstChild);
    setTimeout(() => d.remove(), dur * 1000);
  },
  popup(text, pos) {
    if (!this.visible) return;
    const s = toScreen(pos);
    if (!s.vis) return;
    const d = el('div', 'popup', text); d.style.left = s.x + 'px'; d.style.top = s.y + 'px';
    this.e.popups.appendChild(d); setTimeout(() => d.remove(), 900);
  },
  damageFlash() { const f = $('#vig'); f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit'); },
  warning(text) { const b = this.e.banner; b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); },
  card(c1, c2, dur = 3.4) { const c = this.e.card; $('.c1', c).textContent = c1; $('.c2', c).textContent = c2; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); setTimeout(() => c.classList.remove('on'), dur * 1000); },
  bossBar(name) { this.bossOn = !!name; this.e.boss.classList.toggle('on', !!name); if (name) this.e.bname.textContent = name; },
  bossHp(f) { this.e.bfill.style.width = (f * 100).toFixed(1) + '%'; },
  setCenterWarning(t) { if (t !== this.centerWarn) { this.centerWarn = t; this.e.cwarn.textContent = t || ''; this.e.cwarn.classList.toggle('on', !!t); } },
  update(dt) {
    if (!this.visible || !G.pl) return;
    const pl = G.pl, e = this.e, def = G.def;
    const hpf = clamp(pl.hp / pl.maxHp, 0, 1);
    this.shieldTrail = damp(this.shieldTrail, hpf * 100, 2.2, dt);
    e['hp-fill'].style.width = hpf * 100 + '%'; e['hp-trail'].style.width = this.shieldTrail + '%';
    e['hp-fill'].classList.toggle('low', hpf < 0.3);
    e.hp.textContent = Math.ceil(pl.hp);
    e.wl.classList.toggle('lost', !pl.wingL); e.wr.classList.toggle('lost', !pl.wingR);
    e.lives.textContent = G.attract ? 'DEMO' : '♥ ×' + G.lives;
    e.score.textContent = String(Math.floor(G.score)).padStart(7, '0');
    e.hits.textContent = G.stageHits;
    const mult = Math.min(4, 1 + Math.floor(G.combo / 5) * 0.5);
    e.combo.textContent = G.combo >= 3 ? `COMBO ${G.combo}  ×${mult.toFixed(1)}` : '';
    e.boost.style.width = pl.boostE + '%';
    e.boost.parentElement.classList.toggle('hot', pl.overheat);
    e.boostlbl.textContent = pl.overheat ? 'OVERHEAT' : pl.boosting ? 'ON' : pl.braking ? 'BRAKE' : '';
    e.bombs.innerHTML = '<span class="k">NOVA</span> ' + Array.from({ length: 6 }, (_, i) => `<span class="bm ${i < pl.bombs ? 'on' : ''}"></span>`).join('');
    e.laser.innerHTML = '<span class="k">LASER</span> ' + [1, 2, 3].map((i) => `<span class="lp ${pl.laser >= i ? 'on' : ''}"></span>`).join('');
    // wingmen
    let html = '';
    for (const w of G.wing) {
      const st = w.state === 'ok' ? (w.chaser && w.chaser.alive ? 'HELP!' : '') : 'OUT';
      html += `<div class="wm ${st ? 'warn' : ''} ${w.state !== 'ok' ? 'out' : ''}"><span>${w.def.name}</span><div class="bar mini"><i style="width:${clamp(w.hp / w.maxHp, 0, 1) * 100}%"></i></div><em>${st}</em></div>`;
    }
    if (html !== this._wh) { e.wing.innerHTML = html; this._wh = html; }
    // reticles
    const s1 = _v1.copy(pl.pos).addScaledVector(pl.aim, 42), s2 = _v2.copy(pl.pos).addScaledVector(pl.aim, 120);
    const p1 = toScreen(s1), p2 = toScreen(s2);
    e.ret1.style.transform = `translate(${p1.x}px,${p1.y}px)`; e.ret2.style.transform = `translate(${p2.x}px,${p2.y}px)`;
    e.ret1.style.opacity = e.ret2.style.opacity = pl.dead ? 0 : 1;
    e.charge.style.opacity = pl.charging ? 1 : 0;
    if (pl.charging) { e.charge.style.transform = `translate(${p1.x}px,${p1.y}px) scale(${1.6 - Math.min(1, pl.chargeT / 1.6) * 0.7})`; }
    // lock boxes
    const locks = pl.locks.filter((t) => t.alive);
    while (this.lockEls.length < locks.length) { const d = el('div', 'lock'); e.locks.appendChild(d); this.lockEls.push(d); }
    this.lockEls.forEach((d, i) => {
      const t = locks[i];
      if (!t) { d.style.display = 'none'; return; }
      const s = toScreen(t.pos);
      d.style.display = s.vis ? 'block' : 'none';
      d.style.transform = `translate(${s.x}px,${s.y}px) rotate(${(G.t * 90) % 360}deg)`;
    });
    // help markers
    for (const w of G.wing) {
      const chased = w.state === 'ok' && w.chaser && w.chaser.alive;
      let m = this.helpEls[w.id];
      if (chased) {
        if (!m) { m = this.helpEls[w.id] = el('div', 'helpmark', 'HELP'); e.locks.appendChild(m); }
        const s = toScreen(w.pos);
        m.style.display = s.vis ? 'block' : 'none';
        m.style.transform = `translate(${s.x}px,${s.y - 46}px)`;
      } else if (m) m.style.display = 'none';
    }
    // all-range info + radar
    const ar = def.mode === 'ar';
    e.ar.style.display = ar ? 'block' : 'none'; e.radar.style.display = ar ? 'block' : 'none';
    if (ar) {
      const alive = G.ents.filter((x) => x.kind === 'bandit' && x.alive).length;
      e.ar.innerHTML = G.boss ? `<div class="lbl">OBJECTIVE</div><div class="obj">Destroy the Dreadnought</div>` : `<div class="lbl">OBJECTIVE</div><div class="obj">Shoot down ${G.arTarget} Gloom fighters</div><div class="obj2">${G.arKills} / ${G.arTarget}</div>`;
      this.radar();
      const tail = G.ents.some((x) => x.kind === 'bandit' && x.alive && x.onTail);
      if (tail && !this.centerWarn) { e.cwarn.textContent = `ENEMY ON YOUR TAIL — ${glyphSet().maneuver} to shake`; e.cwarn.classList.add('on', 'tail'); this._tail = true; }
      else if (!tail && this._tail) { this._tail = false; e.cwarn.classList.remove('tail'); if (!this.centerWarn) e.cwarn.classList.remove('on'); }
    }
    Radio.update(dt); Hint.update(dt);
    // flash overlay
    const f = $('#flash');
    G.flash = Math.max(0, G.flash - dt * 1.6);
    f.style.opacity = G.flash; f.style.background = '#' + (G.flashCol || 0xffffff).toString(16).padStart(6, '0');
  },
  radar() {
    const cv = this.e.radar, c = cv.getContext('2d'), w = cv.width, cx = w / 2, pl = G.pl;
    c.clearRect(0, 0, w, w);
    c.fillStyle = 'rgba(8,14,30,.62)'; c.beginPath(); c.arc(cx, cx, cx - 3, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(120,220,255,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cx, cx - 3, 0, TAU); c.stroke();
    c.beginPath(); c.arc(cx, cx, cx * 0.5, 0, TAU); c.strokeStyle = 'rgba(120,220,255,.22)'; c.stroke();
    c.beginPath(); c.moveTo(cx, 6); c.lineTo(cx, w - 6); c.moveTo(6, cx); c.lineTo(w - 6, cx); c.stroke();
    const right = _v1.set(1, 0, 0).applyQuaternion(pl.q), fwd = pl.aim, scale = cx / 340;
    const dot = (p, col, r) => {
      const d = _v2.copy(p).sub(pl.pos); const lx = d.dot(right), lz = d.dot(fwd);
      let x = lx * scale, y = -lz * scale; const m = Math.hypot(x, y), lim = cx - 10; if (m > lim) { x *= lim / m; y *= lim / m; }
      c.fillStyle = col; c.beginPath(); c.arc(cx + x, cx + y, r, 0, TAU); c.fill();
    };
    for (const e of G.ents) { if (!e.alive) continue; if (e.kind === 'bandit') dot(e.pos, e.onTail ? '#ffff40' : '#ff5070', e.onTail ? 6 : 4); else if (e.cat === 'part' && e.hp < 900) dot(e.pos, '#ff9a40', 5); }
    for (const wm of G.wing) if (wm.state === 'ok') dot(wm.pos, wm.chaser && wm.chaser.alive ? '#ffffff' : '#60d0ff', 4);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx, cx - 8); c.lineTo(cx + 6, cx + 6); c.lineTo(cx - 6, cx + 6); c.closePath(); c.fill();
  },
};
