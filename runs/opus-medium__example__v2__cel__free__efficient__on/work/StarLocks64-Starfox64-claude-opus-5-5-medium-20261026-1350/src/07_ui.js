// ============================================================================
// UI — controller-first screens, per-viewport HUDs, radio comms with portraits
// ============================================================================
const GLYPHS = {
  confirm: ['✕', 'Enter'], back: ['○', 'Esc'], fire: ['✕', 'Space / J / Click'], bomb: ['○', 'K'], uturn: ['□', 'R'], loop: ['△', 'F'],
  l1: ['L1', 'Q'], r1: ['R1', 'E'], brake: ['L2', 'Ctrl / C'], boost: ['R2', 'Shift'], pause: ['OPTIONS', 'Esc / P'], cam: ['CREATE', 'V'],
  move: ['L-STICK', 'WASD / Arrows'], nav: ['D-PAD', 'Arrows'], lr: ['◀ ▶', '◀ ▶'],
};
function glyph(a) {
  const g = GLYPHS[a]; const kb = Input.lastKind === 'keyboard';
  const t = kb ? g[1] : g[0];
  return `<span class="glyph${t.length > 1 ? ' wide' : ''}">${t}</span>`;
}

// ---------------------------------------------------------------------------
// Portraits — drawn procedurally on canvas
// ---------------------------------------------------------------------------
const FACES = {
  kit: { bg: '#24409a', suit: '#2f7bff', fur: '#e8822e', muz: '#fff3e0', ears: 'pointy', snout: 'fox', eye: '#2fbf5a', nose: '#222', scarf: '#ff3b4e' },
  skye: { bg: '#20307a', suit: '#dfe4ee', fur: '#3f6fb5', muz: '#e8f0ff', ears: 'none', snout: 'beak', beak: '#ffb020', eye: '#ff3b4e', crest: '#2a4f90' },
  bramble: { bg: '#2a4a2a', suit: '#c8a060', fur: '#86a85a', muz: '#b8cc8a', ears: 'none', snout: 'round', eye: '#222', glasses: true, brow: '#ffffff' },
  pip: { bg: '#1a5a4a', suit: '#ffcc33', fur: '#5dcf7a', muz: '#b8f0c0', ears: 'none', snout: 'wide', eye: '#222', bigEyes: true, goggles: '#ff7a1a' },
  marlowe: { bg: '#3a2a20', suit: '#2a3a6a', fur: '#b08050', muz: '#e8d0b0', ears: 'floppy', snout: 'dog', eye: '#3a2a1a', nose: '#222', cap: '#2a3a6a' },
  bolt: { robot: true, bg: '#101830', suit: '#8892a8' },
  vex: { bg: '#3a1040', suit: '#3a2d55', fur: '#9a7a50', muz: '#d8c0a0', ears: 'tall', snout: 'fox', eye: '#ffcc33', nose: '#111', patch: true },
  mink: { bg: '#40102a', suit: '#4a3a6e', fur: '#6a4a3a', muz: '#c8a890', ears: 'small', snout: 'short', eye: '#ff4dd2', nose: '#ff8ab0' },
  brute: { bg: '#402010', suit: '#4a3a2a', fur: '#7a5a48', muz: '#b8907a', ears: 'small', snout: 'pig', eye: '#ff3b4e', tusks: true },
  mandrillo: { bg: '#300a10', suit: '#6a1020', fur: '#4a3a2e', muz: '#6a5a4a', ears: 'small', snout: 'mandrill', eye: '#ffcc33', crown: true },
};
function drawPortrait(ctx, key, mouth, hurt = false) {
  const f = FACES[key] || FACES.kit; const W_ = 128;
  ctx.clearRect(0, 0, W_, W_);
  const gr = ctx.createLinearGradient(0, 0, 0, W_); gr.addColorStop(0, f.bg); gr.addColorStop(1, '#05081a'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W_, W_);
  ctx.lineWidth = 3; ctx.strokeStyle = '#0b1030'; ctx.lineJoin = 'round';
  const shape = (fn, fill) => { ctx.beginPath(); fn(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const ell = (x, y, rx, ry, rot = 0) => () => ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  // shoulders
  shape(() => { ctx.moveTo(14, 128); ctx.quadraticCurveTo(20, 96, 64, 94); ctx.quadraticCurveTo(108, 96, 114, 128); ctx.closePath(); }, f.suit);
  if (f.robot) {
    shape(() => ctx.roundRect(30, 26, 68, 62, 10), '#b8c0d0');
    shape(() => ctx.roundRect(38, 42, 52, 18, 6), '#0b1030');
    ctx.fillStyle = '#4ff0ff'; const sc = (Date.now() / 120) % 6; ctx.fillRect(42 + sc * 6, 47, 10, 8);
    shape(() => ctx.rect(62, 10, 4, 16), '#8892a8'); shape(ell(64, 10, 5, 5), '#ff3b4e');
    shape(() => ctx.rect(46, 70, 36, mouth ? 9 : 4), '#30364a');
    return;
  }
  if (f.scarf) shape(() => { ctx.moveTo(34, 98); ctx.quadraticCurveTo(64, 112, 94, 98); ctx.lineTo(90, 108); ctx.quadraticCurveTo(64, 120, 38, 108); ctx.closePath(); }, f.scarf);
  // ears
  if (f.ears === 'pointy' || f.ears === 'tall') {
    const h = f.ears === 'tall' ? 30 : 22;
    for (const s of [-1, 1]) shape(() => { ctx.moveTo(64 + s * 18, 40); ctx.lineTo(64 + s * 34, 40 - h - 8); ctx.lineTo(64 + s * 38, 48); ctx.closePath(); }, f.fur);
    for (const s of [-1, 1]) shape(() => { ctx.moveTo(64 + s * 23, 40); ctx.lineTo(64 + s * 33, 40 - h); ctx.lineTo(64 + s * 34, 44); ctx.closePath(); }, '#2a1a10');
  } else if (f.ears === 'floppy') { for (const s of [-1, 1]) shape(ell(64 + s * 34, 56, 10, 22, s * 0.3), '#6a4a2a'); }
  else if (f.ears === 'small') { for (const s of [-1, 1]) shape(ell(64 + s * 28, 30, 9, 9), f.fur); }
  if (f.crest) shape(() => { ctx.moveTo(52, 26); ctx.lineTo(60, 4); ctx.lineTo(66, 22); ctx.lineTo(76, 6); ctx.lineTo(78, 28); ctx.closePath(); }, f.crest);
  // head
  shape(ell(64, 56, 32, 34), f.fur);
  if (f.cap) { shape(() => { ctx.moveTo(30, 40); ctx.quadraticCurveTo(64, 6, 98, 40); ctx.closePath(); }, f.cap); ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(64, 30, 4, 0, TAU); ctx.fill(); }
  if (f.crown) { shape(() => { ctx.moveTo(38, 30); ctx.lineTo(42, 8); ctx.lineTo(52, 22); ctx.lineTo(64, 4); ctx.lineTo(76, 22); ctx.lineTo(86, 8); ctx.lineTo(90, 30); ctx.closePath(); }, '#ffcc33'); }
  // muzzle / snout
  const my = 70;
  if (f.snout === 'fox') shape(() => { ctx.moveTo(44, 62); ctx.quadraticCurveTo(64, 56, 84, 62); ctx.lineTo(64, 92); ctx.closePath(); }, f.muz);
  else if (f.snout === 'dog') shape(ell(64, my + 6, 18, 14), f.muz);
  else if (f.snout === 'beak') shape(() => { ctx.moveTo(50, 64); ctx.lineTo(78, 64); ctx.lineTo(64, mouth ? 96 : 90); ctx.closePath(); }, f.beak);
  else if (f.snout === 'round') shape(ell(64, my + 4, 20, 13), f.muz);
  else if (f.snout === 'wide') shape(ell(64, my + 6, 26, 12), f.muz);
  else if (f.snout === 'short') shape(ell(64, my + 2, 14, 11), f.muz);
  else if (f.snout === 'pig') { shape(ell(64, my + 4, 18, 13), f.muz); shape(ell(64, my + 2, 10, 7), '#d8a090'); }
  else if (f.snout === 'mandrill') { shape(ell(64, my, 10, 20), '#ff3b4e'); for (const s of [-1, 1]) shape(ell(64 + s * 16, my, 6, 16), '#3a6aff'); }
  // eyes
  const er = f.bigEyes ? 10 : 7, ey = f.bigEyes ? 44 : 50;
  for (const s of [-1, 1]) {
    if (f.patch && s === -1) { shape(ell(64 - 14, ey, 9, 8), '#111'); ctx.beginPath(); ctx.moveTo(30, 38); ctx.lineTo(96, 44); ctx.stroke(); continue; }
    shape(ell(64 + s * 14, ey, er, er * (hurt ? 0.3 : 1.05)), '#ffffff');
    ctx.fillStyle = f.eye; ctx.beginPath(); ctx.arc(64 + s * 14 + s * 1.5, ey + 1, er * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(64 + s * 14 + s * 1.5 - 1.5, ey - 1.5, er * 0.18, 0, TAU); ctx.fill();
  }
  if (f.goggles) { ctx.strokeStyle = f.goggles; ctx.lineWidth = 4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(64 + s * 14, ey, er + 3, 0, TAU); ctx.stroke(); } ctx.strokeStyle = '#0b1030'; ctx.lineWidth = 3; }
  if (f.glasses) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(64 + s * 14, ey, 9, 0, TAU); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(59, ey); ctx.lineTo(69, ey); ctx.stroke(); }
  if (f.brow) { ctx.strokeStyle = f.brow; ctx.lineWidth = 4; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(64 + s * 6, ey - 12); ctx.lineTo(64 + s * 22, ey - 14); ctx.stroke(); } ctx.strokeStyle = '#0b1030'; ctx.lineWidth = 3; }
  if (f.nose && f.snout !== 'beak') shape(ell(64, f.snout === 'fox' ? 72 : my, 5, 4), f.nose);
  if (f.tusks) for (const s of [-1, 1]) shape(() => { ctx.moveTo(64 + s * 12, my + 12); ctx.lineTo(64 + s * 18, my - 2); ctx.lineTo(64 + s * 8, my + 10); ctx.closePath(); }, '#fffbe8');
  // mouth
  if (f.snout !== 'beak') { ctx.fillStyle = '#3a0a10'; ctx.beginPath(); ctx.ellipse(64, f.snout === 'fox' ? 82 : my + 12, mouth ? 7 : 6, mouth ? 6 : 1.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
}

// ---------------------------------------------------------------------------
// Comms — Star-Fox-style radio chatter
// ---------------------------------------------------------------------------
const Comms = {
  queue: [], cur: null, t: 0, canvas: null, ctx: null,
  init() { this.root = $('#comm'); this.canvas = $('#comm canvas'); this.ctx = this.canvas.getContext('2d'); this.nm = $('#comm .nm'); this.tx = $('#comm .tx'); this.sh = $('#comm .sh'); this.shi = $('#comm .sh i'); },
  say(who, text, o = {}) {
    if (W.mode === 'versus' && !o.force) return;
    // a human playing that pilot speaks as themselves; skip lines for retired wingmen
    if (W.retired[who] && !o.force) return;
    const msg = { who, text, dur: Math.max(2.8, text.length * 0.058 + 1.2) };
    if (o.priority) { this.queue.unshift(msg); if (this.cur) this.t = this.cur.dur; } else this.queue.push(msg);
    if (this.queue.length > 6) this.queue.splice(1, 1);
  },
  clear() { this.queue = []; this.cur = null; this.root.classList.add('hidden'); },
  update(dt) {
    if (this.cur) {
      this.t += dt;
      const n = Math.min(this.cur.text.length, Math.floor(this.t * 45));
      this.tx.textContent = this.cur.text.slice(0, n);
      const talking = n < this.cur.text.length;
      if (Math.floor(this.t * 10) !== this.lastFrame) { this.lastFrame = Math.floor(this.t * 10); drawPortrait(this.ctx, this.cur.who, talking && this.lastFrame % 2 === 0); }
      const ship = W.ships.find(s => s.pilot === this.cur.who && !s.isPlayer && s.team === 'star');
      if (ship) { this.sh.classList.remove('hidden'); this.shi.style.width = Math.max(0, ship.hp / ship.maxHp * 100) + '%'; } else this.sh.classList.add('hidden');
      if (this.t >= this.cur.dur) { this.cur = null; }
    }
    if (!this.cur && this.queue.length) {
      this.cur = this.queue.shift(); this.t = 0; this.lastFrame = -1;
      const c = CHARS[this.cur.who];
      const human = W.players.find(p => p.pilot === this.cur.who && W.players.length > 1);
      this.nm.textContent = (c ? c.name : this.cur.who) + (human ? ` (P${human.playerIndex + 1})` : '');
      this.root.classList.remove('hidden');
      Sound.voice(this.cur.text, c ? c.pitch : 200);
    }
    if (!this.cur && !this.queue.length) this.root.classList.add('hidden');
  },
};

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
class HUD {
  constructor(ship, rect, total) {
    this.ship = ship; this.rect = rect;
    const d = this.root = el('div', 'hud');
    d.style.left = rect.x * 100 + '%'; d.style.top = rect.y * 100 + '%'; d.style.width = rect.w * 100 + '%'; d.style.height = rect.h * 100 + '%';
    d.style.setProperty('--hs', (total > 2 ? 0.62 : total > 1 ? 0.78 : 1) * Settings.data.hudScale);
    d.innerHTML = `
      <div class="tl"><div class="lbl">SHIELD</div><div class="bar sh"><i></i></div><div class="lbl">BOOST</div><div class="bar boost"><i></i></div></div>
      <div class="tr"><div class="hits"><small>HITS</small> <span class="hv">0</span></div><div class="icons rings"></div><div class="lives"></div></div>
      <div class="bl"><div class="icons bombs"></div><div class="lbl laserlv"></div></div>
      <div class="br"></div>
      <div class="boss-wrap hidden"><div class="lbl bossname"></div><div class="bar boss"><i></i></div></div>
      <div class="reticle near"></div><div class="reticle far"></div><div class="lock hidden"></div>
      <canvas class="radar hidden" width="160" height="160"></canvas>
      <div class="warn hidden"></div><div class="center-msg hidden"></div><div class="tip hidden"></div>
      ${total > 1 ? `<div class="pname" style="color:#${PCOLORS[ship.playerIndex].toString(16).padStart(6, '0')}">P${ship.playerIndex + 1} · ${ship.name}</div>` : ''}
      <div class="vs-score hidden"></div>`;
    $('#hudroot').appendChild(d);
    const q = s => d.querySelector(s);
    Object.assign(this, { shBar: q('.bar.sh'), shI: q('.bar.sh i'), boI: q('.bar.boost i'), hv: q('.hv'), rings: q('.rings'), lives: q('.lives'), bombs: q('.bombs'), laserlv: q('.laserlv'),
      bossWrap: q('.boss-wrap'), bossName: q('.bossname'), bossI: q('.bar.boss i'), retN: q('.reticle.near'), retF: q('.reticle.far'), lock: q('.lock'), radar: q('.radar'),
      warn: q('.warn'), center: q('.center-msg'), tipEl: q('.tip'), vs: q('.vs-score') });
    this.rctx = this.radar.getContext('2d');
    this.centerT = 0; this.tipT = 0; this.last = {};
  }
  set(key, val, fn) { if (this.last[key] !== val) { this.last[key] = val; fn(val); } }
  project(p, out) {
    const cam = this.ship.cam; tmpV.copy(p).project(cam);
    const w = GFX.width * this.rect.w, h = GFX.height * this.rect.h;
    out.x = (tmpV.x + 1) / 2 * w; out.y = (1 - tmpV.y) / 2 * h; out.z = tmpV.z; return out;
  }
  update(dt) {
    const s = this.ship;
    this.set('hp', Math.round(s.hp / s.maxHp * 100), v => { this.shI.style.width = Math.max(0, v) + '%'; this.shBar.classList.toggle('low', v < 30); });
    this.shBar.style.width = (9 * s.maxHp / 100) + 'em';
    this.set('boost', Math.round(s.boost * 50), v => this.boI.style.width = v * 2 + '%');
    this.set('hits', s.hits, v => this.hv.textContent = v);
    this.set('rings', s.goldRings, v => { const f = v >= 3 ? v - 3 : v; this.rings.innerHTML = W.mode === 'versus' ? '' : [0, 1, 2].map(i => `<div class="ring${i < f ? '' : ' off'}"></div>`).join('') + (v >= 3 ? '<span class="lbl">EXT</span>' : ''); });
    this.set('lives', W.lives, v => this.lives.textContent = W.mode === 'versus' ? '' : `✈ × ${v}`);
    this.set('bombs', s.bombs, v => this.bombs.innerHTML = Array.from({ length: v }, () => '<div class="bombicon"></div>').join('') || '<span class="lbl">NO BOMBS</span>');
    this.set('laser', s.laser + (s.wingBroken[0] || s.wingBroken[1] ? 'b' : ''), () => this.laserlv.textContent = (['SINGLE', 'TWIN', 'HYPER'][s.laser]) + ' LASER' + (s.wingBroken[0] || s.wingBroken[1] ? ' · WING DAMAGE' : ''));
    // boss
    const b = Game.bossBar;
    if (b && (this.ship.playerIndex === 0 || W.players.length <= 2)) { this.bossWrap.classList.remove('hidden'); this.set('bn', b.name, v => this.bossName.textContent = v); this.bossI.style.width = Math.max(0, b.hp / b.maxHp * 100) + '%'; }
    else this.bossWrap.classList.add('hidden');
    // reticles
    const show = !s.dead && !s.cine && !Game.cutscene;
    if (show) {
      const a = this.project(tmpV2.copy(s.pos).addScaledVector(s.aimDir, 38), { x: 0, y: 0, z: 0 });
      const b2 = this.project(tmpV2.copy(s.pos).addScaledVector(s.aimDir, 95), { x: 0, y: 0, z: 0 });
      this.retN.style.display = this.retF.style.display = a.z < 1 ? 'block' : 'none';
      this.retN.style.left = a.x + 'px'; this.retN.style.top = a.y + 'px'; this.retF.style.left = b2.x + 'px'; this.retF.style.top = b2.y + 'px';
      const charged = s.charge >= 1;
      this.retF.classList.toggle('locked', charged); this.retF.style.transform = `rotate(${45 + (s.charge > 0 ? W.time * 400 : 0)}deg) scale(${1 + s.charge * 0.3})`;
      if (s.lockTarget && (s.lockTarget.alive !== false) && !s.lockTarget.dead) {
        const l = this.project(s.lockTarget.pos, { x: 0, y: 0, z: 0 });
        if (l.z < 1) { this.lock.classList.remove('hidden'); this.lock.style.left = l.x + 'px'; this.lock.style.top = l.y + 'px'; } else this.lock.classList.add('hidden');
      } else this.lock.classList.add('hidden');
    } else { this.retN.style.display = this.retF.style.display = 'none'; this.lock.classList.add('hidden'); }
    // radar for all-range
    const freeMode = W.mode !== 'rail';
    this.radar.classList.toggle('hidden', !freeMode || s.dead);
    if (freeMode && !s.dead) this.drawRadar();
    // warnings
    let warn = '';
    if (s.dead && W.mode !== 'rail') warn = s.respawnT > 0 ? `RESPAWN IN ${Math.ceil(s.respawnT)}` : '';
    else if (s.outOfBounds) warn = 'TURN AROUND — LEAVING COMBAT ZONE';
    else if (!s.dead && s.hp < s.maxHp * 0.25) warn = 'SHIELD CRITICAL';
    else if (!s.dead && this.tailCheck()) warn = 'ENEMY ON YOUR TAIL!';
    this.set('warn', warn, v => { this.warn.textContent = v; this.warn.classList.toggle('hidden', !v); });
    if (this.centerT > 0) { this.centerT -= dt; if (this.centerT <= 0) this.center.classList.add('hidden'); }
    if (this.tipT > 0) { this.tipT -= dt; if (this.tipT <= 0) this.tipEl.classList.add('hidden'); }
    if (W.mode === 'versus' && W.versus) {
      this.vs.classList.remove('hidden');
      const html = W.ships.filter(x => x.versusSlot != null).map(x => `<span style="color:#${PCOLORS[x.versusSlot].toString(16).padStart(6, '0')}">${x.cpu ? 'CPU' : 'P' + (x.versusSlot + 1)} ${x.kills}</span>`).join('');
      this.set('vs', html, v => this.vs.innerHTML = v);
    } else this.vs.classList.add('hidden');
  }
  tailCheck() {
    const s = this.ship; if (W.mode === 'rail') return false;
    for (const o of W.ships) {
      if (o === s || o.dead || (o.team === s.team && W.mode !== 'versus')) continue;
      tmpV.copy(s.pos).sub(o.pos); const d = tmpV.length();
      if (d < 120 && tmpV.normalize().dot(tmpV2.set(0, 0, -1).applyQuaternion(o.q)) > 0.9) return true;
    }
    return false;
  }
  drawRadar() {
    const c = this.rctx, s = this.ship, R = 80, range = W.mode === 'versus' ? 800 : 1100;
    c.clearRect(0, 0, 160, 160);
    c.strokeStyle = 'rgba(79,240,255,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(R, R, R * 0.5, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(R, 0); c.lineTo(R, 160); c.moveTo(0, R); c.lineTo(160, R); c.stroke();
    const fwd = tmpV3.set(0, 0, -1).applyQuaternion(s.q); const yaw = Math.atan2(fwd.x, -fwd.z);
    const dot = (p, col, size) => {
      const dx = p.x - s.pos.x, dz = p.z - s.pos.z;
      const rx = dx * Math.cos(yaw) + dz * Math.sin(yaw), rz = -dx * Math.sin(yaw) + dz * Math.cos(yaw);
      let x = rx / range * R, y = rz / range * R; const l = Math.hypot(x, y); if (l > R - 4) { x *= (R - 4) / l; y *= (R - 4) / l; }
      c.fillStyle = col; c.beginPath(); c.arc(R + x, R + y, size, 0, TAU); c.fill();
    };
    for (const e of W.enemies) if (e.alive && e.targetable) dot(e.pos, e.boss ? '#ff9cf0' : '#ff3b4e', e.boss ? 4 : 2.5);
    for (const o of W.ships) if (o !== s && !o.dead && !o.retired) dot(o.pos, W.mode === 'versus' ? '#' + PCOLORS[o.versusSlot].toString(16).padStart(6, '0') : o.team === 'jackal' ? '#ff4dd2' : '#5dff7a', 3.5);
    for (const it of W.items) dot(it.pos, '#ffcc33', 2);
    if (Stage2.longhaul && W.stage === Stage2) dot(Stage2.longhaul.position, '#4ff0ff', 4);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(R, R - 6); c.lineTo(R - 4, R + 4); c.lineTo(R + 4, R + 4); c.fill();
  }
  showCenter(t, sub, dur) { this.center.innerHTML = `${t}${sub ? `<small>${sub}</small>` : ''}`; this.center.classList.remove('hidden'); this.centerT = dur; }
  showTip(html, dur) { this.tipEl.innerHTML = html; this.tipEl.classList.remove('hidden'); this.tipT = dur; }
  popup(p, text, colr) {
    const pt = this.project(p, { x: 0, y: 0, z: 0 }); if (pt.z > 1) return;
    const e = el('div', '', text);
    Object.assign(e.style, { position: 'absolute', left: pt.x + 'px', top: pt.y + 'px', color: colr, fontSize: '.8em', transform: 'translate(-50%,-50%)', transition: 'transform .9s ease-out, opacity .9s', textShadow: '0 2px 0 #000', pointerEvents: 'none', whiteSpace: 'nowrap' });
    this.root.appendChild(e);
    requestAnimationFrame(() => { e.style.transform = 'translate(-50%,-250%)'; e.style.opacity = '0'; });
    setTimeout(() => e.remove(), 950);
  }
  hurt() { this.root.style.boxShadow = 'inset 0 0 8vmin rgba(255,40,60,.75)'; setTimeout(() => this.root.style.boxShadow = '', 160); }
  remove() { this.root.remove(); }
}

// ---------------------------------------------------------------------------
// Menu / screen framework
// ---------------------------------------------------------------------------
const UI = {
  huds: [], screen: null, items: [], focus: 0, onBack: null, scrollEl: null,
  init() { this.root = $('#ui'); Comms.init(); },
  // HUD helpers
  buildHUDs(viewports) { this.clearHUDs(); for (const v of viewports) this.huds.push(new HUD(v.ship, v.rect, viewports.length)); this.splitLines(viewports.length); },
  clearHUDs() { for (const h of this.huds) h.remove(); this.huds = []; document.querySelectorAll('.split-line').forEach(e => e.remove()); },
  splitLines(n) {
    if (n < 2) return;
    const add = (css) => { const d = el('div', 'split-line'); Object.assign(d.style, css); $('#hudroot').appendChild(d); };
    if (n === 2) add({ left: '50%', top: 0, bottom: 0, width: '4px', marginLeft: '-2px' });
    else { add({ left: '50%', top: 0, bottom: 0, width: '4px', marginLeft: '-2px' }); add({ top: '50%', left: 0, right: 0, height: '4px', marginTop: '-2px' }); }
  },
  hudFor(ship) { return this.huds.find(h => h.ship === ship); },
  updateHUDs(dt) { for (const h of this.huds) h.update(dt); },
  centerMsg(ship, t, sub, dur = 2) { for (const h of this.huds) if (!ship || h.ship === ship) h.showCenter(t, sub, dur); },
  tip(ship, html, dur = 4) { for (const h of this.huds) if (!ship || h.ship === ship) h.showTip(html, dur); },
  popup(p, text, colr) { for (const h of this.huds) h.popup(p, text, colr); },
  hurt(ship) { const h = this.hudFor(ship); if (h) h.hurt(); },
  // ---------------- screens ----------------
  show(html, cls = '') {
    Input.lastInputTime = performance.now(); // idle timer restarts on every new screen
    this.root.innerHTML = ''; const s = el('div', 'screen ' + cls, html); this.root.appendChild(s); this.screen = s;
    this.items = [...s.querySelectorAll('.btn')]; this.focus = Math.max(0, this.items.findIndex(b => b.dataset.default)); this.onBack = null; this.scrollEl = s.querySelector('.about');
    this.items.forEach((b, i) => {
      b.addEventListener('mouseenter', () => { this.setFocus(i); });
      b.addEventListener('click', (e) => { e.stopPropagation(); this.setFocus(i); this.activate(0); });
    });
    this.setFocus(this.focus, true);
    return s;
  },
  hide() { this.root.innerHTML = ''; this.screen = null; this.items = []; },
  setFocus(i, silent) {
    if (!this.items.length) return;
    this.focus = (i + this.items.length) % this.items.length;
    this.items.forEach((b, k) => b.classList.toggle('focus', k === this.focus));
    const d = this.screen.querySelector('.desc'); if (d) d.textContent = this.items[this.focus].dataset.desc || '';
    if (!silent) Sound.sfx('move');
  },
  activate(dir) {
    const b = this.items[this.focus]; if (!b || b.classList.contains('disabled')) { Sound.sfx('error'); return; }
    if (b._opt) { b._opt(dir || 1); Sound.sfx('move'); return; }
    if (dir) return;
    Sound.sfx('select'); b._fn && b._fn();
  },
  update(dt) {
    if (!this.screen) return;
    if (this.lockT > 0) { this.lockT -= dt; return; }
    if (this.items.length) {
      if (Input.anyNav('up', dt)) this.setFocus(this.focus - 1);
      if (Input.anyNav('down', dt)) this.setFocus(this.focus + 1);
      if (Input.anyNav('left', dt)) this.activate(-1);
      if (Input.anyNav('right', dt)) this.activate(1);
      if (Input.anyPressed('confirm')) this.activate(0);
    }
    if (this.scrollEl) { let v = 0; for (const p of Input.pads.values()) v += p.ly; this.scrollEl.scrollTop += v * dt * 500; }
    if (Input.anyPressed('back') && this.onBack) { Sound.sfx('back'); this.onBack(); }
  },
  // build a menu: entries [{label, fn, desc, opt:{get, set, values}}]
  menu(title, entries, { sub = '', back = null, hint = true, logo = false, extra = '' } = {}) {
    const html = `${logo ? logoHTML() : `<h2>${title}</h2>`}${sub ? `<div class="tagline">${sub}</div>` : ''}
      <div class="menu">${entries.map((e, i) => `<div class="btn${e.disabled ? ' disabled' : ''}" data-i="${i}" ${e.default ? 'data-default="1"' : ''} data-desc="${(e.desc || '').replace(/"/g, '&quot;')}"><span>${e.label}</span>${e.opt ? `<span class="val"></span>` : ''}</div>`).join('')}</div>
      <div class="desc"></div>${extra}
      ${hint ? `<div class="hint"><span>${glyph('nav')} Select</span><span>${glyph('confirm')} Confirm</span>${back ? `<span>${glyph('back')} Back</span>` : ''}</div>` : ''}`;
    const s = this.show(html);
    this.items.forEach((b, i) => {
      const e = entries[i]; b._fn = e.fn;
      if (e.opt) {
        const v = b.querySelector('.val'); const refresh = () => v.textContent = e.opt.label ? e.opt.label(e.opt.get()) : e.opt.get();
        b._opt = (dir) => { e.opt.set(dir); refresh(); };
        refresh();
      }
    });
    this.onBack = back;
    return s;
  },
};
function logoHTML() { return `<div class="logo">STAR LOCKS<small>— 64 —</small></div>`; }
