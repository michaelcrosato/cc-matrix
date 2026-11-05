// 51-hud: big, sparse and readable at ten feet: the site and its clock, the bucks to come, each hunter's panel (score,
// shells, the chamber light, calls), banners, score pops over the animals, captions, prompts in the last device's
// glyphs, the rival to beat, the standings, and the reticles.
const HUD = {
  banners: [], pops: [], cap: null, tips: [], shown: {},
  reset() { this.banners.length = 0; this.pops.length = 0; this.cap = null; this.tips.length = 0; },
  banner(text, o = {}) { if (this.banners.length && this.banners[this.banners.length - 1].text === text) return; this.banners.push({ text, t: 0, dur: o.dur || .95, color: o.color, scale: o.scale || 3, sub: o.sub, colors: o.colors }); if (this.banners.length > 3) this.banners.shift(); if (G.sfx) G.sfx.play('whoosh'); },
  pop(x, y, z, text, color, o = {}) { this.pops.push({ x, y, z, text, color: color || '#fff', t: 0, dur: o.dur || 1.6, sub: o.sub }); if (this.pops.length > 12) this.pops.shift(); },
  caption(name, text, color, dur) { this.cap = { name, text, color: color || '#ffd04a', t: 0, dur: dur || Math.max(2, text.length * .07) }; },
  /** a contextual prompt, shown a limited number of times a hunt */
  tip(key, action, text, o = {}) { const n = this.shown[key] || 0; if (n >= (o.times || 3)) return false; if (this.tips.some(t => t.key === key)) return false; this.shown[key] = n + 1; this.tips.push({ key, action, text, t: 0, dur: o.dur || 2.6, p: o.p }); return true; },
  update(dt) {
    for (const b of this.banners) b.t += dt; this.banners = this.banners.filter(b => b.t < b.dur);
    for (const p of this.pops) p.t += dt; this.pops = this.pops.filter(p => p.t < p.dur);
    if (this.cap) { this.cap.t += dt; if (this.cap.t > this.cap.dur) this.cap = null; }
    for (const t of this.tips) t.t += dt; this.tips = this.tips.filter(t => t.t < t.dur);
  },
  draw(g, H, W, Ht) {
    const site = H.site, big = G.game.settings.bigCaptions, P = H.players;
    // top centre: the site, the clock, the bucks
    if (site && H.seg && (H.seg.kind === 'site' || H.seg.kind === 'trophy') && !H.cinema) {
      const left = Math.max(0, site.limit - site.t), mm = Math.floor(left / 60), ss = Math.floor(left % 60), clock = mm + ':' + String(ss).padStart(2, '0');
      E.font.text(g, site.def.name.toUpperCase(), W / 2, 6, '#f4ead8', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, clock, W / 2, 15, left < 10 && Math.floor(G.game.real * 4) % 2 ? '#ff6a4a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
      const n = Math.max(site.def.bucks || 0, site.bucksSpawned.length), x0 = W / 2 - n * 8;
      for (let i = 0; i < n; i++) { const a = site.bucksSpawned[i]; drawRackIcon(g, x0 + i * 16 + 8, 40, a ? (a.state === 'dead' || a.state === 'dying' ? 'bagged' : a.escaped || a.lost ? 'gone' : a.state === 'hidden' ? 'ahead' : 'live') : 'ahead', a && a.bagger ? SEAT_COLORS[a.bagger - 1] : null, a && a.trophy); }
    }
    // the players' panels
    const corners = [[8, Ht - 8, 'bl'], [W - 8, Ht - 8, 'br'], [8, 8, 'tl'], [W - 8, 8, 'tr']];
    P.forEach((p, i) => { if (!H.cinema && !p.ghost) drawPanel(g, p, ...corners[i], H, P.length); });
    // the rival to beat (the Hunt-Off campaign)
    if (H.rival && G.game.settings.rivalTag && !H.cinema && P.length === 1) { const rv = H.rival; E.ui.box(g, 8, 8, 92, 22, { bg: ['#2a1a10', '#1a100a'], border: '#a8742a', alpha: .85 }); E.font.text(g, rv.name, 14, 11, CAST[rv.id].color, { outline: false, shadow: '#000' }); E.font.text(g, fmt(rv.score), 14, 19, '#ffffff', { outline: false, shadow: '#000' }); E.font.text(g, 'TO BEAT', 94, 19, '#b8a488', { align: 'right', outline: false }); }
    // score pops over the animals
    const q = [0, 0, 0, 0];
    for (const p of this.pops) { if (!H.lens.project(p.x, p.y, p.z, q)) continue; const k = p.t / p.dur, y = q[1] - 18 - k * 16, a = k < .8 ? 1 : (1 - k) / .2; if (a > .2) { E.font.text(g, p.text, q[0], y, p.color, { align: 'center', shadow: '#000', outline: '#140c08' }); if (p.sub) E.font.text(g, p.sub, q[0], y + 9, '#f4ead8', { align: 'center', outline: '#140c08' }); } }
    // banners
    let by = Ht * .32;
    for (const b of this.banners) {
      const k = b.t / b.dur, s = b.scale + (k < .12 ? (1 - k / .12) * 1.5 : 0), x = W / 2 + (k > .85 ? (k - .85) * 900 : 0);
      E.font.title(g, b.text, x, by, { scale: Math.round(s), colors: b.colors || ['#fff6d8', b.color || '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
      if (b.sub) E.font.text(g, b.sub, x, by + s * 9 + 4, '#ffffff', { align: 'center', scale: 1, shadow: '#000' });
      by += s * 9 + (b.sub ? 18 : 10);
    }
    // captions: lower centre, the speaker's name and colour
    if (this.cap) {
      const c = this.cap, sc = big ? 2 : 1, lines = E.font.wrap(c.text, Math.min(W - 40, 360), { scale: sc }), h = lines.length * 9 * sc + 14, y = Ht - 46 - h;
      E.ui.box(g, W / 2 - Math.min(W - 40, 380) / 2, y, Math.min(W - 40, 380), h, { bg: ['#1a120a', '#0e0a06'], border: '#5a4430', alpha: .82 });
      E.font.text(g, c.name, W / 2, y + 3, c.color, { align: 'center', outline: false, shadow: '#000' });
      lines.forEach((l, i) => E.font.text(g, l, W / 2, y + 12 + i * 9 * sc, '#f4ead8', { align: 'center', scale: sc, outline: false }));
    }
    // prompts
    let ty = Ht - 34 - (this.cap ? 50 : 0);
    for (const t of this.tips) { const I = (t.p || P[0] || { input: G.game.input }).input, a = t.t < .2 ? t.t / .2 : 1; if (a > .3) Glyph.cue(g, t.action, t.text, W / 2, ty, I, { scale: 1 }); ty -= 16; }
    // standings (held)
    if (H.showBoard) drawStandings(g, H, W, Ht);
  }
};
function drawRackIcon(g, x, y, state, color, trophy) {
  const c = state === 'bagged' ? (color || '#ffd04a') : state === 'gone' ? '#5a4a40' : trophy ? '#ffd04a' : '#e8dcc0';
  const line = (a, b, cc) => px.line(g, x + a[0], y + a[1], x + b[0], y + b[1], cc);
  const draw = cc => { line([0, 4], [0, 1], cc); line([0, 1], [-5, -4], cc); line([0, 1], [5, -4], cc); line([-3, -1], [-3, -5], cc); line([3, -1], [3, -5], cc); line([-5, -4], [-6, -7], cc); line([5, -4], [6, -7], cc); };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.save(); g.translate(dx, dy); draw('#140c08'); g.restore(); }
  draw(c);
  if (state === 'ahead') { px.dot(g, x, y + 2, '#140c08'); }
  if (state === 'gone') { px.line(g, x - 6, y - 6, x + 6, y + 5, '#e8443a'); px.line(g, x + 6, y - 6, x - 6, y + 5, '#e8443a'); }
  if (state === 'live' && Math.floor(G.game.real * 3) % 2) px.dot(g, x, y + 6, '#ffffff');
}
function drawShell(g, x, y, full, ch) { px.rect(g, x, y, 4, 9, '#140c08'); if (full) { px.rect(g, x + 1, y + 1, 2, 5, ch ? '#e84a2a' : '#c83a22'); px.rect(g, x + 1, y + 6, 2, 2, '#e8c050'); px.dot(g, x + 1, y + 1, '#ff8a6a'); } else px.rect(g, x + 1, y + 1, 2, 7, '#3a2a22'); }
function drawPanel(g, p, ax, ay, corner, H, nP) {
  const W = 118, Hh = 34, x = corner.endsWith('l') ? ax : ax - W, y = corner.startsWith('b') ? ay - Hh : ay + (H.rival && corner === 'tl' ? 26 : 0);
  if (G.game.cornerArea && corner === 'tr') { const ca = G.game.cornerArea(); if (ca) return; }
  E.ui.box(g, x, y, W, Hh, { bg: ['#2a1c10', '#160e08'], border: p.benched ? '#6a6a6a' : p.color, alpha: .82 });
  drawReticleShape(g, x + 9, y + 9, p.shape, p.benched ? '#8a8a8a' : p.color, 4);
  E.font.text(g, fmt(p.score), x + 18, y + 4, '#ffffff', { scale: 2, shadow: '#000', outline: false });
  // the tube: a shell for each round, the chamber light
  const R = p.rifle;
  for (let i = 0; i < R.cap; i++) drawShell(g, x + 6 + i * 6, y + 21, R.reloadT > 0 ? i < R.shells : i < R.rounds, i === 0 && R.chambered);
  const lc = R.reloadT > 0 ? '#ffb030' : R.rackT > 0 ? '#ffe060' : R.chambered ? '#4ae060' : '#e8443a';
  px.disc(g, x + 10 + R.cap * 6, y + 25, 2.5, '#140c08'); px.disc(g, x + 10 + R.cap * 6, y + 25, 1.5, lc);
  // the calls: a horn each
  for (let i = 0; i < p.call.charges; i++) { const cx = x + W - 10 - i * 9, cy = y + 25; px.line(g, cx - 3, cy + 1, cx + 3, cy - 2, '#140c08', 3); px.line(g, cx - 3, cy + 1, cx + 3, cy - 2, p.call.cd > 0 ? '#7a6a50' : '#e8c890', 1); px.dot(g, cx + 3, cy - 3, '#e8c890'); }
  if (p.benched) { E.font.text(g, 'BENCHED', x + W / 2, y - 9, '#c8c8c8', { align: 'center', shadow: '#000' }); }
  if (p.scope.raise > .3) { const b = p.scope.breath / T('breath'); E.ui.bar(g, x + 52, y + 22, 40, 3, b, p.scope.shaky > 0 ? '#e8443a' : p.scope.holding ? '#7ad0ff' : '#c8e8f0'); }
  if (nP > 1 || p.name !== 'P1') E.font.text(g, p.name, x + W - 4, y + 4, p.color, { align: 'right', outline: false, shadow: '#000' });
}
function drawReticleShape(g, x, y, shape, c, r = 7, o = {}) {
  const dk = '#140c08', w = o.w || 1;
  const strokes = cc => {
    if (shape === 'circle') { for (let a = 0; a < 24; a++) { const t = a / 24 * TAU; if (Math.abs(Math.sin(t * 2)) < .3) continue; px.dot(g, x + Math.cos(t) * r, y + Math.sin(t) * r, cc); } px.line(g, x - r - 3, y, x - r + 2, y, cc, w); px.line(g, x + r - 2, y, x + r + 3, y, cc, w); px.line(g, x, y - r - 3, x, y - r + 2, cc, w); px.line(g, x, y + r - 2, x, y + r + 3, cc, w); }
    else if (shape === 'diamond') { px.line(g, x, y - r, x + r, y, cc, w); px.line(g, x + r, y, x, y + r, cc, w); px.line(g, x, y + r, x - r, y, cc, w); px.line(g, x - r, y, x, y - r, cc, w); }
    else if (shape === 'brackets') { const k = Math.max(2, r * .45); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { px.line(g, x + sx * r, y + sy * r, x + sx * (r - k), y + sy * r, cc, w); px.line(g, x + sx * r, y + sy * r, x + sx * r, y + sy * (r - k), cc, w); } }
    else { px.line(g, x, y - r, x + r, y + r * .7, cc, w); px.line(g, x + r, y + r * .7, x - r, y + r * .7, cc, w); px.line(g, x - r, y + r * .7, x, y - r, cc, w); }
  };
  if (!o.noOutline) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.save(); g.translate(dx, dy); strokes(dk); g.restore(); }
  strokes(c); px.dot(g, x, y, c);
}
function drawStandings(g, H, W, Ht) {
  const list = H.players.map(p => ({ name: p.name, score: p.score, color: p.color })).concat((H.ghostList || []).map(gh => ({ name: gh.name, score: gh.score, color: gh.color })));
  if (H.rivalBoard) for (const r of H.rivalBoard) list.push(r);
  list.sort((a, b) => b.score - a.score);
  const w = 200, h = 26 + list.length * 14, x = W / 2 - w / 2, y = Ht / 2 - h / 2;
  E.ui.box(g, x, y, w, h, { bg: ['#2a1c10', '#120a06'], border: '#e8843a', alpha: .92 });
  E.font.text(g, 'STANDINGS', W / 2, y + 6, '#ffd04a', { align: 'center', shadow: '#000' });
  list.forEach((r, i) => { E.font.text(g, (i + 1) + '. ' + r.name, x + 12, y + 20 + i * 14, r.color, { outline: false, shadow: '#000' }); E.font.text(g, fmt(r.score), x + w - 12, y + 20 + i * 14, '#ffffff', { align: 'right', outline: false }); });
}
