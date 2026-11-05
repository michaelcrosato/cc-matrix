// The HUD: the broadcast score bug, each local player's panel (turbo, cards, SPECIAL READY), the prompt strip for the
// device used last, the commentary caption, the big center text, the play clock; in the world: the line of scrimmage
// and the first-down line, rings and tags under held athletes, receiver chips, the pass target marker, the kick meter.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, ui = FF.ui, glyph = FF.glyph;
const hud = FF.hud = { banner: null, show: true };
const pc = p => E.PLAYER_COLORS[p] || '#ffe08a';
hud.playerColor = (m, p) => (m && m.seatColors && m.seatColors[p]) || pc(p);
/** world marks: lines on the field, rings, tags, chips, the target marker, the kick aim line */
hud.world = (r, m, scene) => {
  if (!m || !hud.show) return;
  const b = m.ball, live = m.phase === 'LIVE', pre = m.phase === 'PRESNAP' || m.phase === 'PLAYCALL';
  // the line of scrimmage (blue) and the line to gain (yellow), broadcast style
  if ((pre || live) && m.play !== undefined && m.callKind !== 'kickoff') {
    const los = live && m.play ? m.play.losX : m.los;
    r.decal(g => { const [x0, y0] = r.w(los, F.SIDE_T, 0), [x1, y1] = r.w(los, F.SIDE_B, 0); px.blend(g, .75, 'normal', () => px.line(g, x0, y0, x1, y1, '#3a7aff', 2)); });
    if (m.lineToGain && m.callKind === 'scrimmage') { const lx = m.lineToGain; r.decal(g => { const [x0, y0] = r.w(lx, F.SIDE_T, 0), [x1, y1] = r.w(lx, F.SIDE_B, 0); px.blend(g, .8, 'normal', () => px.line(g, x0, y0, x1, y1, '#ffd83a', 2)); }); }
  }
  // rings and tags under held athletes
  for (const a of m.on.concat(m.extra)) {
    if (a.ctl === null || a.ctl === undefined) continue;
    const p = typeof a.ctl === 'number' ? a.ctl : 0, col = hud.playerColor(m, a.ctl);
    r.decal(() => r.groundRing(a.x, a.y, a.rad + 3, col, .95));
    const tagT = FF.control.tagT[a.ctl] || 0;
    if (pre || tagT > 0) r.queue(a.x, a.y, 46, g => { const [x, y] = r.w(a.x, a.y, 46), t = m.hubNames ? m.hubNames[a.ctl] || 'P' + (p + 1) : 'P' + (p + 1); E.font.text(g, t, Math.round(x), Math.round(y) - 8, col, { align: 'center', outline: '#000', font: 'tiny' }); px.poly(g, [[x - 2, y - 2], [x + 2, y - 2], [x, y]], col); }, { emissive: true, bias: 40 });
    else r.queue(a.x, a.y, 44, g => { const [x, y] = r.w(a.x, a.y, 44); px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], col); }, { emissive: true, bias: 40 });
    // heat pips and SPECIAL READY on held athletes
    if (a.heat > 0 && !(a.hot > 0)) r.queue(a.x, a.y, 50, g => { const [x, y] = r.w(a.x, a.y, 50); for (let k = 0; k < 3; k++) px.rect(g, Math.round(x) - 5 + k * 4, Math.round(y) - 14, 3, 2, k < a.heat ? '#ff7a2a' : '#3a3040'); }, { emissive: true, bias: 41 });
    if (a.special && m.specialReady && live && m.specialReady(a)) r.queue(a.x, a.y, 56, g => { const [x, y] = r.w(a.x, a.y, 56); E.font.text(g, 'SPECIAL READY', Math.round(x), Math.round(y) - 22, (Math.floor(game.real * 4) % 2) ? '#ffe890' : '#ff9a3a', { align: 'center', outline: '#000', font: 'tiny' }); }, { emissive: true, bias: 42 });
  }
  // receiver chips over receivers' heads while a human holds the ball as passer
  const passer = b.holder && b.holder.ctl !== null && m.canPass && m.canPass(b.holder) ? b.holder : null;
  if (passer || (m.phase === 'PRESNAP' && m.set && m.isHuman(m.poss) && m.play && (m.play.off.type === 'pass' || m.play.off.fakeKick))) {
    const p = passer ? passer.ctl : (m.humans[m.poss] || [])[0], I = game.players[typeof p === 'number' ? p : 0] || game.input, dev = glyph.device(I);
    m.receivers(m.poss).forEach((rc, k) => {
      const act = dev === 'gamepad' ? ['b1', 'b2', 'b3'][k] : ['r1', 'r2', 'r3'][k], hov = FF.control.hover === rc;
      r.queue(rc.x, rc.y, 50, g => { const [x, y] = r.w(rc.x, rc.y, 50); const w = glyph.width(act, { I }); glyph.chip(g, Math.round(x - w / 2), Math.round(y) - 14, act, { I }); if (hov) { E.font.text(g, 'CLICK', Math.round(x), Math.round(y) - 26, '#ffb02e', { align: 'center', font: 'tiny', outline: '#000' }); } }, { emissive: true, bias: 45 });
    });
    // routes: your receivers' lines while you're the passer
    if (game.settings.showRoutes && m.play && (passer || m.phase === 'PRESNAP')) for (const rc of m.receivers(m.poss)) { const br = rc.brain; if (!br || !br.path || br.done) continue; r.decal(g => { let [x0, y0] = r.w(rc.x, rc.y, 0); for (let i = br.pi || 0; i < br.path.length; i++) { const [x1, y1] = r.w(br.path[i].x, br.path[i].y, 0); px.blend(g, .55, 'normal', () => px.line(g, x0, y0, x1, y1, '#ffffff', 1)); x0 = x1; y0 = y1; } }); }
  }
  // a mouse hover on a defender to switch to
  if (FF.control.hover && FF.control.hover.ctl === null) { const h = FF.control.hover; r.decal(g => { const [x, y] = r.w(h.x, h.y, 0); px.blend(g, .7, 'normal', () => px.rect(g, x - 7, y + 1, 14, 1, '#ffffff')); }); }
  // the pass target marker: an X with a ring that shrinks as the ball comes down
  if (b.state === 'pass' && (b.type === 'lob' || b.type === 'bullet') && game.settings.targetMarker && b.to) {
    const L = b.to, k = Math.max(0, 1 - b.t / (b.T || 1)), col = b.thrower ? m.teams[b.thrower.side].colors.primary : '#ffffff';
    r.decal(g => { const [x, y] = r.w(L.x, L.y, 0), s = 3 + k * 10; px.line(g, x - 3, y - 2, x + 3, y + 2, '#ffffff', 2); px.line(g, x - 3, y + 2, x + 3, y - 2, '#ffffff', 2); px.line(g, x - 3, y - 2, x + 3, y + 2, col); px.line(g, x - 3, y + 2, x + 3, y - 2, col); px.blend(g, .7, 'normal', () => { for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; px.dot(g, x + Math.cos(t) * s * 1.6, y + Math.sin(t) * s * .9, '#ffffff'); } }); });
  }
  if (b.state === 'kick' && b.to && b.kind !== 'fg') { const L = b.to; r.decal(g => { const [x, y] = r.w(L.x, L.y, 0); px.blend(g, .6, 'normal', () => { px.rect(g, x - 4, y, 9, 1, '#ffd83a'); px.rect(g, x, y - 2, 1, 5, '#ffd83a'); }); }); }
  // the kick: the aim line along the field
  const K = m.meterK; if (K && m.phase === 'PRESNAP' && m.set && !K.done) {
    const kicker = m.on.find(a => a.side === K.side && a.slot === 'K') || m.on[0], D = m.dir(K.side), len = (K.kind === 'fg' ? 30 : 40) * YD;
    r.decal(g => { for (let i = 0; i < 12; i += 2) { const a = r.w(m.los + Math.cos(K.aim) * D * len * i / 12, m.ballY + Math.sin(K.aim) * D * len * i / 12 * D, 0), c = r.w(m.los + Math.cos(K.aim) * D * len * (i + 1) / 12, m.ballY + Math.sin(K.aim) * D * len * (i + 1) / 12 * D, 0); px.line(g, a[0], a[1], c[0], c[1], '#ffffff', 1); } });
    r.queue(kicker.x, kicker.y, 50, g => { const [x, y] = r.w(kicker.x, kicker.y, 54); hud.meter(g, Math.round(x), Math.round(y) - 40, K); }, { emissive: true, bias: 60 });
  }
  void scene;
};
/** the kick meter: an arc of power (green, yellow, red) and the accuracy needle over a center band */
hud.meter = (g, x, y, K) => {
  const w = 64, h = 8;
  ui.panel(g, x - w / 2 - 4, y - 4, w + 8, 30, { alpha: .88 });
  for (let i = 0; i < w; i++) { const v = i / w, c = v > .95 ? '#ff4a3a' : v > .7 ? '#ffd83a' : '#5ae05a'; px.rect(g, x - w / 2 + i, y + h - Math.round(v * h), 1, Math.round(v * h) + 1, i / w <= K.power ? c : E.shade(c, -.6)); }
  E.font.text(g, 'POWER', x - w / 2, y - 2, '#a9a6c0', { font: 'tiny', outline: false });
  const ay = y + 14, band = Math.round((K.band || .12) * w / 2);
  px.rect(g, x - w / 2, ay, w, 6, '#14141e'); px.rect(g, x - band, ay, band * 2 + 1, 6, '#3a8a3a');
  const nx = Math.round(x + (K.stage >= 2 ? (K.stage === 3 ? K.acc : K.needle) : 0) * w / 2); px.rect(g, nx - 1, ay - 2, 2, 10, K.stage >= 2 ? '#ffffff' : '#6a6878');
  E.font.text(g, 'AIM', x - w / 2, ay + 7, '#a9a6c0', { font: 'tiny', outline: false });
};
/** the screen HUD */
hud.overlay = (g, r, m, scene) => {
  if (!m) return;
  if (hud.show) hud.scoreBug(g, r, m);
  FF.fx.drawCenter(g, r);
  if (!hud.show) return;
  FF.talk.draw(g, r);
  // each local player's panel and prompts
  const ps = [].concat(m.humans[0] || [], m.humans[1] || []).filter(p => typeof p === 'number');
  const S = FF.T.safeMargin;
  if (m.phase !== 'PLAYCALL') ps.forEach((p, i) => {
    const I = game.players[p]; if (!I) return;
    const a = FF.control.athleteOf(m, p), side = FF.control.sideOf(m, p), corner = i, x = corner % 2 ? r.W - S - 92 : S, y = corner < 2 ? S : r.H - S - 58 - 26;
    const ca = game.cornerArea(), yy = corner === 1 && ca && ca.y1 > y && ca.x0 < x + 92 ? Math.ceil(ca.y1) + 2 : y;
    ui.panel(g, x, yy, 92, 30, { alpha: .82, border: hud.playerColor(m, p) });
    E.font.text(g, (m.hubNames && m.hubNames[p]) || 'P' + (p + 1), x + 4, yy + 3, hud.playerColor(m, p), { font: 'tiny', outline: false });
    if (a) { E.font.text(g, a.short + ' #' + a.num, x + 22, yy + 3, '#f4f0e6', { font: 'tiny', outline: false }); ui.bar(g, x + 4, yy + 12, 60, 5, a.hot > 0 ? 1 : a.turbo, a.hot > 0 ? '#ff7a2a' : a.turbo < .15 ? '#c83a2a' : '#3af0a0'); E.font.text(g, a.hot > 0 ? 'BLAZING' : 'TURBO', x + 66, yy + 12, a.hot > 0 ? '#ffb02e' : '#a9a6c0', { font: 'tiny', outline: false }); }
    if (side >= 0) { const n = m.cards[side].length; for (let k = 0; k < 3; k++) { px.rect(g, x + 4 + k * 8, yy + 21, 6, 7, k < n ? '#a050e0' : '#2a2438'); if (k < n) px.rect(g, x + 5 + k * 8, yy + 22, 4, 1, '#ffd84a'); } E.font.text(g, 'CARDS', x + 30, yy + 22, '#a9a6c0', { font: 'tiny', outline: false }); }
    // the prompt strip in the player's corner (bottom right for P1 alone)
    const list = FF.control.prompts(m, p);
    if (list.length && m.phase !== 'PLAYCALL') ui.prompts(g, list, ps.length === 1 ? r.W - S - 4 : corner % 2 ? r.W - S - 4 : S + 4, ps.length === 1 ? r.H - S - 30 : (corner < 2 ? yy + 40 : yy - 12), { I, align: ps.length === 1 || corner % 2 ? 'right' : 'left' });
  });
  // the play clock in the presnap (from 5 s)
  if (m.phase === 'PRESNAP' && m.set && m.isHuman(m.poss) && !m.meterK) { const left = FF.T.autoHike - (m.autoHikeT || 0); if (left < 5) E.font.title(g, String(Math.ceil(left)), Math.round(r.W / 2), 30, { scale: 3, colors: left < 3 ? ['#ffe0e0', '#ff5a4a'] : ['#ffffff', '#ffd84a'], align: 'center', outline: '#000' }); }
  // a boss special's banner
  if (hud.banner) { const bn = hud.banner; bn.t += 1 / 60; if (bn.t > 1.4) hud.banner = null; else { const k = Math.min(1, bn.t * 5), w = 180, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .16 - (1 - k) * 30); ui.panel(g, x, y, w, 34, { bg: ['#5a1a8a', '#2a0a4a'], border: '#ffd84a' }); bn.rig.drawPortrait(g, x + 3, y + 3, 28, { zoom: 3, bg: '#1c1430' }); E.font.text(g, bn.kind, x + 38, y + 6, '#ffd84a', { scale: 2, outline: '#000' }); E.font.text(g, bn.name, x + 38, y + 23, '#f4f0e6', { font: 'tiny', outline: false }); } }
  void scene;
};
hud.scoreBug = (g, r, m) => {
  const w = 236, h = 24, x = Math.round(r.W / 2 - w / 2), y = r.H - h - FF.T.safeMargin;
  E.ui.box(g, x, y, w, h, { bg: ['#18183a', '#0a0a1c'], border: '#5a5878', alpha: .92 });
  for (const s of [0, 1]) {
    const t = m.teams[s], tx = s ? x + w - 78 : x + 4;
    px.rect(g, tx, y + 3, 74, 18, E.shade(t.colors.primary, -.45)); px.rect(g, tx, y + 3, 74, 1, t.colors.primary);
    ui.logo(g, t, tx + 2, y + 6, 1);
    E.font.text(g, t.abbr, tx + 16, y + 5, '#f4f0e6', { outline: false });
    E.font.text(g, String(m.score[s]), tx + 70, y + 4, '#ffffff', { scale: 2, align: 'right', outline: '#000' });
    if (m.poss === s && m.phase !== 'FINAL') px.poly(g, s ? [[tx - 4, y + 11], [tx - 1, y + 8], [tx - 1, y + 14]] : [[tx + 77, y + 11], [tx + 74, y + 8], [tx + 74, y + 14]], '#ffd84a');
    // the Fiasco Meter under each team
    ui.bar(g, tx + 16, y + 17, 34, 2, m.meter[s] / 100, '#c05aff', '#2a1a3a');
    if (m.on.some(a => a.side === s && a.hot > 0)) E.font.text(g, '♥', tx + 54, y + 13, '#ff7a2a', { font: 'tiny', outline: false });
  }
  const cx = x + w / 2, q = m.quarter > 4 ? 'OT' : u.ord(m.quarter);
  E.font.text(g, q + '  ' + u.mmss(m.clock), cx, y + 4, '#ffd84a', { align: 'center', outline: false });
  const dd = m.callKind === 'kickoff' ? 'KICKOFF' : m.callKind === 'pat' ? 'PAT' : m.callKind === 'two' ? '2-PT TRY' : u.ord(m.down) + ' & ' + (Math.abs(m.lineToGain - m.goalX(m.poss)) < 8 ? 'GOAL' : m.toGo);
  E.font.text(g, dd, cx, y + 13, '#f4f0e6', { align: 'center', outline: false, font: 'tiny' });
  E.font.text(g, m.spotText(), cx, y + 19, '#a9a6c0', { align: 'center', outline: false, font: 'tiny' });
};
hud.replayOverlay = (g, r, p) => {
  px.rect(g, 0, 0, r.W, 14, '#000000'); px.rect(g, 0, r.H - 14, r.W, 14, '#000000');
  if (Math.floor(game.real * 2) % 2) px.disc(g, 12, 7, 3, '#ff2a2a');
  E.font.text(g, 'REPLAY', 20, 3, '#ffffff', { outline: false });
  const t = p.t; E.font.text(g, '00:' + String(Math.floor(t)).padStart(2, '0') + ':' + String(Math.floor((t % 1) * 30)).padStart(2, '0'), r.W - 60, 3, '#e8e4dc', { outline: false, font: 'tiny' });
  if (p.caption) E.font.text(g, p.caption, r.W / 2, r.H - 11, '#ffd84a', { align: 'center', outline: false });
  ui.prompts(g, [['b1', 'SKIP']], r.W - 8, r.H - 22, { align: 'right' });
};
const u = FF.u;
})();
