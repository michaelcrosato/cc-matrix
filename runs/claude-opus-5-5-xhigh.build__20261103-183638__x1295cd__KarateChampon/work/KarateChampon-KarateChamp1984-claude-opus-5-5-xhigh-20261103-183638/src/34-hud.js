/* =====================================================================================================================
 * FIGHT HUD: the clock (top centre), each side's name, belt and point slots (a half point half-fills a circle, a full
 * point fills it), round pips, the scores, the referee's calls, hints, the input display and the DEV badge. Information is
 * never colour alone: the sides are labelled WHITE and RED, half and full differ in shape.
 * ===================================================================================================================== */
KC.HUD = {
  /** draw the fight HUD for bout b in r.overlay; o: { names, belts, tags, hint, hi, score, inputs: [f, ...], dev } */
  draw(r, b, o = {}) {
    r.overlay(g => {
      const W = r.W, H = r.H, ca = KC.game.cornerArea && KC.game.cornerArea(), cornerH = ca && ca.x0 < W - 4 ? Math.ceil(ca.y1) + 2 : 0;
      // the clock
      const c = Math.ceil(Math.max(0, b.clock)), cs = String(c).padStart(2, '0'), low = c <= 5 && b.phase === 'fight';
      E.ui.box(g, Math.round(W / 2) - 20, 4, 40, 26, { bg: ['#1a1430', '#0a0818'], border: low && Math.floor(KC.game.real * 4) % 2 ? '#ff5a4a' : '#e8d8b0' });
      E.font.title(g, KC.DEV && KC.DEV.infiniteTime ? '--' : cs, Math.round(W / 2), 8, { scale: 2, align: 'center', colors: low ? ['#ffd0c0', '#ff5a4a'] : ['#fff6d0', '#ffd060', '#e8782a'] });
      // each side: label, name, belt, point slots, round pips
      for (const s of [0, 1]) {
        const right = s === 1, f = b.f[s], x = right ? W - 8 : 8, y = right ? 4 + cornerH : 4, al = right ? 'right' : 'left';
        const sideCol = s === 0 ? '#fff6e8' : '#ff5a4a';
        E.font.text(g, s === 0 ? 'WHITE' : 'RED', x, y, sideCol, { align: al, outline: '#1a0c08' });
        const name = (o.names && o.names[s]) || f.F.short, nx = right ? x - E.font.width(s === 0 ? 'WHITE' : 'RED') - 6 : x + E.font.width('WHITE') + 6;
        E.font.text(g, name, nx, y, o.colors && o.colors[s] || '#ffe7a8', { align: al, outline: '#1a0c08' });
        // the belt icon
        const bx = right ? nx - E.font.width(name) - 22 : nx + E.font.width(name) + 6, belt = f.rig.kcRank;
        if (belt && !o.noBelt) { px.rect(g, bx, y + 2, 16, 4, belt.belt); px.rect(g, bx + 6, y + 6, 2, 4, belt.belt); px.rect(g, bx + 9, y + 6, 2, 3, belt.belt); px.rect(g, bx, y + 2, 16, 1, E.shade(belt.belt, .3)); if (belt.stripes) for (let k = 0; k < Math.min(4, Math.ceil(belt.stripes / 2)); k++) px.rect(g, bx + 13 - k * 2, y + 2, 1, 4, '#e8c040'); }
        // point slots
        const n = Math.ceil(b.R('pointsToWin')), pts = b.points[s];
        for (let i = 0; i < n; i++) {
          const cx = right ? x - 8 - i * 18 : x + 8 + i * 18, cy = y + 20, fill = clamp(pts - i, 0, 1);
          px.disc(g, cx, cy, 7, '#0a0818'); px.disc(g, cx, cy, 6, '#3a3048');
          if (fill >= 1) { px.disc(g, cx, cy, 6, s === 0 ? '#f4f0e6' : '#e83a2a'); px.disc(g, cx - 2, cy - 2, 2, '#ffffff'); }
          else if (fill > 0) { px.disc(g, cx, cy, 6, s === 0 ? '#f4f0e6' : '#e83a2a'); px.rect(g, right ? cx - 7 : cx, cy - 7, 8, 15, '#3a3048'); px.rect(g, cx, cy - 6, 1, 13, '#0a0818'); }
        }
        // round pips
        const rw = b.R('roundsToWin');
        if (rw > 1) for (let i = 0; i < rw; i++) { const px0 = right ? x - 4 - i * 9 : x + i * 9, on = b.roundWins[s] > i; px.rect(g, px0, y + 31, 7, 4, on ? '#ffd060' : '#2a2438'); px.rect(g, px0, y + 31, 7, 1, on ? '#fff6c0' : '#4a4058'); }
        if (o.tags && o.tags[s]) E.font.text(g, o.tags[s], right ? x : x, y + 38, '#c8c0e8', { align: al, outline: '#000', font: 'tiny' });
      }
      // the scores
      if (o.score !== undefined) { E.font.text(g, '1P ' + KC.pad(o.score), 8, H - 12, '#fff6e8', { outline: '#000' }); E.font.text(g, 'HI ' + KC.pad(o.hi || 0), W - 8, H - 12, '#ffd060', { align: 'right', outline: '#000' }); }
      // the round card
      if (b.phase === 'card') { const k = clamp(b.t / .2, 0, 1); E.font.title(g, b.cardText, Math.round(W / 2), Math.round(H * .36), { scale: 3, align: 'center', colors: ['#ffffff', '#ffe08a', '#e0662a'], depth: 3 }); void k; }
      b.ref.drawBanner(g, W, H);
      // a hint (story's first matches)
      if (o.hint && (b.phase === 'fight' || b.phase === 'ready')) { const w = E.font.width(o.hint) + 14; E.ui.box(g, Math.round((W - w) / 2), H - 34, w, 14, { bg: '#0a0818', border: '#8a7ab0', alpha: .8 }); E.font.text(g, o.hint, Math.round(W / 2), H - 31, '#e8e0ff', { align: 'center', outline: false }); }
      // the input display: each fighter's last presses as posture + technique arrows
      if (o.inputs) o.inputs.forEach((f, i) => { if (!f) return; const L = f.lastInputs.slice(-8), x0 = i === 0 ? 8 : W - 8 - 8 * 22; L.forEach(([p, t], k) => { E.font.text(g, (KC.ARROW[p] || '·') + KC.ARROW[t], x0 + k * 22, H - 26, k === L.length - 1 ? '#ffe08a' : '#a8a0c8', { outline: '#000' }); }); });
      if (KC.tuneChanged() || (KC.DEV && KC.DEV.on && KC.DEV.anyToggle && KC.DEV.anyToggle())) { E.ui.box(g, Math.round(W / 2) - 14, 32, 28, 12, { bg: '#5a1010', border: '#ff8a6a' }); E.font.text(g, 'DEV', Math.round(W / 2), 34, '#ffd0c0', { align: 'center', outline: false }); }
    });
  },
  /** a points popup over the scorer: the technique's name and its points */
  popup(game, d) {
    const t = KC.TECH[d.tech], named = !KC.settings || KC.settings.techNames !== false;
    game.particles.text(d.x, 0, d.z + 26, (named ? t.name + ' ' : '') + d.pts, d.full ? '#ffe070' : '#ffffff', { scale: 1, bounce: false });
    if (d.counter) game.particles.text(d.x, 0, d.z + 38, 'COUNTER x' + KC.TUNE.counterMul, '#ff8a6a', { scale: 1, bounce: false });
  }
};
