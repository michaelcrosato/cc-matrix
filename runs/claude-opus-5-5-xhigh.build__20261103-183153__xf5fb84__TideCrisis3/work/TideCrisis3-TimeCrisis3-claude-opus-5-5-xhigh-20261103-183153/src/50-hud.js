/* 50-hud: the canvas pixel HUD, per viewport, sized for a TV at 10 feet (key numbers at scale 2-3, nothing under
 * scale 1). TIME (a rising-tide plate) at the top, SCORE and the chain top left, LIFE badges bottom left, the weapon
 * panel bottom right, the reticle, hit markers, crisis-flash rings (shape, sound and an edge arrow, never color
 * alone), big calls (ACTION!, WAIT, TIDE'S IN!, TIME EXTEND), score popups, pickup banners, the radio box with a live
 * portrait, device-aware prompts, boss bars, the continue count. Prompts come from the player's own bindings. */
const F = E.font, px = E.px;
const txt = (g, s, x, y, c, o = {}) => F.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#000', outline: false }, o));
TC.txt = txt;
const ICON = {
  hg: E.sprite(['..........', '.ggggggg..', '.gGGGGGGg.', '.gggg.....', '.gg.......', '.gg.......'], { g: '#8a92a0', G: '#d8dce4' }, 2),
  mg: E.sprite(['..............', 'gggggggggggg..', 'gGGGGGGGGGGGgg', 'gggg.ggg......', '.gg..gg.......', '.gg...........'], { g: '#7a828e', G: '#d8dce4' }, 2),
  sg: E.sprite(['..............', 'wwwgggggggggg.', 'wwwGGGGGGGGGGg', 'ww..gggg......', 'w.............'], { g: '#7a828e', G: '#d8dce4', w: '#8a5a32' }, 2),
  gl: E.sprite(['............', '.ggggggggg..', 'gGGGGGGGGGGg', 'gGGGGGGGGGGg', '.gggg.gg....', '..gg..gg....'], { g: '#5a6a4a', G: '#a8b88a' }, 2),
  badge: E.sprite(['.rrrrr.', 'rRRRRRr', 'rRwwwRr', 'rRRwRRr', '.rRRRr.', '..rRr..', '...r...'], { r: '#7a1a1a', R: '#e8443a', w: '#ffffff' }, 2),
  badgeOff: E.sprite(['.rrrrr.', 'r.....r', 'r.....r', 'r.....r', '.r...r.', '..r.r..', '...r...'], { r: '#4a4a5a' }, 2),
  pip: E.sprite(['yy', 'YY', 'YY', 'oo'], { y: '#fff3b0', Y: '#ffb347', o: '#a85a1a' }, 1),
  pipOff: E.sprite(['..', 'dd', 'dd', 'dd'], { d: '#3a3a4a' }, 1),
  ring: E.sprite(['.rrr.', 'rwwwr', 'rwwwr', 'rwwwr', '.rrr.'], { r: '#e8443a', w: '#ffffff' }, 2),
  bottle: E.sprite(['.g.', '.g.', 'ggg', 'gGg', 'ggg'], { g: '#2a8a4a', G: '#8affaa' }, 2)
};
TC.ICON = ICON;
/** a button glyph in a rounded frame: the label of an action on the player's device */
const PS_ICON = { '✕': 'x', '○': 'o', '□': 's', '△': 't' };
/** a PlayStation face-button symbol drawn in pixels (the font has none): 7 x 7 at (x, y), times k */
function psIcon(g, k, x, y, kk = 1) {
  const c = { x: '#7fb2ff', o: '#ff6a6a', s: '#ff8ad8', t: '#5ae0a0' }[k], P = (a, b) => px.rect(g, x + a * kk, y + b * kk, kk, kk, c);
  if (k === 'x') for (let i = 0; i < 7; i++) { P(i, i); P(6 - i, i); }
  else if (k === 'o') for (const [a, b] of [[2, 0], [3, 0], [4, 0], [1, 1], [5, 1], [0, 2], [6, 2], [0, 3], [6, 3], [0, 4], [6, 4], [1, 5], [5, 5], [2, 6], [3, 6], [4, 6]]) P(a, b);
  else if (k === 's') for (let i = 0; i < 7; i++) { P(i, 0); P(i, 6); P(0, i); P(6, i); }
  else for (const [a, b] of [[3, 0], [2, 1], [4, 1], [2, 2], [4, 2], [1, 3], [5, 3], [1, 4], [5, 4], [0, 5], [6, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]]) P(a, b);
}
TC.psIcon = psIcon;
function btn(g, label, x, y, o = {}) {
  const k = o.scale || 1, icon = PS_ICON[label], w = (icon ? 7 * k : F.width(label, { scale: k })) + 8 * k, h = (icon ? 7 : 7) * k + 4 * k, c = o.color || '#f4f7ff', bg = o.bg || '#20304e';
  px.rect(g, x + k, y, w - 2 * k, h, bg); px.rect(g, x, y + k, w, h - 2 * k, bg);
  px.rect(g, x + k, y, w - 2 * k, k, '#5a7ab0'); px.rect(g, x + k, y + h - k, w - 2 * k, k, '#0a1428');
  if (icon) psIcon(g, icon, x + 4 * k, y + 2 * k, k); else txt(g, label, x + 4 * k, y + 2 * k, c, { shadow: false, scale: k });
  return w;
}
TC.btn = btn;
/** a prompt line with [button] glyphs: parts = ['HOLD ', { a: 'cover' }, ' TO TAKE COVER'] */
function promptLine(g, input, parts, x, y, align = 'center', both, k = 1) {
  const fam = TC.promptFamily(input), dev = input.lastDevice;
  const segs = []; let w = 0;
  for (const p of parts) {
    if (typeof p === 'string') { const ww = F.width(p, { scale: k }); segs.push([p, ww]); w += ww; }
    else { const lab = TC.label(input, p.a, fam === 'pad' ? 'gamepad' : (dev === 'mouse' && p.mouse !== false ? 'mouse' : 'keyboard')); const ww = (PS_ICON[lab] ? 7 * k : F.width(lab, { scale: k })) + 8 * k; segs.push([{ lab }, ww]); w += ww + 2; }
  }
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  for (const [s, ww] of segs) { if (typeof s === 'string') { txt(g, s, cx, y + 2 * k, '#f4f7ff', { scale: k }); cx += ww; } else { btn(g, s.lab, cx, y, { scale: k }); cx += ww + 2; } }
  void both; return w;
}
TC.promptLine = promptLine;

class Hud {
  constructor(play, i) {
    this.play = play; this.i = i; this.calls = []; this.pops = []; this.banners = []; this.marks = []; this.radio = null; this.radioQ = []; this.strip = 0;
    this.hurtT = 0; this.prompt = null; this.seen = {}; this.lastTick = 99; this.ringTick = {};
  }
  call(text, o = {}) { this.calls = this.calls.filter(c => c.slot !== (o.slot || 'mid')); this.calls.push(Object.assign({ text, t: 0, life: 1.2, slot: 'mid', scale: 3, color: '#ffffff' }, o)); }
  pop(pts, at) { this.pops.push({ text: (pts > 0 ? '+' : '') + fmt(pts), at, t: 0, color: pts < 0 ? '#ff6a5a' : '#ffd36a' }); if (this.pops.length > 12) this.pops.shift(); }
  banner(text, sub) { this.banners.push({ text, sub, t: 0 }); if (this.banners.length > 3) this.banners.shift(); }
  mark(head) { this.marks.push({ t: 0, head }); }
  say(who, text) { if (this.radioQ.length > 3) this.radioQ.shift(); this.radioQ.push({ who, text }); }
  showPrompt(id) { if (this.seen[id] && id !== 'torpedo') return; this.seen[id] = true; this.prompt = { id, t: 0 }; }
  step(dt) {
    for (const c of this.calls) c.t += dt; this.calls = this.calls.filter(c => c.t < c.life);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter(p => p.t < 1);
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < 2.2);
    for (const m of this.marks) m.t += dt; this.marks = this.marks.filter(m => m.t < .18);
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.prompt) { this.prompt.t += dt; if (this.prompt.t > 5) this.prompt = null; }
    if (this.radio) { this.radio.t += dt; if (this.radio.t > this.radio.dur) this.radio = null; }
    if (!this.radio && this.radioQ.length) { const r = this.radioQ.shift(); const sp = reg('speaker', r.who) || {}; this.radio = Object.assign(r, { t: 0, dur: Math.max(2.4, Math.min(4.2, lineDur(r.text, r.who) + 1)), rig: this.play.portraitRig(r.who) }); if (this.i === 0 && TC.subtitlesVoice !== false) Voice.say(r.text, r.who, { vol: .45 }); void sp; }
  }
  /** draw for this player in the viewport rect (screen pixels) */
  draw(g, rect, sim, R3) {
    const p0 = sim.players[this.i], lv = this.play.localView(this.i), p = lv ? Object.assign(Object.create(p0), { c: lv.c, aim: lv.aim }) : p0, x0 = rect.x, y0 = rect.y, W = rect.w, H = rect.h, cx = x0 + W / 2, small = W < 300;
    if (tune.view.hideHud) return;
    const cut = !!sim.cut;
    if (cut) { this.drawCut(g, rect, sim); return; }
    // cover vignette tag
    if (p.c > .5 && !p.out) { const k = TC.label(this.play.inputs[this.i] || TC.game.input, 'cover'); void k; txt(g, 'COVER', cx, y0 + H - 34, '#9fe3ff', { align: 'center' }); if (p.mag < 9 && p.weapon === 'hg') { const u = p.reloadT / tune.player.reload; px.rect(g, cx - 16, y0 + H - 25, 32, 3, '#1a2a44'); px.rect(g, cx - 16, y0 + H - 25, Math.round(32 * clamp(u, 0, 1)), 3, '#9fe3ff'); } }
    // TIME plate
    const tm = Math.max(0, sim.timer), low = tm < 10 && sim.phase === 'action', blink = tm < 5 && sim.phase === 'action' && (sim.t * 4 | 0) % 2;
    const pw = small ? 70 : 92, ph = small ? 26 : 30, plx = Math.round(cx - pw / 2), ply = y0 + 3;
    E.ui.box(g, plx, ply, pw, ph, { bg: ['#10244a', '#081428'], border: low ? '#ff3b30' : '#3aa0e8' });
    const frac = clamp(tm / Math.max(1, sim.scene.time * sim.diff.time * tune.time.sceneMul), 0, 1), wl = Math.round((ph - 4) * (1 - frac));
    if (wl > 0) { px.rect(g, plx + 2, ply + ph - 2 - wl, pw - 4, wl, low ? '#5a1a2a' : '#123a6a'); for (let xx = 0; xx < pw - 4; xx += 2) px.dot(g, plx + 2 + xx, ply + ph - 2 - wl + (Math.sin(xx * .5 + sim.t * 5) > 0 ? 0 : 1), '#3a8ad8'); }
    txt(g, 'TIME', cx, ply + 2, '#9fe3ff', { align: 'center' });
    const ts = tm.toFixed(2).padStart(5, '0');
    if (!blink) txt(g, ts, cx, ply + 10, low ? '#ff5a4a' : '#ffffff', { align: 'center', scale: 2 });
    // boss bars
    if (sim.boss && !sim.boss.dead) { const B = sim.boss, bw = Math.min(W - 40, 180), bx = Math.round(cx - bw / 2), by = ply + ph + 3, f = B.hpFrac(); E.ui.box(g, bx - 2, by, bw + 4, 15, { bg: ['#2a0a14', '#14060a'], border: '#ff3b30' }); px.rect(g, bx, by + 9, bw, 4, '#3a1018'); px.rect(g, bx, by + 9, Math.round(bw * f), 4, B.flash > 0 ? '#ffffff' : '#ff4a3a'); txt(g, B.D.name, bx + 1, by + 1, '#ffd36a'); }
    // SCORE
    txt(g, 'SCORE', x0 + 6, y0 + 4, '#9fe3ff');
    const ss = small ? 1 : 2; txt(g, small ? fmt(p.score) : fmt(p.score).padStart(7, ' '), x0 + 6, y0 + 12, '#ffffff', { scale: ss });
    if (p.conts) txt(g, 'C' + p.conts, x0 + 6 + F.width(small ? fmt(p.score) : fmt(p.score).padStart(7, ' '), { scale: ss }) + 3, y0 + 12 + 3 * ss, '#ff9a6a');
    if (p.chain >= 5) txt(g, 'CHAIN ' + p.chain + '  ×' + TC.chainMul(p).toFixed(1), x0 + 6, y0 + 29, '#ffd36a');
    // LIFE
    txt(g, 'LIFE', x0 + 6, y0 + H - 28, '#9fe3ff');
    const shown = Math.min(9, Math.max(p.lives, 0));
    for (let k = 0; k < Math.max(shown, 1); k++) E.px.sprite(g, k < p.lives ? ICON.badge : ICON.badgeOff, x0 + 6 + k * 15, y0 + H - 19);
    if (p.lives > 9) txt(g, '+' + (p.lives - 9), x0 + 6 + 9 * 15, y0 + H - 15, '#ffffff');
    // weapon panel
    const Wd = reg('weapon', p.weapon), wx = x0 + W - (small ? 92 : 110), wy = y0 + H - 34;
    E.ui.box(g, wx, wy, small ? 88 : 106, 31, { bg: ['#10244a', '#081428'], border: '#3aa0e8', alpha: .85 });
    E.px.sprite(g, ICON[p.weapon], wx + 4, wy + 4);
    txt(g, Wd.kind, wx + 34, wy + 3, '#9fe3ff');
    if (p.weapon === 'hg') { for (let k = 0; k < 9; k++) E.px.sprite(g, k < p.mag ? ICON.pip : ICON.pipOff, wx + 34 + k * 5, wy + 14); if (sim.cheat(p, 'ammo')) txt(g, 'INF', wx + 82, wy + 14, '#ffd36a'); }
    else { const n = p.ammo[p.weapon]; txt(g, String(n), wx + 34, wy + 13, n > 0 ? '#ffffff' : '#ff5a4a', { scale: 2 }); E.ui.bar(g, wx + 34, wy + 26, (small ? 48 : 66), 2, n / Wd.pool, '#ffb347'); }
    if (p.stripT > 0) { for (let k = 0; k < 4; k++) { const id = TC.WEAPONS[k], has = id === 'hg' || p.ammo[id] > 0, sx = wx - 4 + k * 26 - 104 + (small ? 16 : 0); E.ui.box(g, sx, wy + 6, 24, 18, { bg: id === p.weapon ? ['#3aa0e8', '#1a5aa0'] : ['#10244a', '#081428'], border: has ? '#9fe3ff' : '#3a3a4a' }); txt(g, String(k + 1), sx + 3, wy + 9, has ? '#ffffff' : '#5a5a6a'); } }
    // RELOAD!
    if (p.weapon === 'hg' && p.mag === 0 && !p.out && p.c < .5 && (sim.t * 3 | 0) % 2 === 0) txt(g, 'RELOAD!', wx + 34, wy - 10, '#ff5a4a', { scale: 1 });
    // threat rings
    this.drawThreats(g, rect, sim, R3, p);
    // the FINAL SHOT ring on the lever
    if (sim.boss && sim.boss.finalT > 0) { const s = R3.project(1592, -80, 335); if (s) { const u = sim.boss.finalT / 3, rr = 8 + 18 * u; for (let k = 0; k < 32; k++) { const a = k / 32 * TAU; px.rect(g, x0 + s[0] + Math.cos(a) * rr - 1, y0 + s[1] + Math.sin(a) * rr - 1, 2, 2, (sim.t * 10 | 0) % 2 ? '#ffd36a' : '#ffffff'); } txt(g, sim.boss.finalT.toFixed(1), x0 + s[0], y0 + s[1] - rr - 10, '#ffd36a', { align: 'center' }); } }
    // reticle and hit markers
    if (p.c < .5 && !p.out && (sim.phase === 'action') && !(TC.dev && TC.dev.open)) {
      const ax = cx + p.aim[0] * H / 2, ay = y0 + H / 2 - p.aim[1] * H / 2, col = p.color, sz = { S: 3, M: 5, L: 7 }[TC.reticleSize || 'M'], st = TC.reticleStyle || 'cross';
      const dark = '#000000', mg = p.weapon === 'mg' ? Math.round(p.bloom * 4) : 0, s2 = sz + mg + (p.weapon === 'sg' ? 3 : 0);
      if (st === 'cross') { for (const [dx, dy, w, h] of [[-s2 - 3, 0, 4, 1], [s2, 0, 4, 1], [0, -s2 - 3, 1, 4], [0, s2, 1, 4]]) { px.rect(g, ax + dx - 1, ay + dy - 1, w + 2, h + 2, dark); px.rect(g, ax + dx, ay + dy, w, h, col); } px.dot(g, ax, ay, '#ffffff'); }
      else if (st === 'ring') { for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; px.dot(g, ax + Math.cos(a) * (s2 + 1), ay + Math.sin(a) * (s2 + 1), dark); px.dot(g, ax + Math.cos(a) * s2, ay + Math.sin(a) * s2, col); } px.dot(g, ax, ay, '#ffffff'); }
      else { px.rect(g, ax - 2, ay - 2, 5, 5, dark); px.rect(g, ax - 1, ay - 1, 3, 3, col); }
      for (const m of this.marks) { const c = m.head ? '#ffd36a' : '#ffffff', d = 5 + m.t * 20; px.line(g, ax - d, ay - d, ax - d + 3, ay - d + 3, c); px.line(g, ax + d, ay - d, ax + d - 3, ay - d + 3, c); px.line(g, ax - d, ay + d, ax - d + 3, ay + d - 3, c); px.line(g, ax + d, ay + d, ax + d - 3, ay + d - 3, c); }
    }
    // score popups at projected points
    for (const q of this.pops) { if (!q.at) continue; const s = R3.project(q.at[0], q.at[1], q.at[2]); if (!s) continue; txt(g, q.text, x0 + s[0] - 1, y0 + s[1] - 1 - q.t * 14, q.color, { align: 'center' }); }
    // banners
    this.banners.forEach((b, k) => { const yy = y0 + H * .3 + k * 22, a = b.t < .15 ? b.t / .15 : 1; if (a < .5 && (b.t * 20 | 0) % 2) return; E.ui.box(g, cx - 80, yy, 160, b.sub ? 20 : 13, { bg: ['#3a2a08', '#1a1004'], border: '#ffd36a', alpha: .9 }); txt(g, b.text, cx, yy + 3, '#ffd36a', { align: 'center' }); if (b.sub) txt(g, b.sub, cx, yy + 11, '#ffffff', { align: 'center' }); });
    // big calls
    for (const c of this.calls) {
      const yy = c.slot === 'top' ? y0 + H * .3 : y0 + H * .42, slide = c.t < .15 ? (1 - c.t / .15) * W * .5 : 0;
      if (c.blink && (c.t * 6 | 0) % 2) continue;
      txt(g, c.text, cx + slide, yy, c.color, { align: 'center', scale: small ? Math.max(2, c.scale - 1) : c.scale, outline: '#08142a', shadow: false });
      if (c.sub) txt(g, c.sub, cx + slide, yy + (small ? 18 : 26), '#ffffff', { align: 'center' });
    }
    if (sim.phase === 'travel' && !sim.cut && (sim.t * 2.5 | 0) % 2 === 0) txt(g, 'WAIT', cx, y0 + H * .44, '#ffffff', { align: 'center', scale: small ? 2 : 3, outline: '#08142a', shadow: false });
    // the prompt bar
    if (this.prompt && sim.phase === 'action' && !this.play.o.attract) this.drawPrompt(g, cx, y0 + H - 48, this.prompt.id);
    // continue
    if (p.out) { E.ui.box(g, cx - 70, y0 + H / 2 - 30, 140, 60, { bg: ['#2a0a14', '#14060a'], border: '#ff3b30' }); txt(g, sim.mode === 'host' ? 'BACK IN' : 'CONTINUE?', cx, y0 + H / 2 - 24, '#ffffff', { align: 'center', scale: 2 }); txt(g, String(Math.max(0, Math.ceil(p.contT))), cx, y0 + H / 2 - 6, '#ffd36a', { align: 'center', scale: 3 }); if (sim.mode !== 'host') promptLine(g, this.play.inputs[this.i] || TC.game.input, ['PRESS ', { a: 'fire' }], cx, y0 + H / 2 + 16); }
    // the radio
    if (this.radio && TC.subtitles !== false) this.drawRadio(g, rect);
    // hurt edge
    if (p.hurtT > 0 || this.hurtT > 0) { const a = Math.max(p.hurtT, this.hurtT); for (let k = 0; k < 4; k++) { const c = k < 2 ? '#ff2a2a' : '#8a0a0a'; if (a * 8 > k) { px.rect(g, x0, y0 + k, W, 1, c); px.rect(g, x0, y0 + H - 1 - k, W, 1, c); px.rect(g, x0 + k, y0, 1, H, c); px.rect(g, x0 + W - 1 - k, y0, 1, H, c); } } }
  }
  drawPrompt(g, cx, y, id) {
    const I = this.play.inputs[this.i] || TC.game.input, P = {
      cover: ['HOLD ', { a: 'cover' }, ' TO TAKE COVER'], reload: ['YOU RELOAD IN COVER: HOLD ', { a: 'cover' }], weapon: [{ a: 'next' }, ' / ', { a: 'prev' }, ' OR FIRE IN COVER: SWITCH WEAPON'],
      torpedo: ['SHOOT THE TORPEDO!'], open: ['SHE\'S OPEN! FIRE!'], shield: ['SHOTGUN OR LAUNCHER: KNOCK THE SHIELD ASIDE'], aim: ['AIM AND ', { a: 'fire' }], final: ['FINAL SHOT! HIT THE LEVER!'], locks: ['SHOOT THE GLOWING GATE LOCKS!']
    }[id] || [id.toUpperCase()];
    const w = promptLine(g, I, P, cx, y + 1, 'center');
    void w;
  }
  drawThreats(g, rect, sim, R3, p) {
    const x0 = rect.x, y0 = rect.y, W = rect.w, H = rect.h, big = TC.threatSize === 'Large' ? 2 : 1;
    for (const th of sim.threats) {
      if (th.done || !th.pos) continue;
      const mine = th.target === this.i, at = th.pos(); if (!at) continue;
      const u = clamp((sim.t - th.t0) / Math.max(.05, th.T - th.t0), 0, 1), s = R3.project(at[0], at[1], at[2]);
      let sx, sy, on = !!s && s[0] >= 4 && s[0] <= W - 4 && s[1] >= 4 && s[1] <= H - 4;
      if (s) { sx = x0 + s[0]; sy = y0 + s[1]; }
      if (!on) {   // an arrow at the screen's edge toward it
        if (!mine) continue;
        const cam = sim.cameraFor(this.i), a = Math.atan2(at[1] - cam.y, at[0] - cam.x) - cam.yaw, dx = Math.sin(a), dy = -Math.cos(a) * .3 - .2;
        const k = Math.min((W / 2 - 14) / Math.max(1e-3, Math.abs(dx)), (H / 2 - 14) / Math.max(1e-3, Math.abs(dy)));
        sx = x0 + W / 2 + dx * k; sy = y0 + H / 2 + dy * k;
        const blink = (sim.t * 10 | 0) % 2; px.disc(g, sx, sy, 6, blink ? '#ff3b30' : '#ffffff'); txt(g, '!', sx, sy - 3, blink ? '#ffffff' : '#ff3b30', { align: 'center', shadow: false });
        continue;
      }
      const R = (26 - 20 * u) * big;
      if (!mine) { for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; px.dot(g, sx + Math.cos(a) * R * .6, sy + Math.sin(a) * R * .6, '#ff9a8a'); } continue; }
      const n = Math.max(16, R * 4 | 0);
      for (let k = 0; k < n; k++) { const a = k / n * TAU; px.rect(g, sx + Math.cos(a) * R - 1, sy + Math.sin(a) * R - 1, 2, 2, '#ff2a1a'); px.dot(g, sx + Math.cos(a) * (R - 1.5), sy + Math.sin(a) * (R - 1.5), '#ffffff'); }
      px.disc(g, sx, sy, 3 * big, '#ffffff'); txt(g, '!', sx + 1, sy - 13 * big, '#ffffff', { align: 'center', scale: big, outline: '#ff2a1a', shadow: false });
      const key = th.id; if (u > .66 && !this.ringTick[key]) { this.ringTick[key] = true; if (this.i === 0 || this.play.local) Audio3.play('tick', { vol: .8 }); }
    }
  }
  drawRadio(g, rect) {
    const r = this.radio, sp = reg('speaker', r.who) || { name: r.who.toUpperCase(), color: '#ffffff' }, w = Math.min(rect.w - 16, rect.w < 300 ? rect.w - 16 : 196), x = rect.w < 300 ? Math.round(rect.x + 8) : rect.x + 6, y = rect.y + (rect.w < 300 ? rect.h - 84 : 42);
    E.ui.box(g, x, y, w, 34, { bg: ['#10244a', '#081428'], border: sp.color, alpha: .88 });
    if (r.rig) try { r.rig.drawPortrait(g, x + 3, y + 3, 28, { zoom: 2.6, turn: .5, bg: '#1a2a4a', frame: false }); } catch (e) { /* portrait unavailable */ }
    txt(g, sp.name, x + 36, y + 3, sp.color);
    const shown = Math.floor(r.t * 34), lines = F.wrap(r.text, w - 42, { scale: 1 });
    let left = shown; lines.slice(0, 2).forEach((L, k) => { const s = L.slice(0, Math.max(0, left)); left -= L.length; txt(g, s, x + 36, y + 13 + k * 9, '#ffffff'); });
  }
  drawCut(g, rect, sim) {
    const W = rect.w, H = rect.h, x0 = rect.x, y0 = rect.y, cut = sim.cut;
    px.rect(g, x0, y0, W, 18, '#000000'); px.rect(g, x0, y0 + H - 18, W, 18, '#000000');
    const l = cut.line;
    if (l) {
      const sp = reg('speaker', l.who) || { name: l.who.toUpperCase(), color: '#ffffff' }, w = Math.min(W - 20, 300), x = Math.round(x0 + W / 2 - w / 2), y = y0 + H - 66;
      E.ui.box(g, x, y, w, 46, { bg: ['#10244a', '#081428'], border: sp.color, alpha: .92 });
      const rig = this.play.portraitRig(l.who); if (rig) try { rig.drawPortrait(g, x + 4, y + 4, 38, { zoom: 3, turn: .5, bg: '#1a2a4a', frame: false }); } catch (e) { /* none */ }
      txt(g, sp.name, x + 48, y + 4, sp.color);
      const shown = Math.floor(l.t * 40), lines = F.wrap(l.text, w - 54, { scale: 1 }); let left = shown;
      lines.slice(0, 3).forEach((L, k) => { const s = L.slice(0, Math.max(0, left)); left -= L.length; txt(g, s, x + 48, y + 15 + k * 9, '#ffffff'); });
    }
    const I = this.play.inputs[0] || TC.game.input;
    if ((sim.t * 2 | 0) % 2 === 0 || cut.skipHold > 0) promptLine(g, I, ['HOLD ', { a: 'fire', mouse: true }, ' TO SKIP'], x0 + W - 8, y0 + H - 14, 'right');
    if (cut.skipHold > 0) px.rect(g, x0 + W - 70, y0 + H - 3, Math.round(62 * cut.skipHold / .6), 2, '#ffd36a');
    if (cut.screen) this.drawBroadcast(g, rect, sim);
  }
  drawBroadcast(g, rect, sim) {
    const w = 96, h = 64, x = rect.x + 12, y = rect.y + 26;
    E.ui.box(g, x - 3, y - 3, w + 6, h + 14, { bg: ['#1a0a10', '#0a0408'], border: '#ff3b30' });
    const rig = this.play.portraitRig('krake'); if (rig) try { rig.drawPortrait(g, x + (w - h) / 2, y, h, { zoom: 3.4, turn: .25, bg: '#2a0a14', frame: false }); } catch (e) { /* none */ }
    txt(g, '• LIVE', x + 2, y + h + 2, (sim.t * 2 | 0) % 2 ? '#ff3b30' : '#ffffff');
  }
}
TC.Hud = Hud;
