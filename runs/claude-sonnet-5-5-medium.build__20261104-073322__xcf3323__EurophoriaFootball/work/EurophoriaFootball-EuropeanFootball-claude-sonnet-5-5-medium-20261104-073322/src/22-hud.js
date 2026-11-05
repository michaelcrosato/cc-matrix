/* ============ 22-hud: the 10-foot HUD ============ */
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const TXT = (g, s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
EF.USED = E.store.get('ef:used', {});
EF.useAction = a => { EF.USED[a] = (EF.USED[a] || 0) + 1; if (EF.USED[a] % 3 === 0 || EF.USED[a] < 4) E.store.set('ef:used', EF.USED); };
EF.showPrompt = a => { const m = game.settings && game.settings.prompts || 'learning'; return m === 'always' || (m === 'learning' && (EF.USED[a] || 0) < 3); };
EF.MatchView.prototype.hud = function (g, r) {
  const M = this.M, W = r.W, H = r.H, ca = game.cornerArea && game.cornerArea(), st = this.st;
  if (this.o.noHud) return;
  const t0 = M.teams[0], t1 = M.teams[1];
  // ---- the score bug ----
  const bx = 6, by = 6, bw = 150, bh = 30;
  E.ui.box(g, bx, by, bw, bh, { bg: ['#101830', '#0a1020'], border: '#5a6a9a', alpha: .92 });
  EF.drawCrest(g, t0.data, bx + 4, by + 3, 1); EF.drawCrest(g, t1.data, bx + bw - 18, by + 3, 1);
  TXT(g, t0.data.code, bx + 22, by + 4, '#c8d4ff', { font: 'tiny' }); TXT(g, t1.data.code, bx + bw - 38, by + 4, '#c8d4ff', { font: 'tiny', align: 'left' });
  TXT(g, String(M.score[0]), bx + 54, by + 5, '#ffffff', { scale: 3 }); TXT(g, '-', bx + 75, by + 7, '#9aa6c8', { scale: 2 }); TXT(g, String(M.score[1]), bx + 88, by + 5, '#ffffff', { scale: 3 });
  if (M.shoot) { TXT(g, '(' + M.shoot.score[0] + '-' + M.shoot.score[1] + ')', bx + 104, by + 10, '#ffd84a', { font: 'tiny' }); }
  const clockTxt = M.rules.training ? 'TRAINING' : M.mode === 'shootout' ? 'PENALTIES' : M.golden ? 'GOLDEN GOAL' : (M.half === 1 ? '1ST' : M.extra ? 'ET' : '2ND') + ' ' + (M.minute < 10 ? '0' : '') + M.minute + "'";
  TXT(g, clockTxt, bx + 4, by + bh + 3, '#ffe7a8', { font: 'tiny' });
  if (M.teams[0].down || M.teams[1].down) { TXT(g, (M.teams[0].down ? t0.data.code + ' -' + M.teams[0].down : '') + ' ' + (M.teams[1].down ? t1.data.code + ' -' + M.teams[1].down : ''), bx + 70, by + bh + 3, '#ff9a8a', { font: 'tiny' }); }
  // ---- the crowd gauges ----
  const gy = by + bh + 14, gw = 150;
  for (let s = 0; s < 2; s++) {
    const v = M.eu[s], full = v >= 1, eur = M.europhoria && M.europhoria.side === s, y = gy + s * 8, col = EF.TEAMCOL(M.teams[s].id, s);
    px.rect(g, bx, y, gw, 6, '#0a0c14'); px.rect(g, bx + 1, y + 1, gw - 2, 4, '#1a2036');
    const fw = Math.round((gw - 2) * v); px.rect(g, bx + 1, y + 1, fw, 4, eur ? (Math.floor(this.t * 12) % 2 ? '#ffd84a' : '#ff7a2a') : full && Math.floor(this.t * 6) % 2 ? '#ffffff' : col);
    if (s === 0 || M.humans.some(h => h.side === s)) TXT(g, eur ? 'EUROPHORIA!' : full ? 'CROWD READY' : 'CROWD', bx + gw + 4, y - 1, eur ? '#ffd84a' : '#9aa6c8', { font: 'tiny' });
  }
  // ---- notices ----
  let ny = 40 + (ca && ca.y1 < 40 ? 0 : 0); EF.notices.forEach(n => { const k = Math.min(1, n.t / .15), a = clamp((n.dur - n.t) / .3, 0, 1), sc = n.scale || 2; const y = Math.round(H * .22 + EF.notices.slice(0, EF.notices.indexOf(n)).reduce((a, m) => a + (m.scale || 2) * 9 + 4, 0)); if (a <= 0) return; TXT(g, n.text, W / 2, y - (1 - k) * 8, n.color, { scale: sc, align: 'center', outline: '#000', shadow: false }); });
  // ---- set-piece banner ----
  if (M.mode === 'setpiece' && M.sp) { const sp = M.sp, nm = { throwin: 'THROW-IN', goalkick: 'GOAL KICK', corner: 'CORNER', freekick: sp.indirect ? 'FREE KICK (INDIRECT)' : 'FREE KICK', penalty: 'PENALTY' }[sp.type]; TXT(g, nm + ' - ' + M.teams[sp.side].data.short, W / 2, H * .15, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false }); }
  if (M.mode === 'kickoff') TXT(g, 'KICK OFF: ' + M.teams[M.restartSide].data.short, W / 2, H * .15, '#ffe7a8', { scale: 2, align: 'center', outline: '#000', shadow: false });
  // ---- the radar ----
  const s2 = 2.2 / TL, rw = Math.round((Pitch.X1 - Pitch.X0) * s2), rh = Math.round((Pitch.Y1 - Pitch.Y0) * s2), rx = W - rw - 8, ry = (ca && ca.x0 < W - rw - 8 + rw && ca.y1 > 0 ? Math.ceil(ca.y1) + 4 : 8);
  if (!this.o.noRadar) { E.ui.box(g, rx - 2, ry - 2, rw + 4, rh + 4, { bg: '#143a1e', border: '#5a8a66', alpha: .72 }); px.rect(g, rx + rw / 2, ry, 1, rh, '#5a8a66');
    for (const f of M.F) if (!f.sentOff) { const c = EF.TEAMCOL(M.teams[f.side].id, f.side); px.rect(g, Math.round(rx + (f.x - Pitch.X0) * s2) - 1, Math.round(ry + (f.y - Pitch.Y0) * s2) - 1, f.human !== null ? 3 : 2, f.human !== null ? 3 : 2, c); }
    px.rect(g, Math.round(rx + (M.ball.x - Pitch.X0) * s2), Math.round(ry + (M.ball.y - Pitch.Y0) * s2), 2, 2, '#ffffff'); }
  // ---- fog in the second half at Lucchetto ----
  if (st.weather && st.weather.kind === 'fog') { const k = M.half === 2 || M.extra ? .28 : .1; px.blend(g, k, 'normal', () => px.rect(g, 0, 0, W, H, '#c8ccd4')); }
  if (this.flash > 0) { this.flash = Math.max(0, this.flash - .03); px.blend(g, this.flash * .35, 'add', () => px.rect(g, 0, 0, W, H, '#ffffff')); }
  // ---- the Save Duel ----
  const d = M.duel; if (d) { const cx = W / 2, cy = H / 2, k = clamp(d.t / d.dur, 0, 1), rad = 46 - k * 34, sweet = 12; px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#000a1a'));
    for (let a = 0; a < 48; a++) { const an = a / 48 * Math.PI * 2; px.dot(g, Math.round(cx + Math.cos(an) * 46), Math.round(cy + Math.sin(an) * 46), '#3a4a7a'); px.dot(g, Math.round(cx + Math.cos(an) * sweet), Math.round(cy + Math.sin(an) * sweet), '#9aff9a'); px.dot(g, Math.round(cx + Math.cos(an) * rad), Math.round(cy + Math.sin(an) * rad), k > .6 && k < .78 ? '#ffffff' : '#ffd84a'); px.dot(g, Math.round(cx + Math.cos(an) * (rad + 1)), Math.round(cy + Math.sin(an) * (rad + 1)), k > .6 && k < .78 ? '#ffffff' : '#ffd84a'); }
    TXT(g, 'SAVE DUEL!', cx, cy - 66, '#9ae0ff', { scale: 2, align: 'center', outline: '#000', shadow: false });
    const humanDef = M.humans.some(h => h.side === d.side); if (humanDef) EF.prompt(g, cx, cy + 56, 'pass', 'PRESS WHEN THE RINGS MEET!', { align: 'center', player: M.humans.find(h => h.side === d.side).idx }); else TXT(g, 'THE KEEPER READS IT...', cx, cy + 58, '#c8d4ff', { align: 'center' }); }
  // ---- VAR ----
  if (M.var) { const v = M.var; E.ui.box(g, W / 2 - 100, H * .3, 200, 54, { bg: ['#0a1830', '#050c1c'], border: '#9ad8ff', alpha: .94 }); TXT(g, 'VAR', W / 2, H * .3 + 5, '#9ad8ff', { scale: 3, align: 'center' }); TXT(g, v.kind === 'goal' ? 'CHECKING THE GOAL...' : 'CHECKING THE PENALTY...', W / 2, H * .3 + 30, '#e8f0ff', { align: 'center' }); E.ui.bar(g, W / 2 - 80, H * .3 + 44, 160, 5, v.t / v.dur, '#9ad8ff'); }
  // ---- replay ----
  if (M.mode === 'replay') { px.rect(g, 0, 0, W, 14, '#000'); px.rect(g, 0, H - 14, W, 14, '#000'); if (Math.floor(this.t * 2) % 2) px.disc(g, 14, 25, 4, '#ff3a3a'); TXT(g, 'REPLAY', 22, 22, '#ffffff', { scale: 2 }); EF.prompt(g, W - 8, H - 12, 'pass', 'SKIP', { align: 'right', scale: 1, player: 0 }); }
  // ---- cards ----
  // ---- the commentary box ----
  const cm = this.commentary.cur; if (cm && (!game.settings || game.settings.subtitles !== false) && !this.o.noCommentary && M.mode !== 'replay') {
    const ln = cm.lines[cm.i], txt = ln.text.slice(0, Math.floor(cm.shown)), bw2 = Math.min(W - 20, 360), x0 = Math.round((W - bw2) / 2), y0 = H - 40, lines = E.font.wrap(ln.text, bw2 - 16, {}).length;
    E.ui.box(g, x0, y0 - (lines > 1 ? 8 : 0), bw2, 28 + (lines > 1 ? 8 : 0), { bg: ['#101830', '#0a0f20'], border: ln.who === 'TREV' ? '#c88a5a' : ln.who === 'PA' ? '#8a8a9a' : '#5a8ac8', alpha: .88 });
    TXT(g, EF.SPEAKERS[ln.who].name, x0 + 6, y0 - (lines > 1 ? 4 : 0), ln.who === 'TREV' ? '#ffb87a' : ln.who === 'PA' ? '#c8c8d8' : '#8ac8ff', { font: 'tiny' });
    E.font.text(g, txt, x0 + 8, y0 + 6 - (lines > 1 ? 4 : 0), '#fff6e0', { wrap: bw2 - 16, shadow: '#000', outline: false });
  }
  // ---- context prompts for the first human ----
  this.drawPrompts(g, r);
  // ---- shootout tracker ----
  if (M.shoot) { const S = M.shoot; for (let s = 0; s < 2; s++) { for (let i = 0; i < Math.max(5, S.kicks[s].length); i++) { const v = S.kicks[s][i]; px.disc(g, W / 2 - 40 + i * 9, H * .1 + s * 10, 3, v === undefined ? '#3a4a6a' : v ? '#5aff7a' : '#ff5a4a'); } TXT(g, M.teams[s].data.code, W / 2 - 62, H * .1 + s * 10 - 3, '#c8d4ff', { font: 'tiny' }); } }
  // ---- goal celebration picker ----
  const sc = M.goalInfo && (M.mode === 'goal' || M.mode === 'celebrate') ? M.goalInfo : null; if (sc && M.humans.some(h => h.side === sc.side) && !sc.own) { const h = M.humans.find(h => h.side === sc.side); const y = H - 64; TXT(g, 'PICK A CELEBRATION', W / 2, y - 12, '#ffe7a8', { align: 'center', font: 'tiny' }); const opts = [['pass', 'ARMS UP'], ['shoot', 'KNEE SLIDE'], ['lob', 'THE ROBOT'], ['through', 'HELICOPTER']]; let wsum = 0; for (const [a, l] of opts) wsum += EF.promptWidth(a, l, { player: h.idx }) + 12; let x = W / 2 - wsum / 2; for (const [a, l] of opts) { x += EF.prompt(g, x, y, a, l, { player: h.idx }) + 12; } }
  if (M.mode === 'halftime' || M.mode === 'fulltime') this.statsPanel(g, r);
  if (M.mode === 'shootout' && M.shoot && M.shoot.phase === 'ready' && M.shoot.taker && M.shoot.taker.human !== null) { EF.prompt(g, W / 2, H - 52, 'shoot', 'HOLD TO CHARGE, RELEASE TO SHOOT. AIM WITH THE STICK', { align: 'center', player: M.shoot.taker.human }); }
};
EF.MatchView.prototype.statsPanel = function (g, r) {
  const M = this.M, W = r.W, H = r.H, x = W / 2 - 110, y = H * .34; E.ui.box(g, x, y, 220, 88, { bg: ['#101830', '#0a1020'], border: '#8a9ad0', alpha: .94 });
  TXT(g, M.mode === 'halftime' ? 'HALF TIME' : 'FULL TIME', W / 2, y + 5, '#ffd84a', { scale: 2, align: 'center' });
  TXT(g, M.teams[0].data.short + '  ' + M.score[0] + ' - ' + M.score[1] + '  ' + M.teams[1].data.short, W / 2, y + 22, '#ffffff', { align: 'center' });
  const rows = [['SHOTS', s => s.shots], ['ON TARGET', s => s.onTarget], ['PASSES', s => s.passesDone + '/' + s.passes], ['TACKLES', s => s.tackles], ['FOULS', s => s.fouls]];
  rows.forEach(([l, f], i) => { TXT(g, String(f(M.stats[0])), x + 40, y + 36 + i * 9, '#c8d4ff', { font: 'tiny', align: 'center' }); TXT(g, l, W / 2, y + 36 + i * 9, '#8a9ac8', { font: 'tiny', align: 'center' }); TXT(g, String(f(M.stats[1])), x + 180, y + 36 + i * 9, '#c8d4ff', { font: 'tiny', align: 'center' }); });
};
EF.MatchView.prototype.drawPrompts = function (g, r) {
  const M = this.M, W = r.W, H = r.H, h = M.humans[0]; if (!h || !h.f || M.mode === 'replay' || M.mode === 'var' || M.duel) return; const f = h.f, ball = M.ball, idx = h.idx; let items = [];
  const full = M.eu[h.side] >= 1 && !M.europhoria;
  if (M.mode === 'setpiece' && M.sp && M.sp.taker === f) { items = [['pass', 'PASS'], ['shoot', 'SHOOT (HOLD)'], ['lob', M.sp.type === 'corner' ? 'CROSS' : 'LOB']]; if (M.sp.type === 'penalty') items = [['shoot', 'HOLD, AIM, RELEASE']]; }
  else if (M.mode === 'play') {
    if (ball.owner === f) items = [['pass', 'PASS'], ['shoot', 'SHOOT'], ['lob', 'LOB'], ['through', 'THROUGH'], ['skill', 'SKILL'], ['dive', 'DIVE']].filter(([a]) => EF.showPrompt(a));
    else if (!ball.owner && ball.z > 6 && ball.z < 40 && Math.hypot(ball.x - f.x, ball.y - f.y) < 40) items = [['shoot', ball.z > 15 ? 'HEADER' : 'VOLLEY'], ['pass', 'HEAD IT ON']];
    else if (ball.owner && ball.owner.side !== f.side) items = [['pass', 'TACKLE'], ['shoot', 'SLIDE'], ['lob', 'BARGE'], ['through', 'SWITCH']].filter(([a]) => EF.showPrompt(a === 'pass' ? 'tackle' : a === 'shoot' ? 'slide' : a === 'lob' ? 'barge' : 'switch'));
  }
  if (full) items.unshift(['euphoria', 'EUROPHORIA!']);
  if (!items.length) return;
  let wsum = 0; for (const [a, l] of items) wsum += EF.promptWidth(a, l, { player: idx }) + 14; let x = W / 2 - wsum / 2; const y = H - 62 - (this.commentary.cur ? 0 : -12);
  px.blend(g, .5, 'normal', () => px.rect(g, Math.round(x) - 6, y - 4, Math.round(wsum) + 2, 18, '#000')); for (const [a, l] of items) { x += EF.prompt(g, x, y, a, l, { player: idx, color: a === 'euphoria' ? '#ffd84a' : '#fff6e0' }) + 14; }
};
