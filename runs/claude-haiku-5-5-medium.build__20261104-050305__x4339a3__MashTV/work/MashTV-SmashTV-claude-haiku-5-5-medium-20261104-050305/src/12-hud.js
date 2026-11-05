/* MASH TV — 12-hud: the in-play HUD (§11.4) and the broadcast cards, drawn in screen pixels over the arena. Every position
 * anchors to r.W and r.H, so it fits any screen shape. */

MT.hud = {
  // the lower third: one line at a time, typed out at 45 characters a second (§5.12)
  lowerThird(r, ctx) {
    const L = MT.lineNow; if (!L || !MT.settings().subtitles) return;
    const chars = Math.min(L.text.length, Math.floor(L.t * 45)), text = L.text.slice(0, chars);
    const w = Math.min(r.W - 40, 300), x = Math.round(r.W / 2 - w / 2), y = r.H - 58;
    r.overlay(g => {
      E.ui.box(g, x, y, w, 40, { bg: ['#1a0a30', '#0c0418'], border: '#ffcc33', alpha: .92 });
      const nameCol = L.speaker === 'LANCE' ? '#ffcc33' : L.speaker === 'PENNY' ? '#2ee6ff' : L.speaker === 'NETWORK' ? '#ff3344' : '#ff8ad8';
      E.font.text(g, L.speaker, x + 6, y + 4, nameCol, { scale: 1, shadow: '#000' });
      E.font.text(g, text, x + 6, y + 15, '#fff7e8', { scale: 1, shadow: '#000', wrap: w - 12 });
    });
  },
  // the banners: big, bulb-framed, sliding in
  banners(r) {
    let y = Math.round(r.H * .36);
    for (const b of MT.banners.slice(0, 2)) {
      const k = Math.min(1, b.age / .2), slide = Math.round((1 - k) * 60), w = Math.min(r.W - 40, E.font.width(b.text, { scale: 2 }) + 40);
      const x = Math.round(r.W / 2 - w / 2) + slide;
      r.overlay(g => { E.ui.box(g, x, y, w, 26, { bg: ['#14072a', '#0a0316'], border: b.color, alpha: .9 }); E.font.text(g, b.text, r.W / 2 + slide, y + 6, b.color, { scale: 2, align: 'center', shadow: '#000' }); });
      y += 30;
    }
  },
  // the RATINGS gauge: a TV dial with a needle, the multiplier, and the APPLAUSE light
  ratings(r, run, W) {
    const R = run.ratings.R, cx = Math.round(r.W / 2), y = 8, w = 110;
    r.overlay(g => {
      E.ui.box(g, cx - w / 2, y, w, 22, { bg: ['#120822', '#07030f'], border: '#ff2e88', alpha: .92 });
      E.font.text(g, 'RATINGS', cx, y + 2, '#ffcc33', { scale: 1, align: 'center', shadow: '#000' });
      px.rect(g, cx - w / 2 + 6, y + 13, w - 12, 4, '#2a1446');
      px.rect(g, cx - w / 2 + 6, y + 13, Math.round((w - 12) * R / 100), 4, R >= 100 ? '#ff2e88' : '#2ee6ff');
      const mul = W ? W.multiplier : 1;
      E.font.text(g, 'x' + mul, cx + w / 2 - 6, y + 2, '#ffffff', { scale: 1, align: 'right', shadow: '#000' });
      if (W && W.primeOn) E.font.text(g, 'PRIME TIME', cx, y + 26, (Math.floor(W.time * 4) % 2 ? '#ff2e88' : '#ffcc33'), { scale: 1, align: 'center', shadow: '#000' });
      if (MT.G && run) E.font.text(g, '★ ' + run.keys + '/9', cx, y + 26 + (W && W.primeOn ? 10 : 0), '#ffcc33', { scale: 1, align: 'center', shadow: '#000' });
    });
  },
  // a player's panel: portrait-free, the name in its colour, cash, HP pips, lives, the weapon bar and add-ons
  panel(r, c, slot) {
    const w = 96, h = 30, pad = 4, cornerX = slot % 2 === 0 ? pad : r.W - w - pad, cornerY = slot < 2 ? (r.H >= 200 ? 40 : 30) : r.H - h - 48;
    r.overlay(g => {
      E.ui.box(g, cornerX, cornerY, w, h, { bg: ['#140a24', '#070310'], border: c.color, alpha: .86 });
      E.font.text(g, c.n + ' ' + c.name, cornerX + 4, cornerY + 2, c.color, { scale: 1, shadow: '#000' });
      const cash = '$' + c.cash.toLocaleString('en-US');
      E.font.text(g, cash, cornerX + 4, cornerY + 11, '#fff7e8', { scale: 1, shadow: '#000' });
      for (let i = 0; i < c.maxHp; i++) px.rect(g, cornerX + w - 10 - i * 5, cornerY + 3, 3, 4, i < c.hp ? '#ff3344' : '#3a2a40');
      for (let i = 0; i < Math.min(c.lives, 6); i++) px.disc(g, cornerX + 6 + i * 7, cornerY + h - 4, 2.5, c.color);
      if (c.weapon.id !== 'blaster') { const pct = c.weapon.t / (MT.WEAPONS[c.weapon.id].dur * MT.T.puDuration); E.ui.bar(g, cornerX + 4, cornerY + 20, 44, 3, Math.max(0, Math.min(1, pct)), '#2ee6ff'); E.font.text(g, (MT.WEAPONS[c.weapon.id].name || '').slice(0, 12), cornerX + 50, cornerY + 18, '#2ee6ff', { scale: 1 }); }
      if (c.bombs > 0) E.font.text(g, '★'.repeat(Math.min(3, c.bombs)), cornerX + w - 30, cornerY + 17, '#ffcc33', { scale: 1 });
      if (c.state === 'out') { E.ui.box(g, cornerX, cornerY, w, h, { bg: ['#000', '#000'], alpha: .6 }); E.font.text(g, 'OUT - START', cornerX + 6, cornerY + 11, '#ff3344', { scale: 1, shadow: '#000' }); }
    });
  },
  // the room name, the wave dots and the prompts under the arena
  roomBar(r, W) {
    if (!W) return;
    const txt = W.R.type === 'boss' ? W.R.name : (W.R.id + ' ' + W.R.name);
    r.overlay(g => { E.font.text(g, txt, r.W / 2, r.H - 14, '#c8c0e0', { scale: 1, align: 'center', shadow: '#000' }); });
    if (W.phase === 'exit' && !MT.G.paused) { const p = (Math.floor(W.time * 2) % 2) ? '#ffcc33' : '#ffffff'; r.overlay(g => E.font.text(g, 'PICK A DOOR!', r.W / 2, r.H / 2 + 50, p, { scale: 2, align: 'center', shadow: '#000' })); }
  },
  bugs(r) {
    const on = Math.floor(MT.G.time * 2) % 2;
    r.overlay(g => { if (on) px.disc(g, 8, 8, 2.5, '#ff3344'); E.font.text(g, 'LIVE', 14, 5, '#ffffff', { scale: 1, shadow: '#000' }); E.font.text(g, 'MASH 9', 8, 16, '#ffcc33', { scale: 1, shadow: '#000' }); });
  },
  bossBar(r, W) {
    const b = W && W.boss; if (!b || !b.alive && !(b.dying > 0)) return;
    const hp = b.parts.filter(p => p.id !== 'hub' || true).reduce((s, p) => s + Math.max(0, p.hp), 0), max = b.parts.reduce((s, p) => s + p.max, 0) || 1;
    const name = { mashy: 'MASHY', wheel: 'THE WHEEL OF MISFORTUNE', lance: W.phaseName === 'network' ? 'THE NETWORK' : 'LANCE LUSTRE' }[b.kind];
    const w = Math.min(r.W - 120, 260), x = Math.round(r.W / 2 - w / 2), y = 40;
    r.overlay(g => { E.font.text(g, name, r.W / 2, y - 10, '#ffcc33', { scale: 1, align: 'center', shadow: '#000' }); E.ui.bar(g, x, y, w, 6, Math.min(1, hp / max), '#ff3344'); });
  },
  // the cards: the episode title card, the NEXT ON MASH TV map card, the recap, the continue
  card(r, title, sub, line, sec) {
    r.overlay(g => {
      px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.82)');
      E.font.title(g, title, r.W / 2, r.H / 2 - 40, { scale: 3, align: 'center', colors: ['#ff2e88', '#ffcc33'] });
      E.font.text(g, sub, r.W / 2, r.H / 2 + 6, '#fff7e8', { scale: 2, align: 'center', shadow: '#000' });
      if (line) E.font.text(g, line, r.W / 2, r.H / 2 + 36, '#2ee6ff', { scale: 1, align: 'center', shadow: '#000', wrap: r.W - 60 });
    });
  },
  mapCard(r, ep, roomId) {
    const E2 = MT.EPISODES[ep - 1]; if (!E2) return;
    r.overlay(g => {
      px.rect(g, 0, 0, r.bw, r.bh, 'rgba(10,4,20,0.9)');
      E.font.title(g, 'NEXT ON MASH TV', r.W / 2, 16, { scale: 2, align: 'center', colors: ['#ff2e88', '#ffcc33'] });
      const cx = r.W / 2, cy = r.H / 2 + 14, step = Math.min(r.W / 5, r.H / 3.6);
      for (const id of Object.keys(E2.map)) {
        const [mx, my] = E2.map[id], x = cx + mx * step, y = cy - my * step * .9 + 10;
        const room = MT.ROOMS[id], cur = id === roomId;
        E.ui.box(g, x - 46, y - 14, 92, 28, { bg: cur ? ['#ffcc33', '#b07a00'] : ['#241240', '#0e061e'], border: cur ? '#fff7e8' : '#ff2e88', alpha: .95 });
        E.font.text(g, id + ' ' + (room ? room.name.split(' ')[0] : ''), x, y - 6, cur ? '#15121c' : '#fff7e8', { scale: 1, align: 'center' });
        if (room && room.key) E.font.text(g, '★', x + 38, y - 14, '#ffcc33', { scale: 1 });
      }
    });
  }
};
MT.settings = () => (MT.G ? { subtitles: MT.G.settings.subtitles !== false } : { subtitles: true });
