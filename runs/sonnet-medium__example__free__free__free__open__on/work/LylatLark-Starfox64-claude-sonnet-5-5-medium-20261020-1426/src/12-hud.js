'use strict';
/* ===== HUD: DOM panels + canvas overlay (reticle, lock-ons, wingman alerts), comms with drawn portraits ===== */
function drawPortrait(c, who, talk, t) {
  const d = CAST[who] || CAST.lark, w = c.canvas.width, h = c.canvas.height, k = w / 100;
  c.clearRect(0, 0, w, h); c.save(); c.scale(k, k);
  const bg = c.createLinearGradient(0, 0, 0, 100); bg.addColorStop(0, '#16202f'); bg.addColorStop(1, '#0a0f18'); c.fillStyle = bg; c.fillRect(0, 0, 100, 100);
  c.fillStyle = d.col + '33'; c.beginPath(); c.arc(50, 58, 46, 0, TAU); c.fill();
  const sp = d.species, skin = d.skin, dark = '#1a1a22';
  const ell = (x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
  const tri = (a, b, cc, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...cc); c.closePath(); c.fill(); };
  const m = talk ? 3 + Math.abs(Math.sin(t * 18)) * 5 : 1.2;
  // shoulders / suit
  ell(50, 104, 38, 22, d.col); ell(50, 104, 38, 22, 'rgba(0,0,0,.25)'); c.fillStyle = d.col; c.fillRect(38, 80, 24, 12);
  if (sp === 'hare') { ell(34, 22, 7, 26, skin); ell(66, 22, 7, 26, skin); ell(34, 24, 3.5, 20, '#e8a0b0'); ell(66, 24, 3.5, 20, '#e8a0b0'); }
  if (sp === 'owl') { tri([26, 36], [32, 10], [44, 30], skin); tri([74, 36], [68, 10], [56, 30], skin); }
  if (sp === 'frog') { }
  ell(50, 56, sp === 'frog' ? 34 : 30, sp === 'frog' ? 26 : 30, skin);
  if (sp === 'owl') { ell(38, 52, 13, 13, '#f0e6c8'); ell(62, 52, 13, 13, '#f0e6c8'); ell(38, 52, 6, 6, '#e8b020'); ell(62, 52, 6, 6, '#e8b020'); ell(38, 52, 3, 3, dark); ell(62, 52, 3, 3, dark); tri([50, 56], [44, 64 + m * 0.3], [56, 64 + m * 0.3], '#e8a030'); }
  else if (sp === 'frog') { ell(32, 36, 11, 11, skin); ell(68, 36, 11, 11, skin); ell(32, 36, 7, 7, '#fff'); ell(68, 36, 7, 7, '#fff'); ell(33, 37, 3.5, 3.5, dark); ell(67, 37, 3.5, 3.5, dark); c.fillStyle = '#1d5a2a'; c.beginPath(); c.ellipse(50, 68, 20, m + 1, 0, 0, TAU); c.fill(); ell(24, 60, 3, 2, '#3a8a3a'); ell(76, 60, 3, 2, '#3a8a3a'); }
  else if (sp === 'hare') { ell(40, 52, 5, 6, '#fff'); ell(60, 52, 5, 6, '#fff'); ell(41, 53, 2.6, 3, dark); ell(59, 53, 2.6, 3, dark); ell(50, 62, 4, 3, '#e07a90'); c.fillStyle = '#4a2a2a'; c.beginPath(); c.ellipse(50, 70, 8, m * 0.8 + 0.6, 0, 0, TAU); c.fill(); c.strokeStyle = '#fff8'; c.lineWidth = 0.8; for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(50 + s * 6, 64 + i * 2); c.lineTo(50 + s * 22, 61 + i * 6); c.stroke(); } }
  else if (sp === 'hawk') { ell(39, 50, 6, 5, '#fff'); ell(61, 50, 6, 5, '#fff'); ell(40, 51, 3, 3.4, '#c8b000'); ell(60, 51, 3, 3.4, '#c8b000'); ell(40, 51, 1.4, 2.6, dark); ell(60, 51, 1.4, 2.6, dark); tri([26, 40], [46, 48], [26, 48], dark); tri([74, 40], [54, 48], [74, 48], dark); tri([42, 58], [58, 58], [50, 74 + m * 0.4], '#e8b020'); c.fillStyle = '#c23b3b'; c.fillRect(22, 30, 56, 5); }
  else if (sp === 'crow') { ell(40, 50, 5, 4, '#ff2a4a'); ell(60, 50, 5, 4, '#ff2a4a'); tri([24, 38], [46, 50], [24, 48], '#000'); tri([76, 38], [54, 50], [76, 48], '#000'); tri([41, 56], [59, 56], [50, 82 + m * 0.5], '#444'); c.strokeStyle = '#ff2a4a55'; for (let y = 0; y < 100; y += 6) { c.beginPath(); c.moveTo(0, y + (t * 40) % 6); c.lineTo(100, y + (t * 40) % 6); c.stroke(); } }
  else { /* lark */ ell(40, 52, 5, 5.5, '#fff'); ell(60, 52, 5, 5.5, '#fff'); ell(41, 53, 2.6, 3, dark); ell(59, 53, 2.6, 3, dark); tri([43, 58], [57, 58], [50, 70 + m * 0.5], '#f0b030'); ell(50, 30, 13, 8, '#ffc23a'); tri([44, 24], [50, 10], [56, 24], '#ffc23a'); }
  // headset / visor for pilots
  if (sp !== 'crow' && sp !== 'owl') { c.strokeStyle = '#bfc8d8'; c.lineWidth = 2.2; c.beginPath(); c.arc(50, 52, 33, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); ell(18, 58, 4, 7, '#bfc8d8'); ell(82, 58, 4, 7, '#bfc8d8'); }
  if (sp === 'owl') { c.fillStyle = '#334'; c.fillRect(20, 80, 60, 6); }
  c.restore();
  c.strokeStyle = d.col; c.lineWidth = 3; c.strokeRect(1.5, 1.5, w - 3, h - 3);
}

const HUD = {
  root: null, cv: null, cx: null, cache: {}, commQ: [], commCur: null, commT: 0, typed: 0, toasts: [], tutOn: false, portraitT: 0, hurtT: 0, bannerT: 0,
  init(root) {
    this.root = root;
    root.innerHTML = `
      <canvas id="hudc"></canvas>
      <div class="hud-tl"><div class="lbl">SHIELD</div><div class="shield"><i></i><b id="shv">100</b></div><div class="row"><span id="lives"></span><span id="bombs"></span><span id="laser"></span></div><div id="wing"></div></div>
      <div class="hud-tr"><div class="hits"><span class="lbl">HITS</span><b id="hits">0</b></div><div class="score"><span class="lbl">SCORE</span><b id="score">0</b></div><div id="chain"></div></div>
      <div class="hud-bc"><div class="boost"><i></i></div><div class="lbl"><span id="boostl">BOOST</span></div></div>
      <div class="hud-br"><div class="squad"><i></i></div><div class="lbl" id="squadl">SQUAD CALL</div></div>
      <div class="hud-bl comm" id="comm"><canvas width="160" height="160"></canvas><div class="ct"><div class="cn"></div><div class="cx"></div></div></div>
      <div id="bossbar"><div class="bn"></div><div class="bb"><i></i></div></div>
      <div id="tut"></div><div id="banner"><b></b><span></span></div><div id="toasts"></div>
      <div id="warn">SHIELD CRITICAL</div><div id="vig"></div><div id="demotag">DEMO · PRESS ANY BUTTON</div><div id="dbg"></div>`;
    this.cv = $('#hudc', root); this.cx = this.cv.getContext('2d');
    this.pcx = $('#comm canvas', root).getContext('2d');
    addEventListener('resize', () => this.resize()); this.resize();
    this.fade = $('#fade');
  },
  resize() { this.cv.width = innerWidth; this.cv.height = innerHeight; },
  show(v) { this.root.classList.toggle('on', !!v); if (!v) { this.root.querySelector('#demotag').style.display = 'none'; } },
  reset() { this.commQ = []; this.commCur = null; $('#comm', this.root).classList.remove('show'); this.tut(null); this.bossBar(null); this.cache = {}; $('#toasts', this.root).innerHTML = ''; $('#demotag', this.root).style.display = Game.attract ? 'block' : 'none'; this.root.style.setProperty('--hs', Settings.hudScale); },
  hurt() { this.hurtT = 0.5; },
  dummyHit() {},
  fadeOut(cb) { this.fade.classList.add('on'); setTimeout(() => { cb(); setTimeout(() => this.fade.classList.remove('on'), 150); }, 520); },
  glyphHtml(text) { return text.replace(/\{(\w+)\}/g, (m, a) => `<b class="gl">${Input.glyph(a)}</b>`); },
  tut(text, done) {
    const e = $('#tut', this.root);
    if (!text) { e.className = ''; e.innerHTML = ''; this.tutOn = false; return; }
    this.tutText = text; this.tutDone = !!done; e.className = 'on' + (done ? ' done' : ''); e.innerHTML = (done ? '<span class="ck">✓</span>' : '') + this.glyphHtml(text); this.tutOn = true;
  },
  comm(who, text, dur, prio) {
    if (Game.attract && Math.random() < 0) return;
    const m = { who, text, dur: Math.max(dur, 1.4 + text.length * 0.04) };
    if (prio) { this.commQ = []; this.commCur = null; }
    if (this.commQ.length < 4) this.commQ.push(m);
  },
  toast(text) {
    const d = el('div', 'toast', text); $('#toasts', this.root).appendChild(d); setTimeout(() => d.remove(), 2200);
    while ($('#toasts', this.root).children.length > 3) $('#toasts', this.root).firstChild.remove();
  },
  banner(text, sub) { const b = $('#banner', this.root); b.classList.remove('on'); void b.offsetWidth; $('b', b).textContent = text; $('span', b).textContent = sub || ''; b.classList.add('on'); b.classList.toggle('warn', text === 'WARNING'); },
  bossBar(name, frac) {
    const b = $('#bossbar', this.root);
    if (!name) { b.classList.remove('on'); return; }
    b.classList.add('on'); $('.bn', b).textContent = name; $('i', b).style.width = Math.max(0, frac * 100).toFixed(1) + '%';
  },
  set(id, html) { if (this.cache[id] !== html) { this.cache[id] = html; $('#' + id, this.root).innerHTML = html; } },
  update(g, dt) {
    if (!this.root.classList.contains('on')) return;
    const P = g.P; if (!P) return; const R = this.root;
    const frac = clamp(P.shield / P.maxShield, 0, 1), sh = $('.shield i', R); sh.style.width = (frac * 100) + '%';
    sh.style.background = frac > 0.5 ? 'linear-gradient(90deg,#3adf8a,#8cffc0)' : frac > 0.25 ? 'linear-gradient(90deg,#e8b020,#ffe070)' : 'linear-gradient(90deg,#e03a3a,#ff8a6a)';
    $('.shield', R).style.width = (14 * P.maxShield / 100) + 'rem';
    this.set('shv', Math.max(0, Math.ceil(P.shield)));
    this.set('lives', '<span class="ic">▲</span>×' + Math.max(0, P.lives));
    this.set('bombs', '<span class="ic b">●</span>×' + P.bombs);
    this.set('laser', ['LASER', 'TWIN', 'HYPER'][P.laser - 1]);
    this.set('hits', P.hits); this.set('score', pad(P.score, 7));
    this.set('chain', P.chain >= 3 ? 'CHAIN ×' + P.chain : '');
    $('.boost i', R).style.width = (P.boost * 100) + '%'; $('.boost', R).classList.toggle('cd', P.boostCd > 0);
    this.set('boostl', P.boostCd > 0 ? 'OVERHEAT' : 'BOOST ' + Input.glyph('boost') + ' · BRAKE ' + Input.glyph('brake'));
    $('.squad i', R).style.width = (P.squad * 100) + '%'; $('.squad', R).classList.toggle('full', P.squad >= 1);
    this.set('squadl', P.squad >= 1 ? '<b class="gl">' + Input.glyph('squad') + '</b> SQUAD CALL READY' : 'SQUAD CALL');
    // wingmen
    this.set('wing', g.wingmen.map((w) => { const c = CAST[w.id]; return `<div class="wm ${w.alive ? '' : 'lost'} ${w.chased && w.alive ? 'chased' : ''}"><span style="color:${c.col}">${c.name}</span><i><u style="width:${w.alive ? clamp(w.hp / w.maxhp, 0, 1) * 100 : 0}%;background:${c.col}"></u></i></div>`; }).join(''));
    $('#warn', R).style.display = (P.shield < P.maxShield * 0.28 && P.alive && g.state === 'play') ? 'block' : 'none';
    this.hurtT = Math.max(0, this.hurtT - dt); $('#vig', R).style.opacity = Math.min(1, this.hurtT * 2) * 0.9 + (P.shield < P.maxShield * 0.28 && P.alive ? 0.25 + 0.15 * Math.sin(g.time * 8) : 0);
    // tutorial glyph refresh when device changes
    if (this.tutOn && this.tutGl !== Input.last) { this.tutGl = Input.last; this.tut(this.tutText, this.tutDone); }
    this.updateComm(dt);
    if (g.debug) $('#dbg', R).textContent = `prog ${g.progress.toFixed(0)}  ent ${g.enemies.length}  eb ${g.eb.length}  state ${g.state}  god ${g.god}`; else $('#dbg', R).textContent = '';
    this.draw(g);
  },
  updateComm(dt) {
    const box = $('#comm', this.root);
    if (!this.commCur && this.commQ.length) {
      this.commCur = this.commQ.shift(); this.commT = 0; this.typed = 0; const c = CAST[this.commCur.who] || CAST.lark;
      $('.cn', box).innerHTML = `<b style="color:${c.col}">${c.name}</b><span>${c.role}</span>`; box.style.setProperty('--cc', c.col); box.classList.add('show'); box.classList.toggle('enemy', this.commCur.who === 'gloam');
    }
    const cur = this.commCur;
    if (cur) {
      this.commT += dt; const prev = Math.floor(this.typed); this.typed = Math.min(cur.text.length, this.typed + dt * 42); const n = Math.floor(this.typed);
      if (n > prev && n % 2 === 0) Audio.voice((CAST[cur.who] || CAST.lark).pitch);
      $('.cx', box).textContent = cur.text.slice(0, n);
      drawPortrait(this.pcx, cur.who, n < cur.text.length, this.commT);
      if (this.commT > cur.dur) { this.commCur = null; if (!this.commQ.length) box.classList.remove('show'); }
    }
  },
  draw(g) {
    const c = this.cx, W = this.cv.width, H = this.cv.height; c.clearRect(0, 0, W, H);
    const P = g.P, cam = World.camera; if (!P || !P.alive || g.state === 'dead') return;
    const proj = (x, y, z) => { _v.set(x, y, z).project(cam); return { x: (_v.x * 0.5 + 0.5) * W, y: (-_v.y * 0.5 + 0.5) * H, v: _v.z < 1 }; };
    const u = H / 1080, tt = g.time;
    // reticles
    const far = proj(P.ox, P.oy, g.pz - 100), near = proj(P.ox, P.oy, g.pz - 45);
    const lk = P.charge > 0; const col = lk ? '#ffd24a' : '#7dffb0';
    const br = (x, y, s) => { c.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.moveTo(x + sx * s, y + sy * s * 0.5); c.lineTo(x + sx * s, y + sy * s); c.lineTo(x + sx * s * 0.5, y + sy * s); } c.stroke(); };
    const cross = (x, y, s) => { c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke(); };
    const dual = (fn) => { c.strokeStyle = 'rgba(0,10,20,.75)'; c.lineWidth = 7 * u; fn(); c.strokeStyle = col; c.lineWidth = 3 * u; fn(); };
    dual(() => { br(far.x, far.y, 34 * u); br(near.x, near.y, 15 * u); cross(far.x, far.y, 7 * u); });
    if (P.charge > 0) { c.strokeStyle = '#ffe9a0'; c.lineWidth = 5 * u; c.beginPath(); c.arc(far.x, far.y, 52 * u, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, P.charge / 1.5)); c.stroke(); c.lineWidth = 2 * u; c.globalAlpha = 0.5; c.beginPath(); c.arc(far.x, far.y, 0.36 * H * 0.5, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    // lock markers
    c.shadowBlur = 0;
    P.locks.forEach((e, i) => {
      if (!e.alive) return; const p = proj(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z); if (!p.v) return;
      const s = (34 + Math.sin(tt * 14 + i) * 3) * u; c.strokeStyle = '#ff5a4a'; c.lineWidth = 3.5 * u; c.save(); c.translate(p.x, p.y); c.rotate(tt * 2);
      c.beginPath(); c.rect(-s, -s, s * 2, s * 2); c.stroke(); c.restore();
      c.fillStyle = '#ff5a4a'; c.font = `bold ${22 * u}px sans-serif`; c.textAlign = 'center'; c.fillText(i + 1, p.x, p.y - s - 8 * u);
    });
    // wingman alerts + chasers
    for (const w of g.wingmen) if (w.alive && w.chased) {
      const p = proj(w.pos.x, w.pos.y + 3, w.pos.z); if (!p.v) continue; const a = 0.6 + 0.4 * Math.sin(tt * 10);
      c.fillStyle = `rgba(255,80,70,${a})`; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 14 * u, p.y - 26 * u); c.lineTo(p.x + 14 * u, p.y - 26 * u); c.closePath(); c.fill();
      c.font = `bold ${20 * u}px sans-serif`; c.textAlign = 'center'; c.lineWidth = 4 * u; c.strokeStyle = '#000'; c.strokeText(CAST[w.id].name + ' NEEDS HELP', p.x, p.y - 34 * u); c.fillStyle = '#ff7a6a'; c.fillText(CAST[w.id].name + ' NEEDS HELP', p.x, p.y - 34 * u);
    }
    for (const e of g.enemies) if (e.alive && e.kind === 'chaser') {
      const p = proj(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z); if (!p.v) continue; c.strokeStyle = '#ff5a4a'; c.lineWidth = 2.5 * u; br(p.x, p.y, 24 * u);
    }
    // boss part markers (where to shoot)
    if (g.boss && !g.boss.dying) for (const e of g.boss.parts) if (e.alive && !e.invuln && !e.hide) {
      const p = proj(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z); if (!p.v) continue;
      c.strokeStyle = 'rgba(255,200,80,.85)'; c.lineWidth = 2.5 * u; br(p.x, p.y, 30 * u);
      c.fillStyle = '#ffd24a'; c.fillRect(p.x - 30 * u, p.y + 38 * u, 60 * u * (e.hp / e.maxhp), 5 * u);
    }
    // dummy hints during training
    if (g.tut && g.tut.id === 'charge') for (const e of g.enemies) if (e.alive && e.kind === 'dummy') { const p = proj(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z); if (p.v) { c.strokeStyle = 'rgba(100,220,255,.6)'; c.lineWidth = 2 * u; br(p.x, p.y, 26 * u); } }
  },
};
