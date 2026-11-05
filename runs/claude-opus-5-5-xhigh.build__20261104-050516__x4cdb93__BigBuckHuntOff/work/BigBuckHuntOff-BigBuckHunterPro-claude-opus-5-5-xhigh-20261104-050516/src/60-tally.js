// 60-tally: after each site, one beat at a time over the dimmed frozen view: SITE CLEAR or TIME!; a card for each animal
// bagged, its x-ray Shot Chart (where every round went, labelled), distance, rack and its points counted up; then the
// critters, penalties and bonuses, the stars, and the standings (party columns, or the rivals in the campaign).
function dim(g, W, Ht, a = .55) { px.blend(g, a, 'multiply', () => px.rect(g, 0, 0, W, Ht, '#3a2a1e')); }
function drawStars(g, x, y, n, of = 3, t = 99) {
  for (let i = 0; i < of; i++) { const on = i < n && t > i * .25, cx = x + i * 22, s = on ? 1 + Math.max(0, .4 - (t - i * .25)) : 1; drawRackIcon(g, cx, y, on ? 'bagged' : 'gone', on ? '#ffd040' : '#5a4a3a'); if (on && s > 1.05) px.ddisc(g, cx, y, 12, '#ffe080', .4); }
}
SEG.tally = (H, o) => {
  const site = o.trophy ? H.trophySite : H.lastSite, pages = [], auto = H.mode === 'attract' || H.hubMode || o.auto;
  if (site) {
    pages.push({ kind: 'head' });
    const kills = []; for (const res of site.results) for (const k of res.kills) kills.push({ k, p: res.p });
    kills.sort((a, b) => b.k.points - a.k.points);
    for (const kk of kills.slice(0, H.mode === 'attract' ? 2 : 6)) pages.push({ kind: 'kill', k: kk.k, p: kk.p });
    pages.push({ kind: 'sum' });
    if (H.mode === 'campaign' && H.players.length === 1 && !o.trophy) pages.push({ kind: 'rivals' });
  }
  let i = 0, t = 0, count = 0, ticked = 0;
  return { block: true, canShoot: false, showReticles: false, actorsLive: false, cinema: true, noForeground: false,
    enter() { if (G.sfx) G.sfx.music('results', { fade: .8 }); if (!pages.length) i = 99; },
    update(dt) {
      if (i >= pages.length) return true;
      t += dt; const pg = pages[i];
      if (pg.kind === 'kill') { const tgt = pg.k.points; const prev = count; count = Math.min(tgt, count + Math.max(1, tgt * dt * 1.4)); if (Math.floor(count / 50) > ticked) { ticked = Math.floor(count / 50); if (G.sfx) G.sfx.play('tick'); } if (prev < tgt && count >= tgt && G.sfx) G.sfx.play('confirm'); }
      const ready = t > .6, adv = ready && (anyConfirm(H) || (auto && t > (pg.kind === 'kill' ? 2.6 : 2)) || t > 12);
      if (adv) { if (pg.kind === 'kill' && count < pg.k.points) { count = pg.k.points; t = .3; } else { i++; t = 0; count = 0; ticked = 0; if (i < pages.length && pages[i].kind === 'sum' && G.sfx) G.sfx.play('whoosh'); } }
      return i >= pages.length;
    },
    skip() { i = pages.length; },
    draw(g, W, Ht) {
      dim(g, W, Ht, .6);
      const pg = pages[i]; if (!pg || !site) return;
      const bw = Math.min(W - 40, 340), bh = 196, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2 - 6;
      E.ui.box(g, x, y, bw, bh, { bg: ['#2e2014', '#160e08'], border: '#c8843a' });
      const name = (site.def.name || '').toUpperCase(), reason = site.endReason === 'clear' ? 'SITE CLEAR' : site.endReason === 'benched' ? 'BENCHED' : 'TIME!';
      if (pg.kind === 'head') {
        E.font.title(g, o.trophy ? (H.trophyInfo && H.trophyInfo.bagged ? 'TROPHY BAGGED!' : 'THE ONE THAT GOT AWAY') : reason, W / 2, y + 40, { scale: 3, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
        E.font.text(g, name, W / 2, y + 80, '#f4ead8', { align: 'center', scale: 2, outline: false });
        const bagged = site.bucksSpawned.filter(a => a.bagger).length, esc = site.bucksSpawned.filter(a => a.escaped).length, lost = site.bucksSpawned.filter(a => a.lost).length;
        E.font.text(g, bagged + ' BAGGED   ' + esc + ' GOT AWAY' + (lost ? '   ' + lost + ' LOST' : ''), W / 2, y + 106, '#d8c8a8', { align: 'center', outline: false });
      } else if (pg.kind === 'kill') {
        const k = pg.k, a = k.a, sc = a.sp.id === 'moose' ? 1.6 : a.sp.id === 'elk' ? 2.1 : 2.9;
        E.font.text(g, (k.trophy ? 'TROPHY  ' : '') + a.label + '  ·  ' + k.rack, x + 12, y + 8, k.trophy ? '#ffd040' : '#ffe0b0', { outline: false, shadow: '#000' });
        if (H.players.length > 1) E.font.text(g, pg.p.name, x + bw - 12, y + 8, pg.p.color, { align: 'right', outline: false });
        // the chart: the animal side-on, see-through, a mark where each round went
        const cx = x + bw / 2 - 6, cyy = y + 118;
        px.rect(g, x + 10, y + 22, bw - 20, 112, '#0e1820'); for (let gx = x + 10; gx < x + bw - 10; gx += 12) px.rect(g, gx, y + 22, 1, 112, '#16242e'); for (let gy = y + 22; gy < y + 134; gy += 12) px.rect(g, x + 10, gy, bw - 20, 1, '#16242e');
        const offX = -((a.rig.S.head[0] + a.rig.S.tail[0]) / 2) * sc;
        const marks = a.rig.drawXray(g, cx + offX, cyy, sc, a.hits.map(h => ({ local: h.local, lethal: (ZONES[h.zone] || {}).lethal, zone: h.zone, pn: h.pn })));
        marks.forEach(([mx, my, h], j) => { const lx = mx + (j % 2 ? 26 : -26), ly = y + 30 + j * 10; px.line(g, mx, my, lx, ly + 3, '#ffe080'); E.font.text(g, (ZONES[h.zone] || ZONES.body).label, lx, ly, h.lethal ? '#ff8a7a' : '#ffd040', { align: j % 2 ? 'left' : 'right', outline: '#0e1820' }); });
        // the points line
        const line = fmt(k.base) + ' x' + k.distMult.toFixed(1) + ' DIST x' + k.zoneMult.toFixed(1) + ' ' + (ZONES[k.zone] || ZONES.body).label + (k.running ? ' x' + T('runningMult').toFixed(2) + ' RUN' : '') + (k.trophy ? ' x3 TROPHY' : '');
        E.font.text(g, Math.round(k.dist) + ' M', x + 14, y + 140, '#f4ead8', { scale: 2, outline: false });
        E.font.text(g, line, x + 14, y + 158, '#c8b898', { outline: false });
        const extra = (k.quick ? ' +50 QUICK DRAW' : '') + (k.multi ? ' +' + k.multi + (k.multiN >= 3 ? ' TRIPLE' : ' DOUBLE') : '') + (k.shared ? '  SHARED' : '');
        if (extra) E.font.text(g, extra.trim(), x + 14, y + 170, '#7ad0ff', { outline: false });
        E.font.text(g, '+' + fmt(count), x + bw - 14, y + 144, '#ffffff', { align: 'right', scale: 3, outline: '#1a0c08' });
      } else if (pg.kind === 'sum') {
        E.font.text(g, name + '  ·  TOTALS', W / 2, y + 8, '#ffe0b0', { align: 'center', outline: false });
        const R = site.results, cw = (bw - 20) / R.length;
        R.forEach((res, j) => {
          const cx0 = x + 10 + j * cw, lines = [];
          for (const k of res.kills) lines.push([k.label + ' ' + Math.round(k.dist) + 'M', k.points]);
          for (const c of res.critters) lines.push([c.label.toUpperCase(), c.points]);
          for (const b of res.bonuses) lines.push([b.label, b.points]);
          for (const pz of res.penalties) lines.push([pz.label, pz.points]);
          if (R.length > 1) E.font.text(g, res.p.name, cx0 + cw / 2, y + 22, res.p.color, { align: 'center', outline: false });
          lines.slice(0, 9).forEach(([l, v], q) => { const yy = y + 36 + q * 11, show = t > q * .18; if (!show) return; E.font.text(g, l, cx0 + 6, yy, v < 0 ? '#ff8a7a' : '#e8dcc8', { outline: false }); E.font.text(g, (v > 0 ? '+' : '') + fmt(v), cx0 + cw - 6, yy, v < 0 ? '#ff8a7a' : '#ffffff', { align: 'right', outline: false }); });
          E.font.text(g, fmt(res.score), cx0 + cw / 2, y + 140, '#ffffff', { align: 'center', scale: R.length > 2 ? 2 : 3, outline: '#1a0c08' });
          drawStars(g, cx0 + cw / 2 - 22, y + 176, res.stars, 3, t - .4);
        });
        if (R.length > 1) { const lead = R.slice().sort((a, b) => b.score - a.score)[0]; E.font.text(g, lead.p.name + ' TAKES THE SITE', W / 2, y + 186, lead.p.color, { align: 'center', outline: false }); }
      } else if (pg.kind === 'rivals') {
        E.font.text(g, 'THE HUNT-OFF STANDINGS', W / 2, y + 10, '#ffe0b0', { align: 'center', outline: false, scale: 2 });
        const list = (H.rivalBoard || []).concat([{ name: 'YOU', score: H.players[0].score, color: H.players[0].color }]).sort((a, b) => b.score - a.score);
        list.forEach((r, q) => { const yy = y + 44 + q * 26; E.font.text(g, (q + 1) + '. ' + r.name, x + 30, yy, r.color, { scale: 2, outline: false }); E.font.text(g, fmt(r.score), x + bw - 30, yy, '#ffffff', { align: 'right', scale: 2, outline: false }); });
      }
      if (t > .6) Glyph.cue(g, 'confirm', 'CONTINUE', W / 2, y + bh + 14, H.players[0].input);
    }
  };
};
