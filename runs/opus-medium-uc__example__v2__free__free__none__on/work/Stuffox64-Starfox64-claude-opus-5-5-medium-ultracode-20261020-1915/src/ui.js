// 10-foot, controller-first UI: menus with focus navigation, HUD, comms, overlay canvas (reticle/lock/radar/popups).
import * as THREE from 'three/webgpu';
import { GLYPHS } from './input.js';
import { settings, saveSettings, save, DIFF } from './settings.js';
import { bossHp } from './actors.js';
import { ABOUT_SECTIONS } from './about.js';

const $ = (s) => document.querySelector(s);
const _v = new THREE.Vector3();

// ---------------- portraits ----------------
const PORTRAIT = {
  tod: { fur: '#e8741e', inner: '#fff2dc', ear: 'fox', bg: '#1b3f8a' },
  bramble: { fur: '#777a85', inner: '#f5f5f5', ear: 'round', bg: '#1b3f8a', stripe: true },
  pippa: { fur: '#f7d9e6', inner: '#ffffff', ear: 'bunny', bg: '#1b3f8a', bow: true },
  gizmo: { fur: '#b98a4b', inner: '#f6e1b0', ear: 'tuft', bg: '#1b3f8a', goggles: true },
  woolsey: { fur: '#f4f1ea', inner: '#e8dccb', ear: 'sheep', bg: '#1f5a3a', cap: true },
  ratchet: { fur: '#9aa4b2', inner: '#c4ccd6', ear: 'rat', bg: '#7a1f2a', tin: true },
  vex: { fur: '#8a7b66', inner: '#c8b89a', ear: 'jackal', bg: '#5a1f7a', tin: true },
  snarl: { fur: '#a08a5a', inner: '#d8c89a', ear: 'round', bg: '#5a1f7a', spots: true },
  quill: { fur: '#6a5a4a', inner: '#c8b89a', ear: 'spike', bg: '#5a1f7a' },
};
export function drawPortrait(ctx, who, S, t = 0, talking = false) {
  const P = PORTRAIT[who] || PORTRAIT.tod;
  ctx.save(); ctx.clearRect(0, 0, S, S);
  const g = ctx.createLinearGradient(0, 0, 0, S); g.addColorStop(0, P.bg); g.addColorStop(1, '#0a0f24');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < S; y += 4) ctx.fillRect(0, y, S, 1);
  const cx = S / 2, cy = S * 0.58 + Math.sin(t * 2) * S * 0.01, r = S * 0.3;
  ctx.lineWidth = S * 0.025; ctx.strokeStyle = '#141420';
  const ellipse = (x, y, rx, ry, fill, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const tri = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  // body/shoulders (flight suit)
  ellipse(cx, S * 1.02, S * 0.42, S * 0.25, P.tin ? '#3b4252' : '#2d6ee0');
  // ears
  if (P.ear === 'fox' || P.ear === 'jackal') {
    for (const s of [-1, 1]) tri([cx + s * r * 0.35, cy - r * 0.6, cx + s * r * 0.95, cy - r * 1.55, cx + s * r * 0.95, cy - r * 0.35], P.fur);
    for (const s of [-1, 1]) tri([cx + s * r * 0.55, cy - r * 0.62, cx + s * r * 0.88, cy - r * 1.25, cx + s * r * 0.88, cy - r * 0.5], P.inner);
  } else if (P.ear === 'bunny') {
    for (const s of [-1, 1]) { ellipse(cx + s * r * 0.4, cy - r * 1.45, r * 0.22, r * 0.75, P.fur, s * 0.15); ellipse(cx + s * r * 0.4, cy - r * 1.4, r * 0.1, r * 0.55, '#ff9fc4', s * 0.15); }
  } else if (P.ear === 'round' || P.ear === 'rat') {
    const er = P.ear === 'rat' ? 0.45 : 0.28;
    for (const s of [-1, 1]) { ellipse(cx + s * r * 0.8, cy - r * 0.8, r * er, r * er, P.fur); ellipse(cx + s * r * 0.8, cy - r * 0.8, r * er * 0.55, r * er * 0.55, P.inner); }
  } else if (P.ear === 'tuft') {
    for (const s of [-1, 1]) tri([cx + s * r * 0.4, cy - r * 0.75, cx + s * r * 0.9, cy - r * 1.35, cx + s * r * 0.85, cy - r * 0.45], P.fur);
  } else if (P.ear === 'sheep') {
    for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; ellipse(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.85, r * 0.3, r * 0.3, '#ffffff'); }
  } else if (P.ear === 'spike') {
    for (let i = 0; i < 9; i++) { const a = Math.PI + 0.2 + i / 8 * (Math.PI - 0.4); tri([cx + Math.cos(a - 0.15) * r * 0.9, cy + Math.sin(a - 0.15) * r * 0.9, cx + Math.cos(a) * r * 1.6, cy + Math.sin(a) * r * 1.6, cx + Math.cos(a + 0.15) * r * 0.9, cy + Math.sin(a + 0.15) * r * 0.9], '#3a2a1a'); }
  }
  // head
  ellipse(cx, cy, r, r * 0.92, P.fur);
  if (P.tin) { ctx.fillStyle = '#5a6272'; for (const [x, y] of [[-0.7, -0.2], [0.7, -0.2], [-0.5, 0.5], [0.5, 0.5]]) { ctx.beginPath(); ctx.arc(cx + x * r, cy + y * r, S * 0.012, 0, 7); ctx.fill(); } }
  if (P.stripe) { ctx.fillStyle = '#f5f5f5'; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.35, r * 0.2, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
  if (P.spots) { ctx.fillStyle = '#5a4a2a'; for (const [x, y] of [[-0.5, -0.4], [0.45, -0.5], [0.6, 0.1], [-0.65, 0.15]]) { ctx.beginPath(); ctx.arc(cx + x * r, cy + y * r, r * 0.1, 0, 7); ctx.fill(); } }
  // muzzle
  ellipse(cx, cy + r * 0.35, r * 0.55, r * 0.42, P.inner);
  // stitch seam (plush!)
  ctx.strokeStyle = '#141420'; ctx.lineWidth = S * 0.012; ctx.setLineDash([S * 0.02, S * 0.02]);
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.9); ctx.lineTo(cx, cy - r * 0.15); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineWidth = S * 0.025;
  // eyes: button eyes for plushies, glowing for tin
  const blink = (Math.floor(t * 0.7) % 5 === 0 && (t * 0.7 % 1) < 0.12);
  for (const s of [-1, 1]) {
    const ex = cx + s * r * 0.38, ey = cy - r * 0.08;
    if (P.goggles) { ellipse(ex, ey, r * 0.3, r * 0.3, '#c8e8ff'); }
    if (P.tin) { ctx.fillStyle = who === 'ratchet' && s > 0 ? '#ff3030' : '#ffcc33'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.13, 0, 7); ctx.fill(); if (who === 'ratchet' && s > 0) { ctx.strokeStyle = '#e8c050'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.24, 0, 7); ctx.stroke(); ctx.strokeStyle = '#141420'; } }
    else if (blink) { ctx.beginPath(); ctx.moveTo(ex - r * 0.13, ey); ctx.lineTo(ex + r * 0.13, ey); ctx.stroke(); }
    else {
      ctx.fillStyle = '#141420'; ctx.beginPath(); ctx.arc(ex, ey, r * 0.14, 0, 7); ctx.fill();
      ctx.fillStyle = P.goggles ? '#c8e8ff' : P.fur; for (const [hx, hy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(ex + hx * r * 0.045, ey + hy * r * 0.045, r * 0.022, 0, 7); ctx.fill(); }
    }
  }
  // nose / beak
  if (P.ear === 'tuft') tri([cx - r * 0.12, cy + r * 0.15, cx + r * 0.12, cy + r * 0.15, cx, cy + r * 0.42], '#f2c230');
  else ellipse(cx, cy + r * 0.18, r * 0.12, r * 0.09, '#141420');
  // mouth
  const open = talking ? Math.abs(Math.sin(t * 16)) * r * 0.16 : 0;
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.48, r * 0.16, Math.max(r * 0.02, open), 0, 0, Math.PI * 2); ctx.fillStyle = '#5a1a2a'; ctx.fill(); ctx.stroke();
  if (P.bow) { tri([cx + r * 0.5, cy - r * 0.75, cx + r * 0.95, cy - r * 1.0, cx + r * 0.95, cy - r * 0.5], '#8a5cd6'); }
  if (P.cap) { ctx.fillStyle = '#2f5a3a'; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.75, r * 0.8, r * 0.3, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e8c050'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.85, r * 0.1, 0, 7); ctx.fill(); }
  // headset
  if (!P.tin) { ctx.strokeStyle = '#333'; ctx.lineWidth = S * 0.02; ctx.beginPath(); ctx.moveTo(cx - r * 0.95, cy + r * 0.1); ctx.quadraticCurveTo(cx - r * 0.95, cy + r * 0.7, cx - r * 0.3, cy + r * 0.62); ctx.stroke(); }
  ctx.restore();
}

// ---------------- UI ----------------
export class UI {
  constructor(app) {
    this.app = app;
    this.hudEl = $('#hud'); this.menuEl = $('#menu'); this.overlay = $('#overlay');
    this.octx = this.overlay.getContext('2d');
    this.popups = []; this.screen = null; this.focus = 0; this.items = []; this.stack = [];
    this.commEl = $('#comm'); this.commCanvas = $('#comm canvas'); this.commCtx = this.commCanvas.getContext('2d');
    this.comm_ = null; this.commTyped = 0;
    this.bannerEl = $('#banner'); this.hintEl = $('#hint');
    this.wingCanvases = {};
    this.buildHud();
    addEventListener('resize', () => this.resize()); this.resize();
  }
  resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.overlay.width = innerWidth * dpr; this.overlay.height = innerHeight * dpr;
    this.dpr = dpr;
  }
  glyph(a) { return (GLYPHS[this.app.input.device] || GLYPHS.ps)[a] || a; }
  glyphs(text) {
    const G = GLYPHS[this.app.input.device] || GLYPHS.ps;
    return text.replace(/\{(\w+)\}/g, (_, k) => (k === 'roll' ? `${G.bankL}/${G.bankR}×2` : (G[k] || k)));
  }
  btn(a) { return `<span class="glyph g-${a}">${this.glyph(a)}</span>`; }

  // ---------------- HUD ----------------
  buildHud() {
    this.hudEl.innerHTML = `
      <div class="hud-tl">
        <div class="shield"><div class="label">SHIELD</div><div class="bar"><div class="fill"></div><div class="ext"></div></div><div class="gold"></div></div>
        <div class="wings"></div>
      </div>
      <div class="hud-tr"><div class="score">0</div><div class="hits">HITS <b>0</b></div><div class="medal-goal"></div></div>
      <div class="hud-bl">
        <div class="boost"><div class="label">BOOST</div><div class="bar"><div class="fill"></div></div></div>
        <div class="row"><div class="bombs"></div><div class="laser"></div><div class="lives"></div></div>
      </div>
      <div class="hud-boss"><div class="name"></div><div class="bar"><div class="fill"></div></div></div>
      <div class="attract-tag">DEMO PLAY<small>Press any button</small></div>`;
    const w = this.hudEl.querySelector('.wings');
    for (const k of ['bramble', 'pippa', 'gizmo']) {
      const d = document.createElement('div'); d.className = 'wing'; d.dataset.k = k;
      d.innerHTML = `<canvas width="64" height="64"></canvas><div class="whp"><div></div></div>`;
      w.appendChild(d); this.wingCanvases[k] = d;
      drawPortrait(d.querySelector('canvas').getContext('2d'), k, 64);
    }
    this.h = {
      shieldFill: this.hudEl.querySelector('.shield .fill'), shieldExt: this.hudEl.querySelector('.shield .ext'), gold: this.hudEl.querySelector('.gold'),
      score: this.hudEl.querySelector('.score'), hits: this.hudEl.querySelector('.hits b'), medal: this.hudEl.querySelector('.medal-goal'),
      boostFill: this.hudEl.querySelector('.boost .fill'), bombs: this.hudEl.querySelector('.bombs'), laser: this.hudEl.querySelector('.laser'), lives: this.hudEl.querySelector('.lives'),
      boss: this.hudEl.querySelector('.hud-boss'), bossName: this.hudEl.querySelector('.hud-boss .name'), bossFill: this.hudEl.querySelector('.hud-boss .fill'),
      attract: this.hudEl.querySelector('.attract-tag'),
    };
    this.last = {};
  }
  showHud(v) { this.hudEl.classList.toggle('show', v); if (!v) { this.comm(null); this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height); } }
  setText(key, el, v) { if (this.last[key] !== v) { this.last[key] = v; el.innerHTML = v; } }
  updateHud(s, camera, dt) {
    const h = this.h;
    const sp = Math.max(0, s.shield) / 150;
    h.shieldFill.style.width = `${sp * 100}%`;
    h.shieldFill.classList.toggle('low', s.shield < 30);
    h.shieldExt.style.width = `${(s.maxShield / 150) * 100}%`;
    this.setText('gold', h.gold, '<i class="ring"></i>'.repeat(s.gold % 3) + '<i class="ring empty"></i>'.repeat(3 - (s.gold % 3)));
    this.setText('score', h.score, String(s.score).padStart(7, '0'));
    this.setText('hits', h.hits, String(s.hits));
    this.setText('medal', h.medal, s.hits >= s.medal ? '<span class="got">★ MEDAL</span>' : `MEDAL ${s.medal}`);
    h.boostFill.style.width = `${s.boost * 100}%`; h.boostFill.classList.toggle('lock', s.boostLock);
    this.setText('bombs', h.bombs, '<i class="bomb"></i>'.repeat(Math.min(9, s.bombs)) || '<span class="dim">NO BOMBS</span>');
    const wingsBroken = s.wings.L <= 0 || s.wings.R <= 0;
    this.setText('laser', h.laser, `<span class="lz l${s.laser}">${['SINGLE', 'TWIN', 'HYPER'][s.laser]}</span>${wingsBroken ? '<span class="wingwarn">WING DMG</span>' : ''}`);
    this.setText('lives', h.lives, `<i class="life"></i>×${Math.max(0, s.lives)}`);
    for (const w of s.wingmates) {
      const el = this.wingCanvases[w.key];
      el.classList.toggle('gone', !w.present || !w.active);
      el.classList.toggle('trouble', !!w.trouble);
      el.querySelector('.whp div').style.width = `${Math.max(0, w.hp)}%`;
    }
    const gizmo = s.wingmates.find((w) => w.key === 'gizmo');
    const showBoss = s.boss && !s.boss.gone && gizmo && gizmo.active && !s.attract;
    h.boss.classList.toggle('show', !!showBoss);
    if (showBoss) { this.setText('bossn', h.bossName, s.boss.name); h.bossFill.style.width = `${bossHp(s.boss) * 100}%`; }
    h.attract.classList.toggle('show', s.attract);
    this.drawOverlay(s, camera, dt);
    this.updateCommBox(dt);
  }
  project(pos, camera) {
    _v.copy(pos).project(camera);
    if (_v.z > 1) return null;
    return { x: (_v.x * 0.5 + 0.5) * this.overlay.width, y: (-_v.y * 0.5 + 0.5) * this.overlay.height, z: _v.z };
  }
  drawOverlay(s, camera, dt) {
    const c = this.octx, W = this.overlay.width, H = this.overlay.height, k = this.dpr * Math.min(1.4, Math.max(0.7, H / this.dpr / 900));
    c.clearRect(0, 0, W, H);
    const p = s.player;
    c.lineJoin = 'round';
    // reticle
    if (!s.dead && s.phase === 'play') {
      const near = this.project(_v.copy(p.pos).addScaledVector(p.fwd, 45), camera);
      const far = this.project(_v.copy(p.pos).addScaledVector(p.fwd, 110), camera);
      const lockCol = s.lock ? '#ff4d6a' : '#7dffa0';
      if (near) this.square(c, near.x, near.y, 22 * k, lockCol, 3 * k);
      if (far) {
        this.square(c, far.x, far.y, 14 * k, lockCol, 3 * k);
        if (s.charge > 0) { c.strokeStyle = s.charge >= 1 ? '#ffd34d' : '#7dffa0'; c.lineWidth = 4 * k; c.beginPath(); c.arc(far.x, far.y, 26 * k, -Math.PI / 2, -Math.PI / 2 + s.charge * Math.PI * 2); c.stroke(); }
      }
      // lock-on brackets
      if (s.lock && !s.lock.dead) {
        const lp = this.project(s.lock.aimPos || s.lock.obj.position, camera);
        if (lp) {
          const t = performance.now() / 1000, r = (28 + Math.sin(t * 10) * 4) * k;
          c.save(); c.translate(lp.x, lp.y); c.rotate(t * 2);
          c.strokeStyle = '#ff4d6a'; c.lineWidth = 4 * k;
          for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(r, r * 0.4); c.lineTo(r, r); c.lineTo(r * 0.4, r); c.stroke(); }
          c.restore();
          this.text(c, 'LOCK', lp.x, lp.y - 40 * k, 16 * k, '#ff4d6a');
        }
      }
    }
    // ace name tags and health
    for (const e of s.enemies) {
      if (e.dead || !(e.ace || (e.type === 'bomber'))) continue;
      const ep = this.project(e.obj.position, camera);
      if (!ep || ep.x < 0 || ep.x > W || ep.y < 0 || ep.y > H) { if (e.ace) this.edgeArrow(c, e.obj.position, camera, '#d05cff', e.name, k); continue; }
      const bw = 60 * k;
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(ep.x - bw / 2, ep.y - 34 * k, bw, 7 * k);
      c.fillStyle = e.ace ? '#d05cff' : '#ffb04d'; c.fillRect(ep.x - bw / 2, ep.y - 34 * k, bw * (e.hp / e.maxHp), 7 * k);
      if (e.ace) this.text(c, e.name.toUpperCase(), ep.x, ep.y - 42 * k, 15 * k, '#e8c0ff');
    }
    // wingmates in trouble
    for (const w of s.wingmates) {
      if (!w.trouble || !w.active) continue;
      const wp = this.project(w.pos, camera);
      if (wp && wp.x > 0 && wp.x < W && wp.y > 0 && wp.y < H) {
        const t = performance.now() / 1000;
        c.strokeStyle = '#7ad8ff'; c.lineWidth = 3 * k; c.beginPath(); c.arc(wp.x, wp.y, (24 + Math.sin(t * 8) * 4) * k, 0, 7); c.stroke();
        this.text(c, 'HELP!', wp.x, wp.y - 36 * k, 18 * k, '#7ad8ff');
      } else this.edgeArrow(c, w.pos, camera, '#7ad8ff', 'HELP', k);
    }
    // boss off-screen arrow
    if (s.boss && !s.boss.gone && s.mode === 'allrange') {
      const bp = s.boss.obj.position; const pp = this.project(bp, camera);
      if (!pp || pp.x < 0 || pp.x > W || pp.y < 0 || pp.y > H) this.edgeArrow(c, bp, camera, '#ff4fa8', 'BOSS', k);
    }
    // radar
    if (s.mode === 'allrange' && s.phase !== 'clear') this.radar(c, s, W, H, k);
    // popups
    for (const pu of this.popups) {
      pu.t += dt;
      const pp = this.project(pu.pos, camera);
      if (!pp) continue;
      c.globalAlpha = Math.max(0, 1 - pu.t / 1.4);
      this.text(c, pu.text, pp.x, pp.y - pu.t * 50 * k, 22 * k, pu.color);
      c.globalAlpha = 1;
    }
    this.popups = this.popups.filter((p) => p.t < 1.4);
  }
  square(c, x, y, r, col, lw) {
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = lw + 3; c.strokeRect(x - r, y - r, r * 2, r * 2);
    c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(x - r, y - r, r * 2, r * 2);
  }
  text(c, t, x, y, size, col) {
    c.font = `800 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = size * 0.22; c.strokeStyle = 'rgba(10,10,30,0.9)'; c.strokeText(t, x, y);
    c.fillStyle = col; c.fillText(t, x, y);
  }
  edgeArrow(c, pos, camera, col, label, k) {
    const W = this.overlay.width, H = this.overlay.height;
    _v.copy(pos).applyMatrix4(camera.matrixWorldInverse);
    let ang = Math.atan2(-_v.y, _v.x);
    if (_v.z > 0 && Math.abs(_v.x) < 1e-3) ang = Math.PI / 2;
    const cx = W / 2, cy = H / 2, rx = W / 2 - 60 * k, ry = H / 2 - 60 * k;
    const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = col; c.strokeStyle = '#0a0a1e'; c.lineWidth = 3 * k;
    c.beginPath(); c.moveTo(18 * k, 0); c.lineTo(-10 * k, -12 * k); c.lineTo(-10 * k, 12 * k); c.closePath(); c.fill(); c.stroke();
    c.restore();
    this.text(c, label, x - Math.cos(ang) * 30 * k, y - Math.sin(ang) * 30 * k, 13 * k, col);
  }
  radar(c, s, W, H, k) {
    const R = 90 * k, cx = W - R - 30 * k, cy = H - R - 30 * k, range = 700;
    c.fillStyle = 'rgba(10,20,50,0.6)'; c.strokeStyle = 'rgba(125,255,160,0.7)'; c.lineWidth = 2 * k;
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.arc(cx, cy, R * 0.5, 0, 7); c.stroke();
    const p = s.player; const yaw = p.arYaw;
    const dot = (pos, col, size) => {
      const dx = pos.x - p.pos.x, dz = pos.z - p.pos.z;
      const rx = dx * Math.cos(yaw) - dz * Math.sin(yaw), rz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
      let x = rx / range * R, y = rz / range * R; const l = Math.hypot(x, y);
      if (l > R - 4 * k) { x *= (R - 4 * k) / l; y *= (R - 4 * k) / l; }
      c.fillStyle = col; c.beginPath(); c.arc(cx + x, cy + y, size * k, 0, 7); c.fill();
    };
    for (const e of s.enemies) if (!e.dead && !e.boss) dot(e.obj.position, e.ace ? '#d05cff' : '#ff4d4d', e.ace ? 5 : 3);
    for (const pk of s.pickups) dot(pk.pos, '#ffd34d', 2.5);
    if (s.boss && !s.boss.gone) dot(s.boss.obj.position, '#ff4fa8', 9);
    const cols = { bramble: '#7aff7a', pippa: '#ff9fc4', gizmo: '#7ad8ff' };
    for (const w of s.wingmates) if (w.active) dot(w.pos, cols[w.key], 4);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(cx, cy - 7 * k); c.lineTo(cx - 5 * k, cy + 5 * k); c.lineTo(cx + 5 * k, cy + 5 * k); c.closePath(); c.fill();
  }
  popup(text, pos, color = '#fff') { this.popups.push({ text, pos: pos.clone(), color, t: 0 }); }
  damageFlash() { const f = $('#flash'); f.className = 'dmg'; void f.offsetWidth; f.className = 'dmg go'; }
  bombFlash() { const f = $('#flash'); f.className = 'bomb'; void f.offsetWidth; f.className = 'bomb go'; }
  banner(top, main, sub, dur = 2.5, style = '') {
    const b = this.bannerEl;
    b.className = 'show ' + style;
    b.innerHTML = `${top ? `<div class="top">${top}</div>` : ''}<div class="main">${main}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
    clearTimeout(this._bt); this._bt = setTimeout(() => { b.className = ''; }, dur * 1000);
  }
  hint(text, dur = 4) {
    const h = this.hintEl; h.innerHTML = text; h.className = 'show';
    clearTimeout(this._ht); this._ht = setTimeout(() => { h.className = ''; }, dur * 1000);
  }
  clearTransient() { this.bannerEl.className = ''; this.hintEl.className = ''; this.popups.length = 0; this.comm(null); }
  comm(c) {
    this.comm_ = c; this.commTyped = 0;
    if (!c) { this.commEl.classList.remove('show'); return; }
    this.commEl.classList.add('show');
    this.commEl.classList.toggle('enemy', ['ratchet', 'vex', 'snarl', 'quill'].includes(c.who));
    this.commEl.querySelector('.who').textContent = c.name;
    this.commEl.querySelector('.txt').textContent = '';
  }
  updateCommBox(dt) {
    const c = this.comm_; if (!c) return;
    this.commTyped = Math.min(c.text.length, this.commTyped + dt * 55);
    const n = Math.floor(this.commTyped);
    const el = this.commEl.querySelector('.txt');
    if (el.textContent.length !== n) el.textContent = c.text.slice(0, n);
    drawPortrait(this.commCtx, c.who, this.commCanvas.width, performance.now() / 1000, n < c.text.length);
  }

  // ---------------- menus ----------------
  open(screen, data) {
    this.screen = screen; this.data = data; this.focus = 0;
    this.menuEl.className = 'show s-' + screen;
    this.render();
  }
  push(screen, data) { this.stack.push({ screen: this.screen, data: this.data, focus: this.focus }); this.open(screen, data); }
  pop() {
    const prev = this.stack.pop();
    if (!prev) return false;
    this.open(prev.screen, prev.data); this.focus = prev.focus; this.render(); return true;
  }
  close() { this.screen = null; this.menuEl.className = ''; this.menuEl.innerHTML = ''; this.stack.length = 0; }
  render() {
    const html = SCREENS[this.screen] ? SCREENS[this.screen](this, this.data) : '';
    this.menuEl.innerHTML = html;
    this.items = [...this.menuEl.querySelectorAll('.mi')];
    this.items.forEach((el, i) => {
      el.classList.add('ui-clickable');
      el.addEventListener('mouseenter', () => { if (this.focus !== i) { this.focus = i; this.applyFocus(); this.app.audio.menuMove(); } });
      el.addEventListener('click', (ev) => { this.focus = i; this.applyFocus(); if (ev.target.closest('.arrow-l')) this.adjust(-1); else if (ev.target.closest('.arrow-r')) this.adjust(1); else this.activate(); });
    });
    this.menuEl.querySelectorAll('.ui-back').forEach((el) => el.addEventListener('click', () => this.back()));
    this.menuEl.querySelectorAll('.ui-tab').forEach((el) => el.addEventListener('click', () => { this.data = { ...(this.data || {}), tab: +el.dataset.tab }; this.render(); }));
    if (this.focus >= this.items.length) this.focus = Math.max(0, this.items.length - 1);
    this.applyFocus();
    const tw = this.menuEl.querySelector('.title-wrap');
    if (tw) { tw.classList.add('ui-clickable'); tw.addEventListener('click', () => this.activate()); }
    const pc = this.menuEl.querySelector('canvas.portrait');
    if (pc) drawPortrait(pc.getContext('2d'), pc.dataset.who, pc.width, 0, false);
    this.menuEl.querySelectorAll('canvas.portrait-sm').forEach((cv) => drawPortrait(cv.getContext('2d'), cv.dataset.who, cv.width));
    const map = this.menuEl.querySelector('canvas.map'); if (map) drawMap(map, this.data);
  }
  applyFocus() {
    this.items.forEach((el, i) => el.classList.toggle('focus', i === this.focus));
    const f = this.items[this.focus]; if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' });
  }
  updateMenu(input, dt) {
    if (!this.screen) return;
    const scroller = this.menuEl.querySelector('.scroll');
    if (this.screen === 'about' && scroller) {
      if (input.nav.down || input.ly < -0.5) scroller.scrollTop += (input.nav.down ? 60 : 0) + (input.ly < -0.5 ? 600 * dt : 0);
      if (input.nav.up || input.ly > 0.5) scroller.scrollTop -= (input.nav.up ? 60 : 0) + (input.ly > 0.5 ? 600 * dt : 0);
    }
    if (this.items.length && this.screen !== 'about') {
      if (input.nav.down) { this.focus = (this.focus + 1) % this.items.length; this.applyFocus(); this.app.audio.menuMove(); }
      if (input.nav.up) { this.focus = (this.focus - 1 + this.items.length) % this.items.length; this.applyFocus(); this.app.audio.menuMove(); }
      if (input.nav.left) this.adjust(-1);
      if (input.nav.right) this.adjust(1);
    }
    if (this.screen === 'howto') {
      if (input.pressed.tabL || (input.nav.left && !this.items.length)) { this.data = { ...(this.data || {}), tab: ((this.data?.tab || 0) + 3) % 4 }; this.render(); this.app.audio.menuMove(); }
      if (input.pressed.tabR || (input.nav.right && !this.items.length)) { this.data = { ...(this.data || {}), tab: ((this.data?.tab || 0) + 1) % 4 }; this.render(); this.app.audio.menuMove(); }
    }
    if (input.pressed.confirm) this.activate();
    else if (input.pressed.back) this.back();
  }
  adjust(dir) {
    const el = this.items[this.focus]; if (!el || !el.dataset.set) return;
    const key = el.dataset.set; const def = SETTING_DEFS.find((d) => d.key === key);
    if (!def) return;
    if (def.type === 'bool') settings[key] = !settings[key];
    else if (def.type === 'choice') { const i = def.options.indexOf(settings[key]); settings[key] = def.options[(i + dir + def.options.length) % def.options.length]; }
    else if (def.type === 'range') settings[key] = Math.round(Math.max(def.min, Math.min(def.max, settings[key] + def.step * dir)) * 100) / 100;
    saveSettings(); this.app.audio.applyVolumes(); this.app.audio.menuMove();
    const f = this.focus; this.render(); this.focus = f; this.applyFocus();
  }
  activate() {
    const el = this.items[this.focus];
    if (!el) { if (this.screen === 'about' || this.screen === 'howto') this.back(); return; }
    if (el.dataset.set) { this.adjust(1); return; }
    this.app.audio.menuOk();
    this.app.menuAction(el.dataset.act, el.dataset, this.screen);
  }
  back() {
    this.app.audio.menuBack();
    this.app.menuAction('back', {}, this.screen);
  }
}

// ---------------- settings definitions ----------------
const SETTING_DEFS = [
  { key: 'invertPadX', label: 'Invert Horizontal (Controller)', type: 'bool', help: 'Fixes controllers that report left/right flipped' },
  { key: 'invertPadY', label: 'Invert Vertical (Controller)', type: 'bool', help: 'Fixes controllers that report up/down flipped' },
  { key: 'flightY', label: 'Flight Pitch', type: 'choice', options: ['normal', 'pilot'], names: { normal: 'Normal', pilot: 'Pilot (Inverted)' }, help: 'Pilot: push forward to dive' },
  { key: 'difficulty', label: 'Difficulty', type: 'choice', options: ['easy', 'normal', 'hard'], names: { easy: 'Cadet', normal: 'Pilot', hard: 'Ace' }, help: 'Damage taken, enemy fire rate and toughness' },
  { key: 'master', label: 'Master Volume', type: 'range', min: 0, max: 1, step: 0.1 },
  { key: 'music', label: 'Music Volume', type: 'range', min: 0, max: 1, step: 0.1 },
  { key: 'sfx', label: 'Effects Volume', type: 'range', min: 0, max: 1, step: 0.1 },
  { key: 'voice', label: 'Radio Chatter Volume', type: 'range', min: 0, max: 1, step: 0.1 },
  { key: 'vibration', label: 'Vibration', type: 'bool' },
  { key: 'shake', label: 'Screen Shake', type: 'bool' },
  { key: 'hints', label: 'Tutorial Hints', type: 'bool' },
  { key: 'deadzone', label: 'Stick Deadzone', type: 'range', min: 0.05, max: 0.35, step: 0.05 },
];
function settingValue(d) {
  const v = settings[d.key];
  if (d.type === 'bool') return v ? 'ON' : 'OFF';
  if (d.type === 'choice') return d.names[v] || v;
  if (d.key === 'deadzone') return v.toFixed(2);
  return `<span class="meter">${'<i></i>'.repeat(Math.round(v * 10))}${'<i class="off"></i>'.repeat(10 - Math.round(v * 10))}</span>`;
}

function footer(ui, items) {
  return `<div class="footer">${items.map(([a, t]) => `<span>${ui.btn(a)} ${t}</span>`).join('')}</div>`;
}

const SCREENS = {
  touch: (ui) => `
    <div class="center-card">
      <div class="logo small">STUFFOX<span>64</span></div>
      <div class="big-msg">Controller or keyboard required</div>
      <p class="muted">Connect a controller (PS5 DualSense recommended) or a keyboard to play.</p>
      <div class="list narrow"><div class="mi" data-act="settings">Settings</div></div>
    </div>`,
  title: (ui) => `
    <div class="title-wrap">
      <div class="logo">STUFFOX<span>64</span></div>
      <div class="tagline">A plush squadron vs. the Clockwork Armada</div>
      <div class="press">Press ${ui.btn('confirm')} to start</div>
      ${bestLine()}
    </div>
    <div class="list hidden"><div class="mi" data-act="start">Start</div></div>`,
  main: (ui) => `
    <div class="menu-wrap">
      <div class="logo small">STUFFOX<span>64</span></div>
      <div class="list">
        <div class="mi" data-act="new">Start Mission<small>Stage 1 → 2 campaign · ${DIFF[settings.difficulty].label}</small></div>
        <div class="mi" data-act="select">Stage Select<small>Jump to any stage</small></div>
        <div class="mi" data-act="howto">How to Play<small>Controls, moves, items</small></div>
        <div class="mi" data-act="settings">Settings<small>Controls, audio, accessibility</small></div>
        <div class="mi" data-act="about">About &amp; Credits<small>Source info &amp; feedback</small></div>
      </div>
      ${bestLine()}
    </div>
    ${footer(ui, [['confirm', 'Select'], ['back', 'Title']])}`,
  select: (ui) => `
    <div class="menu-wrap">
      <h1>Stage Select</h1>
      <div class="cards">
        ${[0, 1].map((i) => {
          const st = i === 0 ? { n: 'QUILTARA', d: 'Rail mission · Sea, plains, city or canyon route · Boss: Windup Colossus', c: 'c1' } : { n: 'BUTTON BELT', d: 'All-Range mission · Asteroids, rival aces · Boss: The Music Box', c: 'c2' };
          return `<div class="mi card ${st.c}" data-act="stage" data-stage="${i}"><div class="num">STAGE ${i + 1}</div><div class="nm">${st.n}</div><div class="ds">${st.d}</div>
            <div class="rec">Best ${String(save.best[i + 1] || 0).padStart(7, '0')} ${save.medals[i + 1] ? '<span class="medal">★</span>' : ''}</div></div>`;
        }).join('')}
      </div>
    </div>
    ${footer(ui, [['confirm', 'Launch'], ['back', 'Back']])}`,
  settings: (ui) => `
    <div class="menu-wrap wide">
      <h1>Settings</h1>
      <div class="list settings scroll">
        ${SETTING_DEFS.map((d) => `<div class="mi row" data-set="${d.key}"><div class="lbl">${d.label}${d.help ? `<small>${d.help}</small>` : ''}</div><div class="val"><span class="arrow-l">◀</span>${settingValue(d)}<span class="arrow-r">▶</span></div></div>`).join('')}
        <div class="mi" data-act="reset">Reset to Defaults</div>
        <div class="mi" data-act="back">Back</div>
      </div>
    </div>
    ${footer(ui, [['confirm', 'Change'], ['stick', '◀ ▶ Adjust'], ['back', 'Back']])}`,
  howto: (ui, data) => {
    const tab = (data && data.tab) || 0;
    const tabs = ['Controls', 'Maneuvers', 'Items', 'Scoring'];
    const row = (a, t) => `<div class="ctl"><span class="k">${a}</span><span class="t">${t}</span></div>`;
    const b = (a) => ui.btn(a);
    const pages = [
      `<div class="ctls">${row(ui.glyph('stick'), 'Steer the Plushwing')}${row(b('fire'), 'Tap: lasers · Hold: charge lock-on blast')}${row(b('bomb'), 'Plush Bomb (press again to detonate)')}${row(b('boost'), 'Boost')}${row(b('brake'), 'Brake')}${row(`${b('bankL')} ${b('bankR')}`, 'Hold: bank-turn · Double-tap: Barrel Roll')}${row(b('loop'), 'Somersault · with ' + b('brake') + ': U-Turn (All-Range)')}${row(b('pause'), 'Pause')}</div>
       <p class="muted">Keyboard: WASD/Arrows steer · Space/J fire · K bomb · Shift boost · Ctrl brake · Q/E bank · R somersault · Esc pause. Mouse: left fire, right bomb.</p>`,
      `<div class="tips">
        <div class="tip"><b>Barrel Roll</b>Double-tap a bank button. While spinning you bounce enemy shots back at them.</div>
        <div class="tip"><b>Charged Lock-on</b>Hold fire until the ring fills, sweep the reticle over a target, release. The blast hits everything nearby: multi-kills award bonus hits.</div>
        <div class="tip"><b>Somersault</b>Loop up and over to get behind chasers. Uses boost gauge.</div>
        <div class="tip"><b>U-Turn</b>All-Range only: hold brake and press somersault to flip 180°.</div>
        <div class="tip"><b>Bank-turn</b>Hold a bank button toward your turn to cut sharper corners.</div>
        <div class="tip"><b>Wingmates</b>When a teammate calls for help, shoot their pursuers. If they fall, they miss the next stage. Gizmo scans boss shields.</div>
      </div>`,
      `<div class="tips">
        <div class="tip"><b>Silver Ring</b>Restores some shield.</div>
        <div class="tip"><b>Gold Ring</b>Restores more. 3 extend max shield, 6 grant an extra life.</div>
        <div class="tip"><b>Laser Pod</b>Single → Twin → Hyper lasers. Losing a wing drops you to single.</div>
        <div class="tip"><b>Plush Bomb</b>+1 bomb.</div>
        <div class="tip"><b>Wing Patch</b>Re-stitches broken wings.</div>
        <div class="tip"><b>Checkpoint Ring</b>Respawn here if you go down.</div>
        <div class="tip"><b>Flare Gates</b>Fly through every gate to open a secret route.</div>
      </div>`,
      `<div class="tips">
        <div class="tip"><b>Hits</b>Every enemy downed by you is a hit. Big enemies are worth more.</div>
        <div class="tip"><b>Bonus</b>Multi-kills with charged shots or bombs, crushing enemies with toppled towers.</div>
        <div class="tip"><b>Medals</b>Reach the stage's hit target (Quiltara 90, Button Belt 60) for a medal.</div>
        <div class="tip"><b>Wingmates</b>Each wingmate still flying at stage end adds 500 points.</div>
      </div>`,
    ];
    return `<div class="menu-wrap wide"><h1>How to Play</h1>
      <div class="tabs">${b('tabL')}${tabs.map((t, i) => `<span class="ui-tab ui-clickable ${i === tab ? 'on' : ''}" data-tab="${i}">${t}</span>`).join('')}${b('tabR')}</div>
      <div class="page">${pages[tab]}</div></div>
      ${footer(ui, [['tabs', 'Switch tab'], ['back', 'Back']])}`;
  },
  about: (ui) => `
    <div class="menu-wrap wide"><h1>About &amp; Credits</h1>
      <div class="scroll about">${ABOUT_SECTIONS.map((s) => `<h2>${s.title}</h2>${s.items.map((i) => `<p>${i}</p>`).join('')}`).join('')}</div>
    </div>
    ${footer(ui, [['stick', 'Scroll'], ['back', 'Back']])}`,
  briefing: (ui, d) => `
    <div class="brief">
      <div class="brief-l"><canvas class="portrait" data-who="woolsey" width="220" height="220"></canvas><div class="who">Gen. Woolsey</div></div>
      <div class="brief-r">
        <div class="num">STAGE ${d.stage.id}</div><h1>${d.stage.name}</h1>
        ${d.stage.briefing.map(([, t]) => `<p>${t}</p>`).join('')}
        <canvas class="map" width="640" height="200"></canvas>
        <div class="list narrow"><div class="mi" data-act="launch">Launch</div></div>
      </div>
    </div>
    ${footer(ui, [['confirm', 'Launch'], ['back', 'Back']])}`,
  pause: (ui) => `
    <div class="menu-wrap">
      <h1>Paused</h1>
      <div class="list">
        <div class="mi" data-act="resume">Resume</div>
        <div class="mi" data-act="restart">Restart Stage</div>
        <div class="mi" data-act="howto">How to Play</div>
        <div class="mi" data-act="settings">Settings</div>
        <div class="mi" data-act="quit">Quit to Title</div>
      </div>
    </div>
    ${footer(ui, [['confirm', 'Select'], ['back', 'Resume']])}`,
  results: (ui, r) => `
    <div class="menu-wrap wide results">
      <div class="num">STAGE ${r.stage.id} CLEAR</div><h1>${r.stage.name}</h1>
      <div class="tally">
        <div class="big"><span>ENEMIES DOWNED</span><b class="count" data-to="${r.hits}">0</b></div>
        <div class="medalrow ${r.medal ? 'got' : ''}">${r.medal ? '★ MEDAL EARNED' : `Medal target: ${r.stage.medal} hits`}</div>
        ${r.stage.id === 1 ? `<div class="line">Route: <b>${r.route === 'B' ? 'Hem Canyon (secret)' : 'Thimble City'}</b></div>` : ''}
        <div class="team">${r.wingmates.map((w) => `<div class="tm ${w.hp > 0 ? '' : 'down'}"><canvas class="portrait-sm" data-who="${w.key}" width="72" height="72"></canvas><span>${w.hp > 0 ? `${Math.round(w.hp)}%` : 'REPAIRS'}</span></div>`).join('')}</div>
        <div class="line">Team bonus <b>+${r.wingAlive * 500}</b></div>
        <div class="line">Score <b>${String(r.carry.score).padStart(7, '0')}</b></div>
      </div>
      <div class="list narrow"><div class="mi" data-act="next">${r.stage.id === 1 ? 'Continue to Stage 2' : 'Finish'}</div></div>
    </div>`,
  gameover: (ui) => `
    <div class="menu-wrap">
      <h1 class="red">GAME OVER</h1>
      <p class="muted">The Clockwork Armada keeps on ticking...</p>
      <div class="list"><div class="mi" data-act="continue">Continue (score resets)</div><div class="mi" data-act="quit">Quit to Title</div></div>
    </div>`,
  demoend: (ui, d) => `
    <div class="menu-wrap wide">
      <div class="logo small">STUFFOX<span>64</span></div>
      <h1>Demo Complete!</h1>
      <p>Baron Ratchet's flagship is scrap and Quiltara is safe... for now.</p>
      <div class="line big">Final Score <b>${String(d.score).padStart(7, '0')}</b></div>
      <p class="muted">Thanks for flying with the Stuffox team. The full journey through the Fennix system continues in the complete game.</p>
      <div class="list narrow"><div class="mi" data-act="credits">Credits</div><div class="mi" data-act="quit">Title Screen</div></div>
    </div>`,
};
function bestLine() {
  const b1 = save.best[1] || 0, b2 = save.best[2] || 0;
  if (!b1 && !b2) return '';
  return `<div class="best">BEST · Quiltara ${String(b1).padStart(7, '0')}${save.medals[1] ? ' ★' : ''} · Button Belt ${String(b2).padStart(7, '0')}${save.medals[2] ? ' ★' : ''}</div>`;
}
function drawMap(cv, d) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#0e1a3a'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(120,180,255,0.15)'; for (let x = 0; x < W; x += 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  const pts = [[70, 140, 'Quiltara', '#6cc05a'], [320, 70, 'Button Belt', '#b07aff'], [560, 120, '???', '#555']];
  c.lineWidth = 4; c.setLineDash([10, 8]); c.strokeStyle = '#ffd34d';
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.quadraticCurveTo(200, 30, pts[1][0], pts[1][1]); c.stroke();
  c.strokeStyle = '#555'; c.beginPath(); c.moveTo(pts[1][0], pts[1][1]); c.quadraticCurveTo(450, 160, pts[2][0], pts[2][1]); c.stroke(); c.setLineDash([]);
  pts.forEach(([x, y, n, col], i) => {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, i === d.stage.id - 1 ? 26 : 18, 0, 7); c.fill();
    c.strokeStyle = i === d.stage.id - 1 ? '#fff' : '#223'; c.lineWidth = 4; c.stroke();
    c.fillStyle = '#fff'; c.font = '700 18px "Trebuchet MS", sans-serif'; c.textAlign = 'center'; c.fillText(n, x, y + 46);
  });
}
