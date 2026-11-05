/* 41-hud: the match HUD (PLAN 11.5). The top strip: HOME's panel at the left, AWAY's at the right (team, score, two
 * player plates with turbo, heat pips, power-up and P badges), the period, the game clock and the shot clock in the
 * middle. In the world: P1-P4 tags over the humans, turbo rings, the handler's ring, edge arrows for humans off screen,
 * the release meter, the dunk-range ring, power-ups on the floor, barks. At the bottom: the announcer's lower third and,
 * at the Pier, the windsock. */
function hudPanelW(r) { return clamp(Math.floor((r.W - 84) / 2) - 8, 116, 170); }
function drawPlate(g, p, x, y, w, right) {
  const t = get('team', p.teamId), hc = p.human !== null && p.human !== undefined ? E.PLAYER_COLORS[p.human] : null;
  let nx = right ? x + w - 2 : x + 2;
  if (hc) { const bw = 13; const bx = right ? nx - bw : nx; px.rect(g, bx, y, bw, 8, hc); E.font.text(g, 'P' + (p.human + 1), bx + bw / 2, y, '#0c0614', { align: 'center', outline: false }); nx += right ? -bw - 2 : bw + 2; }
  const nm = p.name.length > 11 ? p.name.split(' ')[0] : p.name;
  E.font.text(g, nm, nx, y, p.isNova() ? UIC.gold : UIC.ink, { align: right ? 'right' : 'left', outline: '#0c0614' });
  // turbo bar, heat pips, power-up
  const bx = right ? x + 4 : x + w - 46, by = y + 2;
  E.ui.bar(g, bx, by, 26, 3, p.infTurbo() ? 1 : p.turbo, p.turboOn ? '#ffffff' : p.turbo < .2 ? '#ff5a3a' : t.colors.trim);
  for (let k = 0; k < 3; k++) { const on = p.isNova() || k < p.heat; px.rect(g, bx + 29 + k * 5, by - 1, 4, 5, on ? (p.isNova() ? (Math.floor(game.real * 8 + k) % 2 ? '#ffd23a' : '#ff7a2a') : '#ff7a2a') : '#3a2a4a'); }
  if (p.pu) { const def = get('powerup', p.pu.id), ix = right ? x - 14 : x + w + 2; px.sprite(g, def.icon, ix, y - 1); E.font.text(g, String(Math.ceil(p.pu.t)), ix + 6, y + 10, def.color, { align: 'center', font: 'tiny', outline: '#000' }); }
}
function drawScoreBug(g, r) {
  const M = S.match; if (!M) return;
  const W = hudPanelW(r), ca = game.cornerArea(), rightEdge = ca && ca.y0 < 30 ? Math.min(r.W - 4, Math.floor(ca.x0) - 2) : r.W - 4;
  for (const team of [0, 1]) {
    const T = get('team', S.teams[team].id), x = team === 0 ? 4 : rightEdge - W, y = 3, right = team === 1;
    E.ui.box(g, x, y, W, 36, { bg: [E.shade(T.colors.jersey, -.45), E.shade(T.colors.jersey, -.65)], border: T.colors.trim, alpha: .88 });
    px.sprite(g, LOGOS[T.logo].spr, right ? x + W - 15 : x + 3, y + 3);
    E.font.text(g, T.short, right ? x + W - 18 : x + 18, y + 4, '#ffffff', { align: right ? 'right' : 'left', outline: '#0c0614' });
    const sc = String(M.score[team]); E.font.text(g, sc, right ? x + 4 : x + W - 4, y + 2, M.gold[team] ? UIC.gold : '#ffffff', { align: right ? 'left' : 'right', scale: 2, outline: '#0c0614' });
    teamPlayers(team).forEach((p, i) => drawPlate(g, p, x + 2, y + 15 + i * 10, W - 4, right));
    if (M.poss === team && (M.phase === 'live' || M.phase === 'inbound')) px.rect(g, right ? x + W - 3 : x + 1, y + 2, 2, 32, UIC.gold);
  }
  // the clocks
  const cx = Math.round(r.W / 2), per = M.sudden ? 'SUDDEN BLAM' : M.ot ? 'OT' + (M.ot > 1 ? M.ot : '') : (M.quarters === 2 ? 'H' : 'Q') + M.quarter;
  E.ui.box(g, cx - 30, 3, 60, 26, { bg: ['#1a1030', '#0c0618'], border: UIC.line, alpha: .9 });
  E.font.text(g, per, cx, 5, UIC.muted, { align: 'center', outline: false });
  if (!M.sudden) E.font.text(g, mmss(Math.ceil(M.clock)), cx, 13, M.clock < 10 && M.phase === 'live' ? (Math.floor(game.real * 4) % 2 ? '#ff5a3a' : '#ffffff') : '#ffffff', { align: 'center', scale: 2, outline: '#000' });
  const sh = Math.ceil(M.shot), red = sh <= 5 && M.phase === 'live';
  E.ui.box(g, cx - 11, 30, 22, 11, { bg: red ? '#5a0a0a' : '#1a1030', border: red ? '#ff5a3a' : UIC.line, gradient: false, alpha: .9 });
  E.font.text(g, String(Math.max(0, sh)), cx, 32, red ? '#ff8a6a' : UIC.gold, { align: 'center', outline: false });
}
let lastShotBeep = 0;
function hudSounds() { const M = S.match; if (!M || M.phase !== 'live') return; const s = Math.ceil(M.shot); if (s <= 3 && s >= 1 && s !== lastShotBeep && S.ball.state === 'held') { lastShotBeep = s; sfx('shotclock_beep'); } if (s > 3) lastShotBeep = 0; }
/** the floor and in-world marks: rings, tags, the release meter, the dunk-range ring, power-ups */
function drawWorldMarks(r) {
  const b = S.ball, t = game.real;
  for (const u of POWERUPS.floor) {
    const def = get('powerup', u.id), k = .5 + .5 * Math.sin(t * 5), blink = u.t < 3 && Math.floor(t * 8) % 2;
    r.decal(() => { r.groundRing(u.x, u.y, 10 + k * 2, def.color, .8); r.groundDisc(u.x, u.y, 9, def.color, .2); });
    if (!blink) r.queue(u.x, u.y, 12, g => { const [x, y] = r.w(u.x, u.y, 14 + Math.sin(t * 3) * 3); px.sprite(g, def.icon, Math.round(x) - 6, Math.round(y) - 6); }, { emissive: true });
  }
  for (const p of S.players) {
    if (p.turboOn && p.z < 2) r.decal(() => r.groundRing(p.x, p.y, 9, '#ffffff', .5 + .3 * Math.sin(t * 20)));
    if (b.owner === p && b.state === 'held') r.decal(() => r.groundRing(p.x, p.y, 11, UIC.gold, .55));
    if (p.human !== null && p.human !== undefined) {
      const c = E.PLAYER_COLORS[p.human], top = p.z + p.rig.o.size * 34 + 8;
      r.queue(p.x, p.y, top, g => {
        const [x, y] = r.w(p.x, p.y, top), X = Math.round(x), Y = Math.round(y);
        if (X < 6 || X > r.W - 6) return;
        px.poly(g, [[X - 4, Y - 5], [X + 4, Y - 5], [X, Y]], c); E.font.text(g, 'P' + (p.human + 1), X, Y - 13, c, { align: 'center', outline: '#0c0614' });
      }, { emissive: true });
      // the release meter beside a human shooter; the dunk-range ring under a human handler on turbo
      if (game.settings.shotMeter !== false && p.state === 'air' && p.jump && p.jump.kind === 'shot' && !p.jump.released) r.queue(p.x, p.y, 70, g => {
        const J = p.jump, [x, y] = r.w(p.x, p.y, p.z + 40), X = Math.round(x) + 12, Y = Math.round(y) - 18, H = 26, top = J.ta + .25, u = clamp(p.st / top, 0, 1);
        const win = tune('perfectWindow') * (p.pu && p.pu.id === 'laser' ? 2 : 1), w0 = (J.ta - win / 2) / top, w1 = (J.ta + win / 2) / top;
        px.rect(g, X - 1, Y - 1, 6, H + 2, '#0c0614'); px.rect(g, X, Y, 4, H, '#2a2040');
        px.rect(g, X, Y + Math.round(H * (1 - w1)), 4, Math.max(1, Math.round(H * (w1 - w0))), '#5aff7a');
        px.rect(g, X - 2, Y + Math.round(H * (1 - u)), 8, 2, u > w1 ? '#ff5a3a' : '#ffffff');
      }, { emissive: true });
      if (b.owner === p && p.turboOn && game.settings.shotMeter !== false) { const rim = attackRim(p.team), R2 = dunkRange(p), inR = dist2(p.x, p.y, rim.x, rim.y) <= R2; r.decal(() => r.groundArc(rim.x, rim.y, R2 - 1.5, R2 + .5, rim.side < 0 ? -PI / 2 : PI / 2, rim.side < 0 ? PI / 2 : PI * 1.5, inR ? '#5aff7a' : '#ffffff', inR ? .7 : .35)); }
    }
  }
  for (const bk of BARKS) { const p = bk.p; r.queue(p.x, p.y, 90, g => { const h = p.rig.head(), [x, y] = r.w(h[0], h[1], h[2] + 10), w = E.font.width(bk.text) + 6; E.ui.box(g, Math.round(x - w / 2), Math.round(y) - 12, w, 11, { bg: '#ffffff', border: '#1a1030', gradient: false }); E.font.text(g, bk.text, Math.round(x), Math.round(y) - 10, '#1a1030', { align: 'center', outline: false }); }, { emissive: true }); }
}
/** edge arrows for humans off screen, the lower-third caption, the windsock */
function drawHudBottom(g, r) {
  for (const p of S.players) {
    if (p.human === null || p.human === undefined) continue;
    const [x, y] = r.w(p.x, p.y, p.z + 30); if (x >= 0 && x <= r.W && y >= 0 && y <= r.H) continue;
    const X = clamp(x, 8, r.W - 8), Y = clamp(y, 46, r.H - 30), c = E.PLAYER_COLORS[p.human], a = Math.atan2(y - Y, x - X);
    px.disc(g, X, Y, 6, '#0c0614'); px.poly(g, [[X + Math.cos(a) * 6, Y + Math.sin(a) * 6], [X + Math.cos(a + 2.3) * 5, Y + Math.sin(a + 2.3) * 5], [X + Math.cos(a - 2.3) * 5, Y + Math.sin(a - 2.3) * 5]], c);
    E.font.text(g, 'P' + (p.human + 1), X, Y + 7, c, { align: 'center', font: 'tiny', outline: '#000' });
  }
  const C = ANN.cap;
  if (C && game.real < C.until) {
    const w = Math.min(r.W - 20, 300), x = Math.round((r.W - w) / 2), lines = wrapText(C.text, w - 46).slice(0, 2), h = 14 + lines.length * 9, y = r.H - h - 6;
    E.ui.box(g, x, y, w, h, { bg: ['#1a0e34', '#0c0618'], border: C.speaker === 'deedee' ? UIC.accent : C.speaker === 'gigawatt' ? '#a050ff' : UIC.accent2, alpha: .9 });
    if (CAST[C.speaker] || get('player', C.speaker)) drawPortrait(g, C.speaker, x + 4, y + 3, Math.min(32, h - 6), { frame: false });
    E.font.text(g, C.name, x + 40, y + 3, C.speaker === 'deedee' ? '#ff8ad8' : '#7af0ff', { outline: false });
    lines.forEach((l, i) => E.font.text(g, l, x + 40, y + 12 + i * 9, UIC.ink, { outline: false }));
  }
  if (TWIST.wind) {   // the windsock: its direction and 1-3 chevrons
    const x = 22, y = r.H - 44, w = TWIST.windOn ? Math.hypot(TWIST.windX, TWIST.windY) : 0, dir = TWIST.windX >= 0 ? 1 : -1, n = w > .8 ? 3 : w > .55 ? 2 : w > 0 ? 1 : 0;
    E.ui.box(g, x - 16, y - 14, 34, 28, { bg: '#0c0618', border: UIC.line, alpha: .8 }); px.rect(g, x - 1, y - 8, 2, 18, '#c8c8d0');
    const L2 = 6 + w * 10, droop = (1 - w) * 6; px.poly(g, [[x, y - 8], [x + dir * L2, y - 7 + droop], [x + dir * L2, y - 3 + droop], [x, y - 2]], '#ff5a3a');
    for (let k = 0; k < n; k++) E.font.text(g, dir > 0 ? '>' : '<', x - 8 + k * 6, y + 4, '#ffd23a', { outline: false });
  }
}
/** the ball: a 9x9 sprite with seams, turning with its speed; a shadow sized by its height; a comet trail in Supernova */
const BALL_SPR = [0, 1, 2, 3].map(k => E.sprite([
  '..kkkkk..', '.koooook.', ['koSoooook', 'kooSooook', 'koooSoook', 'kooooSook'][k], 'kSSSSSSSk', ['kooooSook', 'koooSoook', 'kooSooook', 'koSoooook'][k], 'koooooook', 'kooooooLk', '.koooLLk.', '..kkkkk..'
].map(row => row.replace(/L/g, 'l')), { k: '#3a1a0c', o: '#e8742a', S: '#2a1408', l: '#ffb070' }));
function drawBall(r) {
  const b = S.ball; if (!b) return;
  if (b.state === 'held' && b.owner && b.owner.state === 'inbound' && !b.owner.ballAt) return;
  r.shadow(b.x, b.y, Math.max(2, 4.5 - b.z * .02), clamp(.5 - b.z * .002, .15, .5));
  const nova = b.owner ? b.owner.isNova() : b.shot && b.shot.shooter && b.shot.shooter.isNova(), fast = Math.hypot(b.vx, b.vy) > 260;
  if ((nova || fast) && b.trail.length > 2) r.queue(b.x, b.y, b.z, g => { px.blend(g, .5, 'add', () => { b.trail.forEach((q, i) => { const [x, y] = r.w(q[0], q[1], q[2]); px.disc(g, Math.round(x), Math.round(y), 1 + i * .45, nova ? (i % 2 ? '#ffd23a' : '#ff7a2a') : '#ffffff'); }); }); }, { bias: -.5, emissive: true });
  const fr = Math.floor(b.roll / 6) % 4, gold = S.match && S.match.gold && b.owner && S.match.gold[b.owner.team];
  r.sprite(b.x, b.y, b.z - BALL_R, BALL_SPR[fr], { anchor: 'bottom', glow: gold || nova ? .6 : 0, bias: b.owner && b.owner.dribble && Math.sin((b.owner.rig.facing || 0)) > 0 ? .5 : .2 });
}
