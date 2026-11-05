/* 24-hud: the 10-foot HUD in screen pixels: the score bug (crests, codes, score, clock, Euphoria gauges, red cards), name
 * tags with stamina, the power meter with its gold sweet spot, reticles (corner ring, free-kick target, penalty zones, mouse
 * aim), the radar (shapes and colours), big notices, context prompts, the Save Duel ring, the celebration picker, the
 * shootout's dots and off-screen arrows. Kept inside a safe margin and clear of the corner's buttons. */
class HUD {
  constructor() { this.notes = []; this.toasts = []; this.t = 0; }
  notice(text, o = {}) { this.notes = this.notes.filter(n => n.text !== text); this.notes.push(Object.assign({ text, t: o.t || 1.8, max: o.t || 1.8, colors: o.colors || ['#fffbe8', '#ffe08a', '#ffb347'], sub: o.sub || null, scale: o.scale || 3 }, o)); if (this.notes.length > 1) this.notes.shift(); }
  toast(title, text, o = {}) { this.toasts.push(Object.assign({ title, text, t: o.t || 3, max: o.t || 3 }, o)); if (this.toasts.length > 3) this.toasts.shift(); }
  update(dt) { this.t += dt; for (const n of this.notes) n.t -= dt; this.notes = this.notes.filter(n => n.t > 0); for (const n of this.toasts) n.t -= dt; this.toasts = this.toasts.filter(n => n.t > 0); }
  draw(r, m, view, o = {}) {
    const W = r.W, H = r.H, mx = Math.round(W * .03), my = Math.round(H * .03);
    // world-space bits first (queued): tags, meters, rings
    this.worldBits(r, m, view, o);
    r.overlay(g => {
      if (!o.noBug) this.scoreBug(g, m, mx, my);
      if (game.settings.radar !== 'off' && !o.noRadar) this.radar(g, r, m, view, mx, my);
      this.setpieceBar(g, r, m, o);
      this.prompts(g, r, m, view, o);
      this.celebPicker(g, r, m, o);
      if (m.mode === 'shootout' || m.so) this.shootout(g, r, m);
      this.duelBits(g, r, m);
      this.notices(g, r);
      this.toastsDraw(g, r, mx, my);
      if (m.mode === 'halftime' || (m.mode === 'fulltime' && !o.noFull)) this.halftime(g, r, m);
      if (EF.tuneChanged().length && !m.session) { E.font.text(g, 'DEV TUNED', W - mx, H - my - 8, '#ff7ad0', { align: 'right', font: 'tiny', outline: '#000' }); }
      this.arrows(g, r, m, view);
    });
  }
  scoreBug(g, m, x, y) {
    const t0 = m.teams[0], t1 = m.teams[1], w = 168, h = 30;
    E.ui.box(g, x, y, w, h + 12, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .9 });
    EF.drawCrest(g, t0, x + 12, y + 12, 16); EF.drawCrest(g, t1, x + w - 12, y + 12, 16);
    E.font.text(g, t0.short, x + 24, y + 6, '#fff6e0', { scale: 1, outline: false, shadow: '#000' });
    E.font.text(g, t1.short, x + w - 24, y + 6, '#fff6e0', { scale: 1, outline: false, shadow: '#000', align: 'right' });
    const sc = m.score[0] + ' - ' + m.score[1];
    E.font.text(g, sc, x + w / 2, y + 3, '#ffffff', { scale: 2, outline: '#000', align: 'center' });
    const clk = m.minuteLabel();
    E.font.text(g, clk, x + w / 2, y + 20, m.half >= 3 ? '#ffc83a' : '#c8d0f0', { align: 'center', outline: false, shadow: '#000' });
    // the Euphoria gauges: 3 segments, flashing when full
    for (let s = 0; s < 2; s++) {
      const gx = s ? x + w - 58 : x + 6, gy = y + h + 2, v = m.euph[s] / 100, full = m.euph[s] >= 100 || m.euroT[s] > 0;
      const col = full ? (Math.floor(this.t * 8) % 2 ? '#ffffff' : '#ffc83a') : '#ff7a2a';
      for (let k = 0; k < 3; k++) {
        const segV = clamp(v * 3 - k, 0, 1);
        px.rect(g, gx + k * 18, gy, 16, 6, '#1a1a2a'); px.rect(g, gx + k * 18 + 1, gy + 1, Math.round(14 * segV), 4, m.euroT[s] > 0 ? EF.kitFor(m, s).shirt : col);
      }
      if (m.teams[s] && m.side[s].some(f => f.sentOff)) for (const [i] of m.side[s].filter(f => f.sentOff).entries()) px.rect(g, s ? x + w - 6 - i * 5 : x + 2 + i * 5, y + h - 4, 3, 5, '#ff2a2a');
    }
    E.font.text(g, 'EUPHORIA', x + w / 2, y + h + 2, '#ffc83a', { font: 'tiny', align: 'center', outline: false });
  }
  radar(g, r, m, view, mx, my) {
    const s = .14, w = Math.round(P.L * s), h = Math.round(P.W * s), ca = game.cornerArea();
    const x0 = r.W - mx - w, y0 = ca && ca.x0 < x0 + w ? Math.ceil(ca.y1) + 4 : my;
    E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#123a1a', border: '#6a9070', alpha: .75 });
    px.rect(g, x0 + Math.round(w / 2), y0, 1, h, '#3a6a3a');
    for (const f of m.players) {
      if (f.sentOff) continue;
      const x = Math.round(x0 + (f.body.x - P.X0) * s), y = Math.round(y0 + (f.body.y - P.Y0) * s), c = EF.kitFor(m, f.side).shirt;
      if (f.side === 0) px.disc(g, x, y, 2, c); else px.rect(g, x - 2, y - 2, 4, 4, c);
      if (f.side === 0) px.dot(g, x, y, '#000'); else px.dot(g, x, y, '#000');
      if (f.human != null) { const pc = E.PLAYER_COLORS[(m.slots[f.human] && m.slots[f.human].color) || f.human] || '#fff'; px.rect(g, x - 3, y - 4, 6, 1, pc); }
    }
    px.rect(g, Math.round(x0 + (m.ball.x - P.X0) * s), Math.round(y0 + (m.ball.y - P.Y0) * s), 2, 2, '#ffffff');
  }
  worldBits(r, m, view, o) {
    const t = this.t;
    for (const sl of m.slots) {
      const f = sl.f; if (!f || f.sentOff || m.mode === 'shootout' && !(m.sp && m.sp.taker === f)) continue;
      const b = f.body, col = E.PLAYER_COLORS[sl.color != null ? sl.color : sl.i] || '#ffe08a', z = 38 * (f.data.size || 1.08);
      r.queue(b.x, b.y, z, g => {
        const [x, y] = r.w(b.x, b.y, z), X = Math.round(x), Y = Math.round(y);
        px.poly(g, [[X - 4, Y - 6], [X + 4, Y - 6], [X, Y - 1]], col); px.poly(g, [[X - 3, Y - 5], [X + 3, Y - 5], [X, Y - 2]], E.shade(col, .3));
        const name = (sl.label || ('P' + (sl.i + 1)));
        E.font.text(g, name, X, Y - 15, col, { align: 'center', outline: '#000', font: 'tiny' });
        if (f.stamina < 60) { px.rect(g, X - 8, Y - 19, 16, 2, '#1a1a1a'); px.rect(g, X - 8, Y - 19, Math.round(16 * f.stamina / 100), 2, f.stamina < 25 ? '#ff4a3a' : '#6ad04a'); }
        if (f.charging) {
          const v = f.meter, bw = 28, bx = X - bw / 2, by = Y - 25;
          px.rect(g, bx - 1, by - 1, bw + 2, 6, '#000'); px.rect(g, bx, by, Math.round(bw * v), 4, v > .95 ? (Math.floor(t * 20) % 2 ? '#fff' : '#ff3a2a') : '#ff9a3a');
          px.rect(g, bx + Math.round(bw * .78), by, Math.round(bw * .12), 4, v >= .78 && v <= .9 ? '#fff6a0' : '#c8a020');
          if (m.euroT[f.side] > 0 && !m.superUsed[f.side]) px.rect(g, bx + Math.round(bw * .9), by - 2, 1, 8, '#ff3aa0');
        }
      }, { emissive: true, bias: 50 });
      // the mouse's reticle on the pitch
      if (sl.ctl && sl.ctl.mouseAim && m.mode === 'play') { const gpt = game.mouseGround(); if (gpt) { const gx = gpt[0] !== undefined ? gpt[0] : gpt.x, gy = gpt[1] !== undefined ? gpt[1] : gpt.y; r.decal(() => { r.groundRing(gx, gy, 6, '#ffc83a', .9); r.groundRing(gx, gy, 2, '#ffffff', .9); }); } }
    }
    if (!m.slots.length && m.owner && !o.noTags) { const f = m.owner, b = f.body; r.queue(b.x, b.y, 40, g => { const [x, y] = r.w(b.x, b.y, 40); E.font.text(g, f.data.name, Math.round(x), Math.round(y) - 8, '#fff6e0', { align: 'center', outline: '#000', font: 'tiny' }); }, { emissive: true, bias: 50 }); }
    const sp = m.sp;
    if (sp && sp.phase === 'aim' && sp.human) {
      if (sp.kind === 'corner' && sp.ring) r.decal(() => { r.groundRing(sp.ring.x, sp.ring.y, 14 + Math.sin(t * 6) * 2, '#ffc83a', .9); r.groundRing(sp.ring.x, sp.ring.y, 4, '#ffffff', .9); });
      if (sp.shootable) { const gx = m.goalX(sp.side), y = P.CY + sp.aimY * (P.GH - 6), z = 6 + sp.aimZ * (P.BAR - 10); r.queue(gx, y, z, g => { const [x, yy] = r.w(gx, y, z); px.disc(g, Math.round(x), Math.round(yy), 4, '#ffc83a'); px.disc(g, Math.round(x), Math.round(yy), 2, '#000000'); px.dot(g, Math.round(x), Math.round(yy), '#ffffff'); }, { emissive: true, bias: 60 }); }
      if (sp.kind === 'penalty') { const gx = m.goalX(sp.side); for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { const y = P.CY + [-1, 0, 1][a] * (P.GH - 10), z = b ? 26 : 6, on = sp.zone[0] === a && sp.zone[1] === b; r.queue(gx, y, z, g => { const [x, yy] = r.w(gx, y, z); px.rect(g, Math.round(x) - 4, Math.round(yy) - 4, 8, 8, on ? '#ffc83a' : '#ffffff30'); if (on) px.rect(g, Math.round(x) - 2, Math.round(yy) - 2, 4, 4, '#000'); }, { emissive: true, bias: 60 }); } }
    }
    if (sp && sp.phase === 'aim' && (sp.kind === 'penalty' && sp.charging || sp.shootable && sp.charging)) { const f = sp.taker, b = f.body; r.queue(b.x, b.y, 44, g => { const [x, y] = r.w(b.x, b.y, 44); px.rect(g, Math.round(x) - 15, Math.round(y) - 1, 30, 6, '#000'); px.rect(g, Math.round(x) - 14, Math.round(y), Math.round(28 * sp.power), 4, '#ff9a3a'); if (sp.kind === 'penalty') px.rect(g, Math.round(x) - 14, Math.round(y), Math.round(28 * .2), 4, '#5ae0ff'); }, { emissive: true, bias: 60 }); }
    // the Save Duel's ring round the keeper
    if (m.duel && m.superFlight) {
      const k = m.keeper[1 - m.superFlight.side], d = m.duel, u = clamp(d.t / d.target, 0, 1.4), rad = lerp(40, 10, Math.min(1, u)) + (u > 1 ? (u - 1) * 20 : 0);
      r.decal(() => { r.groundRing(k.body.x, k.body.y, 10, '#ffffff', .9); r.groundRing(k.body.x, k.body.y, rad, Math.abs(d.t - d.target) < .06 ? '#5aff7a' : '#ffc83a', .95); });
    }
  }
  setpieceBar(g, r, m, o) {
    const sp = m.sp, y = r.H - Math.round(r.H * .03) - 96;
    if (!sp || sp.phase !== 'aim' || !sp.human || o.noPrompts) return;
    const I = sp.human.ctl && sp.human.ctl.I, opt = { input: I || game.input, scale: 1, device: sp.human.ctl && sp.human.ctl.device };
    const list = sp.kind === 'corner' ? [['lob', 'CROSS'], ['shoot', 'SHORT'], ['up', 'AIM']] : sp.kind === 'penalty' ? [['shoot', 'HOLD: POWER'], ['up', 'AIM']] : sp.shootable ? [['shoot', 'HOLD: SHOOT'], ['pass', 'PASS'], ['lob', 'CHIP']] : sp.kind === 'goalkick' ? [['pass', 'SHORT'], ['lob', 'LONG']] : [['pass', 'KICK OFF']];
    E.ui.box(g, r.W / 2 - 130, y - 4, 260, 20, { bg: '#0d1430', border: '#ffc83a', alpha: .8 });
    E.font.text(g, { kickoff: 'KICK OFF', goalkick: 'GOAL KICK', corner: 'CORNER', freekick: 'FREE KICK', penalty: 'PENALTY' }[sp.kind], r.W / 2 - 124, y + 2, '#ffc83a', { outline: false });
    EF.promptRow(g, r.W / 2 + 30, y, list, opt);
    if (sp.kind === 'penalty' && sp.keeperHuman && sp.keeperHuman !== sp.human) {
      const kI = sp.keeperHuman.ctl && sp.keeperHuman.ctl.I;
      EF.promptRow(g, r.W / 2, y - 22, [['up', 'GUESS'], ['pass', 'DIVE']], { input: kI || game.input });
    }
  }
  prompts(g, r, m, view, o) {
    if (o.noPrompts || game.settings.prompts === 'off' || m.mode !== 'play') return;
    for (const sl of m.slots) {
      const f = sl.f; if (!f || !sl.ctl || !sl.ctl.I) continue;
      const I = sl.ctl.I, learning = game.settings.prompts !== 'always', used = sl.ctl.used || {};
      const show = a => !learning || (used[a] || 0) < 3;
      const [sx, sy] = r.w(f.body.x, f.body.y, 46), items = [];
      if (m.euph[sl.side] >= 100 && m.euroT[sl.side] <= 0) items.push([I.half || EF.deviceOf(I) === 'gamepad' ? ['switch', 'skill'] : 'euphoria', 'EUROPHORIA!']);
      else if (!m.owner && airWindow(f)) { const w = airWindow(f); items.push(['shoot', w.z >= 22 ? 'HEADER' : 'VOLLEY']); }
      else if (m.owner === f) { if (show('pass')) items.push(['pass', 'PASS']); if (show('shoot')) items.push(['shoot', 'SHOOT']); if (show('skill')) items.push(['skill', 'SKILL']); }
      else if (m.owner && m.owner.side !== f.side) { if (show('pass')) items.push(['pass', 'TACKLE']); if (show('shoot')) items.push(['shoot', 'SLIDE']); if (show('switch')) items.push(['switch', 'SWITCH']); }
      if (m.euroT[sl.side] > 0 && !m.superUsed[sl.side] && m.owner === f) items.unshift(['shoot', 'FULL POWER: SUPER STRIKE!']);
      if (!items.length) continue;
      EF.promptRow(g, clamp(sx, 60, r.W - 60), clamp(sy - 34, 50, r.H - 40), items.slice(0, 3), { input: I, device: sl.ctl.device });
    }
  }
  celebPicker(g, r, m, o) {
    const c = m.celebration; if (!c || !c.scorer || c.picked || c.t < .4 || c.t > 2.4 || o.noPrompts) return;
    const sl = m.slots.find(s => s.side === c.side && s.ctl && s.ctl.I); if (!sl) return;
    const list = EF.celebrationChoices(m, c.scorer), acts = ['pass', 'shoot', 'lob', 'through'];
    const y = r.H - Math.round(r.H * .03) - 92;
    E.ui.box(g, r.W / 2 - 200, y - 18, 400, 40, { bg: '#0d1430', border: '#ffc83a', alpha: .88 });
    E.font.text(g, 'CELEBRATE!', r.W / 2, y - 14, '#ffc83a', { align: 'center', outline: false });
    EF.promptRow(g, r.W / 2, y, list.map((id, i) => [acts[i], (EF.get('celebration', id) || {}).name || id]), { input: sl.ctl.I, device: sl.ctl.device });
    const k = 1 - (c.t - .4) / 2; px.rect(g, r.W / 2 - 190, y + 16, Math.round(380 * k), 2, '#ffc83a');
  }
  shootout(g, r, m) {
    const so = m.so; if (!so) return;
    const y = Math.round(r.H * .03) + 52, x = Math.round(r.W * .03);
    E.ui.box(g, x, y, 168, 34, { bg: '#0d1430', border: '#ffc83a', alpha: .88 });
    for (let s = 0; s < 2; s++) {
      E.font.text(g, m.teams[s].short, x + 6, y + 5 + s * 14, '#fff6e0', { outline: false });
      const n = Math.max(5, so.kicks[0].length, so.kicks[1].length);
      for (let i = 0; i < n; i++) { const k = so.kicks[s][i], cx = x + 40 + i * 12, cy = y + 9 + s * 14; px.disc(g, cx, cy, 4, '#1a1a2a'); if (k === true) px.disc(g, cx, cy, 3, '#5aff7a'); else if (k === false) { px.line(g, cx - 2, cy - 2, cx + 2, cy + 2, '#ff3a3a'); px.line(g, cx - 2, cy + 2, cx + 2, cy - 2, '#ff3a3a'); } }
    }
  }
  duelBits(g, r, m) {
    if (!m.duel) return;
    const sl = m.slots[m.duel.slot];
    E.font.title(g, 'SAVE DUEL!', r.W / 2, Math.round(r.H * .1), { align: 'center', scale: 3, colors: ['#ffffff', '#5ae0ff', '#3a8aff'] });
    if (sl && sl.ctl && sl.ctl.I) EF.promptRow(g, r.W / 2, Math.round(r.H * .1) + 30, [['pass', 'WHEN THE RINGS MEET!']], { input: sl.ctl.I, scale: 2, device: sl.ctl.device });
  }
  notices(g, r) {
    this.notes.forEach((n, i) => {
      const u = 1 - n.t / n.max, pop = u < .12 ? u / .12 : 1, sc = Math.max(1, Math.round(n.scale * (u < .12 ? .6 + pop * .4 : 1)));
      const y = Math.round(r.H * (.26 + i * .14));
      E.font.title(g, n.text, r.W / 2, y, { align: 'center', scale: sc, colors: n.colors, depth: 2 });
      if (n.sub) E.font.text(g, n.sub, r.W / 2, y + sc * 8 + 6, '#fff6e0', { align: 'center', scale: 1, outline: '#000' });
    });
  }
  toastsDraw(g, r, mx, my) {
    this.toasts.forEach((n, i) => {
      const k = Math.min(1, (n.max - n.t) * 4, n.t * 3), w = 180, x = Math.round(r.W - mx - w * k), y = Math.round(r.H * .45 + i * 34);
      E.ui.box(g, x, y, w, 30, { bg: ['#2a1a4a', '#16224a'], border: '#ff7ad0', alpha: .92 });
      E.font.text(g, n.title, x + 8, y + 5, '#ff9ae0', { outline: false });
      E.font.text(g, n.text, x + 8, y + 16, '#fff6e0', { outline: false });
    });
  }
  halftime(g, r, m) {
    const w = 300, h = 120, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .3);
    E.ui.box(g, x, y, w, h, { bg: ['#0d1430', '#16224a'], border: '#ffc83a', alpha: .92 });
    E.font.title(g, m.mode === 'halftime' ? 'HALF TIME' : 'FULL TIME', r.W / 2, y + 8, { align: 'center', scale: 2, colors: ['#fffbe8', '#ffe08a', '#ffb347'] });
    EF.drawCrest(g, m.teams[0], x + 40, y + 56, 30); EF.drawCrest(g, m.teams[1], x + w - 40, y + 56, 30);
    E.font.text(g, m.score[0] + ' - ' + m.score[1], r.W / 2, y + 42, '#ffffff', { align: 'center', scale: 3, outline: '#000' });
    const st = m.stats, tp = st[0].poss + st[1].poss || 1;
    E.font.text(g, 'SHOTS  ' + st[0].shots + ' - ' + st[1].shots, r.W / 2, y + 78, '#c8d0f0', { align: 'center', outline: false });
    E.font.text(g, 'POSSESSION  ' + Math.round(st[0].poss / tp * 100) + '% - ' + Math.round(st[1].poss / tp * 100) + '%', r.W / 2, y + 92, '#c8d0f0', { align: 'center', outline: false });
  }
  arrows(g, r, m, view) {
    const b = m.ball, [x, y] = r.w(b.x, b.y, b.z);
    if (x < 0 || x > r.W || y < 0 || y > r.H) { const cx = clamp(x, 10, r.W - 10), cy = clamp(y, 10, r.H - 10), a = Math.atan2(y - r.H / 2, x - r.W / 2); px.poly(g, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a + 2.4) * 5, cy + Math.sin(a + 2.4) * 5], [cx + Math.cos(a - 2.4) * 5, cy + Math.sin(a - 2.4) * 5]], '#ffffff'); }
  }
}
EF.HUD = HUD;
