/* THE HUD (section 6.16), 10-foot: in screen pixels, inside a safe margin, clear of the corner's buttons. The score bug
 * with crests and Euphoria gauges, name tags, the power meter, reticles, the radar, notices, context and set-piece
 * prompts, the Save Duel ring, shootout dots, the VAR lower third, off-screen arrows. */
EF.HUD = {
  margin(r) { return [Math.max(6, Math.round(r.W * .035)), Math.max(5, Math.round(r.H * .035))]; },
  draw(r, m, src, o = {}) {
    const [mx, my] = this.margin(r);
    this.world(r, m, src);
    r.overlay(g => {
      if (!src.replay) this.tags(g, r, m);
      if (m.kind !== 'training') this.scoreBug(g, r, m, mx, my);
      if (game.settings.radar !== false && !src.replay && !m.shootout && m.kind !== 'training') this.radar(g, r, m, mx, my);
      if (src.replay) this.replayTag(g, r, mx, my);
      else {
        this.notice(g, r, m);
        if (m.shootout) this.shootoutDots(g, r, m, my);
        if (m.mode === 'var') this.varBar(g, r, m);
        this.prompts(g, r, m, mx, my);
        if (m.duel) this.duelText(g, r, m);
        this.arrows(g, r, m);
      }
      if (EF.tuneChanged() && !EF.inSession) E.font.text(g, 'DEV TUNING', r.W - mx, r.H - my - 8, '#ff7a3a', { align: 'right', font: 'tiny', outline: '#000' });
    });
  },
  /* ---- world-anchored: the power meter, reticles, the Save Duel ring ---- */
  world(r, m, src) {
    if (src.replay) return;
    const SP = m.setpiece;
    for (const f of m.players) if (f.charging && f.charge > 0 && !f.ghost) {
      const B = f.body; r.queue(B.x, B.y, 46, g => { const p = r.w(B.x, B.y, 44), x = Math.round(p[0]) - 13, y = Math.round(p[1]) - 6; px.rect(g, x - 1, y - 1, 28, 6, '#0a0a12'); px.rect(g, x, y, Math.round(26 * f.charge), 4, f.charge > .9 ? '#ff5a3a' : '#ffd36a'); px.rect(g, x + Math.round(26 * .78), y - 1, Math.round(26 * .12), 1, '#ffe070'); px.rect(g, x + Math.round(26 * .78), y + 4, Math.round(26 * .12), 1, '#ffe070'); if (f.charge >= .78 && f.charge <= .9) px.rect(g, x, y, Math.round(26 * f.charge), 1, '#ffffff'); }, { emissive: true, bias: 10 });
    }
    if (SP && SP.kind === 'corner' && SP.ring && !SP.taken && SP.stage === 'aim') { const R = SP.ring; r.decal(() => { r.groundRing(R.x, R.y, 18, '#ffe040', 1); r.groundRing(R.x, R.y, 17, '#ffe040', 1); r.groundRing(R.x, R.y, 8 + Math.sin(m.t * 6) * 3, '#ffffff', .8); }); }
    if (SP && SP.kind === 'freekick' && SP.shootable && SP.reticle && !SP.taken && SP.stage === 'aim') {
      const gx = m.goalX(SP.side), R = SP.reticle, y = P.CY + R.y * (P.GH - 6), z = 4 + R.z * (P.BAR - 10);
      r.queue(gx, y, z, g => { const p = r.w(gx, y, z), X = Math.round(p[0]), Y = Math.round(p[1]); px.line(g, X - 5, Y, X - 2, Y, '#ffe040'); px.line(g, X + 2, Y, X + 5, Y, '#ffe040'); px.line(g, X, Y - 5, X, Y - 2, '#ffe040'); px.line(g, X, Y + 2, X, Y + 5, '#ffe040'); px.dot(g, X, Y, '#ffffff'); }, { emissive: true, bias: 20 });
    }
    const pk = m.shootout ? m.shootout.kick : SP && SP.pen;
    if (pk && pk.state === 'aim' && pk.hT && !pk.hT.cpu) {
      const y = P.CY + pk.cursor.x * (P.GH - 8), z = 4 + pk.cursor.y * 22;
      r.queue(pk.gx, y, z, g => { const p = r.w(pk.gx, y, z), X = Math.round(p[0]), Y = Math.round(p[1]); px.rect(g, X - 4, Y - 4, 9, 1, '#ffe040'); px.rect(g, X - 4, Y + 4, 9, 1, '#ffe040'); px.rect(g, X - 4, Y - 4, 1, 9, '#ffe040'); px.rect(g, X + 4, Y - 4, 1, 9, '#ffe040'); }, { emissive: true, bias: 20 });
    }
    if (pk && pk.keeperAim && pk.hK && !pk.hK.cpu && !pk.dived) { const y = P.CY + clamp(pk.keeperAim.x, -1, 1) * 30, z = pk.keeperAim.high ? 26 : 6; r.queue(pk.gx, y, z, g => { const p = r.w(pk.gx, y, z); px.disc(g, p[0], p[1], 3, '#6aa0ff'); }, { emissive: true, bias: 20 }); }
    for (const h of m.humans) if (h.ctl && h.ctl.mouse && h.ctl.raw && h.ctl.raw.aimPoint) { const a = h.ctl.raw.aimPoint; r.decal(() => { r.groundRing(a.x, a.y, 5, '#ffffff', .8); r.groundRing(a.x, a.y, 2, h.color, 1); }); }
    if (m.duel && !m.duel.result) {
      const D = m.duel, k = D.keeper.body, u = clamp(D.t / D.dur, 0, 1.3), rad = lerp(46, 12, Math.min(1, u)) * (u > 1 ? 1 - (u - 1) * 2 : 1);
      r.decal(() => { r.groundRing(k.x, k.y, 12, '#ffffff', .9); if (rad > 2) r.groundRing(k.x, k.y, rad, Math.abs(D.t - D.dur) < .06 ? '#7aff9a' : Math.abs(D.t - D.dur) < .14 ? '#ffe040' : '#ff7a3a', 1); });
    }
  },
  /* ---- name tags over the humans' footballers (a triangle in their colour, the name, stamina under 60) ---- */
  tags(g, r, m) {
    const humans = m.humans.filter(h => h.fb && !h.cpu);
    const list = humans.length ? humans.map(h => [h.fb, h.color, m.humans.length > 1 || m.kind === 'session' ? h.name : null]) : m.owner ? [[m.owner, '#ffffff', null]] : [];
    for (const [f, col, who] of list) {
      if (f.ghost || f.sentOff) continue;
      const p = r.w(f.body.x, f.body.y, f.body.z + 40), X = Math.round(p[0]), Y = Math.round(p[1]);
      if (X < -10 || X > r.W + 10 || Y < -10 || Y > r.H + 20) continue;
      px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], col); px.line(g, X - 4, Y - 5, X + 4, Y - 5, '#0b0814');
      const name = (who ? who + ' ' : '') + f.short; E.font.text(g, name, X, Y - 15, '#ffffff', { align: 'center', outline: '#0b0814' });
      if (f.stamina < 60) { const w = 18; px.rect(g, X - w / 2 - 1, Y - 18, w + 2, 3, '#0b0814'); px.rect(g, X - w / 2, Y - 17, Math.round(w * f.stamina / 100), 1, f.stamina < 25 ? '#ff5a3a' : '#7aff9a'); if (f.sweat) px.rect(g, X + w / 2 + 2, Y - 20, 1, 2, '#7ac8ff'); }
    }
  },
  scoreBug(g, r, m, mx, my) {
    const y = my, x = mx, T = m.teams, w = 172;
    E.ui.box(g, x, y, w, 30, { bg: ['#0d1430', '#16224a'], border: '#2a3a6a', alpha: .92 });
    EF.drawCrest(g, T[0], x + 11, y + 11, 14); EF.drawCrest(g, T[1], x + w - 11, y + 11, 14);
    E.font.text(g, T[0].short, x + 22, y + 5, '#fff6e0', { outline: false });
    E.font.text(g, T[1].short, x + w - 22, y + 5, '#fff6e0', { outline: false, align: 'right' });
    E.font.text(g, m.score[0] + ' - ' + m.score[1], x + w / 2, y + 3, '#ffffff', { align: 'center', scale: 2, outline: '#0b0814' });
    const clock = m.clockText; E.font.text(g, clock, x + w / 2, y + 19, m.golden ? '#ffc83a' : '#c8d0e8', { align: 'center', outline: false });
    // Euphoria gauges: three segments, flashing when full; Europhoria drains
    for (const s of [0, 1]) {
      const gx = s ? x + w - 60 : x + 6, gy = y + 22, v = m.euphoria[s], eu = m.europhoria && m.europhoria.side === s, full = v >= 100 && !eu, col = eu ? '#ffc83a' : full && Math.floor(m.t * 6) % 2 ? '#ffffff' : T[s].kits.home.shirt;
      for (let k = 0; k < 3; k++) { const sx = gx + k * 18, fill = clamp((v - k * 33.34) / 33.33, 0, 1); px.rect(g, sx, gy, 16, 4, '#0a0a14'); px.rect(g, sx + 1, gy + 1, Math.round(14 * fill), 2, col); }
      for (let c = 0; c < m.side[s].filter(f => f.sentOff).length; c++) px.rect(g, s ? x + w - 8 - c * 5 : x + 24 + c * 5, y + 14, 3, 5, '#e8202a');
    }
    if (m.pure) E.font.text(g, 'PURE FOOTBALL', x + w / 2, y + 32, '#9aa6c8', { align: 'center', font: 'tiny', outline: '#000' });
  },
  radar(g, r, m, mx, my) {
    const s = 1 / 9, w = Math.round(P.L * s), h = Math.round(P.W * s), ca = game.cornerArea(), x0 = r.W - mx - w, y0 = ca && ca.x0 < x0 + w && ca.y1 > my ? Math.ceil(ca.y1) + 4 : my;
    E.ui.box(g, x0 - 2, y0 - 2, w + 4, h + 4, { bg: '#123a1e', border: '#5a8a6a', alpha: .78 });
    px.line(g, x0 + w / 2, y0, x0 + w / 2, y0 + h, '#3a6a4a');
    for (const gx of [0, w]) px.rect(g, x0 + gx - 1, y0 + h / 2 - 5, 2, 10, '#ffffff');
    for (const f of m.players) {
      if (f.ghost) continue; const X = Math.round(x0 + (f.body.x - P.X0) * s), Y = Math.round(y0 + (f.body.y - P.Y0) * s), c = m.teams[f.side].kits[m.kits[f.side]].shirt;
      if (f.side === 0) px.disc(g, X, Y, 1.6, c); else px.rect(g, X - 1, Y - 1, 3, 3, c);
      if (f.human && !f.human.cpu) { px.rect(g, X - 2, Y - 3, 5, 1, f.human.color); }
    }
    const b = m.ball; px.rect(g, Math.round(x0 + (b.x - P.X0) * s), Math.round(y0 + (b.y - P.Y0) * s), 2, 2, '#ffffff');
  },
  notice(g, r, m) {
    const N = m.notice; if (!N) return;
    const k = N.t < .15 ? N.t / .15 : 1, y = Math.round(r.H * .3), sc = N.big ? (N.text.length > 12 ? 3 : 4) : 2;
    const cols = N.color ? [E.shade(N.color, .5), N.color, E.shade(N.color, -.2)] : ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'];
    if (k >= 1 || Math.floor(N.t * 30) % 2) E.font.title(g, N.text, r.W / 2, y - (1 - k) * 20, { align: 'center', scale: sc, colors: cols, depth: N.big ? 3 : 2 });
    if (N.sub) E.font.text(g, N.sub, r.W / 2, y + 8 * sc + 6, '#ffffff', { align: 'center', outline: '#0b0814', scale: 1 });
  },
  shootoutDots(g, r, m, my) {
    const S = m.shootout, y = my + 40;
    for (const s of [0, 1]) {
      const n = Math.max(5, S.kicks[s].length), x0 = r.W / 2 + (s ? 14 : -14 - n * 9);
      E.font.text(g, m.teams[s].short, s ? x0 + n * 9 + 4 : x0 - 4, y - 1, '#ffffff', { align: s ? 'left' : 'right', outline: '#000' });
      for (let i = 0; i < n; i++) { const k = S.kicks[s][i], X = x0 + i * 9; px.disc(g, X + 3, y + 3, 3.5, '#0a0a14'); if (k === true) px.disc(g, X + 3, y + 3, 2.5, '#5aff7a'); else if (k === false) { px.line(g, X + 1, y + 1, X + 5, y + 5, '#ff4a4a'); px.line(g, X + 5, y + 1, X + 1, y + 5, '#ff4a4a'); } }
    }
  },
  varBar(g, r, m) {
    const y = Math.round(r.H * .72), w = Math.min(r.W - 40, 260), x = Math.round((r.W - w) / 2);
    E.ui.box(g, x, y, w, 26, { bg: ['#101828', '#1a2a48'], border: '#7ac8ff' });
    px.rect(g, x + 4, y + 4, 34, 18, '#7ac8ff'); E.font.text(g, 'VAR', x + 21, y + 9, '#0a1020', { align: 'center', outline: false });
    const d = m.var && m.var.decided ? (m.var.overturn ? (m.var.kind === 'goal' ? 'NO GOAL' : 'NO PENALTY') : m.var.kind === 'goal' ? 'GOAL STANDS' : 'PENALTY STANDS') : 'CHECKING' + '...'.slice(0, Math.floor(m.t * 3) % 4);
    E.font.text(g, d, x + 46, y + 9, '#ffffff', { outline: false });
  },
  duelText(g, r, m) { const D = m.duel; if (D.result) return; const I = D.human && D.human.input ? D.human.input : D.mine ? game.input : null; E.font.title(g, 'SAVE DUEL!', r.W / 2, Math.round(r.H * .2), { align: 'center', scale: 3, colors: ['#ffffff', '#7ac8ff', '#3a6aff'] }); if (I) EF.prompts(g, r.W / 2, Math.round(r.H * .2) + 30, [['pass', 'ON THE RING']], { input: I, scale: 2, textScale: 1 }); },
  replayTag(g, r, mx, my) {
    for (let y = 0; y < r.H; y += 3) px.blend(g, .12, 'multiply', () => px.rect(g, 0, y, r.W, 1, '#000000'));
    const ca = game.cornerArea(), ty = ca && ca.x0 < r.W - mx ? Math.ceil(ca.y1) + 4 : my;
    E.ui.box(g, r.W - mx - 74, ty, 74, 20, { bg: '#c81a2a', border: '#ffffff' }); E.font.text(g, 'REPLAY', r.W - mx - 33, ty + 7, '#ffffff', { align: 'center', outline: false });
    if (Math.floor(game.real * 2) % 2) px.disc(g, r.W - mx - 66, ty + 10, 3, '#ffffff');
    EF.prompts(g, mx, my + 36, [['confirm', 'SKIP']], { align: 'left', input: game.input });
  },
  /* ---- prompts: near the controlled player (while learning), and the set piece's bar at the bottom ---- */
  prompts(g, r, m, mx, my) {
    const mode = game.settings.prompts, by = r.H - my - 64, SP = m.setpiece;
    for (const h of m.humans) {
      if (h.cpu || h.remote || !h.fb || !h.input) continue;
      const f = h.fb, I = h.input, learn = a => mode === 'always' || (mode === 'learning' && (h.used[a] || 0) < 3);
      const list = [];
      if (m.euphoria[h.side] >= 100 && !m.europhoria && !m.pure && m.mode === 'play') list.push(['euphoria', 'EUROPHORIA!']);
      if (m.europhoria && m.europhoria.side === h.side && !m.superUsed && f.hasBall()) list.push(['shoot', 'HOLD: SUPER STRIKE']);
      if (m.mode === 'play' && !f.hasBall() && !m.owner && f.airWindow && f.airWindow()) { const w = f.airWindow(); list.push(['shoot', w.z > 22 ? 'HEADER' : 'VOLLEY']); }
      else if (m.mode === 'play' && mode !== 'off') {
        if (f.hasBall()) { if (learn('pass')) list.push(['pass', 'PASS']); if (learn('shoot')) list.push(['shoot', 'SHOOT']); if (learn('lob')) list.push(['lob', 'LOB']); if (learn('skill')) list.push(['skill', 'SKILL']); }
        else if (m.owner && m.owner.side !== h.side) { if (learn('tackle')) list.push(['pass', 'TACKLE']); if (learn('slide')) list.push(['shoot', 'SLIDE']); if (learn('barge')) list.push(['lob', 'BARGE']); }
      }
      if (list.length && !(SP && !SP.taken)) { const p = r.w(f.body.x, f.body.y, f.body.z), X = Math.round(p[0]), Y = Math.round(p[1]) + 8; if (X > 0 && X < r.W && Y < r.H - 12) EF.prompts(g, X, Y, list.slice(0, 3), { input: I }); }
    }
    // the set piece's bar
    const h = SP && !SP.taken ? m.humanFor(SP.side) : null;
    let bar = null, I = h && h.input;
    if (SP && !SP.taken && h && SP.stage === 'aim' && SP.taker === h.fb) {
      if (SP.kind === 'corner') bar = [['up', 'AIM THE RING'], ['lob', 'CROSS'], ['shoot', 'SHORT']];
      else if (SP.kind === 'freekick' && SP.shootable) bar = [['up', 'AIM'], ['shoot', 'HOLD: SHOOT'], ['pass', 'PASS'], ['lob', 'LOB']];
      else if (SP.kind === 'goalkick') bar = [['pass', 'SHORT'], ['lob', 'LONG']];
    }
    if (SP && SP.kind === 'goalkick' && !SP.taken && h && SP.stage === 'aim') bar = [['pass', 'SHORT'], ['lob', 'LONG']];
    const pk = m.shootout ? m.shootout.kick : SP && SP.pen;
    if (pk && (pk.state === 'aim' || pk.state === 'runup')) {
      if (pk.hT && !pk.hT.cpu && pk.state === 'aim') { bar = [['up', 'AIM'], ['shoot', 'HOLD: POWER (LIGHT + CENTRE: PANENKA)']]; I = pk.hT.input; }
      else if (pk.hK && !pk.hK.cpu && !pk.dived) { bar = [['left', 'PICK A SIDE'], ['pass', 'DIVE']]; I = pk.hK.input; }
    }
    if (m.celebration && m.celebration.human && !m.celebration.pick) { const C = m.celebration; bar = C.offer.map((c, i) => [['pass', 'shoot', 'lob', 'through'][i], c.name]); I = C.human.input; }
    if (bar && I) { const w = EF.prompts(g, -9999, -9999, bar, { input: I }); E.ui.box(g, Math.round(r.W / 2 - w / 2 - 8), by - 5, w + 16, 21, { bg: '#0d1430', border: '#ffc83a', alpha: .9 }); EF.prompts(g, r.W / 2, by, bar, { input: I }); }
  },
  /** arrows at the screen's edge for the ball and the humans' footballers when they are off it */
  arrows(g, r, m) {
    const pts = [[m.ball, '#ffffff']].concat(m.humans.filter(h => h.fb && !h.cpu).map(h => [h.fb.body, h.color]));
    for (const [o, c] of pts) {
      const p = r.w(o.x, o.y, o.z || 0), X = p[0], Y = p[1]; if (X >= 0 && X <= r.W && Y >= 0 && Y <= r.H) continue;
      const cx = clamp(X, 8, r.W - 8), cy = clamp(Y, 40, r.H - 8), a = Math.atan2(Y - cy, X - cx);
      px.poly(g, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a + 2.4) * 5, cy + Math.sin(a + 2.4) * 5], [cx + Math.cos(a - 2.4) * 5, cy + Math.sin(a - 2.4) * 5]], c);
    }
  }
};
