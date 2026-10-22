// ===== 09_hud.js — radio comms and the canvas HUD =====
const Comms = {
  queue: [], cur: null, t: 0, used: new Set(), shown: 0, lastBlip: 0,
  el: null, nameEl: null, textEl: null, ctx: null,
  init() {
    this.el = document.getElementById('comms'); this.nameEl = this.el.querySelector('.cname'); this.textEl = this.el.querySelector('.ctext');
    this.ctx = document.getElementById('portrait').getContext('2d');
  },
  say(who, text, dur = 3, tag = null, priority = false) {
    if (tag) { if (this.used.has(tag)) return; this.used.add(tag); }
    const m = { who, text, dur };
    if (priority) this.queue.unshift(m); else this.queue.push(m);
    if (this.queue.length > 5) this.queue.length = 5;
  },
  update(dt) {
    if (!this.cur && this.queue.length) { this.cur = this.queue.shift(); this.t = 0; this.shown = 0; this.nameEl.textContent = CAST[this.cur.who].name; this.el.classList.add('show'); Audio_.setDuck(0.6); }
    if (!this.cur) return;
    this.t += dt;
    const c = this.cur, n = Math.min(c.text.length, Math.floor(this.t * 48));
    if (n !== this.shown) { this.shown = n; this.textEl.textContent = c.text.slice(0, n); if (n < c.text.length && c.text[n - 1] !== ' ') Audio_.voice(c.who); }
    const talking = n < c.text.length;
    drawPortrait(this.ctx, c.who, talking, this.t, this.t < 0.18 ? 1 - this.t / 0.18 : 0);
    if (this.t > c.dur + c.text.length / 48) { this.cur = null; if (!this.queue.length) { this.el.classList.remove('show'); Audio_.setDuck(1); } }
  },
  skip() { if (this.cur) this.t = 999; },
  clear() { this.queue.length = 0; this.cur = null; this.el.classList.remove('show'); Audio_.setDuck(1); },
};

const HUD = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1, popups: [], toasts: [], bossBar: null, behindWarn: 0, damageFlash: 0, whiteFlash: 0,
  reticleNdc: V3(), bannerT: 0, hintT: 0, visible: false, usedActions: new Set(), lockSpin: 0,
  init() { this.cv = document.getElementById('hud'); this.ctx = this.cv.getContext('2d'); this.resize(); this.bannerEl = document.getElementById('banner'); this.hintEl = document.getElementById('hint'); },
  resize() { this.dpr = Math.min(devicePixelRatio, 2); this.W = this.cv.width = innerWidth * this.dpr; this.H = this.cv.height = innerHeight * this.dpr; },
  banner(text, sub = '', dur = 2) { this.bannerEl.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; this.bannerEl.classList.add('show'); this.bannerT = dur; },
  hint(html, dur = 5) { this.hintEl.innerHTML = html; this.hintEl.classList.add('show'); this.hintT = dur; },
  toast(text) { this.toasts.push({ text, t: 0 }); if (this.toasts.length > 3) this.toasts.shift(); },
  popup(text, pos, col = '#ffd23f') { this.popups.push({ text, pos: pos.clone(), t: 0, col }); },
  used(a) { this.usedActions.add(a); },
  clearAll() { this.popups.length = 0; this.toasts.length = 0; this.bossBar = null; this.bannerEl.classList.remove('show'); this.hintEl.classList.remove('show'); this.damageFlash = 0; this.whiteFlash = 0; },
  update(dt) {
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.bannerEl.classList.remove('show'); }
    if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.hintEl.classList.remove('show'); }
    this.behindWarn = Math.max(0, this.behindWarn - dt); this.damageFlash = Math.max(0, this.damageFlash - dt * 2.5); this.whiteFlash = Math.max(0, this.whiteFlash - dt * 0.7);
    for (const p of this.popups) p.t += dt; this.popups = this.popups.filter(p => p.t < 1.2);
    for (const t of this.toasts) t.t += dt; this.toasts = this.toasts.filter(t => t.t < 2.4);
    this.lockSpin += dt * 3;
  },
  // ----- drawing helpers -----
  s(v) { return v * this.H / 1000 * Settings.hudScale; },
  text(str, x, y, size, col = '#fff', align = 'left', font = 'Russo One') {
    const c = this.ctx; c.font = `${this.s(size)}px "${font}", sans-serif`; c.textAlign = align; c.textBaseline = 'middle';
    c.lineWidth = this.s(size) * 0.18; c.strokeStyle = 'rgba(0,0,12,.85)'; c.strokeText(str, x, y); c.fillStyle = col; c.fillText(str, x, y);
  },
  bar(x, y, w, h, frac, col, back = 'rgba(0,0,0,.55)') {
    const c = this.ctx; c.fillStyle = back; this.round(x, y, w, h, h / 2); c.fill();
    c.fillStyle = col; if (frac > 0) { this.round(x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2); c.fill(); }
    c.lineWidth = this.s(2.5); c.strokeStyle = 'rgba(255,255,255,.7)'; this.round(x, y, w, h, h / 2); c.stroke();
  },
  round(x, y, w, h, r) { const c = this.ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
  toScreen(p, out = { x: 0, y: 0, z: 0 }) { _v1.copy(p).project(Gfx.camera); out.x = (_v1.x * 0.5 + 0.5) * this.W; out.y = (-_v1.y * 0.5 + 0.5) * this.H; out.z = _v1.z; out.ndcX = _v1.x; out.ndcY = _v1.y; return out; },
  draw() {
    const c = this.ctx, W = this.W, H = this.H, s = v => this.s(v);
    c.clearRect(0, 0, W, H);
    if (!this.visible) return;
    const P = Player, m = s(50);
    // boost speed lines
    if (P.boosting && !P.dead) { c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = s(2); for (let i = 0; i < 26; i++) { const a = rand(0, TAU), r0 = rand(0.35, 0.5) * H, r1 = r0 + rand(0.1, 0.25) * H; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); c.stroke(); } }
    // reticles
    if (!P.dead && (Game.state === 'playing' || Game.state === 'attract')) {
      const near = this.toScreen(_v2.copy(P.pos).addScaledVector(P.fwd, 30)), far = this.toScreen(_v3.copy(P.pos).addScaledVector(P.fwd, 80));
      this.reticleNdc.set(far.ndcX, far.ndcY, 0);
      c.lineWidth = s(3.5); c.strokeStyle = P.charge >= 1 ? '#6dff9a' : 'rgba(120,255,160,.95)';
      if (near.z < 1) { const r = s(26); c.strokeRect(near.x - r, near.y - r, r * 2, r * 2); }
      if (far.z < 1) {
        const r = s(15); c.strokeRect(far.x - r, far.y - r, r * 2, r * 2);
        c.beginPath(); c.moveTo(far.x - r * 1.6, far.y); c.lineTo(far.x - r * 0.6, far.y); c.moveTo(far.x + r * 0.6, far.y); c.lineTo(far.x + r * 1.6, far.y); c.stroke();
        if (P.charge > 0) { c.strokeStyle = P.charge >= 1 ? '#7dffb0' : 'rgba(255,255,255,.8)'; c.lineWidth = s(5); c.beginPath(); c.arc(far.x, far.y, s(32), -Math.PI / 2, -Math.PI / 2 + TAU * P.charge); c.stroke(); }
      }
      if (P.lockTarget && P.lockTarget.alive) {
        const t = this.toScreen(P.lockTarget.pos);
        if (t.z < 1) { c.save(); c.translate(t.x, t.y); c.rotate(this.lockSpin); c.strokeStyle = '#ff4060'; c.lineWidth = s(4); const r = s(30); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(r, -r * 0.4); c.lineTo(r, -r); c.lineTo(r * 0.4, -r); c.stroke(); } c.restore(); this.text('LOCK', t.x, t.y + s(46), 16, '#ff6080', 'center'); }
      }
      // chased wingman indicator
      for (const w of Wingmen.list) if (w.state === 'chased') {
        const t = this.toScreen(w.pos);
        if (t.z < 1 && t.x > 0 && t.x < W && t.y > 0 && t.y < H) { c.strokeStyle = '#5dff8f'; c.lineWidth = s(3); c.beginPath(); c.arc(t.x, t.y, s(34), 0, TAU); c.stroke(); this.text(CAST[w.id].name + ' NEEDS HELP', t.x, t.y - s(50), 17, '#5dff8f', 'center'); }
        else this.edgeArrow(t, '#5dff8f', CAST[w.id].name);
      }
      if (Game.mode === 'allrange' && Boss.active && Boss.phase !== 'intro') { const t = this.toScreen(Boss.group.position); if (!(t.z < 1 && t.x > 0 && t.x < W && t.y > 0 && t.y < H)) this.edgeArrow(t, '#c080ff', 'BOSS'); }
    }
    // popups
    for (const p of this.popups) { const t = this.toScreen(p.pos); if (t.z < 1) { c.globalAlpha = 1 - p.t / 1.2; this.text(p.text, t.x, t.y - s(40 + p.t * 60), 30, p.col, 'center'); c.globalAlpha = 1; } }
    // --- top-left: shield, gold rings, lives, bombs
    const sw = s(300) * (P.maxShield / 100);
    this.text('SHIELD', m, m, 18, '#9fd8ff');
    const frac = P.shield / P.maxShield;
    this.bar(m, m + s(18), sw, s(24), frac, frac > 0.5 ? '#3fd0ff' : frac > 0.25 ? '#ffd23f' : (Math.floor(Game.t * 6) % 2 ? '#ff4d5e' : '#a02030'));
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(m + s(16) + i * s(34), m + s(70), s(12), 0, TAU); c.lineWidth = s(4); c.strokeStyle = i < P.goldRings ? '#ffc22a' : 'rgba(255,255,255,.3)'; c.stroke(); }
    this.text(`✈ × ${P.lives}`, m + s(120), m + s(70), 22, '#fff');
    for (let i = 0; i < Math.min(P.bombs, 9); i++) { c.fillStyle = '#ff5a7a'; c.beginPath(); c.arc(m + s(14) + i * s(28), m + s(108), s(10), 0, TAU); c.fill(); c.strokeStyle = '#300'; c.lineWidth = s(2); c.stroke(); }
    this.text('BOMBS', m + Math.max(3, Math.min(P.bombs, 9)) * s(28) + s(10), m + s(108), 14, '#ffb0c0');
    // --- top-right: hits & score
    this.text('HITS', W - m, m, 18, '#ffd23f', 'right');
    this.text(String(Game.hits).padStart(3, '0'), W - m, m + s(46), 54, '#fff', 'right');
    this.text(`SCORE ${Game.score.toLocaleString()}`, W - m, m + s(94), 18, '#cfe0ff', 'right');
    // --- bottom-left: boost meter, laser, wings
    const by = H - m - s(26);
    this.text(P.meterLock ? 'COOLING' : 'BOOST', m, by - s(24), 18, P.meterLock ? '#ff8a6a' : '#9fffc0');
    this.bar(m, by, s(260), s(22), P.meter, P.meterLock ? '#ff6a4a' : '#5dff8f');
    const lv = ['SINGLE', 'TWIN', 'HYPER'][P.laser];
    this.text(`LASER  ${lv}`, m, by - s(64), 18, ['#9fffc0', '#5dff8f', '#7fb8ff'][P.laser]);
    const wcol = n => n >= 3 ? '#5dff8f' : n > 0 ? '#ffd23f' : '#ff4d5e';
    c.fillStyle = wcol(P.wings.L); c.beginPath(); c.moveTo(m + s(250), by - s(64)); c.lineTo(m + s(210), by - s(56)); c.lineTo(m + s(250), by - s(72)); c.fill();
    c.fillStyle = wcol(P.wings.R); c.beginPath(); c.moveTo(m + s(260), by - s(64)); c.lineTo(m + s(300), by - s(56)); c.lineTo(m + s(260), by - s(72)); c.fill();
    // --- bottom-right: wingmen
    Wingmen.list.forEach((w, i) => {
      const x = W - m - s(230), y = H - m - s(26) - (2 - i) * s(46);
      this.text(CAST[w.id].name, x, y, 18, w.active ? '#fff' : '#778', 'left');
      if (w.active && w.state !== 'leaving') this.bar(x + s(90), y - s(9), s(140), s(18), w.hp / 100, w.state === 'chased' ? (Math.floor(Game.t * 6) % 2 ? '#ffd23f' : '#ff4d5e') : '#5dff8f');
      else this.text('OUT', x + s(90), y, 18, '#ff6070');
    });
    // --- top-centre: boss bar or route progress
    if (this.bossBar && this.bossBar.show) {
      const bw = s(560); this.text(this.bossBar.name, W / 2, m, 18, '#ff9ab0', 'center');
      this.bar(W / 2 - bw / 2, m + s(18), bw, s(20), this.bossBar.frac(), '#ff4d7a');
    } else if (Game.mode === 'rail' && Game.state === 'playing') {
      const bw = s(420), x0 = W / 2 - bw / 2, y0 = m + s(4);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x0, y0, bw, s(6));
      c.fillStyle = '#9fd8ff'; c.fillRect(x0, y0, bw * clamp(Game.d / L.ALLRANGE, 0, 1), s(6));
      for (const [d, col] of [[L.CHECK, '#5dff8f'], [L.BRANCH, '#ffb030'], [L.ALLRANGE, '#ff4d7a']]) { c.fillStyle = col; c.fillRect(x0 + bw * d / L.ALLRANGE - s(3), y0 - s(6), s(6), s(18)); }
      if (Game.d > L.GATES[0] - 200 && Game.d < L.BRANCH) { const n = World.gates.filter(g => g.passed).length; this.text(`GATES ${n}/5`, W / 2, y0 + s(34), 18, n === 5 ? '#ffd23f' : '#ffb070', 'center'); }
    }
    // radar in all-range mode
    if (Game.mode === 'allrange' && (Game.state === 'playing' || Game.state === 'attract')) this.radar(W / 2, H - m - s(110), s(95));
    // enemy behind warning
    if (this.behindWarn > 0 && Game.state === 'playing') { const a = 0.6 + Math.sin(Game.t * 14) * 0.4; c.globalAlpha = a; this.text('▼  ENEMY BEHIND  ▼', W / 2, H - m - s(250), 26, '#ff5060', 'center'); c.globalAlpha = 1; }
    // toasts
    this.toasts.forEach((t, i) => { c.globalAlpha = clamp((2.4 - t.t) * 3, 0, 1); this.text(t.text, W / 2, H * 0.68 - i * s(36), 22, '#fff', 'center', 'Rajdhani'); c.globalAlpha = 1; });
    // vignettes
    if (this.damageFlash > 0) { const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9); g.addColorStop(0, 'rgba(255,0,30,0)'); g.addColorStop(1, `rgba(255,0,30,${this.damageFlash * 0.55})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    if (this.whiteFlash > 0) { c.fillStyle = `rgba(255,255,255,${this.whiteFlash})`; c.fillRect(0, 0, W, H); }
  },
  edgeArrow(t, col, label) {
    const c = this.ctx, W = this.W, H = this.H;
    let dx = t.ndcX, dy = -t.ndcY; if (t.z > 1) { dx = -dx; dy = -dy; }
    const a = Math.atan2(dy, dx), r = Math.min(W, H) * 0.42;
    const x = W / 2 + Math.cos(a) * r * (W / H > 1 ? W / H * 0.9 : 1), y = H / 2 + Math.sin(a) * r;
    const cx = clamp(x, this.s(60), W - this.s(60)), cy = clamp(y, this.s(60), H - this.s(60));
    c.save(); c.translate(cx, cy); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(this.s(26), 0); c.lineTo(-this.s(10), -this.s(16)); c.lineTo(-this.s(10), this.s(16)); c.fill(); c.restore();
    this.text(label, cx, cy + this.s(32), 15, col, 'center');
  },
  radar(cx, cy, R) {
    const c = this.ctx, P = Player;
    c.fillStyle = 'rgba(0,20,30,.55)'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(120,255,200,.6)'; c.lineWidth = this.s(2.5); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 0.5, 0, TAU); c.strokeStyle = 'rgba(120,255,200,.25)'; c.stroke();
    const scale = R / 520, yaw = P.yaw;
    const plot = (p, col, sz) => {
      let dx = p.x - P.pos.x, dz = p.z - P.pos.z;
      const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw), rz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      let x = rx * scale, y = rz * scale; const l = Math.hypot(x, y); if (l > R - 4) { x *= (R - 4) / l; y *= (R - 4) / l; }
      c.fillStyle = col; c.beginPath(); c.arc(cx + x, cy + y, sz, 0, TAU); c.fill();
    };
    // arena boundary
    c.strokeStyle = 'rgba(255,80,80,.35)'; c.beginPath();
    for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU; const p = _v2.set(L.ARENA.x + Math.cos(a) * L.ARENA_R, 0, L.ARENA.z + Math.sin(a) * L.ARENA_R); let dx = p.x - P.pos.x, dz = p.z - P.pos.z; const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw), rz = dx * Math.sin(yaw) + dz * Math.cos(yaw); const x = clamp(rx * scale, -R, R), y = clamp(rz * scale, -R, R); if (Math.hypot(x, y) < R) { i === 0 ? c.moveTo(cx + x, cy + y) : c.lineTo(cx + x, cy + y); } }
    c.stroke();
    if (Boss.active) plot(Boss.group.position, '#c080ff', this.s(9));
    for (const e of Enemies.list) if (e.alive && !e.boss) plot(e.pos, e.type === 'missile' ? '#ffb030' : '#ff4d5e', this.s(4.5));
    for (const w of Wingmen.list) if (w.active) plot(w.pos, '#5dff8f', this.s(5));
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx, cy - this.s(9)); c.lineTo(cx - this.s(6), cy + this.s(7)); c.lineTo(cx + this.s(6), cy + this.s(7)); c.fill();
  },
};
