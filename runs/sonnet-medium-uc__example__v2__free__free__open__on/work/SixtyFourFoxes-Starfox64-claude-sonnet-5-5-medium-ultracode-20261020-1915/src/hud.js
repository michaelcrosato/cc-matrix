// DOM HUD: shield, bombs, score, comm box with voice blips, reticle, lock-ons, banners, radar.
import { audio } from './audio.js';
import { input } from './input.js';
import { settings } from './settings.js';
import { ALLIES } from './enemies.js';
import { clamp } from './util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

export function portrait(who) {
  const c = (ALLIES[who] || ALLIES.base).color;
  const faces = {
    kit: `<polygon points="14,40 22,8 40,28" fill="#ff8a3a"/><polygon points="86,40 78,8 60,28" fill="#ff8a3a"/><ellipse cx="50" cy="58" rx="34" ry="30" fill="#ff8a3a"/><path d="M16,62 Q50,98 84,62 Q50,76 16,62Z" fill="#fff"/><circle cx="37" cy="52" r="5" fill="#111"/><circle cx="63" cy="52" r="5" fill="#111"/><ellipse cx="50" cy="68" rx="6" ry="4.5" fill="#111"/>`,
    rook: `<path d="M16,30 L50,6 L84,30 L78,62 Q50,92 22,62Z" fill="#6a8aff"/><path d="M34,56 L50,86 L66,56 Q50,64 34,56Z" fill="#ffd36a"/><circle cx="36" cy="44" r="6" fill="#fff"/><circle cx="64" cy="44" r="6" fill="#fff"/><circle cx="37" cy="45" r="3" fill="#111"/><circle cx="63" cy="45" r="3" fill="#111"/><path d="M42,26 L50,40 L58,26" fill="#2a3a9a"/>`,
    hazel: `<ellipse cx="32" cy="22" rx="9" ry="26" fill="#f0e6dc"/><ellipse cx="68" cy="22" rx="9" ry="26" fill="#f0e6dc"/><ellipse cx="32" cy="24" rx="4" ry="18" fill="#ff7fb0"/><ellipse cx="68" cy="24" rx="4" ry="18" fill="#ff7fb0"/><ellipse cx="50" cy="62" rx="32" ry="28" fill="#f0e6dc"/><circle cx="38" cy="58" r="5" fill="#111"/><circle cx="62" cy="58" r="5" fill="#111"/><ellipse cx="50" cy="70" rx="5" ry="3.5" fill="#ff7fb0"/>`,
    dot: `<ellipse cx="50" cy="60" rx="40" ry="30" fill="#2fb36a"/><circle cx="28" cy="34" r="14" fill="#2fb36a"/><circle cx="72" cy="34" r="14" fill="#2fb36a"/><circle cx="28" cy="34" r="9" fill="#fff"/><circle cx="72" cy="34" r="9" fill="#fff"/><circle cx="29" cy="35" r="4.5" fill="#111"/><circle cx="71" cy="35" r="4.5" fill="#111"/><path d="M24,70 Q50,88 76,70" stroke="#111" stroke-width="3.5" fill="none"/>`,
    base: `<rect x="14" y="14" width="72" height="72" rx="14" fill="#25405f"/><rect x="26" y="34" width="48" height="20" rx="8" fill="#9fe8ff"/><rect x="30" y="64" width="40" height="6" rx="3" fill="#9fe8ff"/>`,
    gen: `<polygon points="12,44 20,6 42,28" fill="#555d73"/><polygon points="88,44 80,6 58,28" fill="#555d73"/><ellipse cx="50" cy="60" rx="34" ry="30" fill="#555d73"/><polygon points="30,50 44,56 30,60" fill="#ff4a4a"/><polygon points="70,50 56,56 70,60" fill="#ff4a4a"/><path d="M34,76 L50,70 L66,76" stroke="#111" stroke-width="4" fill="none"/>`,
  };
  return `<svg viewBox="0 0 100 100" width="100%" height="100%"><rect width="100" height="100" fill="#0b1224"/>${faces[who] || faces.base}<rect width="100" height="100" fill="none" stroke="${c}" stroke-width="3"/></svg>`;
}

export class HUD {
  constructor(root) {
    this.root = root = el('div', 'hud hidden'); document.getElementById('ui').appendChild(root);
    root.innerHTML = `
      <div class="top-bar"><div class="progress"><i></i></div></div>
      <div class="tl"><div class="lbl">SHIELD</div><div class="shield"><i></i><b></b></div><div class="subrow"><div class="bombs"></div><div class="laser"></div></div></div>
      <div class="tr"><div class="score">0</div><div class="kills"><span>HITS</span> <b>0</b></div><div class="combo"></div></div>
      <div class="objective"></div><div class="hint hidden"></div>
      <div class="bossbar hidden"><div class="bn"></div><div class="bb"><i></i></div></div>
      <div class="allies"></div>
      <div class="comm hidden"><div class="face"></div><div class="ctext"><div class="cname"></div><div class="cbody"></div></div></div>
      <div class="boostwrap"><div class="boost"><i></i></div><div class="blabel">BOOST</div></div>
      <div class="ret near"></div><div class="ret far"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" class="chg"/><path d="M50 8v22M50 70v22M8 50h22M70 50h22"/></svg></div>
      <div class="locks"></div>
      <div class="fx-flash"></div><div class="vignette"></div>
      <div class="warn hidden"></div><div class="tail hidden">▲ BEHIND YOU ▲</div><div class="arena hidden">RETURN TO COMBAT AREA</div>
      <div class="banner hidden"><div class="b1"></div><div class="b2"></div></div>
      <div class="toast hidden"></div><div class="popups"></div>
      <div class="radarwrap hidden"><canvas width="220" height="220"></canvas><div class="rleft"></div></div>
      <div class="demo hidden"><b>DEMO</b> — press any button to play</div>`;
    const q = (s) => root.querySelector(s);
    this.e = { shield: q('.shield i'), shieldMax: q('.shield b'), bombs: q('.bombs'), laser: q('.laser'), score: q('.score'), kills: q('.kills b'), combo: q('.combo'), obj: q('.objective'), hint: q('.hint'),
      boss: q('.bossbar'), bossN: q('.bn'), bossB: q('.bb i'), allies: q('.allies'), comm: q('.comm'), face: q('.face'), cname: q('.cname'), cbody: q('.cbody'), boost: q('.boost i'), boostWrap: q('.boost'),
      near: q('.ret.near'), far: q('.ret.far'), chg: q('.chg'), locks: q('.locks'), flash: q('.fx-flash'), vig: q('.vignette'), warn: q('.warn'), tail: q('.tail'), arena: q('.arena'),
      banner: q('.banner'), b1: q('.b1'), b2: q('.b2'), toast: q('.toast'), popups: q('.popups'), radarW: q('.radarwrap'), radar: q('.radarwrap canvas'), rleft: q('.rleft'), progress: q('.progress i'), demo: q('.demo') };
    this.lockEls = []; this.commQueue = []; this.cur = null; this.timers = {}; this.state = {}; this.allyKey = '';
  }
  show(on) { this.root.classList.toggle('hidden', !on); }
  setDemo(on) { this.e.demo.classList.toggle('hidden', !on); }
  reset() {
    this.commQueue.length = 0; this.cur = null; this.e.comm.classList.add('hidden'); this.e.hint.classList.add('hidden'); this.e.boss.classList.add('hidden');
    this.e.obj.textContent = ''; this.e.banner.classList.add('hidden'); this.e.toast.classList.add('hidden'); this.allyKey = ''; this.e.allies.innerHTML = '';
    this.e.radarW.classList.add('hidden'); this.e.progress.style.width = '0%'; this.e.locks.innerHTML = ''; this.lockEls = []; this.e.popups.innerHTML = '';
    this.state = {}; this.e.tail.classList.add('hidden'); this.e.arena.classList.add('hidden');
  }
  set(s) {
    const e = this.e, st = this.state;
    const pct = clamp(s.health / s.maxHealth, 0, 1) * 100;
    e.shield.style.width = pct + '%'; e.shield.parentElement.classList.toggle('low', pct < 30);
    e.shieldMax.style.width = (s.maxHealth / 200 * 100) + '%'; e.shield.parentElement.style.width = (s.maxHealth * 2.4) + 'px';
    const bk = 'b' + s.bombs; if (st.bk !== bk) { st.bk = bk; e.bombs.innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="${i < s.bombs ? 'on' : ''}">●</span>`).join('') + '<em>BOMB</em>'; }
    const lk = 'l' + s.laser; if (st.lk !== lk) { st.lk = lk; e.laser.innerHTML = ['SINGLE', 'TWIN', 'HYPER'][s.laser] + ' LASER'; e.laser.dataset.lv = s.laser; }
    if (st.score !== s.score) { st.score = s.score; e.score.textContent = String(s.score).padStart(7, '0'); }
    if (st.kills !== s.kills) { st.kills = s.kills; e.kills.textContent = s.kills; }
    const cb = s.combo >= 3 ? `COMBO ×${(1 + Math.min(20, s.combo) * 0.05).toFixed(2)}` : ''; if (st.cb !== cb) { st.cb = cb; e.combo.textContent = cb; }
    e.boost.style.width = s.boost + '%'; e.boostWrap.classList.toggle('lock', s.boostLock);
    e.chg.style.strokeDashoffset = String(188 * (1 - s.charge)); e.far.classList.toggle('charging', s.charge > 0.1);
  }
  setAllies(list) {
    const key = list.map((a) => a.name + a.state + Math.ceil(a.hp / 10)).join('|');
    if (key === this.allyKey) return; this.allyKey = key;
    this.e.allies.innerHTML = list.map((a) => `<div class="ally ${a.state}" style="--c:${a.color}"><span>${a.name}</span><div class="ab"><i style="width:${a.hp}%"></i></div>${a.state === 'chased' ? '<em>HELP!</em>' : a.state === 'gone' ? '<em>OUT</em>' : ''}</div>`).join('');
  }
  reticle(near, far, charge, alive) {
    const e = this.e; const vis = alive && near.z < 1;
    e.near.style.display = e.far.style.display = vis ? 'block' : 'none';
    const px = (v) => ((v.x * 0.5 + 0.5) * 100) + 'vw', py = (v) => ((-v.y * 0.5 + 0.5) * 100) + 'vh';
    e.near.style.left = px(near); e.near.style.top = py(near); e.far.style.left = px(far); e.far.style.top = py(far);
  }
  locks(marks) {
    while (this.lockEls.length < marks.length) { const d = el('div', 'lock'); this.e.locks.appendChild(d); this.lockEls.push(d); }
    this.lockEls.forEach((d, i) => {
      const m = marks[i]; if (!m) { d.style.display = 'none'; return; }
      d.style.display = 'block'; d.style.left = ((m.x * 0.5 + 0.5) * 100) + 'vw'; d.style.top = ((-m.y * 0.5 + 0.5) * 100) + 'vh';
    });
  }
  objective(t) { this.e.obj.textContent = t ? '◆ ' + t : ''; }
  objectiveCount(n) { this.e.rleft.textContent = n + ' HOSTILES'; }
  progress(f) { this.e.progress.style.width = (f * 100) + '%'; }
  hint(text, keys) {
    const t = text.replace(/\{(\w+)\}/g, (_, k) => `<kbd>${input.glyph(k)}</kbd>`);
    this.e.hint.innerHTML = t; this.e.hint.classList.remove('hidden'); clearTimeout(this.timers.hint); this.timers.hint = setTimeout(() => this.e.hint.classList.add('hidden'), 6500);
  }
  toast(t) { const e = this.e.toast; e.textContent = t; e.classList.remove('hidden'); e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; clearTimeout(this.timers.toast); this.timers.toast = setTimeout(() => e.classList.add('hidden'), 1700); }
  warn(t) { const e = this.e.warn; e.textContent = t; e.classList.remove('hidden'); clearTimeout(this.timers.warn); this.timers.warn = setTimeout(() => e.classList.add('hidden'), 1400); }
  tail(on) { this.e.tail.classList.toggle('hidden', !on); }
  arena(on) { this.e.arena.classList.toggle('hidden', !on); }
  banner(t1, t2, dur = 3) { const b = this.e.banner; this.e.b1.textContent = t1; this.e.b2.textContent = t2 || ''; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(this.timers.banner); this.timers.banner = setTimeout(() => b.classList.add('hidden'), dur * 1000); }
  bossBar(name, f) { const b = this.e.boss; if (name == null) { b.classList.add('hidden'); return; } b.classList.remove('hidden'); this.e.bossN.textContent = name.toUpperCase(); this.e.bossB.style.width = clamp(f, 0, 1) * 100 + '%'; }
  flash(kind) {
    if (settings.reducedFlash && kind === 'bomb') return;
    const e = this.e.flash; e.className = 'fx-flash ' + kind; void e.offsetWidth; e.className = 'fx-flash ' + kind + ' go';
  }
  popup(text, world) {
    if (!world || !this.cam) return;
    const v = world.clone().project(this.cam); if (v.z > 1) return;
    const d = el('div', 'pop', text); d.style.left = ((v.x * 0.5 + 0.5) * 100) + 'vw'; d.style.top = ((-v.y * 0.5 + 0.5) * 100) + 'vh';
    this.e.popups.appendChild(d); setTimeout(() => d.remove(), 900);
  }
  // radio comms
  comm(who, text, dur = 4) {
    if (!settings.subtitles && false) return;
    this.commQueue.push({ who, text, dur }); if (this.commQueue.length > 4) this.commQueue.shift();
  }
  skipComm() { if (this.cur) this.cur.t = this.cur.total + this.cur.dur; }
  updateComm(dt) {
    const e = this.e;
    if (!this.cur) {
      const n = this.commQueue.shift(); if (!n) return;
      const info = ALLIES[n.who] || ALLIES.base;
      this.cur = { ...n, info, t: 0, total: n.text.length / 42, shown: 0, blip: 0 };
      e.face.innerHTML = portrait(n.who); e.cname.textContent = info.name + ' · ' + info.species.toUpperCase(); e.cname.style.color = info.color; e.cbody.textContent = '';
      e.comm.classList.remove('hidden'); e.comm.style.setProperty('--c', info.color); audio.sfx('tick');
    }
    const c = this.cur; c.t += dt;
    const chars = Math.min(c.text.length, Math.floor(c.t * 42));
    if (chars !== c.shown) { c.shown = chars; e.cbody.textContent = c.text.slice(0, chars); if (chars % 2 === 0) audio.voice(c.info.pitch); e.face.firstChild.style.transform = chars % 4 < 2 ? 'scale(1.0)' : 'scale(1.04)'; }
    if (c.t > c.total + c.dur) { e.comm.classList.add('hidden'); this.cur = null; }
  }
  radar(P, enemies, allies, R) {
    const w = this.e.radarW; w.classList.remove('hidden');
    const cv = this.e.radar, g = cv.getContext('2d'), S = cv.width, c = S / 2, rad = c - 6;
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(8,16,36,.72)'; g.beginPath(); g.arc(c, c, rad, 0, 7); g.fill();
    g.strokeStyle = '#9fe8ff'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = 'rgba(159,232,255,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(c, c, rad * 0.5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(c, 6); g.lineTo(c, S - 6); g.moveTo(6, c); g.lineTo(S - 6, c); g.stroke();
    const range = 420; const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw);
    const plot = (pos, col, r) => {
      const dx = pos.x - P.pos.x, dz = pos.z - P.pos.z;
      // rotate so player's forward is up
      const fx = dx * cy - dz * sy, fz = dx * sy + dz * cy; // fz negative = forward
      let px = fx / range, pz = fz / range; const m = Math.hypot(px, pz); if (m > 1) { px /= m; pz /= m; }
      g.fillStyle = col; g.beginPath(); g.arc(c + px * rad, c + pz * rad, r, 0, 7); g.fill();
    };
    for (const a of allies) plot(a.pos, '#5fe38a', 4);
    for (const e of enemies) plot(e.pos, e.kind === 'leader' ? '#ffd24a' : '#ff5a6a', e.kind === 'leader' ? 6 : 4);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(c, c - 8); g.lineTo(c - 6, c + 6); g.lineTo(c + 6, c + 6); g.fill();
    // arena edge indicator
    const ed = (R - Math.hypot(P.pos.x, P.pos.z)) / range; if (ed < 1) { g.strokeStyle = '#ff9a40'; g.lineWidth = 3; g.beginPath(); g.arc(c - (P.pos.x * cy - P.pos.z * sy) / range * rad * 0, c, rad, 0, 0); g.stroke(); }
  }
  update(dt, cam) { this.cam = cam; this.updateComm(dt); }
}
