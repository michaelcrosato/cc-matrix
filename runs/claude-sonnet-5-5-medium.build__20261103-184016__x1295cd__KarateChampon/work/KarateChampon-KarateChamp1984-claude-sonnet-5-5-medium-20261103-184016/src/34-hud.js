/* ---------- fight HUD: clock, point slots, round pips, score, calls, popups ---------- */
class FightHUD {
  constructor(bout, o = {}) {
    this.b = bout; this.o = o; this.call = null; this.pop = []; this.hint = null; this.names = o.names || [bout.f[0].name, bout.f[1].name]; this.tags = o.tags || ['WHITE', 'RED']; this.inputs = [];
    bout.on('call', c => { this.call = { id: c.id, t: KC.game.real, text: KC.callText(c.id) }; KC.onCall && KC.onCall(c, bout); });
    bout.on('point', p => { this.pop.push({ t: KC.game.real, text: (KC.game.settings.techNames !== false ? KC.TECHS[p.tech].name + ' ' : '') + p.pts + (p.counter ? ' COUNTER!' : ''), side: p.side, full: p.full }); });
  }
  draw(r) {
    const b = this.b, now = KC.game.real;
    r.overlay(g => {
      const W = r.W, H = r.H, cx = W / 2;
      // clock
      KC.panel(g, cx - 24, 4, 48, 26, { alpha: .8 });
      E.font.title(g, String(Math.ceil(b.clock)).padStart(2, '0'), cx, 8, { scale: 2, align: 'center', colors: b.clock < 6 ? ['#fff', '#ff8a6a', '#e0302a'] : GOLD, depth: 1 });
      // sides
      for (let s = 0; s < 2; s++) {
        const left = s === 0, pw = clamp(Math.floor((W - 64) / 2), 96, 150), al = left ? 'left' : 'right', col = left ? '#fff6e8' : '#ff7a6a';
        KC.panel(g, left ? 4 : W - 4 - pw, 4, pw, 40, { alpha: .6 });
        KC.text(g, up(this.names[s]).slice(0, Math.floor((pw - 12) / 6)), left ? 10 : W - 10, 8, col, { align: al }); KC.text(g, this.tags[s], left ? 14 + 20 * Math.ceil(T().pointsToWin) + 2 : W - 14 - 20 * Math.ceil(T().pointsToWin) - 2, 27, left ? '#b8b0d8' : '#ff9a8a', { align: al });
        const n = Math.ceil(T().pointsToWin);
        for (let i = 0; i < n; i++) {
          const x = left ? 12 + i * 20 : W - 12 - 16 - i * 20, y = 21, v = clamp(b.pts[s] - i, 0, 1);
          px.disc(g, x + 7, y + 7, 8, '#10101c'); px.disc(g, x + 7, y + 7, 6, '#2a2a40');
          if (v >= 1) px.disc(g, x + 7, y + 7, 6, col); else if (v > 0) { for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 0; xx++) if (xx * xx + yy * yy <= 36) px.dot(g, x + 7 + (left ? xx : -xx), y + 7 + yy, col); }
        }
        const rn = b.needRounds; if (rn > 1 || !b.single) for (let i = 0; i < rn; i++) { const x = left ? 12 + i * 10 : W - 22 - i * 10; px.disc(g, x + 3, 40, 3, '#10101c'); px.disc(g, x + 3, 40, 2, b.rounds[s] > i ? '#ffd060' : '#3a3a50'); }
      }
      // scores
      if (!this.o.hideScore) { KC.text(g, '1P ' + fmt(b.score[0]), 8, H - 14, '#fff6e8'); KC.text(g, 'HI ' + fmt(KC.hiScore ? KC.hiScore() : 0), W - 8, H - 14, '#ffd060', { align: 'right' }); }
      // calls: title font, big
      if (this.call && now - this.call.t < 1.4) {
        const k = now - this.call.t, sc = this.call.text.length > 13 ? 2 : 3, a = clamp(1.4 - k, 0, 1);
        px.blend(g, Math.min(1, a * 1.6), 'normal', () => E.font.title(g, this.call.text, cx, Math.round(H * .3), { scale: sc, align: 'center', colors: k < .1 ? ['#fff', '#fff', '#ffe8a0'] : GOLD, depth: 3 }));
      }
      this.pop = this.pop.filter(p => now - p.t < 1.6);
      for (const p of this.pop) {
        const k = now - p.t, sc = 1, w = E.font.width(p.text, { scale: sc }), lines = w > W - 24 ? E.font.wrap(p.text, Math.floor(W / 2 - 12), { scale: sc }) : [p.text], x = clamp(p.side === 0 ? W * .3 : W * .7, Math.min(W / 2, Math.max(...lines.map(l => E.font.width(l, { scale: sc }))) / 2 + 8), W - Math.max(...lines.map(l => E.font.width(l, { scale: sc }))) / 2 - 8);
        lines.forEach((l, i) => KC.text(g, l, Math.round(x), Math.round(H * .5 - k * 14 + i * 10), p.full ? '#ffe070' : '#fff', { align: 'center', scale: sc }));
      }
      if (b.phase === 'card') { const t = b.round; E.font.title(g, b.needRounds > 1 ? 'ROUND ' + t : 'BOUT', cx, Math.round(H * .42), { scale: 3, align: 'center', colors: GOLD, depth: 3 }); }
      if (this.hint) KC.text(g, this.hint, cx, H - 44, '#ffe8a0', { align: 'center' });
      if (KC.tuned()) KC.text(g, 'DEV', cx, 34, '#ff6a6a', { align: 'center' });
      if (this.o.inputDisplay || KC.game.settings.inputDisplay || KC.dev.showInput) this.drawInputs(g, r);
    });
  }
  drawInputs(g, r) {
    const rd = this.o.readers && this.o.readers[0]; if (!rd) return; let x = 8; const y = r.H - 40;
    for (const h of rd.hist.slice(-8)) { KC.text(g, (h.p === 'n' ? '' : h.p.toUpperCase()) + '+' + h.t.toUpperCase(), x, y, '#9ad8ff', { scale: 1 }); x += 36; }
  }
}
KC.FightHUD = FightHUD;
KC.callText = id => (KC.CALLS[id] || ['?', '?'])[KC.game.settings.calls === 'Japanese' ? 1 : 0];
