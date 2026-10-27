// ---------------------------------------------------------------- HUD (canvas 2D), comms portraits, hints
const txt = (a) => Input.label(a).replace(/<[^>]+>/g, '');
const HINTS = {
  move: () => `Move your ship with ${txt('move')}. Aim the reticle with ${txt('aim')}.`, fire: () => `Hold ${txt('fire')} to fire your lasers.`, bank: () => `Fly around the pillars. Slam into one and you lose shield.`,
  roll: () => `Tap ${txt('rollL')} or ${txt('rollR')} for a barrel roll: reflects enemy shots!`, lock: () => `Hold ${txt('charge')} to charge. Targets in the reticle get locked. Release to fire!`,
  bomb: () => `Press ${txt('bomb')} to fire a Nova Bomb. It clears the whole screen!`, shock: () => `Fly HIGH to jump the shockwave!`, uturn: () => `Hold ${txt('boost')} and pull the stick down for a U-turn.`, loop: () => `Hold ${txt('boost')} and push the stick up for a loop.`,
};
const WHO_FACE = {
  hop: (c, r, t) => { c.fillStyle = '#f2f0e0'; for (const s of [-1, 1]) { ell(c, s * r * 0.35, -r * 0.85, r * 0.2, r * 0.7, '#f2f0e0', 3); ell(c, s * r * 0.35, -r * 0.85, r * 0.1, r * 0.5, '#ff9ab8'); } ell(c, 0, 0, r * 0.7, r * 0.65, '#f2f0e0', 3); eyes(c, r, '#222'); ell(c, 0, r * 0.12, r * 0.1, r * 0.07, '#ff7a9a'); whisk(c, r, '#444'); mouth(c, r * 0.3, t); },
  pip: (c, r, t) => { for (const s of [-1, 1]) { ell(c, s * r * 0.45, -r * 0.55, r * 0.3, r * 0.3, '#9be15a', 3); ell(c, s * r * 0.45, -r * 0.55, r * 0.2, r * 0.2, '#fff'); ell(c, s * r * 0.45, -r * 0.52, r * 0.09, r * 0.09, '#111'); } ell(c, 0, r * 0.05, r * 0.85, r * 0.6, '#9be15a', 3); ell(c, -r * 0.25, r * 0.0, r * 0.07, r * 0.05, '#4a8a2a'); ell(c, r * 0.25, r * 0.0, r * 0.07, r * 0.05, '#4a8a2a'); mouth(c, r * 0.5, t, 0.28); },
  rook: (c, r, t) => { ell(c, 0, 0, r * 0.7, r * 0.75, '#2e2842', 3); tri(c, [[-r * 0.13, 0.1 * r], [r * 0.13, 0.1 * r], [0, r * 0.55 + t * r * 0.1]], '#ffa030'); for (const s of [-1, 1]) { ell(c, s * r * 0.3, -r * 0.15, r * 0.14, r * 0.12, '#ffe23a'); ell(c, s * r * 0.3, -r * 0.15, r * 0.05, r * 0.05, '#111'); } c.strokeStyle = '#111'; c.lineWidth = 4; c.beginPath(); c.moveTo(-r * 0.45, -r * 0.35); c.lineTo(-r * 0.12, -r * 0.25); c.moveTo(r * 0.45, -r * 0.35); c.lineTo(r * 0.12, -r * 0.25); c.stroke(); tri(c, [[-r * 0.2, -r * 0.7], [0, -r * 1.0], [r * 0.2, -r * 0.7]], '#2e2842'); },
  biscuit: (c, r, t) => { for (const s of [-1, 1]) tri(c, [[s * r * 0.3, -r * 0.5], [s * r * 0.75, -r * 1.05], [s * r * 0.8, -r * 0.2]], '#d9a066', 3); ell(c, 0, 0, r * 0.75, r * 0.68, '#d9a066', 3); ell(c, 0, r * 0.2, r * 0.38, r * 0.4, '#fff3dc'); eyes(c, r, '#222'); ell(c, 0, r * 0.16, r * 0.1, r * 0.07, '#222'); mouth(c, r * 0.36, t); if (t > 0.3) ell(c, 0, r * 0.5, r * 0.12, r * 0.12, '#ff7a9a'); },
  gnarl: (c, r, t) => { for (const s of [-1, 1]) tri(c, [[s * r * 0.3, -r * 0.5], [s * r * 0.85, -r * 1.1], [s * r * 0.9, -r * 0.1]], '#6e5f50', 3); ell(c, 0, 0, r * 0.78, r * 0.7, '#8a7a68', 3); for (const s of [-1, 1]) { ell(c, s * r * 0.3, -r * 0.1, r * 0.14, r * 0.1, '#ff4a2a'); ell(c, s * r * 0.3, -r * 0.1, r * 0.05, r * 0.05, '#000'); } c.fillStyle = '#222'; c.fillRect(-r * 0.45, -r * 0.3, r * 0.3, r * 0.13); ell(c, 0, r * 0.2, r * 0.12, r * 0.08, '#111'); mouth(c, r * 0.45, t, 0.25); c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) tri(c, [[i * r * 0.12 - r * 0.05, r * 0.4], [i * r * 0.12 + r * 0.05, r * 0.4], [i * r * 0.12, r * 0.52]], '#fff'); },
  claw: (c, r, t) => { for (const s of [-1, 1]) tri(c, [[s * r * 0.35, -r * 0.5], [s * r * 0.6, -r * 1.0], [s * r * 0.8, -r * 0.3]], '#2a2236', 3); ell(c, 0, 0, r * 0.75, r * 0.68, '#2a2236', 3); for (const s of [-1, 1]) { ell(c, s * r * 0.3, -r * 0.1, r * 0.17, r * 0.09, '#ffb000'); ell(c, s * r * 0.3, -r * 0.1, r * 0.04, r * 0.09, '#000'); } c.strokeStyle = '#ffb000'; c.lineWidth = 3; c.beginPath(); c.moveTo(r * 0.45, -r * 0.45); c.lineTo(r * 0.2, -r * 0.05); c.stroke(); ell(c, 0, r * 0.15, r * 0.1, r * 0.07, '#ff7a9a'); mouth(c, r * 0.4, t, 0.2); whisk(c, r, '#aaa'); },
  hero: (c, r, t) => { for (const s of [-1, 1]) tri(c, [[s * r * 0.3, -r * 0.5], [s * r * 0.65, -r * 1.0], [s * r * 0.8, -r * 0.25]], '#ff9a3a', 3); ell(c, 0, 0, r * 0.75, r * 0.68, '#ff9a3a', 3); c.strokeStyle = '#c4601a'; c.lineWidth = 3; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * r * 0.2, -r * 0.65); c.lineTo(i * r * 0.2, -r * 0.4); c.stroke(); } eyes(c, r, '#222'); ell(c, 0, r * 0.12, r * 0.1, r * 0.07, '#ff7a9a'); whisk(c, r, '#fff'); mouth(c, r * 0.3, t); },
};
function ell(c, x, y, rx, ry, fill, stroke) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = stroke; c.strokeStyle = '#150f2b'; c.stroke(); } }
function tri(c, pts, fill, stroke) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); c.lineTo(pts[1][0], pts[1][1]); c.lineTo(pts[2][0], pts[2][1]); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = stroke; c.strokeStyle = '#150f2b'; c.stroke(); } }
function eyes(c, r, col) { for (const s of [-1, 1]) { ell(c, s * r * 0.28, -r * 0.1, r * 0.13, r * 0.15, '#fff', 2); ell(c, s * r * 0.28, -r * 0.08, r * 0.06, r * 0.08, col); } }
function whisk(c, r, col) { c.strokeStyle = col; c.lineWidth = 2; for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(s * r * 0.3, r * 0.2 + i * 6); c.lineTo(s * r * 0.85, r * 0.15 + i * 14); c.stroke(); } }
function mouth(c, y, t, w = 0.22) { const r = 60; c.beginPath(); c.ellipse(0, y, r * w, 3 + t * 16, 0, 0, TAU); c.fillStyle = '#5a1020'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#150f2b'; c.stroke(); }
function drawFace(c, who, cx, cy, r, talk) {
  c.save(); c.translate(cx, cy); const info = WHO[who] || WHO.hero; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#2a1d66'; c.fill(); c.save(); c.clip();
  const grd = c.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r); grd.addColorStop(0, '#5a47c0'); grd.addColorStop(1, '#241a5c'); c.fillStyle = grd; c.fillRect(-r, -r, r * 2, r * 2); c.translate(0, r * 0.2); c.scale(r / 100 * 1.0, r / 100 * 1.0); (WHO_FACE[who] || WHO_FACE.hero)(c, 100, talk); c.restore(); c.lineWidth = 5; c.strokeStyle = info.c2; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.restore();
}

const Comms = {
  queue: [], cur: null, t: 0, chars: 0, hold: 0, delay: 0,
  reset() { this.queue.length = 0; this.cur = null; this.delay = 0; },
  say(id, delay = 0, custom) { const lines = custom || COMMS[id]; if (!lines) return; if (Game.attract && false) return; this.queue.push(...lines.map(([who, text]) => ({ who, text, d: delay }))); if (!this.cur) this.delay = delay; },
  advice() { const pool = Game.kind === 'rail' ? (Game.boss && !Game.boss.dead ? ADVICE.boss : ADVICE.rail) : ADVICE.ar; const who = pick(['hop', 'pip', 'rook']); this.queue.unshift({ who, text: pick(pool), d: 0 }); if (this.cur) { this.cur = null; } A.play('radio'); },
  update(dt) {
    if (!this.cur) { if (!this.queue.length) return; this.delay -= dt; if (this.delay > 0) return; this.cur = this.queue.shift(); this.chars = 0; this.t = 0; this.hold = 0; A.play('radio'); return; }
    const c = this.cur, cps = Settings.textSpeed >= 99 ? 999 : 26 * Settings.textSpeed; this.t += dt; const before = Math.floor(this.chars); this.chars = Math.min(c.text.length, this.chars + dt * cps); const after = Math.floor(this.chars);
    for (let i = before; i < after; i++) if (i % 2 === 0 && c.text[i] !== ' ') A.blip(c.who, c.text.charCodeAt(i));
    if (this.chars >= c.text.length) { this.hold += dt; if (this.hold > 1.8 + c.text.length * 0.03) { this.cur = null; this.delay = 0.25; } }
  },
  talking() { return this.cur && this.chars < this.cur.text.length; },
};

const Hud = {
  cv: null, ctx: null, popups: [], alert_: null, bannerT: 0, banner_: null, hints: [], hintCur: null, bossBar: null, hurtT: {}, pipHurt: 0, tick: 0,
  init() { this.cv = $('#hud'); this.ctx = this.cv.getContext('2d'); },
  reset() { this.popups.length = 0; this.alert_ = null; this.bannerT = 0; this.hintCur = null; this.hints.length = 0; this.bossBar = null; this.hurtT = {}; },
  banner(t, sub) { this.banner_ = { t, sub }; this.bannerT = 3.6; },
  alert(text, color = '#ff5b6b', t = 2) { this.alert_ = { text, color, t, t0: t }; },
  hint(id) { if (!Settings.hints || Game.attract || !HINTS[id]) return; if (Game.hintsShown['h_' + id]) return; Game.hintsShown['h_' + id] = true; this.hints.push(id); },
  popup(pos, text, color) { this.popups.push({ pos: pos.clone(), text, color, t: 0 }); if (this.popups.length > 30) this.popups.shift(); },
  hurt(p, dmg) { this.hurtT[p.slot] = 0.6; },
  update(dt) {
    this.tick += dt; this.bannerT = Math.max(0, this.bannerT - dt); if (this.alert_) { this.alert_.t -= dt; if (this.alert_.t <= 0) this.alert_ = null; }
    for (const p of this.popups) p.t += dt; this.popups = this.popups.filter((p) => p.t < 1.1); this.pipHurt = Math.max(0, this.pipHurt - dt * 2);
    for (const k in this.hurtT) this.hurtT[k] = Math.max(0, this.hurtT[k] - dt);
    if (this.hintCur) { this.hintCur.t -= dt; if (this.hintCur.t <= 0) this.hintCur = null; } else if (this.hints.length && !Game.paused) this.hintCur = { id: this.hints.shift(), t: 5.5, t0: 5.5 };
  },
  proj(pos, view) { const v = pos.clone().project(view.cam); return { x: view.x + (v.x * 0.5 + 0.5) * view.w, y: view.y + (-v.y * 0.5 + 0.5) * view.h, behind: v.z > 1 || v.z < -1, z: v.z }; },
  draw(views) {
    const c = this.ctx, cv = this.cv, dpr = cv.width / innerWidth; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    const fl = $('#flash'); if (!Game.active) { fl.style.opacity = 0; return; }
    const fi = Game.flash * (Settings.reduceFlash ? 0.25 : 0.7); fl.style.opacity = fi; fl.style.background = Game.flash > 0.6 && Game.bombs.length ? '#fff6c0' : '#ff2a2a';
    const W = innerWidth, H = innerHeight, rail = Game.kind === 'rail', n = Game.pilots.length;
    for (const v of views) { c.save(); c.beginPath(); c.rect(v.x, v.y, v.w, v.h); c.clip(); this.drawView(c, v, rail); c.restore(); }
    if (!rail && n > 1) { c.strokeStyle = '#150f2b'; c.lineWidth = 6; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); if (n > 2) { c.moveTo(0, H / 2); c.lineTo(W, H / 2); } c.stroke(); }
    const full = { x: 0, y: 0, w: W, h: H, cam: views[0].cam }; const s = Math.min(W / 1920, H / 1080);
    for (const p of this.popups) { const pr = this.proj(p.pos, views[0]); if (pr.behind) continue; c.globalAlpha = 1 - p.t / 1.1; c.font = `900 ${Math.round(30 * s)}px Impact, sans-serif`; c.textAlign = 'center'; c.lineWidth = 6 * s; c.strokeStyle = '#150f2b'; c.fillStyle = p.color; const y = pr.y - p.t * 60 * s; c.strokeText(p.text, pr.x, y); c.fillText(p.text, pr.x, y); c.globalAlpha = 1; }
    this.drawComms(c, s); this.drawBoss(c, s, W); this.drawSquad(c, s, W); this.drawBanner(c, s, W, H); this.drawHint(c, s, W, H);
    if (Game.state === 'intro' && !Game.attract) { }
  },
  drawView(c, v, rail) {
    const s = Math.min(v.w / 1920, v.h / 1080) * (rail ? 1 : 1.25), pilots = rail ? Game.pilots : [Game.pilots[v.pi]];
    for (const p of pilots) {
      if (!p) continue; const idx = Game.pilots.indexOf(p), multi = Game.pilots.length > 1;
      if (p.alive) this.drawReticle(c, p, v, s);
      if (rail && multi && p.alive) { const pr = this.proj(p.pos.clone().add(V3(0, 2.2, 0)), v); if (!pr.behind) { c.fillStyle = p.color.hex; c.strokeStyle = '#150f2b'; c.lineWidth = 4; c.font = `900 ${22 * s}px Impact`; c.textAlign = 'center'; c.strokeText('P' + (p.slot + 1), pr.x, pr.y); c.fillText('P' + (p.slot + 1), pr.x, pr.y); } }
      this.drawPanel(c, p, v, s, rail, idx);
      if (!p.alive && !p.out) { c.textAlign = 'center'; c.font = `900 ${50 * s}px Impact`; c.fillStyle = '#ffe23a'; c.strokeStyle = '#150f2b'; c.lineWidth = 8 * s; const tx = rail ? v.x + v.w / 2 + (idx - (Game.pilots.length - 1) / 2) * 260 * s : v.x + v.w / 2; c.strokeText('RESPAWNING', tx, v.y + v.h * 0.45); c.fillText('RESPAWNING', tx, v.y + v.h * 0.45); }
      if (p.out) { c.textAlign = 'center'; c.font = `900 ${50 * s}px Impact`; c.fillStyle = '#ff5b6b'; c.strokeStyle = '#150f2b'; c.lineWidth = 8 * s; const tx = rail ? v.x + v.w / 2 + (idx - (Game.pilots.length - 1) / 2) * 260 * s : v.x + v.w / 2; c.strokeText('P' + (p.slot + 1) + ' OUT', tx, v.y + v.h * 0.45); c.fillText('P' + (p.slot + 1) + ' OUT', tx, v.y + v.h * 0.45); }
      if (!rail && p.alive) { this.drawRadar(c, p, v, s); this.drawARWarnings(c, p, v, s); }
      if (Hud.hurtT[p.slot] > 0 && p.alive) { c.strokeStyle = `rgba(255,40,40,${Hud.hurtT[p.slot]})`; c.lineWidth = 26 * s; c.strokeRect(v.x + 8, v.y + 8, v.w - 16, v.h - 16); }
    }
    if (!rail) this.drawEnemyMarkers(c, v, s);
    else this.drawBars(c, v, s);
  },
  drawBars(c, v, s) { for (const e of Game.enemies) { if (e.dead || e.type === 'bossRoot' || e.type === 'bossPart' || e.def.hp < 8 || e.hp >= e.maxhp) continue; const pr = this.proj(e.pos.clone().add(V3(0, e.r + 1.5, 0)), v); if (pr.behind || pr.z > 0.995) continue; const w = 80 * s; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(pr.x - w / 2, pr.y, w, 9 * s); c.fillStyle = '#ff5b6b'; c.fillRect(pr.x - w / 2, pr.y, w * clamp(e.hp / e.maxhp, 0, 1), 9 * s); } },
  drawReticle(c, p, v, s) {
    const col = p.color.hex, far = this.proj(p.reticle, v); if (far.behind) return; const near = this.proj(p.pos.clone().lerp(p.reticle, 0.42), v);
    const ring = (x, y, r, w) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.lineWidth = w + 3 * s; c.strokeStyle = '#150f2b'; c.stroke(); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    ring(far.x, far.y, 26 * s, 3.5 * s); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.moveTo(far.x + Math.cos(a) * 14 * s, far.y + Math.sin(a) * 14 * s); c.lineTo(far.x + Math.cos(a) * 36 * s, far.y + Math.sin(a) * 36 * s); c.lineWidth = 3.5 * s; c.strokeStyle = col; c.stroke(); }
    ring(near.x, near.y, 12 * s, 2.5 * s); c.beginPath(); c.arc(far.x, far.y, 3 * s, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.moveTo(near.x, near.y); c.lineTo(far.x, far.y); c.lineWidth = 1.5 * s; c.strokeStyle = col; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1;
    if (p.charging) { c.beginPath(); c.arc(far.x, far.y, 46 * s, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge); c.lineWidth = 7 * s; c.strokeStyle = p.charge > 0.95 ? '#fff' : '#ffe23a'; c.stroke(); }
    p.locks.forEach((e, i) => { if (e.dead) return; const pr = this.proj(e.pos, v); if (pr.behind) return; const sz = clamp(900 / Math.max(10, e.pos.distanceTo(p.pos)), 22, 70) * s; c.strokeStyle = '#ff3a3a'; c.lineWidth = 4 * s; const x0 = pr.x - sz, y0 = pr.y - sz, L = sz * 0.55; for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const bx = pr.x + (sx ? sz : -sz), by = pr.y + (sy ? sz : -sz); c.beginPath(); c.moveTo(bx, by + (sy ? -L : L)); c.lineTo(bx, by); c.lineTo(bx + (sx ? -L : L), by); c.stroke(); } c.font = `900 ${22 * s}px Impact`; c.fillStyle = '#ff3a3a'; c.textAlign = 'center'; c.fillText(String(i + 1), pr.x, pr.y - sz - 6 * s); c.beginPath(); c.moveTo(far.x, far.y); c.lineTo(pr.x, pr.y); c.lineWidth = 1.5 * s; c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1; });
  },
  drawPanel(c, p, v, s, rail, idx) {
    const multi = Game.pilots.length > 1, w = 470 * s, h = 150 * s, m = 28 * s; let x, y;
    if (rail) { const pos = idx % 4; x = (pos % 2 === 0) ? v.x + m : v.x + v.w - w - m; y = pos < 2 ? v.y + v.h - h - m : v.y + v.h - h - m - (multi ? h + 10 * s : 0); if (pos >= 2 && !multi) y = v.y + m; }
    else { x = v.x + m; y = v.y + v.h - h - m; }
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(21,15,43,.78)'; rr2(c, 0, 0, w, h, 16 * s); c.fill(); c.lineWidth = 4 * s; c.strokeStyle = p.color.hex; c.stroke();
    c.fillStyle = p.color.hex; rr2(c, 12 * s, 12 * s, 58 * s, 34 * s, 10 * s); c.fill(); c.fillStyle = '#150f2b'; c.font = `900 ${26 * s}px Impact`; c.textAlign = 'center'; c.fillText('P' + (p.slot + 1), 41 * s, 38 * s);
    c.textAlign = 'right'; c.fillStyle = '#fff4d6'; c.font = `900 ${32 * s}px Impact`; c.fillText(String(Math.floor(p.score)).padStart(7, '0'), w - 16 * s, 40 * s);
    const bw = w - 32 * s, bh = 26 * s, by = 58 * s, hpk = clamp(p.hp / p.maxHp, 0, 1); c.fillStyle = 'rgba(0,0,0,.6)'; rr2(c, 16 * s, by, bw, bh, 8 * s); c.fill();
    const hcol = hpk > 0.55 ? '#4be88a' : hpk > 0.28 ? '#ffd23a' : (Math.floor(Hud.tick * 8) % 2 ? '#ff3a3a' : '#ff8a8a'); c.fillStyle = hcol; rr2(c, 16 * s, by, Math.max(2, bw * hpk), bh, 8 * s); c.fill();
    c.fillStyle = '#150f2b'; c.font = `900 ${19 * s}px Trebuchet MS, sans-serif`; c.textAlign = 'left'; c.fillText('SHIELD  ' + Math.ceil(p.hp), 24 * s, by + 19 * s);
    // boost meter
    c.fillStyle = 'rgba(0,0,0,.6)'; rr2(c, 16 * s, 96 * s, 150 * s, 12 * s, 6 * s); c.fill(); c.fillStyle = p.boostCd > 0 ? '#ff7a5a' : '#38e8ff'; rr2(c, 16 * s, 96 * s, Math.max(2, 150 * s * p.boostMeter), 12 * s, 6 * s); c.fill(); c.fillStyle = '#fff4d6'; c.font = `700 ${15 * s}px Trebuchet MS`; c.fillText('BOOST', 172 * s, 107 * s);
    // bombs
    for (let i = 0; i < Math.min(p.bombs, 9); i++) { c.beginPath(); c.arc(30 * s + i * 24 * s, 132 * s, 9 * s, 0, TAU); c.fillStyle = '#ffd23a'; c.fill(); c.lineWidth = 2.5 * s; c.strokeStyle = '#150f2b'; c.stroke(); }
    // lives + weapon
    c.textAlign = 'right'; c.fillStyle = '#fff4d6'; c.font = `900 ${22 * s}px Impact`; c.fillText('x' + p.lives, w - 16 * s, 130 * s); this.paw(c, w - 70 * s, 122 * s, 9 * s, '#ffc83a');
    c.font = `800 ${16 * s}px Trebuchet MS`; c.fillStyle = '#8ae8ff'; c.fillText(['SINGLE', 'TWIN', 'HYPER'][p.wlevel - 1] + ' LASER', w - 16 * s, 100 * s);
    c.textAlign = 'left'; c.fillStyle = '#ffe23a'; c.font = `900 ${20 * s}px Impact`; c.fillText('HITS ' + String(p.kills).padStart(3, '0'), 210 * s, 133 * s); c.restore();
  },
  paw(c, x, y, r, col) { c.fillStyle = col; c.strokeStyle = '#150f2b'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y + r * 0.4, r * 0.8, r * 0.65, 0, 0, TAU); c.fill(); c.stroke(); for (const [dx, dy] of [[-1, -0.5], [-0.35, -1.05], [0.35, -1.05], [1, -0.5]]) { c.beginPath(); c.arc(x + dx * r * 0.9, y + dy * r * 0.9, r * 0.32, 0, TAU); c.fill(); c.stroke(); } },
  drawRadar(c, p, v, s) {
    const R0 = 92 * s, cx = v.x + v.w / 2, cy = v.y + v.h - R0 - 26 * s; c.save(); c.translate(cx, cy); c.fillStyle = 'rgba(21,15,43,.7)'; c.beginPath(); c.arc(0, 0, R0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(138,232,255,.6)'; c.lineWidth = 2.5 * s; c.stroke(); c.beginPath(); c.arc(0, 0, R0 * 0.5, 0, TAU); c.lineWidth = 1.2 * s; c.stroke();
    const range = 450, dot = (pos, col, r, shape) => { const d = pos.clone().sub(p.pos), x = d.x * Math.cos(p.yaw) - d.z * Math.sin(p.yaw), z = d.x * Math.sin(p.yaw) + d.z * Math.cos(p.yaw); let rx = x / range * R0, ry = z / range * R0; const l = Math.hypot(rx, ry); if (l > R0 - 4) { rx *= (R0 - 4) / l; ry *= (R0 - 4) / l; } c.fillStyle = col; c.beginPath(); if (shape === 'tri') { c.moveTo(rx, ry - r); c.lineTo(rx + r, ry + r); c.lineTo(rx - r, ry + r); c.closePath(); } else c.arc(rx, ry, r, 0, TAU); c.fill(); if (Math.abs(d.y) > 25) { c.fillRect(rx - 1, ry + (d.y > 0 ? -r - 5 : r), 2, 5); } };
    for (const e of Game.enemies) if (!e.dead && e.type !== 'missile') dot(e.pos, e.type === 'rival' ? '#ffb000' : '#ff4a6a', e.type === 'rival' ? 6 * s : 4 * s);
    for (const w of Game.wingmen) if (!w.out) dot(w.pos, '#4be88a', 4 * s); for (const o of Game.pilots) if (o.alive && o !== p) dot(o.pos, o.color.hex, 4 * s); for (const k of Game.pickups) if (!k.dead) dot(k.pos, '#8ae8ff', 3 * s);
    c.fillStyle = p.color.hex; c.beginPath(); c.moveTo(0, -8 * s); c.lineTo(6 * s, 6 * s); c.lineTo(-6 * s, 6 * s); c.closePath(); c.fill(); c.restore();
  },
  drawARWarnings(c, p, v, s) {
    c.textAlign = 'center'; c.font = `900 ${44 * s}px Impact`; c.lineWidth = 8 * s; c.strokeStyle = '#150f2b';
    if (p.tailed && Math.floor(Hud.tick * 5) % 2 === 0) { c.fillStyle = '#ff5b6b'; c.strokeText('TAILED!', v.x + v.w / 2, v.y + v.h * 0.2); c.fillText('TAILED!', v.x + v.w / 2, v.y + v.h * 0.2); }
    if (p.outside) { c.fillStyle = '#ffe23a'; c.font = `900 ${34 * s}px Impact`; c.strokeText('RETURN TO THE BATTLE ZONE', v.x + v.w / 2, v.y + v.h * 0.28); c.fillText('RETURN TO THE BATTLE ZONE', v.x + v.w / 2, v.y + v.h * 0.28); }
    if (p.man) { c.fillStyle = '#8ae8ff'; c.font = `900 ${30 * s}px Impact`; c.strokeText(p.man.type === 'uturn' ? 'U-TURN' : 'LOOP', v.x + v.w / 2, v.y + v.h * 0.72); c.fillText(p.man.type === 'uturn' ? 'U-TURN' : 'LOOP', v.x + v.w / 2, v.y + v.h * 0.72); }
  },
  drawEnemyMarkers(c, v, s) {
    for (const e of Game.enemies) { if (e.dead || e.type === 'missile') continue; const pr = this.proj(e.pos, v); const rival = e.type === 'rival'; const d = e.pos.distanceTo(v.cam.position); const onScreen = !pr.behind && pr.x > v.x + 20 && pr.x < v.x + v.w - 20 && pr.y > v.y + 20 && pr.y < v.y + v.h - 20;
      if (onScreen && d > 25) { const sz = clamp(500 / d, 8, 26) * s; c.strokeStyle = rival ? '#ffb000' : 'rgba(255,74,106,.85)'; c.lineWidth = 2.5 * s; c.beginPath(); c.moveTo(pr.x, pr.y - sz); c.lineTo(pr.x + sz, pr.y); c.lineTo(pr.x, pr.y + sz); c.lineTo(pr.x - sz, pr.y); c.closePath(); c.stroke(); }
      else if (rival) { const cx = v.x + v.w / 2, cy = v.y + v.h / 2; let dx = pr.x - cx, dy = pr.y - cy; if (pr.behind) { dx = -dx; dy = -dy; } const a = Math.atan2(dy, dx); const rx = cx + Math.cos(a) * v.w * 0.42, ry = cy + Math.sin(a) * v.h * 0.4; c.save(); c.translate(rx, ry); c.rotate(a); c.fillStyle = '#ffb000'; c.strokeStyle = '#150f2b'; c.lineWidth = 3; c.beginPath(); c.moveTo(18 * s, 0); c.lineTo(-12 * s, -14 * s); c.lineTo(-12 * s, 14 * s); c.closePath(); c.fill(); c.stroke(); c.restore(); } }
    for (const w of Game.wingmen) { if (w.out || !w.chased) continue; const pr = this.proj(w.pos, v); if (pr.behind) continue; c.fillStyle = '#ffd33d'; c.font = `900 ${22 * s}px Impact`; c.textAlign = 'center'; c.fillText('HELP PIP', pr.x, pr.y - 28 * s); }
  },
  drawComms(c, s) {
    const cur = Comms.cur; if (!cur) return; const info = WHO[cur.who] || WHO.hero, x = 36 * s, y = 30 * s, w = 940 * s, h = 156 * s;
    c.save(); c.fillStyle = 'rgba(21,15,43,.86)'; rr2(c, x, y, w, h, 18 * s); c.fill(); c.lineWidth = 4 * s; c.strokeStyle = info.c2; c.stroke();
    drawFace(c, cur.who, x + 82 * s, y + h / 2, 62 * s, Comms.talking() ? Math.abs(Math.sin(Comms.t * 17)) : 0);
    c.textAlign = 'left'; c.fillStyle = info.c2; c.font = `900 ${24 * s}px Impact`; c.fillText(info.name, x + 168 * s, y + 38 * s);
    c.fillStyle = '#fff4d6'; c.font = `700 ${27 * s}px Trebuchet MS, sans-serif`; const text = cur.text.slice(0, Math.floor(Comms.chars)); wrapText(c, text, x + 168 * s, y + 74 * s, w - 190 * s, 33 * s); c.restore();
  },
  drawBoss(c, s, W) {
    const b = this.bossBar; if (!b) return; let hp = 0, mx = 0; const bo = b.boss;
    if (bo.type === 'bossRoot') { for (const p of bo.parts) if (p.part !== 'body' && p.part !== 'head') { hp += Math.max(0, p.hp); mx += p.maxhp; } } else { hp = Math.max(0, bo.hp); mx = bo.maxhp; }
    const w = 1000 * s, x = 1020 * s, y = 36 * s; if (W < 1500) return;
    c.save(); c.fillStyle = 'rgba(21,15,43,.85)'; rr2(c, x - 10 * s, y - 8 * s, w * 0.52 + 20 * s, 64 * s, 14 * s); c.fill(); c.textAlign = 'left'; c.fillStyle = '#ff7a3a'; c.font = `900 ${24 * s}px Impact`; c.fillText(b.name, x, y + 20 * s);
    c.fillStyle = 'rgba(0,0,0,.6)'; rr2(c, x, y + 28 * s, w * 0.52, 16 * s, 8 * s); c.fill(); c.fillStyle = '#ff3a5a'; rr2(c, x, y + 28 * s, Math.max(3, w * 0.52 * hp / Math.max(1, mx)), 16 * s, 8 * s); c.fill(); c.restore();
  },
  drawSquad(c, s, W) {
    if (!Game.wingmen.length) return; const x = W - 290 * s, y = 36 * s; c.save(); let i = 0;
    for (const w of Game.wingmen) { const yy = y + i++ * 54 * s; c.fillStyle = 'rgba(21,15,43,.78)'; rr2(c, x, yy, 262 * s, 46 * s, 12 * s); c.fill(); const info = WHO[w.who]; drawFace(c, w.who, x + 25 * s, yy + 23 * s, 19 * s, 0); c.textAlign = 'left'; c.fillStyle = info.c2; c.font = `900 ${18 * s}px Impact`; c.fillText(info.name, x + 54 * s, yy + 19 * s);
      const k = w.out ? 0 : clamp(w.hp / w.maxhp, 0, 1); c.fillStyle = 'rgba(0,0,0,.6)'; rr2(c, x + 54 * s, yy + 25 * s, 190 * s, 11 * s, 5 * s); c.fill(); c.fillStyle = w.chased && Math.floor(Hud.tick * 6) % 2 ? '#ff5b6b' : '#4be88a'; if (k > 0) { rr2(c, x + 54 * s, yy + 25 * s, 190 * s * k, 11 * s, 5 * s); c.fill(); } if (w.out) { c.fillStyle = '#ff5b6b'; c.font = `900 ${14 * s}px Impact`; c.fillText('DOWN', x + 200 * s, yy + 19 * s); } }
    c.restore();
  },
  drawBanner(c, s, W, H) {
    if (this.bannerT > 0 && this.banner_) { const t = this.bannerT, k = Math.min(1, (3.6 - t) * 4, t * 3); c.save(); c.globalAlpha = k; c.textAlign = 'center'; c.translate(W / 2, H * 0.34 + (1 - k) * 30 * s); c.font = `900 ${96 * s}px Impact`; c.lineWidth = 14 * s; c.strokeStyle = '#150f2b'; c.fillStyle = '#ffb02e'; c.strokeText(this.banner_.t, 0, 0); c.fillText(this.banner_.t, 0, 0); if (this.banner_.sub) { c.font = `800 ${32 * s}px Trebuchet MS`; c.lineWidth = 8 * s; c.fillStyle = '#fff4d6'; c.strokeText(this.banner_.sub, 0, 54 * s); c.fillText(this.banner_.sub, 0, 54 * s); } c.restore(); }
    const a = this.alert_; if (a) { const on = Math.floor(a.t * 6) % 2 === 0 || a.t0 - a.t < 0.2; if (on) { c.save(); c.textAlign = 'center'; c.font = `900 ${64 * s}px Impact`; c.lineWidth = 11 * s; c.strokeStyle = '#150f2b'; c.fillStyle = a.color; c.strokeText(a.text, W / 2, H * 0.52); c.fillText(a.text, W / 2, H * 0.52); c.restore(); } }
  },
  drawHint(c, s, W, H) {
    const h = this.hintCur; if (!h) return; const text = HINTS[h.id](), k = Math.min(1, (h.t0 - h.t) * 4, h.t * 3); c.save(); c.globalAlpha = k; c.font = `800 ${30 * s}px Trebuchet MS, sans-serif`; const w = Math.min(W - 60 * s, c.measureText(text).width + 80 * s), x = W / 2 - w / 2, y = H * 0.72;
    c.fillStyle = 'rgba(21,15,43,.88)'; rr2(c, x, y, w, 70 * s, 16 * s); c.fill(); c.lineWidth = 4 * s; c.strokeStyle = '#38e8ff'; c.stroke(); c.fillStyle = '#38e8ff'; c.font = `900 ${18 * s}px Impact`; c.textAlign = 'left'; c.fillText('HINT', x + 22 * s, y + 24 * s); c.font = `800 ${30 * s}px Trebuchet MS, sans-serif`; c.fillStyle = '#fff4d6'; c.textAlign = 'center'; c.fillText(text, W / 2, y + 54 * s); c.restore();
  },
};
function rr2(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function wrapText(c, text, x, y, maxW, lh) { const words = text.split(' '); let line = ''; let yy = y; for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = t; } c.fillText(line, x, yy); }
